"""
Add blur overlay to the bottom 15% of the video in draft_content.json.

This creates a second video layer with the same footage, cropped to bottom 15%,
with a gaussian blur effect applied, positioned at the bottom of the canvas.
CapCut renders this natively - no FFmpeg post-processing needed.
"""
import json
import os
import uuid
import copy


def add_blur_to_draft(draft_dir: str, blur_bottom_pct: int = 15) -> bool:
    """Add a blur overlay on the bottom X% of the video in draft_content.json.
    
    Creates:
    - A duplicate video material (cropped to bottom region)
    - A blur video effect  
    - A new video segment on an empty track, referencing both
    
    Args:
        draft_dir: Path to the draft directory
        blur_bottom_pct: Percentage of video height to blur (from bottom)
        
    Returns:
        True if blur was added successfully
    """
    content_path = os.path.join(draft_dir, "draft_content.json")
    if not os.path.exists(content_path):
        print(f"WARN: draft_content.json not found in {draft_dir}")
        return False
    
    with open(content_path, 'r', encoding='utf-8') as f:
        draft = json.load(f)
    
    tracks = draft.get("tracks", [])
    materials = draft.get("materials", {})
    videos_mat = materials.get("videos", [])
    
    # 1. Find the main video segment and its material
    main_seg = None
    main_track_idx = None
    for i, track in enumerate(tracks):
        if track.get("type") == "video" and track.get("segments"):
            main_seg = track["segments"][0]
            main_track_idx = i
            break
    
    if not main_seg:
        print("WARN: No main video segment found")
        return False
    
    main_material_id = main_seg.get("material_id", "")
    main_mat = None
    for v in videos_mat:
        if v.get("id") == main_material_id:
            main_mat = v
            break
    
    if not main_mat:
        print(f"WARN: Video material {main_material_id} not found")
        return False
    
    # 2. Create blur video material (copy of main, cropped to bottom region)
    blur_mat = copy.deepcopy(main_mat)
    blur_mat_id = uuid.uuid4().hex
    blur_mat["id"] = blur_mat_id
    
    # Crop: show only the bottom X%
    top_frac = 1.0 - (blur_bottom_pct / 100.0)  # e.g., 0.85 for 15%
    blur_mat["crop"] = {
        "upper_left_x": 0.0,
        "upper_left_y": top_frac,
        "upper_right_x": 1.0,
        "upper_right_y": top_frac,
        "lower_left_x": 0.0,
        "lower_left_y": 1.0,
        "lower_right_x": 1.0,
        "lower_right_y": 1.0,
    }
    
    videos_mat.append(blur_mat)
    
    # 3. Create a blur video_effect
    blur_effect_id = uuid.uuid4().hex
    blur_effect = {
        "adjust_params": [
            {
                "default_value": 1.0,
                "id": "",
                "max_value": 1.0,
                "min_value": 0.0,
                "name": "effects_adjust_blur",
                "value": 0.75  # 75% blur intensity
            }
        ],
        "algorithm_artifact_path": "",
        "category_id": "",
        "category_name": "",
        "common_keyframes": [],
        "disable_effect_faces": [],
        "effect_id": "2452132",
        "enable_skin_auto_color": False,
        "formula_id": "",
        "id": blur_effect_id,
        "import_from": "",
        "is_user_custom": False,
        "name": "高斯模糊",
        "path": "",
        "platform": "all",
        "request_id": "",
        "resource_id": "6745599",
        "source_platform": 0,
        "title": "高斯模糊",
        "type": "video_effect",
        "value": 1.0
    }
    
    if "video_effects" not in materials:
        materials["video_effects"] = []
    materials["video_effects"].append(blur_effect)
    
    # 4. Create a speed material for the blur segment
    blur_speed_id = uuid.uuid4().hex
    blur_speed = {
        "curve_speed": None,
        "id": blur_speed_id,
        "mode": 0,
        "speed": 1.0,
        "type": "speed"
    }
    if "speeds" not in materials:
        materials["speeds"] = []
    materials["speeds"].append(blur_speed)
    
    # 5. Create the blur video segment
    blur_seg = copy.deepcopy(main_seg)
    blur_seg["material_id"] = blur_mat_id
    blur_seg["id"] = uuid.uuid4().hex
    blur_seg["extra_material_refs"] = [blur_speed_id, blur_effect_id]
    
    # Position at the bottom of canvas
    # transform y: 0 = center, fraction moves down. For bottom 15%:
    # The cropped region is 15% of height. Placed at bottom means:
    # y = 0.5 - (blur_bottom_pct / 200) = center of the cropped region at bottom
    # Actually in CapCut: y=0 is center, y=0.5 puts center of segment at bottom edge
    # For 15% height crop placed at very bottom:
    # y = (1 - blur_bottom_pct/100) / 2 = (1 - 0.15) / 2 = 0.425
    bottom_y = (1.0 - blur_bottom_pct / 100.0) / 2.0
    
    blur_seg["clip"] = {
        "alpha": 1.0,
        "flip": {"horizontal": False, "vertical": False},
        "rotation": 0.0,
        "scale": {"x": 1.0, "y": 1.0},
        "transform": {"x": 0.0, "y": bottom_y}
    }
    
    # Remove volume (don't duplicate audio)
    blur_seg["volume"] = 0.0
    
    # 6. Add blur segment to an empty video track
    # Find an empty video track, or create one ABOVE the main video track
    blur_track = None
    for i, track in enumerate(tracks):
        if track.get("type") == "video" and not track.get("segments"):
            blur_track = track
            break
    
    if blur_track:
        blur_track["segments"] = [blur_seg]
    else:
        # Create a new video track at the beginning (rendered on top)
        new_track = {
            "attribute": 0,
            "flag": 0,
            "id": uuid.uuid4().hex,
            "segments": [blur_seg],
            "type": "video"
        }
        # Insert before text track but after main video
        tracks.insert(main_track_idx, new_track)
    
    # 7. Save updated draft
    with open(content_path, 'w', encoding='utf-8') as f:
        json.dump(draft, f, ensure_ascii=False)
    
    print(f"OK: Added blur overlay ({blur_bottom_pct}% bottom) to draft")
    return True


if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1:
        add_blur_to_draft(sys.argv[1])
    else:
        # Test with latest draft
        import glob
        drafts = glob.glob(r"C:\Users\Admin\AppData\Local\JianyingPro\User Data\Projects\com.lveditor.draft\*")
        if drafts:
            drafts.sort(key=os.path.getmtime, reverse=True)
            print(f"Testing with: {drafts[0]}")
            add_blur_to_draft(drafts[0])
