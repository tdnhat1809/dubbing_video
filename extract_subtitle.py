"""
Script trích xuất hardsub từ video 1.mp4
Chạy trực tiếp process_video() không cần API
"""
import os
import sys

# MUST be set before ANY paddle import to fix PIR/oneDNN error
os.environ["FLAGS_enable_pir_api"] = "0"
os.environ["FLAGS_enable_pir_in_executor"] = "0" 
os.environ["FLAGS_use_mkldnn"] = "0"
os.environ["FLAGS_enable_pir_with_pt_kernel"] = "0"

# Đảm bảo chạy từ thư mục dự án
os.chdir(os.path.dirname(os.path.abspath(__file__)))

# Import từ video_subtitle_api
from video_subtitle_api import process_video

if __name__ == "__main__":
    video_file = "1.mp4"
    
    if not os.path.exists(video_file):
        print(f"Lỗi: Không tìm thấy file {video_file}")
        sys.exit(1)
    
    print(f"=== Bắt đầu trích xuất hardsub từ {video_file} ===")
    process_video(video_file, num_workers=10)
    
    # Kiểm tra kết quả
    srt_file = "text_ocr.srt"
    if os.path.exists(srt_file):
        print(f"\n=== Kết quả đã lưu vào {srt_file} ===")
        with open(srt_file, "r", encoding="utf-8") as f:
            content = f.read()
        print(content)
    else:
        print("Không tạo được file SRT.")
