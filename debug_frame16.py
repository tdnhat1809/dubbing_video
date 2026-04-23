"""Debug: What does YOLO see at frame ~16 seconds?"""
import os, sys, cv2, numpy as np
os.environ["KMP_DUPLICATE_LIB_OK"] = "TRUE"

from ultralytics import YOLO

VIDEO = "1.mp4"
model = YOLO(os.path.join(os.path.dirname(os.path.abspath(__file__)), "model_last_train", "best (2).pt"))

cap = cv2.VideoCapture(VIDEO)
fps = cap.get(cv2.CAP_PROP_FPS)
fh = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
fw = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))

lines = []
lines.append(f"Video: {fw}x{fh}, FPS={fps}")
lines.append(f"Bottom 85% zone starts at y={int(fh * 0.85)}")
lines.append("")

for sec in [14.0, 14.5, 15.0, 15.5, 16.0, 16.5, 17.0, 17.5, 18.0, 18.5, 19.0]:
    fn = int(sec * fps)
    cap.set(cv2.CAP_PROP_POS_FRAMES, fn)
    ret, frame = cap.read()
    if not ret:
        continue

    results = model.predict(source=frame, show=False, save=False, verbose=False, imgsz=320, conf=0.25, device=0, half=True)
    data = results[0].boxes.data.cpu().numpy()

    lines.append(f"=== {sec:.1f}s (frame {fn}) === {len(data)} boxes")
    
    bz = fh * 0.85
    
    for i, box in enumerate(data):
        x1, y1, x2, y2, conf, cls = box.tolist()
        tag = "BOTTOM" if y2 > bz else "center"
        lines.append(f"  [{i}] y1={y1:.0f} y2={y2:.0f} conf={conf:.2f} {tag} size={x2-x1:.0f}x{y2-y1:.0f}")
    lines.append("")

cap.release()

with open("debug_yolo.txt", "w", encoding="utf-8") as f:
    f.write("\n".join(lines))
print("Saved to debug_yolo.txt")
