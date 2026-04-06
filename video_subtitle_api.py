# Import necessary libraries
from flask import Flask, request, jsonify, send_file
import os
import tempfile
import shutil
from werkzeug.utils import secure_filename
import threading
import uuid
from datetime import datetime
import logging
from pyngrok import ngrok
import json
import subprocess
import sys
import signal
from concurrent.futures import ThreadPoolExecutor
import time
import base64
import requests
import json
import os
from pathlib import Path
import random   
import re
import time
from ultralytics import YOLO
import cv2
import numpy as np
from rapidfuzz import fuzz
from concurrent.futures import ThreadPoolExecutor, as_completed
import os
import re
import time
import requests
import re
import json
import shutil
import torch
from mistralai import Mistral
import base64
import mimetypes
import google.generativeai as genai
from google.generativeai.types import HarmCategory, HarmBlockThreshold
import os

# Use RapidOCR (ONNX) instead of PaddleOCR to avoid ConvertPirAttribute2RuntimeAttribute crash
import onnxruntime as ort
from rapidocr_onnxruntime import RapidOCR
import threading
import queue
from collections import OrderedDict

def init_rapidocr():
    """Initialize RapidOCR with CUDA GPU acceleration if available."""
    providers = ort.get_available_providers()
    print(f"  ONNX providers: {providers}")
    use_cuda = 'CUDAExecutionProvider' in providers
    if use_cuda:
        engine = RapidOCR(
            det_use_cuda=True,
            rec_use_cuda=True,
            cls_use_cuda=True,
        )
        print("RapidOCR engine initialized (CUDA GPU)")
    else:
        engine = RapidOCR()
        print("RapidOCR engine initialized (CPU fallback)")
    return engine


def rapidocr_recognize(engine, image):
    """Run RapidOCR on image (numpy array or file path). Returns extracted text."""
    try:
        result, _ = engine(image)
        if result is None:
            return ""
        texts = [item[1] for item in result if item[2] > 0.5]
        if not texts:
            return ""
        return "".join(texts)
    except Exception as e:
        print(f"  OCR error: {e}")
        return ""



def load_image(image_path):
    mime_type, _ = mimetypes.guess_type(image_path)
    with open(image_path, "rb") as image_file:
        image_data = image_file.read()
    base64_encoded = base64.b64encode(image_data).decode('utf-8')
    base64_url = f"data:{mime_type};base64,{base64_encoded}"
    return base64_url

# Xóa và tạo lại thư mục
def clean_and_create_dir(dir_path):
    if os.path.exists(dir_path):
        shutil.rmtree(dir_path)
    os.makedirs(dir_path)
    print(f'Đã xóa tất cả tệp và thư mục trong "{dir_path}".')

clean_and_create_dir('crop_subtitle')
clean_and_create_dir('output_process')

os.environ["KMP_DUPLICATE_LIB_OK"]="TRUE"
model = YOLO(os.path.join(os.path.dirname(os.path.abspath(__file__)), "best.pt"))

