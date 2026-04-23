from src.utils.logger import logger
import config
import src.pyJianYingDraft as draft
from src.utils.draft_cache import update_cache
from exceptions import CustomException, CustomError
import datetime
import uuid
import os
import json
import time
import shutil


def _register_draft_in_root_meta(draft_id: str, draft_path: str) -> None:
    """Register a new draft in root_meta_info.json so 剪映 can see it on the home page.
    
    Without this, 剪映 v8.9+ will not show the draft in its UI, causing
    JianyingController.find_and_click_draft() to fail with DraftNotFound.
    """
    try:
        root_meta_path = os.path.join(config.DRAFT_SAVE_PATH, "root_meta_info.json")
        if not os.path.exists(root_meta_path):
            logger.warning(f"root_meta_info.json not found at {root_meta_path}, skipping registration")
            return

        with open(root_meta_path, 'r', encoding='utf-8') as f:
            root_meta = json.load(f)

        # Build draft entry matching 剪映's expected format
        now_us = int(time.time() * 1_000_000)
        draft_fold_path = draft_path.replace('\\', '/')
        
        new_entry = {
            "draft_cloud_capcut_purchase_info": "",
            "draft_cloud_purchase_info": "",
            "draft_cloud_template_id": "",
            "draft_cloud_tutorial_info": "",
            "draft_cloud_videocut_purchase_info": "",
            "draft_enterprise_info": {
                "draft_enterprise_extra": "",
                "draft_enterprise_id": "",
                "draft_enterprise_name": "",
                "enterprise_material_obfuscate_info": []
            },
            "draft_fold_path": draft_fold_path,
            "draft_id": draft_id,
            "draft_is_ai_packaging_used": False,
            "draft_is_article_video_draft": False,
            "draft_is_from_deeplink": "",
            "draft_is_invisible": False,
            "draft_materials_copied": False,
            "draft_materials_video_cnt": 0,
            "draft_name": draft_id,
            "draft_new_version": "",
            "draft_origin_draft_id": "",
            "draft_removable_storage_device": "",
            "draft_root_path": config.DRAFT_SAVE_PATH.replace('\\', '/'),
            "draft_segment_extra_info": "",
            "draft_timeline_materials_size_": 0,
            "draft_type": "",
            "tm_draft_create": now_us,
            "tm_draft_modified": now_us,
            "tm_duration": 0
        }

        # Add to all_draft_store (at beginning = most recent)
        all_drafts = root_meta.get('all_draft_store', [])
        # Remove existing entry with same id if any
        all_drafts = [d for d in all_drafts if d.get('draft_id') != draft_id]
        all_drafts.insert(0, new_entry)
        root_meta['all_draft_store'] = all_drafts

        # Also update draft_ids list if it's actually a list
        draft_ids = root_meta.get('draft_ids')
        if isinstance(draft_ids, list):
            if draft_id not in draft_ids:
                draft_ids.insert(0, draft_id)
                root_meta['draft_ids'] = draft_ids

        with open(root_meta_path, 'w', encoding='utf-8') as f:
            json.dump(root_meta, f, ensure_ascii=False, indent=2)

        logger.info(f"Registered draft {draft_id} in root_meta_info.json (total: {len(all_drafts)})")
    except Exception as e:
        logger.warning(f"Failed to register draft in root_meta_info.json: {e}")


def create_draft(width: int, height: int) -> str:
    """
    基于模板创建剪映草稿的业务逻辑
    
    Args:
        width: 草稿宽度
        height: 草稿高度
    
    Returns:
        draft_url: 草稿URL

    Raises:
        CustomException: 草稿创建失败
    """
    # 生成一个草稿ID
    timestamp = datetime.datetime.now().strftime("%Y%m%d%H%M%S")
    unique_id = uuid.uuid4().hex[:8]
    draft_id = f"{timestamp}{unique_id}"
    logger.info(f"draft_id: {draft_id}, width: {width}, height: {height}")

    # 使用模板创建草稿
    try:
        # 复制模板到新草稿目录
        template_path = os.path.join(config.TEMPLATE_DIR, "default2")
        draft_path = os.path.join(config.DRAFT_DIR, draft_id)
        if os.path.exists(draft_path): shutil.rmtree(draft_path)
        shutil.copytree(template_path, draft_path)
        
        # 在创建草稿时，确保两个文件都存在且内容相同
        draft_info_path = os.path.join(draft_path, "draft_info.json")
        draft_content_path = os.path.join(draft_path, "draft_content.json")
        
        # 加载模板草稿，然后修改配置
        script = draft.ScriptFile.load_template(draft_info_path)
        # 启用双文件兼容模式，这样保存时会自动同步两个文件
        script.dual_file_compatibility = True
        script.width, script.height = width, height
        script.content["canvas_config"]["width"], script.content["canvas_config"]["height"] = width, height
        
        # 保存修改后的草稿（会自动同步到两个文件）
        script.save_path = draft_content_path
        script.save()
        
        # 添加空的主轨道（仅当没有主轨道时添加）
        main_track_name = "main_track"
        script.add_track(track_type=draft.TrackType.video, track_name=main_track_name, relative_index=0)
        logger.info(f"Added empty main track: {main_track_name}")
        
        script.save()
        
        # Note: root_meta_info.json registration moved to video_task_manager
        # after draft is copied to DRAFT_SAVE_PATH (剪映 folder)
        
    except Exception as e:
        logger.error(f"create draft failed: {e}")
        raise CustomException(CustomError.DRAFT_CREATE_FAILED)

    # 缓存草稿并返回URL
    update_cache(draft_id, script)
    logger.info(f"create draft success: {draft_id}")
    return config.DRAFT_URL + "?draft_id=" + draft_id