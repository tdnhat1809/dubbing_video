"""
Standalone worker script for CapCut Mate export.

Runs as a separate process to avoid COM threading conflicts
with the FastAPI server's ThreadPoolExecutor.

Usage:
    python -m src.utils.capcut_export_worker <draft_id> <outfile>
"""
import sys
import os
import json
import time
import subprocess

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

import config
from uiautomation import UIAutomationInitializerInThread
import src.pyJianYingDraft as draft

JIANYING_EXE = r"C:\Users\Admin\AppData\Local\JianyingPro\Apps\5.9.0.11632\JianyingPro.exe"


def patch_draft_meta(draft_id: str) -> None:
    """Patch draft_meta_info.json to point to DRAFT_SAVE_PATH."""
    draft_save_dir = os.path.join(config.DRAFT_SAVE_PATH, draft_id)
    meta_path = os.path.join(draft_save_dir, "draft_meta_info.json")
    if not os.path.exists(meta_path):
        print(f"WARN: draft_meta_info.json not found at {meta_path}")
        return

    with open(meta_path, 'r', encoding='utf-8') as f:
        meta = json.load(f)

    meta['draft_name'] = draft_id
    meta['draft_fold_path'] = draft_save_dir.replace('\\', '/')
    meta['draft_root_path'] = config.DRAFT_SAVE_PATH.replace('\\', '/')

    with open(meta_path, 'w', encoding='utf-8') as f:
        json.dump(meta, f, ensure_ascii=False, indent=2)
    print(f"OK: Patched draft_meta_info.json for {draft_id}")


def register_draft(draft_id: str) -> None:
    """Register draft in root_meta_info.json."""
    draft_save_dir = os.path.join(config.DRAFT_SAVE_PATH, draft_id)
    from src.service.create_draft import _register_draft_in_root_meta
    _register_draft_in_root_meta(draft_id, draft_save_dir)
    print(f"OK: Registered draft {draft_id}")


def restart_jianying() -> None:
    """Kill all JianyingPro and restart v5.9."""
    print("INFO: Killing JianyingPro...")
    try:
        subprocess.run(
            ["taskkill", "/F", "/IM", "JianyingPro.exe"],
            capture_output=True, timeout=10
        )
    except Exception as e:
        print(f"WARN: taskkill: {e}")

    time.sleep(5)

    print(f"INFO: Launching v5.9: {JIANYING_EXE}")
    subprocess.Popen(
        [JIANYING_EXE],
        creationflags=subprocess.DETACHED_PROCESS | subprocess.CREATE_NEW_PROCESS_GROUP
    )

    print("INFO: Waiting 20s for JianyingPro to load...")
    time.sleep(20)
    print("OK: JianyingPro v5.9 ready")


