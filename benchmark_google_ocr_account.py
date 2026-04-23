import argparse
import os
import statistics
import threading
import time
from collections import Counter
from concurrent.futures import ThreadPoolExecutor, as_completed

from google_drive_ocr import _get_accounts, ocr_image_file


def percentile(values, ratio):
    if not values:
        return 0.0
    ordered = sorted(values)
    idx = min(len(ordered) - 1, max(0, int(round((len(ordered) - 1) * ratio))))
    return ordered[idx]


def benchmark_level(image_path, account, workers, total_requests, cleanup):
    active = 0
    peak_active = 0
    lock = threading.Lock()
    latencies = []
    errors = Counter()
    successes = 0
    failures = 0

    def run_one(request_id):
        nonlocal active, peak_active
        started = time.perf_counter()
        with lock:
            active += 1
            peak_active = max(peak_active, active)
        try:
            text = ocr_image_file(image_path, cleanup=cleanup, account=account)
            elapsed = time.perf_counter() - started
            return {
                "request_id": request_id,
                "ok": True,
                "elapsed": elapsed,
                "text_preview": (text or "").replace("\n", " ")[:60],
                "error": "",
            }
        except Exception as exc:
            elapsed = time.perf_counter() - started
            return {
                "request_id": request_id,
                "ok": False,
                "elapsed": elapsed,
                "text_preview": "",
                "error": f"{type(exc).__name__}: {exc}",
            }
        finally:
            with lock:
                active -= 1

    started_all = time.perf_counter()
    print(
        f"\n=== Benchmark {account.name} | workers={workers} | requests={total_requests} ===",
        flush=True,
    )

    with ThreadPoolExecutor(max_workers=workers) as executor:
        futures = [
            executor.submit(run_one, request_id)
            for request_id in range(1, total_requests + 1)
        ]
        for done_index, future in enumerate(as_completed(futures), start=1):
            result = future.result()
            latencies.append(result["elapsed"])
            if result["ok"]:
                successes += 1
                print(
                    f"[OK  {done_index:>4}/{total_requests}] "
                    f"{result['elapsed']:.2f}s | {result['text_preview'] or '(empty)'}",
                    flush=True,
                )
            else:
                failures += 1
                errors[result["error"]] += 1
                print(
                    f"[ERR {done_index:>4}/{total_requests}] "
                    f"{result['elapsed']:.2f}s | {result['error']}",
                    flush=True,
                )

    elapsed_all = time.perf_counter() - started_all
    rpm = successes / elapsed_all * 60 if elapsed_all > 0 else 0.0
    failure_rate = (failures / total_requests * 100.0) if total_requests else 0.0

    summary = {
        "workers": workers,
        "requests": total_requests,
        "successes": successes,
        "failures": failures,
        "failure_rate": failure_rate,
        "total_time_sec": elapsed_all,
        "requests_per_minute": rpm,
        "avg_latency_sec": statistics.mean(latencies) if latencies else 0.0,
        "p50_latency_sec": statistics.median(latencies) if latencies else 0.0,
        "p95_latency_sec": percentile(latencies, 0.95),
        "peak_active": peak_active,
        "errors": errors,
    }

    print("SUMMARY", flush=True)
    print(f"account: {account.name}", flush=True)
    print(f"workers: {workers}", flush=True)
    print(f"requests: {total_requests}", flush=True)
    print(f"successes: {successes}", flush=True)
    print(f"failures: {failures}", flush=True)
    print(f"failure_rate_pct: {failure_rate:.2f}", flush=True)
    print(f"peak_active: {peak_active}", flush=True)
    print(f"total_time_sec: {elapsed_all:.2f}", flush=True)
    print(f"avg_latency_sec: {summary['avg_latency_sec']:.2f}", flush=True)
    print(f"p50_latency_sec: {summary['p50_latency_sec']:.2f}", flush=True)
    print(f"p95_latency_sec: {summary['p95_latency_sec']:.2f}", flush=True)
    print(f"requests_per_minute: {rpm:.2f}", flush=True)
    if errors:
        print("top_errors:", flush=True)
        for message, count in errors.most_common(5):
            print(f"  {count}x {message}", flush=True)

    return summary


def main():
    parser = argparse.ArgumentParser(
        description="Benchmark Google Drive OCR concurrency for a single account."
    )
    parser.add_argument(
        "--image",
        default="debug_crop_17s_box0.png",
        help="Path to the image file used for all OCR requests.",
    )
    parser.add_argument(
        "--account",
        type=int,
        default=0,
        help="Account index from google_drive_ocr._get_accounts().",
    )
    parser.add_argument(
        "--levels",
        nargs="+",
        type=int,
        default=[200, 300, 500, 700],
        help="Worker counts to benchmark.",
    )
    parser.add_argument(
        "--requests",
        type=int,
        default=0,
        help="Requests per level. Default 0 means use the same value as workers.",
    )
    parser.add_argument(
        "--cleanup",
        action="store_true",
        help="Delete created Google Docs after OCR export.",
    )
    parser.add_argument(
        "--max-failure-rate",
        type=float,
        default=2.0,
        help="Threshold used to mark a level as stable.",
    )
    args = parser.parse_args()

    if not os.path.exists(args.image):
        raise FileNotFoundError(f"Image not found: {args.image}")

    accounts = _get_accounts()
    if not accounts:
        raise RuntimeError("No Google accounts configured")
    if args.account < 0 or args.account >= len(accounts):
        raise IndexError(f"Account index out of range: {args.account}")

    account = accounts[args.account]
    print(f"Using account: [{args.account}] {account.name}", flush=True)
    summaries = []
    for workers in args.levels:
        total_requests = args.requests or workers
        summaries.append(
            benchmark_level(
                image_path=args.image,
                account=account,
                workers=workers,
                total_requests=total_requests,
                cleanup=args.cleanup,
            )
        )

    stable = [
        summary for summary in summaries
        if summary["failure_rate"] <= args.max_failure_rate
    ]

    print("\n=== Final Summary ===", flush=True)
    for summary in summaries:
        print(
            f"workers={summary['workers']:>4} | ok={summary['successes']:>4}/{summary['requests']:<4} "
            f"| fail_rate={summary['failure_rate']:.2f}% | p95={summary['p95_latency_sec']:.2f}s "
            f"| rpm={summary['requests_per_minute']:.1f}",
            flush=True,
        )

    if stable:
        best = max(stable, key=lambda item: item["workers"])
        print(
            f"Recommended stable max for {account.name}: {best['workers']} workers/account "
            f"(failure_rate={best['failure_rate']:.2f}%)",
            flush=True,
        )
    else:
        print(
            f"No tested level stayed below {args.max_failure_rate:.2f}% failure rate.",
            flush=True,
        )


if __name__ == "__main__":
    main()