def frame_to_timecode(frame_number, fps, frame_skip=1):
    total_seconds = frame_number / fps
    hours = int(total_seconds // 3600)
    minutes = int((total_seconds % 3600) // 60)
    seconds = int(total_seconds % 60)
    milliseconds = int((total_seconds - int(total_seconds)) * 1000)
    return f'{hours:02}:{minutes:02}:{seconds:02},{milliseconds:03}'

def is_text_different(text1, text2, threshold=25):
    similarity = fuzz.partial_ratio(text1, text2)
    difference = 100 - similarity
    return difference >= threshold

def is_subtitle_region_changed(prev_crop, curr_crop, threshold=0.92):
    """So sánh 2 crop subtitle bằng template matching.
    Trả về True nếu vùng subtitle thay đổi đáng kể."""
    if prev_crop is None or curr_crop is None:
        return True
    if prev_crop.shape != curr_crop.shape:
        return True
    # So sánh nhanh bằng pixel difference
    gray1 = cv2.cvtColor(prev_crop, cv2.COLOR_BGR2GRAY)
    gray2 = cv2.cvtColor(curr_crop, cv2.COLOR_BGR2GRAY)
    try:
        score = cv2.matchTemplate(gray1, gray2, cv2.TM_CCOEFF_NORMED)[0][0]
        return score < threshold
    except Exception:
        return True

def process_frame(frame_number, frame, fps, frame_width, frame_height, ocr_manager, pending_ocr_tasks):
    """Xử lý frame và gửi OCR task"""
    results = model.predict(show=False, source=frame, save=True)
    data = results[0].boxes.data.cpu().numpy()

    if len(data) > 0:
        lower_half_boxes = [
            box for box in data 
            if ((box[1] + box[3]) / 2) > (frame_height / 4 * 3)
        ]

        if len(lower_half_boxes) > 0: 
            best_box = max(lower_half_boxes, key=lambda box: box[4])
            x1, y1, x2, y2, conf, cls = best_box.tolist()
            
            if (y2 - y1) > 10:
                if len(lower_half_boxes) >= 1:
                    lower_half_boxes_sorted = sorted(lower_half_boxes, key=lambda box: box[4], reverse=True)
                    if len(lower_half_boxes_sorted) > 1:
                        best_box = lower_half_boxes_sorted[1]
                        x1, y1, x2, y2, conf, cls = best_box.tolist()
                        
                        if (y2 - y1) < 10:
                            if len(lower_half_boxes_sorted) > 2:
                                best_box = lower_half_boxes_sorted[2]
                                x1, y1, x2, y2, conf, cls = best_box.tolist()
                            else:
                                x1, y1, x2, y2 = 0, ((frame_height / 4)*3) - 30, frame_width, frame_height
                else:
                    x1, y1, x2, y2 = 0, ((frame_height / 4)*3) - 30, frame_width, frame_height
            

            x1, y1, x2, y2 = max(x1 - 10, 0), max(y1 - 10, 0), min(x2 + 10, frame_width), min(y2 + 10, frame_height)
            
            # Tạo thư mục nếu chưa tồn tại
            for folder_path in ["output_process", "crop_subtitle"]:
                if not os.path.exists(folder_path):
                    os.makedirs(folder_path)

            if conf:
                cv2.rectangle(frame, (int(x1), int(y1)), (int(x2), int(y2)), (0, 255, 0), 2)
                cv2.putText(frame, f'{int(cls)} {conf:.2f}', (int(x1), int(y1) - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.9, (0, 255, 0), 2)

                cropped_region = frame[int(y1):int(y2), int(x1):int(x2)]
                new_start_time = frame_to_timecode(frame_number, fps, frame_skip=1)
                new_end_time = frame_to_timecode(frame_number + 1, fps, frame_skip=1)
                
                temp_file = f'crop_subtitle/{frame_number}_{random.randint(10000,999999)}.jpg'
                cv2.imwrite(temp_file, cropped_region)
                
                # Xử lý ảnh để cải thiện OCR
                # image = cv2.imread(temp_file)
                # gray_image = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
                # _, thresh_image = cv2.threshold(gray_image, 240, 255, cv2.THRESH_BINARY)
                # thresh_image = cv2.bitwise_and(thresh_image, gray_image)
                # kernel = np.ones((3,3), np.uint8)
                # dilated_image = cv2.dilate(thresh_image, kernel, iterations=1)
                # eroded_image = cv2.erode(dilated_image, kernel, iterations=1)
                # colored_image = cv2.cvtColor(eroded_image, cv2.COLOR_GRAY2BGR)
                # enhanced_image = cv2.convertScaleAbs(image, alpha=1.5, beta=0)
                # combined_image = cv2.bitwise_and(enhanced_image, colored_image)

                # output_path = f'output_process/{frame_number}_{random.randint(10000,999999)}.jpg'
                # cv2.imwrite(output_path, combined_image)
                
                # Gửi OCR task
                task_id = f"{frame_number}_{random.randint(1000,9999)}"
                ocr_manager.process_image(task_id, temp_file, frame_number)
                pending_ocr_tasks[task_id] = {
                    'frame_number': frame_number,
                    'frame': frame,
                    'cropped_region': cropped_region,
                    'start_time': new_start_time,
                    'end_time': new_end_time,
                    'temp_file': temp_file
                }
                
                return frame_number, frame, cropped_region, None, new_start_time, new_end_time, task_id
    
    return frame_number, frame, None, None, None, None, None

def process_video(video_path, num_workers=10):
    """Optimized video subtitle extraction using RapidOCR.
    - RapidOCR (ONNX) replaces PaddleOCR (no more PIR/oneDNN crash)
    - Frame differencing (skip OCR if subtitle unchanged)
    - YOLO save=False (no disk writes per frame)
    - OCR directly from numpy array
    """
    import time as _time
    wall_start = _time.time()
    
    file_path = 'text_ocr.srt'
    if os.path.exists(file_path):
        os.remove(file_path)
        print(f"File {file_path} đã bị xóa.")
    
    # === RapidOCR (ONNX) - no PaddlePaddle dependency ===
    print("Initializing RapidOCR engine...")
    ocr_engine = init_rapidocr()
    print("OCR engine ready.")
    
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        print(f"Error: Không thể mở video {video_path}")
        return

    frame_width = int(cap.get(3))
    frame_height = int(cap.get(4))
    fps = int(cap.get(cv2.CAP_PROP_FPS))
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    
    # === Adaptive frame skip: subtitle thường hiện >= 1s ===
    frame_skip = max(fps // 2, 10)
    
    print(f"Total frames: {total_frames}, FPS: {fps}, Frame skip: {frame_skip}")
    print(f"Estimated frames to process: ~{total_frames // frame_skip}")
    
    frame_number = 0
    current_text = ""
    start_time_srt = ""
    end_time_srt = ""
    sub_index = 1
    prev_crop = None  # For frame differencing
    ocr_call_count = 0
    frames_processed = 0
    skipped_by_diff = 0
    
    try:
        while frame_number < total_frames:
            cap.set(cv2.CAP_PROP_POS_FRAMES, frame_number)
            ret, frame = cap.read()
            
            if not ret:
                break
            
            frames_processed += 1
            
            # === YOLO detect (no save, no verbose) ===
            results = model.predict(show=False, source=frame, save=False, verbose=False)
            data = results[0].boxes.data.cpu().numpy()
            
            new_start = frame_to_timecode(frame_number, fps)
            new_end = frame_to_timecode(frame_number + frame_skip, fps)
            
            if len(data) > 0:
                # Filter boxes in lower half of frame (subtitle region)
                lower_half_boxes = [
                    box for box in data 
                    if ((box[1] + box[3]) / 2) > (frame_height * 0.5)
                ]
                
                if len(lower_half_boxes) > 0:
                    # Sort by area (width*height) descending - subtitle is widest box
                    lower_half_boxes_sorted = sorted(
                        lower_half_boxes, 
                        key=lambda b: (b[2]-b[0]) * (b[3]-b[1]), 
                        reverse=True
                    )
                    best_box = lower_half_boxes_sorted[0]
                    x1, y1, x2, y2, conf, cls = best_box.tolist()
                    
                    # Add padding
                    x1 = max(int(x1) - 10, 0)
                    y1 = max(int(y1) - 10, 0)
                    x2 = min(int(x2) + 10, frame_width)
                    y2 = min(int(y2) + 10, frame_height)
                    
                    if (y2 - y1) > 5 and (x2 - x1) > 10 and conf:
                        cropped_region = frame[y1:y2, x1:x2]
                        
                        # === Frame differencing: skip OCR if subtitle unchanged ===
                        if not is_subtitle_region_changed(prev_crop, cropped_region):
                            skipped_by_diff += 1
                            if current_text:
                                end_time_srt = new_end
                            frame_number += frame_skip
                            continue
                        
                        prev_crop = cropped_region.copy()
                        
                        # === RapidOCR directly from numpy array ===
                        ocr_call_count += 1
                        raw_text = rapidocr_recognize(ocr_engine, cropped_region)
                        
                        # Clean text
                        newtext = ""
                        if raw_text:
                            newtext = raw_text.replace('\n', '').replace('\r', '')
                            newtext = re.sub(r"[^\u4e00-\u9fa5\s?!'_0-9一——\-，。？！；：a-zA-Z]", '', newtext)
                            newtext = re.sub(r'^\s*●|●\s*$', '', newtext)
                            newtext = newtext.strip()
                            if not re.search(r"[^\d\s]", newtext):
                                newtext = ""
                            if len(newtext) < 2:
                                newtext = ""
                        
                        if newtext:
                            if is_text_different(newtext, current_text):
                                # Save previous subtitle
                                if current_text and start_time_srt and end_time_srt:
                                    with open("text_ocr.srt", "a", encoding="utf-8") as f:
                                        f.write(f"{sub_index}\n{start_time_srt} --> {end_time_srt}\n{current_text}\n\n")
                                        sub_index += 1
                                
                                current_text = newtext
                                start_time_srt = new_start
                                end_time_srt = new_end
                                print(f"  [{sub_index}] {new_start} NEW: {current_text}")
                            else:
                                end_time_srt = new_end
                        else:
                            # OCR returned empty - subtitle may have ended
                            if current_text and start_time_srt and end_time_srt:
                                with open("text_ocr.srt", "a", encoding="utf-8") as f:
                                    f.write(f"{sub_index}\n{start_time_srt} --> {end_time_srt}\n{current_text}\n\n")
                                    sub_index += 1
                                current_text = ""
                                start_time_srt = ""
                                end_time_srt = ""
                    else:
                        if frames_processed % 20 == 0:
                            print(f"  Frame {frame_number}/{total_frames} - Small/low conf box")
                else:
                    if frames_processed % 20 == 0:
                        print(f"  Frame {frame_number}/{total_frames} - No subtitle box")
            else:
                # No detection - subtitle may have disappeared
                if current_text and start_time_srt and end_time_srt:
                    with open("text_ocr.srt", "a", encoding="utf-8") as f:
                        f.write(f"{sub_index}\n{start_time_srt} --> {end_time_srt}\n{current_text}\n\n")
                        sub_index += 1
                    current_text = ""
                    start_time_srt = ""
                    end_time_srt = ""
                    prev_crop = None
                if frames_processed % 20 == 0:
                    print(f"  Frame {frame_number}/{total_frames} - No detection")
            
            frame_number += frame_skip
        
        # Save last subtitle
        if current_text and start_time_srt and end_time_srt:
            with open("text_ocr.srt", "a", encoding="utf-8") as f:
                f.write(f"{sub_index}\n{start_time_srt} --> {end_time_srt}\n{current_text}\n\n")
    
    finally:
        cap.release()
        elapsed = _time.time() - wall_start
        print(f"\n{'='*50}")
        print(f"=== Video processing completed! ===")
        print(f"Total time: {elapsed:.1f}s ({elapsed/60:.1f} min)")
        print(f"Frames processed: {frames_processed}")
        print(f"OCR calls: {ocr_call_count}")
        print(f"Skipped by frame diff: {skipped_by_diff}")
        print(f"Subtitles found: {sub_index - 1}")
        print(f"{'='*50}")



# Configure ngrok auth token (get from https://dashboard.ngrok.com/get-started/your-authtoken)
NGROK_AUTH_TOKEN = "2Bs6mIwdU0lAWoAlsMJ3Ld2KQmQ_2CEcrMYRSMZWCRMNmRy8u"  # Replace with your token

app = Flask(__name__)
app.config['MAX_CONTENT_LENGTH'] = 500 * 1024 * 1024  # 500MB max file size

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Allowed video extensions
ALLOWED_EXTENSIONS = {'mp4', 'avi', 'mov', 'mkv', 'flv', 'wmv', 'webm'}

# Store processing status
processing_status = {}
translation_status = {}

# Thread pool for background tasks
executor = ThreadPoolExecutor(max_workers=4)

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def translate_srt_subprocess(srt_path, target_language="VIETNAMESE", gemini_api_key="AIzaSyDcnY9Cw_rROruzo6V56iEsasP4K_k86ZI"):
    """
    Translate SRT file using subprocess to avoid signal issues
    """
    try:
        # Create a temporary Python script to run the translation
        temp_script = f"""
import sys
import os
sys.path.append(os.getcwd())

try:
    import gemini_srt_translator as gst
    
    # Set up gemini translator
    gst.gemini_api_key = "{gemini_api_key}"
    gst.target_language = "{target_language}"
    gst.input_file = "{srt_path}"
    gst.skip_upgrade = True
    gst.streaming = False
    gst.quiet = True
    gst.progress_log = False
    
    # Translate
    gst.translate()
    print("Translation completed successfully")
    
except Exception as e:
    print(f"Translation error: {{str(e)}}")
    sys.exit(1)
"""
        
        # Write temporary script
        temp_script_path = f"temp_translate_{uuid.uuid4().hex}.py"
        with open(temp_script_path, 'w') as f:
            f.write(temp_script)
        
        # Run translation in subprocess
        result = subprocess.run([sys.executable, temp_script_path], 
                              capture_output=True, text=True, timeout=300)
        
        # Clean up temporary script
        if os.path.exists(temp_script_path):
            os.remove(temp_script_path)
        
        if result.returncode == 0:
            return True, "Translation completed successfully"
        else:
            return False, f"Translation failed: {result.stderr}"
            
    except subprocess.TimeoutExpired:
        return False, "Translation timeout after 5 minutes"
    except Exception as e:
        return False, f"Translation error: {str(e)}"

def background_process_video(task_id, video_path, num_workers=10):
    """Background function to process video"""
    try:
        processing_status[task_id] = {
            'status': 'processing',
            'progress': 0,
            'message': 'Processing video...',
            'start_time': datetime.now().isoformat()
        }
        
        # Process the video
        process_video(video_path, num_workers)
        
        # Check if SRT file was created
        if os.path.exists('text_ocr.srt'):
            processing_status[task_id] = {
                'status': 'completed',
                'progress': 100,
                'message': 'Video processing completed successfully',
                'srt_file': 'text_ocr.srt',
                'end_time': datetime.now().isoformat()
            }
        else:
            processing_status[task_id] = {
                'status': 'error',
                'progress': 0,
                'message': 'SRT file was not generated',
                'end_time': datetime.now().isoformat()
            }
            
    except Exception as e:
        processing_status[task_id] = {
            'status': 'error',
            'progress': 0,
            'message': f'Error processing video: {str(e)}',
            'end_time': datetime.now().isoformat()
        }
    finally:
        # Clean up temporary video file
        if os.path.exists(video_path):
            os.remove(video_path)

def background_translate_srt(task_id, srt_path, target_language="VIETNAMESE", gemini_api_key="AIzaSyDcnY9Cw_rROruzo6V56iEsasP4K_k86ZI"):
    """Background function to translate SRT file using subprocess"""
    try:
        translation_status[task_id] = {
            'status': 'translating',
            'progress': 0,
            'message': 'Translating SRT file...',
            'start_time': datetime.now().isoformat()
        }
        
        # Use subprocess to translate
        success, message = translate_srt_subprocess(srt_path, target_language, gemini_api_key)
        
        if success:
            # Check for translated file
            possible_translated_files = [
                srt_path.replace('.srt', '_translated.srt'),
                srt_path.replace('.srt', f'_{target_language.lower()}.srt'),
                srt_path  # In case original file is modified
            ]
            
            translated_file = None
            for file_path in possible_translated_files:
                if os.path.exists(file_path):
                    translated_file = file_path
                    break
            
            if translated_file:
                translation_status[task_id] = {
                    'status': 'completed',
                    'progress': 100,
                    'message': 'Translation completed successfully',
                    'translated_file': translated_file,
                    'original_file': srt_path,
                    'target_language': target_language,
                    'end_time': datetime.now().isoformat()
                }
            else:
                translation_status[task_id] = {
                    'status': 'error',
                    'progress': 0,
                    'message': 'Translation completed but output file not found',
                    'end_time': datetime.now().isoformat()
                }
        else:
            translation_status[task_id] = {
                'status': 'error',
                'progress': 0,
                'message': message,
                'end_time': datetime.now().isoformat()
            }
            
    except Exception as e:
        translation_status[task_id] = {
            'status': 'error',
            'progress': 0,
            'message': f'Error translating SRT: {str(e)}',
            'end_time': datetime.now().isoformat()
        }


@app.route('/', methods=['GET'])
def home():
    """Home endpoint"""
    return jsonify({
        'message': 'Video Subtitle Extraction and Translation API',
        'version': '2.0.0',
        'endpoints': {
            'health': '/health',
            'process_video': '/process-video',
            'translate_srt': '/translate-srt',
            'translate_default_srt': '/translate-default-srt',
            'status': '/status/<task_id>',
            'translation_status': '/translation-status/<task_id>',
            'download': '/download/<task_id>',
            'download_translated': '/download-translated/<task_id>',
            'tasks': '/tasks'
        }
    })

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy', 
        'message': 'Video subtitle extraction and translation API is running',
        'timestamp': datetime.now().isoformat(),
        'features': {
            'video_processing': True,
            'gemini_translation': True,
            'google_translate': True
        }
    })

@app.route('/process-video', methods=['POST'])
def process_video_endpoint():
    """Process video file and extract subtitles"""
    try:
        # Check if video file is present
        if 'video' not in request.files:
            return jsonify({'error': 'No video file provided'}), 400
        
        video_file = request.files['video']
        
        # Check if file is selected
        if video_file.filename == '':
            return jsonify({'error': 'No video file selected'}), 400
        
        # Check if file type is allowed
        if not allowed_file(video_file.filename):
            return jsonify({'error': f'Invalid file type. Allowed types: {", ".join(ALLOWED_EXTENSIONS)}'}), 400
        
        # Get number of workers (optional parameter)
        num_workers = request.form.get('num_workers', 5)
        try:
            num_workers = int(num_workers)
            if num_workers <= 0 or num_workers > 10:
                num_workers = 5
        except ValueError:
            num_workers = 5
        
        # Generate unique task ID
        task_id = str(uuid.uuid4())
        
        # Create temporary file for the video
        temp_dir = tempfile.mkdtemp()
        filename = secure_filename(video_file.filename)
        temp_video_path = os.path.join(temp_dir, filename)
        
        # Save uploaded video
        video_file.save(temp_video_path)
        
        # Initialize directories
        clean_and_create_dir('crop_subtitle')
        clean_and_create_dir('output_process')
        
        # Start background processing using ThreadPoolExecutor
        future = executor.submit(background_process_video, task_id, temp_video_path, num_workers)
        
        return jsonify({
            'task_id': task_id,
            'status': 'started',
            'message': 'Video processing started',
            'num_workers': num_workers
        }), 202
        
    except Exception as e:
        logger.error(f"Error in process_video_endpoint: {str(e)}")
        return jsonify({'error': f'Server error: {str(e)}'}), 500

@app.route('/translate-srt', methods=['POST'])
def translate_srt_endpoint():
    """Translate SRT file to target language using Gemini"""
    try:
        # Check if SRT file is provided
        if 'srt_file' not in request.files and 'srt_path' not in request.form:
            return jsonify({'error': 'No SRT file provided. Use either file upload or file path'}), 400
        
        # Get target language and API key
        target_language = request.form.get('target_language', 'VIETNAMESE')
        gemini_api_key = request.form.get('gemini_api_key', 'AIzaSyDcnY9Cw_rROruzo6V56iEsasP4K_k86ZI')
        
        # Generate unique task ID
        task_id = str(uuid.uuid4())
        
        # Handle file upload or file path
        if 'srt_file' in request.files:
            srt_file = request.files['srt_file']
            
            if srt_file.filename == '':
                return jsonify({'error': 'No SRT file selected'}), 400
            
            if not srt_file.filename.lower().endswith('.srt'):
                return jsonify({'error': 'File must have .srt extension'}), 400
            
            # Save uploaded SRT file
            temp_dir = tempfile.mkdtemp()
            filename = secure_filename(srt_file.filename)
            srt_path = os.path.join(temp_dir, filename)
            srt_file.save(srt_path)
            
        else:
            # Use provided file path
            srt_path = request.form.get('srt_path')
            
            if not os.path.exists(srt_path):
                return jsonify({'error': 'SRT file not found at provided path'}), 400
            
            if not srt_path.lower().endswith('.srt'):
                return jsonify({'error': 'File must have .srt extension'}), 400
        
        # Start background translation using ThreadPoolExecutor
        future = executor.submit(background_translate_srt, task_id, srt_path, target_language, gemini_api_key)
        
        return jsonify({
            'task_id': task_id,
            'status': 'started',
            'message': 'SRT translation started with Gemini',
            'target_language': target_language,
            'srt_path': srt_path
        }), 202
        
    except Exception as e:
        logger.error(f"Error in translate_srt_endpoint: {str(e)}")
        return jsonify({'error': f'Server error: {str(e)}'}), 500

@app.route('/translate-simple', methods=['POST'])

@app.route('/translate-default-srt', methods=['POST'])
def translate_default_srt_endpoint():
    """Translate the default text_ocr.srt file"""
    try:
        # Check if default SRT file exists
        default_srt_path = 'text_ocr.srt'
        if not os.path.exists(default_srt_path):
            return jsonify({'error': 'Default SRT file (text_ocr.srt) not found. Please process a video first.'}), 404
        
        # Get target language and translation method
        target_language = request.form.get('target_language', 'VIETNAMESE')
        method = request.form.get('method', 'gemini')  # 'gemini' or 'google'
        gemini_api_key = request.form.get('gemini_api_key', 'AIzaSyDcnY9Cw_rROruzo6V56iEsasP4K_k86ZI')
        
        # Generate unique task ID
        task_id = str(uuid.uuid4())
        
      
        future = executor.submit(background_translate_srt, task_id, default_srt_path, target_language, gemini_api_key)
        message = 'Default SRT translation started with Gemini'
    
        return jsonify({
            'task_id': task_id,
            'status': 'started',
            'message': message,
            'target_language': target_language,
            'method': method,
            'srt_path': default_srt_path
        }), 202
        
    except Exception as e:
        logger.error(f"Error in translate_default_srt_endpoint: {str(e)}")
        return jsonify({'error': f'Server error: {str(e)}'}), 500

@app.route('/status/<task_id>', methods=['GET'])
def get_processing_status(task_id):
    """Get processing status for a task"""
    if task_id not in processing_status:
        return jsonify({'error': 'Task not found'}), 404
    
    return jsonify(processing_status[task_id])

@app.route('/translation-status/<task_id>', methods=['GET'])
def get_translation_status(task_id):
    """Get translation status for a task"""
    if task_id not in translation_status:
        return jsonify({'error': 'Translation task not found'}), 404
    
    return jsonify(translation_status[task_id])

@app.route('/download/<task_id>', methods=['GET'])
def download_srt_file(task_id):
    """Download the generated SRT file"""
    if task_id not in processing_status:
        return jsonify({'error': 'Task not found'}), 404
    
    task_info = processing_status[task_id]
    
    if task_info['status'] != 'completed':
        return jsonify({'error': 'Task not completed yet'}), 400
    
    srt_file_path = task_info.get('srt_file', 'text_ocr.srt')
    
    if not os.path.exists(srt_file_path):
        return jsonify({'error': 'SRT file not found'}), 404
    
    try:
        return send_file(
            srt_file_path,
            as_attachment=True,
            download_name=f'subtitles_{task_id}.srt',
            mimetype='text/plain'
        )
    except Exception as e:
        logger.error(f"Error downloading file: {str(e)}")
        return jsonify({'error': 'Error downloading file'}), 500

@app.route('/download-translated/<task_id>', methods=['GET'])
def download_translated_srt_file(task_id):
    """Download the translated SRT file"""
    if task_id not in translation_status:
        return jsonify({'error': 'Translation task not found'}), 404
    
    task_info = translation_status[task_id]
    
    if task_info['status'] != 'completed':
        return jsonify({'error': 'Translation not completed yet'}), 400
    
    translated_file_path = task_info.get('translated_file')
    
    if not translated_file_path or not os.path.exists(translated_file_path):
        return jsonify({'error': 'Translated SRT file not found'}), 404
    
    try:
        return send_file(
            translated_file_path,
            as_attachment=True,
            download_name=f'subtitles_translated_{task_id}.srt',
            mimetype='text/plain'
        )
    except Exception as e:
        logger.error(f"Error downloading translated file: {str(e)}")
        return jsonify({'error': 'Error downloading translated file'}), 500

@app.route('/tasks', methods=['GET'])
def list_tasks():
    """List all processing tasks"""
    return jsonify({
        'processing_tasks': [
            {
                'task_id': task_id,
                'status': info['status'],
                'message': info['message'],
                'start_time': info.get('start_time'),
                'end_time': info.get('end_time')
            }
            for task_id, info in processing_status.items()
        ],
        'translation_tasks': [
            {
                'task_id': task_id,
                'status': info['status'],
                'message': info['message'],
                'target_language': info.get('target_language'),
                'start_time': info.get('start_time'),
                'end_time': info.get('end_time')
            }
            for task_id, info in translation_status.items()
        ]
    })

def setup_ngrok(port=8000):
    """Setup ngrok for public access"""
    try:
        # Set ngrok auth token
        ngrok.set_auth_token(NGROK_AUTH_TOKEN)
        
        # Create tunnel
        public_url = ngrok.connect(port)
        
        # Extract the actual URL string
        url_str = str(public_url).split('"')[1] if '"' in str(public_url) else str(public_url)
        
        print(f"🌐 Public URL: {url_str}")
        print(f"🔗 API Health Check: {url_str}/health")
        print(f"📤 Upload Video: {url_str}/process-video")
        print(f"🌍 Translate SRT (Gemini): {url_str}/translate-srt")
        print(f"🌍 Translate SRT (Google): {url_str}/translate-simple")
        print(f"🌍 Translate Default SRT: {url_str}/translate-default-srt")
        
        return url_str
    except Exception as e:
        print(f"❌ Error setting up ngrok: {e}")
        print("Please check your ngrok auth token")
        return None

def test_api_with_curl_examples(public_url):
    """Generate curl examples for testing"""
    print("\n📝 Test your API with these curl commands:")
    print("\n1. Health Check:")
    print(f'curl "{public_url}/health"')
    
    print("\n2. Upload Video:")
    print(f'curl -X POST -F "video=@your_video.mp4" -F "num_workers=5" "{public_url}/process-video"')
    
    print("\n3. Translate SRT file (Gemini):")
    print(f'curl -X POST -F "srt_file=@your_subtitles.srt" -F "target_language=VIETNAMESE" "{public_url}/translate-srt"')
    
    print("\n4. Translate SRT file (Google Translate):")
    print(f'curl -X POST -F "srt_file=@your_subtitles.srt" -F "target_language=VIETNAMESE" "{public_url}/translate-simple"')
    
    print("\n5. Translate default SRT file (Gemini):")
    print(f'curl -X POST -F "target_language=VIETNAMESE" -F "method=gemini" "{public_url}/translate-default-srt"')
    
    print("\n6. Translate default SRT file (Google):")
    print(f'curl -X POST -F "target_language=VIETNAMESE" -F "method=google" "{public_url}/translate-default-srt"')
    
    print("\n7. Check Processing Status:")
    print(f'curl "{public_url}/status/TASK_ID"')
    
    print("\n8. Check Translation Status:")
    print(f'curl "{public_url}/translation-status/TASK_ID"')

def run_api():
    """Run the Flask API"""
    try:
        # Create necessary directories
        os.makedirs('crop_subtitle', exist_ok=True)
        os.makedirs('output_process', exist_ok=True)
        
        print("🚀 Starting Video Subtitle Extraction and Translation API v2.0...")
        print("✨ New Features:")
        print("   - Fixed signal threading issues")
        print("   - Added Google Translate as backup")
        print("   - Improved error handling")
        print("   - Better subprocess management")
        
        # Use consistent port
        port = 8000
        
        # Setup ngrok tunnel
        public_url = setup_ngrok(port)
        
        if public_url:
            print("✅ API is now publicly accessible!")
            print(f"📖 API Documentation:")
            print(f"   - Health Check: GET {public_url}/health")
            print(f"   - Process Video: POST {public_url}/process-video")
            print(f"   - Translate SRT (Gemini): POST {public_url}/translate-srt")
            print(f"   - Translate SRT (Google): POST {public_url}/translate-simple")
            print(f"   - Translate Default SRT: POST {public_url}/translate-default-srt")
            print(f"   - Check Processing Status: GET {public_url}/status/<task_id>")
            print(f"   - Check Translation Status: GET {public_url}/translation-status/<task_id>")
            print(f"   - Download SRT: GET {public_url}/download/<task_id>")
            print(f"   - Download Translated SRT: GET {public_url}/download-translated/<task_id>")
            print(f"   - List Tasks: GET {public_url}/tasks")
            
            # Generate test commands
            test_api_with_curl_examples(public_url)
        
        # Run Flask app
        app.run(host='0.0.0.0', port=port, debug=False)
        
    except Exception as e:
        print(f"❌ Error running API: {e}")
    finally:
        # Cleanup
        executor.shutdown(wait=True)

if __name__ == '__main__':
    # Instructions for setup
    print("🔧 Setup Instructions:")
    print("1. Make sure you have installed: pip install googletrans==4.0.0-rc1")
    print("2. Your ngrok auth token is already set")
    print("3. Make sure your test.py and gemini_srt_translator.py files are in the same directory")
    print("4. Run this script to start the API")
    print("\n" + "="*50)
    
    run_api()