def pre_generate_srt(draft_id: str) -> None:
    """Pre-generate SRT subtitle file from text tracks before stripping them.
    
    This must be called BEFORE strip_text_tracks, because post-processing
    needs the SRT file but text tracks will be removed from draft_content.json.
    """
    draft_save_dir = os.path.join(config.DRAFT_SAVE_PATH, draft_id)
    content_path = os.path.join(draft_save_dir, "draft_content.json")
    srt_path = os.path.join(draft_save_dir, "_subtitles.srt")
    
    if not os.path.exists(content_path):
        print(f"WARN: draft_content.json not found, skipping SRT generation")
        return
    
    with open(content_path, 'r', encoding='utf-8') as f:
        content = json.load(f)
    
    materials = content.get("materials", {})
    texts_mat = materials.get("texts", [])
    tracks = content.get("tracks", [])
    
    text_segments = []
    for track in tracks:
        if track.get("type") != "text":
            continue
        for seg in track.get("segments", []):
            material_id = seg.get("material_id", "")
            target_range = seg.get("target_timerange", {})
            start_us = target_range.get("start", 0)
            duration_us = target_range.get("duration", 0)
            
            # Find text material
            mat = None
            for m in texts_mat:
                if m.get("id") == material_id:
                    mat = m
                    break
            if not mat:
                continue
            
            # Extract text content
            content_data = mat.get("content", "{}")
            try:
                c = json.loads(content_data) if isinstance(content_data, str) else content_data
            except json.JSONDecodeError:
                continue
            
            # Get text from content structure
            text = ""
            if isinstance(c, dict):
                text = c.get("text", "")
                if not text:
                    # Try nested structure
                    for style in c.get("styles", []):
                        if style.get("text"):
                            text = style["text"]
                            break
            
            if text:
                text_segments.append({
                    "text": text,
                    "start_us": start_us,
                    "duration_us": duration_us,
                })
    
    if not text_segments:
        print("INFO: No text segments found for SRT")
        return
    
    # Sort by start time
    text_segments.sort(key=lambda s: s["start_us"])
    
    # Write SRT
    with open(srt_path, 'w', encoding='utf-8') as f:
        for i, seg in enumerate(text_segments, 1):
            start_s = seg["start_us"] / 1_000_000
            end_s = (seg["start_us"] + seg["duration_us"]) / 1_000_000
            
            start_h = int(start_s // 3600)
            start_m = int((start_s % 3600) // 60)
            start_sec = start_s % 60
            
            end_h = int(end_s // 3600)
            end_m = int((end_s % 3600) // 60)
            end_sec = end_s % 60
            
            f.write(f"{i}\n")
            f.write(f"{start_h:02d}:{start_m:02d}:{start_sec:06.3f}".replace(".", ","))
            f.write(f" --> ")
            f.write(f"{end_h:02d}:{end_m:02d}:{end_sec:06.3f}".replace(".", ","))
            f.write(f"\n{seg['text']}\n\n")
    
    print(f"OK: Pre-generated SRT with {len(text_segments)} subtitles -> {srt_path}")


def strip_text_tracks(draft_id: str) -> None:
    """Remove text tracks from draft_content.json before CapCut export.
    
    This prevents double subtitles: CapCut would render text tracks into the video,
    then FFmpeg post-processing would burn subtitles again on top of the blur.
    By stripping text tracks, only FFmpeg renders subtitles (on top of blur).
    """
    draft_save_dir = os.path.join(config.DRAFT_SAVE_PATH, draft_id)
    content_path = os.path.join(draft_save_dir, "draft_content.json")
    if not os.path.exists(content_path):
        print(f"WARN: draft_content.json not found at {content_path}")
        return
    
    with open(content_path, 'r', encoding='utf-8') as f:
        content = json.load(f)
    
    tracks = content.get("tracks", [])
    original_count = len(tracks)
    
    # Remove text tracks (keep video, audio, etc.)
    content["tracks"] = [t for t in tracks if t.get("type") != "text"]
    removed = original_count - len(content["tracks"])
    
    if removed > 0:
        with open(content_path, 'w', encoding='utf-8') as f:
            json.dump(content, f, ensure_ascii=False)
        print(f"OK: Stripped {removed} text tracks from draft_content.json")
    else:
        print("INFO: No text tracks to strip")


def export_draft(draft_id: str, outfile: str) -> bool:
    """Use JianyingController to export the draft."""
    print(f"INFO: Starting UIAutomation export for {draft_id}")
    with UIAutomationInitializerInThread():
        ctrl = draft.JianyingController()
        print(f"OK: JianyingController ready, status={ctrl.app_status}")
        ctrl.export_draft(draft_id, outfile)

    if os.path.exists(outfile):
        print(f"SUCCESS: Export completed -> {outfile}")
        return True
    else:
        print(f"FAIL: Output file not created: {outfile}")
        return False


def main():
    if len(sys.argv) < 3:
        print("Usage: python -m src.utils.capcut_export_worker <draft_id> <outfile>")
        sys.exit(1)

    draft_id = sys.argv[1]
    outfile = sys.argv[2]

    try:
        # 1. Patch draft_meta_info.json
        patch_draft_meta(draft_id)

        # 2. Inject blur overlay into draft_content.json (bottom 15%)
        #    This adds a native blur layer so CapCut renders it natively
        from src.utils.blur_injector import add_blur_to_draft
        draft_save_dir = os.path.join(config.DRAFT_SAVE_PATH, draft_id)
        add_blur_to_draft(draft_save_dir, blur_bottom_pct=15)

        # 3. Register in root_meta_info.json
        register_draft(draft_id)

        # 4. Restart JianyingPro v5.9
        restart_jianying()

        # 5. Export via UIAutomation (CapCut renders blur + subtitle natively)
        success = export_draft(draft_id, outfile)
        
        if success:
            print("EXIT:0")
            sys.exit(0)
        else:
            print("EXIT:1")
            sys.exit(1)

    except Exception as e:
        print(f"ERROR: {e}")
        print("EXIT:1")
        sys.exit(1)


if __name__ == "__main__":
    main()
