from __future__ import annotations

import argparse
from pathlib import Path

from ultralytics import YOLO


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Run local YOLO video inference and save annotated output."
    )
    parser.add_argument(
        "--model",
        default=r"C:\python\ommivoice\model_last_train\best (3).pt",
        help="Path to the YOLO weights file.",
    )
    parser.add_argument(
        "--source",
        default="tiktok_no_wm.mp4",
        help="Path to the input video or image.",
    )
    parser.add_argument(
        "--imgsz",
        type=int,
        default=960,
        help="Inference image size.",
    )
    parser.add_argument(
        "--conf",
        type=float,
        default=0.25,
        help="Confidence threshold.",
    )
    parser.add_argument(
        "--iou",
        type=float,
        default=0.50,
        help="IoU threshold for NMS.",
    )
    parser.add_argument(
        "--device",
        default="0",
        help="Inference device, for example 0, cpu, or 0,1.",
    )
    parser.add_argument(
        "--project",
        default="runs_local",
        help="Base output directory.",
    )
    parser.add_argument(
        "--name",
        default="epoch50_test_1mp4",
        help="Run name under the project directory.",
    )
    parser.add_argument(
        "--save-txt",
        action="store_true",
        help="Save detections as YOLO txt files.",
    )
    parser.add_argument(
        "--save-conf",
        action="store_true",
        help="Save confidences in txt output.",
    )
    parser.add_argument(
        "--line-width",
        type=int,
        default=3,
        help="Bounding-box line width.",
    )
    parser.add_argument(
        "--exist-ok",
        action="store_true",
        help="Reuse the same output directory if it already exists.",
    )
    return parser


def main() -> None:
    args = build_parser().parse_args()

    model_path = Path(args.model).expanduser().resolve()
    source_path = Path(args.source).expanduser().resolve()
    project_dir = Path(args.project).expanduser().resolve()

    if not model_path.exists():
        raise FileNotFoundError(f"Model not found: {model_path}")
    if not source_path.exists():
        raise FileNotFoundError(f"Source not found: {source_path}")

    model = YOLO(str(model_path))
    model.predict(
        source=str(source_path),
        imgsz=args.imgsz,
        conf=args.conf,
        iou=args.iou,
        device=args.device,
        save=True,
        save_txt=args.save_txt,
        save_conf=args.save_conf,
        show=False,
        line_width=args.line_width,
        project=str(project_dir),
        name=args.name,
        exist_ok=args.exist_ok,
    )

    output_path = project_dir / args.name / source_path.name
    print(f"Saved output video to: {output_path}")


if __name__ == "__main__":
    main()
