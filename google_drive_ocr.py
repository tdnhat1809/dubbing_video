"""
Google Drive OCR Module (Multi-Account)
========================================
Upload images to Google Drive → convert to Google Docs → extract OCR text → cleanup.
Supports concurrent batch OCR for fast subtitle extraction.

Multi-account support:
  - Loads all credentials*.json files from project root
  - Each account gets its own token (token_<name>.json)
  - Round-robin distributes OCR tasks across accounts
  - Each account handles up to MAX_WORKERS_PER_ACCOUNT concurrent threads

Key optimizations:
  - Reuse single authenticated service per (thread, account) pair
  - Auto cleanup Google Docs after text extraction
  - Retry with exponential backoff on failures
"""
import os
import sys
import cv2
import glob
import threading
import time
import tempfile
import numpy as np

from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
from googleapiclient.http import MediaFileUpload

SCOPES = ["https://www.googleapis.com/auth/drive"]
_ROOT_DIR = os.path.dirname(os.path.abspath(__file__))


def _read_workers_per_account(default=200):
    raw = os.getenv("GOOGLE_OCR_WORKERS_PER_ACCOUNT", str(default)).strip()
    try:
        return max(1, int(raw))
    except Exception:
        return default

# ============================================================
# Multi-Account Management
# ============================================================

MAX_WORKERS_PER_ACCOUNT = _read_workers_per_account(200)  # max concurrent threads per Google account

class GoogleAccount:
    """Represents a single Google Drive account with its own credentials."""
    
    def __init__(self, name, creds_path, token_path):
        self.name = name
        self.creds_path = creds_path
        self.token_path = token_path
        self._lock = threading.Lock()
        self._creds = None
    
    def authenticate(self):
        """Authenticate this account, refreshing token if needed."""
        if self._creds and self._creds.valid:
            return self._creds
        
        with self._lock:
            creds = None
            if os.path.exists(self.token_path):
                creds = Credentials.from_authorized_user_file(self.token_path, SCOPES)
            
            if not creds or not creds.valid:
                if creds and creds.expired and creds.refresh_token:
                    from google.auth.transport.requests import Request
                    creds.refresh(Request())
                else:
                    flow = InstalledAppFlow.from_client_secrets_file(self.creds_path, SCOPES)
                    creds = flow.run_local_server(port=0)
                
                with open(self.token_path, "w", encoding="utf-8") as f:
                    f.write(creds.to_json())
            
            self._creds = creds
            return creds
    
    def build_service(self):
        """Create a new Drive API service for this account."""
        return build("drive", "v3", credentials=self.authenticate(), cache_discovery=False)
    
    def __repr__(self):
        return f"GoogleAccount({self.name})"


def _discover_accounts():
    """Discover all Google accounts from credentials files in the project root.
    
    Looks for:
      - credentials.json → token.json (original account)
      - credentials1.json → token1.json
      - credentials2.json → token2.json
      - credentials_xxx.json → token_xxx.json
      etc.
    
    Returns: list of GoogleAccount objects
    """
    accounts = []
    
    # Find all credentials*.json files
    pattern = os.path.join(_ROOT_DIR, "credentials*.json")
    creds_files = sorted(glob.glob(pattern))
    
    if not creds_files:
        print("  [Google OCR] WARNING: No credentials*.json found!", flush=True)
        return accounts
    
    for creds_path in creds_files:
        basename = os.path.basename(creds_path)  # e.g. "credentials1.json"
        
        # Derive token filename from credentials filename
        # credentials.json → token.json
        # credentials1.json → token1.json
        # credentials_abc.json → token_abc.json
        suffix = basename.replace("credentials", "").replace(".json", "")  # e.g. "1", "2", "_abc", ""
        token_name = f"token{suffix}.json"
        token_path = os.path.join(_ROOT_DIR, token_name)
        
        name = f"account{suffix}" if suffix else "account_default"
        accounts.append(GoogleAccount(name, creds_path, token_path))
    
    return accounts


# Global account list — loaded once on first use
_accounts = None
_accounts_lock = threading.Lock()


def _get_accounts():
    """Get or discover all available Google accounts (lazy init, thread-safe)."""
    global _accounts
    if _accounts is None:
        with _accounts_lock:
            if _accounts is None:
                _accounts = _discover_accounts()
                if _accounts:
                    names = [a.name for a in _accounts]
                    print(f"  [Google OCR] Loaded {len(_accounts)} accounts: {', '.join(names)}", flush=True)
                else:
                    print("  [Google OCR] No accounts found!", flush=True)
    return _accounts


