"""
Phantom-Tag Video Processing Pipeline

Handles full video watermarking with audio preservation.
- Audio extracted via moviepy BEFORE OpenCV processing
- Only every Nth frame is watermarked for speed
- Audio re-attached after OpenCV loop
- 120-second max video length enforced
"""

import os
import tempfile
import time
import shutil
import cv2
import numpy as np
from moviepy import VideoFileClip

from .qim_dct import embed_watermark_frame, extract_watermark_frame
from .payload import generate_watermark_bits, bits_to_string

EMBED_EVERY_N_FRAMES = 30
FINGERPRINT_EVERY_N_FRAMES = 90
MAX_DURATION_SECONDS = 120


def watermark_video(input_path, output_path, asset_id, channel_id,
                    delta=25.0, watermark_length=80):
    """Watermark a video for a specific distribution channel."""
    start_time = time.time()
    watermark_bits = generate_watermark_bits(asset_id, channel_id, watermark_length)

    clip = VideoFileClip(input_path)
    if clip.duration > MAX_DURATION_SECONDS:
        clip.close()
        raise ValueError(f"Video too long ({clip.duration:.1f}s > {MAX_DURATION_SECONDS}s)")

    has_audio = clip.audio is not None
    cap = cv2.VideoCapture(input_path)
    if not cap.isOpened():
        clip.close()
        raise IOError(f"Cannot open: {input_path}")

    fps = cap.get(cv2.CAP_PROP_FPS)
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    temp_video = tempfile.mktemp(suffix='.mp4')
    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    writer = cv2.VideoWriter(temp_video, fourcc, fps, (width, height))

    frame_count = 0
    embedded_count = 0

    while True:
        ret, frame = cap.read()
        if not ret:
            break
        if frame_count % EMBED_EVERY_N_FRAMES == 0:
            try:
                frame = embed_watermark_frame(frame, watermark_bits, delta, asset_id)
                embedded_count += 1
            except ValueError as e:
                print(f"Warning: Skipping frame {frame_count}: {e}")
        writer.write(frame)
        frame_count += 1

    cap.release()
    writer.release()

    if has_audio:
        processed_clip = VideoFileClip(temp_video)
        final_clip = processed_clip.set_audio(clip.audio)
        final_clip.write_videofile(output_path, codec='libx264',
                                  audio_codec='aac', logger=None)
        processed_clip.close()
        final_clip.close()
    else:
        shutil.move(temp_video, output_path)

    clip.close()
    if os.path.exists(temp_video):
        os.remove(temp_video)

    return {
        "total_frames": frame_count,
        "embedded_frames": embedded_count,
        "fps": fps,
        "resolution": f"{width}x{height}",
        "duration_seconds": round(frame_count / fps, 2) if fps > 0 else 0,
        "processing_time_seconds": round(time.time() - start_time, 2),
        "watermark_bits": bits_to_string(watermark_bits),
        "delta": delta,
        "watermark_length": watermark_length,
    }


def extract_watermark_from_video(video_path, asset_id, delta=25.0,
                                  watermark_length=80, sample_count=5):
    """Extract watermark from suspect video using majority voting."""
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        raise IOError(f"Cannot open: {video_path}")

    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    wm_indices = list(range(0, total_frames, EMBED_EVERY_N_FRAMES))

    if not wm_indices:
        cap.release()
        raise ValueError("No frames to analyze")

    if len(wm_indices) > sample_count:
        step = len(wm_indices) // sample_count
        sample_indices = wm_indices[::step][:sample_count]
    else:
        sample_indices = wm_indices

    all_extracted = []
    for frame_idx in sample_indices:
        cap.set(cv2.CAP_PROP_POS_FRAMES, frame_idx)
        ret, frame = cap.read()
        if not ret:
            continue
        try:
            bits = extract_watermark_frame(frame, asset_id, delta, watermark_length)
            all_extracted.append(bits)
        except ValueError:
            continue

    cap.release()
    if not all_extracted:
        raise ValueError("Could not extract watermark from any frame")

    # Majority voting across frames
    voted_bits = []
    for bit_pos in range(watermark_length):
        votes = [fb[bit_pos] for fb in all_extracted]
        voted_bits.append(1 if sum(votes) > len(votes) / 2 else 0)

    return {
        "extracted_bits": voted_bits,
        "frames_sampled": len(all_extracted),
        "sample_frame_indices": sample_indices,
    }


def get_keyframes(video_path, interval=FINGERPRINT_EVERY_N_FRAMES):
    """Extract keyframes at regular intervals for fingerprinting."""
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        raise IOError(f"Cannot open: {video_path}")

    keyframes = []
    frame_count = 0
    while True:
        ret, frame = cap.read()
        if not ret:
            break
        if frame_count % interval == 0:
            keyframes.append(frame)
        frame_count += 1

    cap.release()
    return keyframes
