import argparse
import os
import threading
import time
from concurrent.futures import ThreadPoolExecutor, as_completed

from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
from googleapiclient.http import MediaFileUpload


SCOPES = ["https://www.googleapis.com/auth/drive"]
TOKEN_LOCK = threading.Lock()


def authenticate():
    creds = None
    if os.path.exists("token.json"):
        creds = Credentials.from_authorized_user_file("token.json", SCOPES)

    if not creds or not creds.valid:
        with TOKEN_LOCK:
            creds = None
            if os.path.exists("token.json"):
                creds = Credentials.from_authorized_user_file("token.json", SCOPES)

            if not creds or not creds.valid:
                flow = InstalledAppFlow.from_client_secrets_file(
                    "credentials.json",
                    SCOPES,
                )
                creds = flow.run_local_server(port=0)

                with open("token.json", "w", encoding="utf-8") as token:
                    token.write(creds.to_json())

    return creds


def build_drive_service():
    creds = authenticate()
    return build("drive", "v3", credentials=creds)


def upload_and_ocr(image_path):
    service = build_drive_service()

    file_metadata = {
        "name": os.path.basename(image_path),
        "mimeType": "application/vnd.google-apps.document",
    }

    media = MediaFileUpload(image_path, resumable=True)

    file = service.files().create(
        body=file_metadata,
        media_body=media,
        fields="id",
    ).execute()

    doc_id = file["id"]
    doc_link = f"https://docs.google.com/document/d/{doc_id}/edit"
    return doc_id, doc_link


def get_google_doc_text(doc_id):
    service = build_drive_service()
    request = service.files().export_media(
        fileId=doc_id,
        mimeType="text/plain",
    )
    return request.execute().decode("utf-8")


def delete_google_doc(doc_id):
    service = build_drive_service()
    service.files().delete(fileId=doc_id).execute()


def ocr_once(image_path, cleanup=False):
    started_at = time.perf_counter()
    doc_id, doc_link = upload_and_ocr(image_path)
    text = get_google_doc_text(doc_id)

    if cleanup:
        delete_google_doc(doc_id)

    elapsed = time.perf_counter() - started_at
    return {
        "doc_id": doc_id,
        "doc_link": doc_link,
        "text": text.strip(),
        "elapsed": elapsed,
    }


def run_benchmark(image_path, workers, total_requests, cleanup=False):
    started_at = time.perf_counter()
    successes = 0
    failures = 0
    results = []

    with ThreadPoolExecutor(max_workers=workers) as executor:
        futures = [
            executor.submit(ocr_once, image_path, cleanup)
            for _ in range(total_requests)
        ]

        for index, future in enumerate(as_completed(futures), start=1):
            try:
                result = future.result()
                successes += 1
                results.append(result)
                print(
                    f"[OK {index}/{total_requests}] "
                    f"{result['elapsed']:.2f}s | {result['doc_id']} | {result['text']}"
                )
            except Exception as exc:
                failures += 1
                print(f"[ERR {index}/{total_requests}] {type(exc).__name__}: {exc}")

    total_elapsed = time.perf_counter() - started_at
    rpm = successes / total_elapsed * 60 if total_elapsed > 0 else 0

    print("\nSUMMARY")
    print(f"workers: {workers}")
    print(f"total_requests: {total_requests}")
    print(f"successes: {successes}")
    print(f"failures: {failures}")
    print(f"total_time_sec: {total_elapsed:.2f}")
    print(f"requests_per_minute: {rpm:.2f}")

    return results


def main():
    parser = argparse.ArgumentParser(
        description="Benchmark Google Drive OCR by uploading the same image concurrently."
    )
    parser.add_argument(
        "--image",
        default="debug_crop_17s_box0.png",
        help="Path to the image file to OCR.",
    )
    parser.add_argument(
        "--workers",
        type=int,
        default=5,
        help="Number of concurrent worker threads.",
    )
    parser.add_argument(
        "--requests",
        type=int,
        default=10,
        help="Total number of OCR requests to run.",
    )
    parser.add_argument(
        "--cleanup",
        action="store_true",
        help="Delete created Google Docs after reading OCR text.",
    )
    args = parser.parse_args()

    if not os.path.exists(args.image):
        raise FileNotFoundError(f"Image not found: {args.image}")

    run_benchmark(
        image_path=args.image,
        workers=args.workers,
        total_requests=args.requests,
        cleanup=args.cleanup,
    )


if __name__ == "__main__":
    main()