# ============================================================
# Thread-local service management (per account)
# ============================================================

_thread_local = threading.local()


def _get_service(account=None):
    """Get or create thread-local Drive service for a specific account.
    
    If account is None, uses the first (default) account.
    """
    if account is None:
        accounts = _get_accounts()
        if not accounts:
            raise RuntimeError("No Google accounts configured")
        account = accounts[0]
    
    # Each thread may need services for different accounts
    if not hasattr(_thread_local, 'services'):
        _thread_local.services = {}
    
    if account.name not in _thread_local.services:
        _thread_local.services[account.name] = account.build_service()
    
    return _thread_local.services[account.name]


# ============================================================
# Single-image OCR
# ============================================================

def ocr_image_file(image_path, cleanup=True, account=None):
    """Upload image to Google Drive, convert to Docs, extract text, delete.
    
    Args:
        image_path: Path to image file
        cleanup: Whether to delete the Google Doc after extraction
        account: GoogleAccount to use (None = default)
    
    Returns: Extracted text string
    """
    service = _get_service(account)

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

    try:
        text = service.files().export_media(
            fileId=doc_id,
            mimeType="text/plain",
        ).execute().decode("utf-8").strip()
        # Remove BOM and non-printable chars from Google Docs output
        text = text.replace('\ufeff', '').strip()
    except Exception as e:
        print(f"  [Google OCR] Export error for {doc_id}: {e}", flush=True)
        raise
    finally:
        if cleanup:
            try:
                service.files().delete(fileId=doc_id).execute()
            except Exception:
                pass

    return text


def ocr_cv2_image(cv2_image, cleanup=True, account=None):
    """OCR a cv2 (numpy array) image via Google Drive."""
    fd, tmp_path = tempfile.mkstemp(suffix=".png")
    try:
        os.close(fd)
        cv2.imwrite(tmp_path, cv2_image)
        return ocr_image_file(tmp_path, cleanup=cleanup, account=account)
    finally:
        try:
            os.unlink(tmp_path)
        except Exception:
            pass


# ============================================================
# Batch OCR with Multi-Account Round-Robin
# ============================================================

def batch_ocr_cv2_images(images, workers=None, cleanup=True):
    """Batch OCR multiple cv2 images concurrently using multiple Google accounts.
    
    Args:
        images: List of (index, cv2_image) tuples
        workers: Number of concurrent threads PER ACCOUNT
        cleanup: Whether to delete Google Docs after extraction
        
    Returns:
        Dict mapping index → text
    """
    from concurrent.futures import ThreadPoolExecutor, as_completed
    
    results = {}
    total = len(images)
    
    if total == 0:
        return results

    accounts = _get_accounts()
    if not accounts:
        raise RuntimeError("No Google accounts configured for OCR")

    if workers is None:
        workers = MAX_WORKERS_PER_ACCOUNT
    
    num_accounts = len(accounts)

    # Save all images to temp files first
    temp_files = {}
    for idx, img in images:
        fd, tmp_path = tempfile.mkstemp(suffix=".png")
        os.close(fd)
        cv2.imwrite(tmp_path, img)
        temp_files[idx] = tmp_path

    t0 = time.time()
    successes = 0
    failures = 0

    MAX_RETRIES = 3

    def _ocr_one(idx_path_account):
        """OCR one image with automatic retry + exponential backoff."""
        idx, fpath, account = idx_path_account
        last_err = None
        for attempt in range(1, MAX_RETRIES + 1):
            try:
                text = ocr_image_file(fpath, cleanup=cleanup, account=account)
                return idx, text, None, attempt, account.name
            except Exception as e:
                last_err = str(e)
                if attempt < MAX_RETRIES:
                    wait = 2 ** attempt  # 2s, 4s, 8s
                    time.sleep(wait)
        return idx, "", last_err, MAX_RETRIES, account.name

    # Distribute images across accounts using round-robin
    tasks = []
    for i, (idx, fpath) in enumerate(temp_files.items()):
        account = accounts[i % num_accounts]
        tasks.append((idx, fpath, account))

    # Calculate actual workers: workers per account * num_accounts
    total_workers = min(workers * num_accounts, total)
    
    # Track per-account stats
    account_stats = {a.name: {"ok": 0, "err": 0} for a in accounts}
    
    print(f"  [Google OCR] Starting batch: {total} images, "
          f"{num_accounts} accounts, {total_workers} total workers "
          f"({workers}/account), max {MAX_RETRIES} retries/item", flush=True)
    for a in accounts:
        count = sum(1 for t in tasks if t[2].name == a.name)
        print(f"    → {a.name}: {count} images assigned", flush=True)

    failed_items = {}  # idx → (fpath, account) for items that fail all retries

    with ThreadPoolExecutor(max_workers=total_workers) as executor:
        futures = {
            executor.submit(_ocr_one, task): task[0]
            for task in tasks
        }

        done_count = 0
        retried_count = 0
        for future in as_completed(futures):
            idx, text, err, attempts, acc_name = future.result()
            if attempts > 1:
                retried_count += 1
            if err:
                failures += 1
                # Find the account for retry
                original_task = next(t for t in tasks if t[0] == idx)
                failed_items[idx] = (temp_files[idx], original_task[2])
                account_stats[acc_name]["err"] += 1
                print(f"  [Google OCR] FAIL #{idx} [{acc_name}] after {attempts} attempts: {err}", flush=True)
            else:
                successes += 1
                account_stats[acc_name]["ok"] += 1
            results[idx] = text
            
            done_count += 1
            pct = done_count / total * 100
            elapsed_so_far = time.time() - t0
            rate = done_count / elapsed_so_far if elapsed_so_far > 0 else 0
            eta = (total - done_count) / rate if rate > 0 else 0
            preview = text[:40].replace('\n', ' ') if text else '(empty)'
            retry_tag = f" R{attempts}" if attempts > 1 else ""
            print(f"  [{pct:5.1f}%] Google OCR: {done_count}/{total}{retry_tag} [{acc_name}] "
                  f"| {elapsed_so_far:.0f}s | ETA: {eta:.0f}s | {preview}", flush=True)

    # ---- RETRY PASS: re-attempt all failed items with the configured per-account concurrency ----
    if failed_items:
        retry_tasks = [(idx, fpath, acc) for idx, (fpath, acc) in failed_items.items()]
        retry_total_workers = min(workers * num_accounts, len(retry_tasks))
        print(f"  [Google OCR] Retry pass: {len(failed_items)} failed items, "
              f"{retry_total_workers} total workers ({workers}/account)...", flush=True)
        with ThreadPoolExecutor(max_workers=retry_total_workers) as executor:
            futures = {
                executor.submit(_ocr_one, task): task[0]
                for task in retry_tasks
            }
            for future in as_completed(futures):
                idx, text, err, attempts, acc_name = future.result()
                if not err and text:
                    results[idx] = text
                    successes += 1
                    failures -= 1
                    account_stats[acc_name]["ok"] += 1
                    account_stats[acc_name]["err"] -= 1
                    print(f"  [Google OCR] RECOVERED #{idx} [{acc_name}]: {text[:40]}", flush=True)
                else:
                    print(f"  [Google OCR] STILL FAILED #{idx} [{acc_name}]: {err}", flush=True)

    # Cleanup temp files
    for fpath in temp_files.values():
        try:
            os.unlink(fpath)
        except Exception:
            pass

    elapsed = time.time() - t0
    rpm = successes / elapsed * 60 if elapsed > 0 else 0
    print(f"  [Google OCR] DONE: {successes}/{total} OK, {failures} ERR, "
          f"{retried_count} retried, {elapsed:.1f}s ({rpm:.0f} req/min)", flush=True)
    
    # Per-account summary
    for a in accounts:
        s = account_stats[a.name]
        print(f"    → {a.name}: {s['ok']} OK, {s['err']} ERR", flush=True)

    return results


# ========================
# CLI for standalone testing
# ========================
if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Google Drive OCR (Multi-Account)")
    parser.add_argument("image", help="Image file to OCR")
    parser.add_argument("--no-cleanup", action="store_true", help="Don't delete Google Doc")
    parser.add_argument("--account", type=int, default=0, help="Account index to use (0-based)")
    parser.add_argument("--list-accounts", action="store_true", help="List all configured accounts")
    args = parser.parse_args()

    if args.list_accounts:
        accounts = _get_accounts()
        for i, a in enumerate(accounts):
            token_exists = "✓" if os.path.exists(a.token_path) else "✗"
            print(f"  [{i}] {a.name}: {a.creds_path} (token: {token_exists})")
        print(f"  Default workers/account: {MAX_WORKERS_PER_ACCOUNT}")
        sys.exit(0)

    if not os.path.exists(args.image):
        print(f"File not found: {args.image}")
        sys.exit(1)

    accounts = _get_accounts()
    account = accounts[args.account] if args.account < len(accounts) else None
    
    text = ocr_image_file(args.image, cleanup=not args.no_cleanup, account=account)
    print(f"OCR Result:\n{text}")
