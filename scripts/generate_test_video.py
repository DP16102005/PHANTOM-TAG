"""
Synthetic Test Video Generator for Phantom-Tag

Generates a 15-second sports-like test video with:
- Moving colored rectangles (simulating players)
- Score overlay text
- Frame counter for debugging
- Saves to ./storage/originals/test_asset.mp4
"""

import os
import sys
import cv2
import numpy as np

# Output configuration
DURATION_SECONDS = 15
FPS = 30
WIDTH = 1280
HEIGHT = 720
OUTPUT_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "storage", "originals")
OUTPUT_FILE = os.path.join(OUTPUT_DIR, "test_asset.mp4")


def generate_test_video():
    """Generate a synthetic sports-like test video."""
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    total_frames = DURATION_SECONDS * FPS

    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    writer = cv2.VideoWriter(OUTPUT_FILE, fourcc, FPS, (WIDTH, HEIGHT))

    if not writer.isOpened():
        print(f"ERROR: Could not create video writer for {OUTPUT_FILE}")
        sys.exit(1)

    print(f"Generating {DURATION_SECONDS}s test video at {WIDTH}x{HEIGHT} {FPS}fps...")
    print(f"Total frames: {total_frames}")

    # Define "players" as colored rectangles with movement
    players = [
        {"color": (0, 100, 255), "x": 100, "y": 300, "vx": 3, "vy": 1, "w": 40, "h": 60, "team": "A"},
        {"color": (0, 100, 255), "x": 300, "y": 200, "vx": 2, "vy": -1, "w": 40, "h": 60, "team": "A"},
        {"color": (0, 100, 255), "x": 500, "y": 400, "vx": 1, "vy": 2, "w": 40, "h": 60, "team": "A"},
        {"color": (255, 100, 0), "x": 700, "y": 350, "vx": -2, "vy": 1, "w": 40, "h": 60, "team": "B"},
        {"color": (255, 100, 0), "x": 900, "y": 250, "vx": -3, "vy": -1, "w": 40, "h": 60, "team": "B"},
        {"color": (255, 100, 0), "x": 1100, "y": 450, "vx": -1, "vy": -2, "w": 40, "h": 60, "team": "B"},
    ]

    # Ball
    ball = {"x": 640, "y": 360, "vx": 5, "vy": 3, "r": 12}

    for frame_idx in range(total_frames):
        # Green "field" background with slight gradient
        frame = np.zeros((HEIGHT, WIDTH, 3), dtype=np.uint8)
        frame[:, :, 1] = 80  # Green base
        # Add field lines
        cv2.line(frame, (WIDTH // 2, 0), (WIDTH // 2, HEIGHT), (100, 140, 100), 2)
        cv2.circle(frame, (WIDTH // 2, HEIGHT // 2), 80, (100, 140, 100), 2)
        cv2.rectangle(frame, (0, HEIGHT // 4), (120, 3 * HEIGHT // 4), (100, 140, 100), 2)
        cv2.rectangle(frame, (WIDTH - 120, HEIGHT // 4), (WIDTH, 3 * HEIGHT // 4), (100, 140, 100), 2)

        # Move and draw players
        for p in players:
            p["x"] += p["vx"]
            p["y"] += p["vy"]
            # Bounce off edges
            if p["x"] <= 0 or p["x"] + p["w"] >= WIDTH:
                p["vx"] *= -1
            if p["y"] <= 60 or p["y"] + p["h"] >= HEIGHT - 30:
                p["vy"] *= -1
            p["x"] = max(0, min(WIDTH - p["w"], p["x"]))
            p["y"] = max(60, min(HEIGHT - p["h"] - 30, p["y"]))

            cv2.rectangle(frame,
                          (int(p["x"]), int(p["y"])),
                          (int(p["x"] + p["w"]), int(p["y"] + p["h"])),
                          p["color"], -1)
            # Jersey number
            cv2.putText(frame, p["team"], (int(p["x"] + 10), int(p["y"] + 35)),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2)

        # Move and draw ball
        ball["x"] += ball["vx"]
        ball["y"] += ball["vy"]
        if ball["x"] <= ball["r"] or ball["x"] >= WIDTH - ball["r"]:
            ball["vx"] *= -1
        if ball["y"] <= 60 + ball["r"] or ball["y"] >= HEIGHT - 30 - ball["r"]:
            ball["vy"] *= -1
        cv2.circle(frame, (int(ball["x"]), int(ball["y"])), ball["r"], (255, 255, 255), -1)

        # Score overlay bar
        cv2.rectangle(frame, (0, 0), (WIDTH, 55), (30, 30, 30), -1)
        cv2.putText(frame, "TEAM A", (20, 35),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 100, 255), 2)
        score_a = 2 if frame_idx > total_frames * 0.6 else (1 if frame_idx > total_frames * 0.3 else 0)
        score_b = 1 if frame_idx > total_frames * 0.5 else 0
        cv2.putText(frame, f"{score_a} - {score_b}", (WIDTH // 2 - 40, 38),
                    cv2.FONT_HERSHEY_SIMPLEX, 1.0, (255, 255, 255), 2)
        cv2.putText(frame, "TEAM B", (WIDTH - 170, 35),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.8, (255, 100, 0), 2)

        # Time display
        elapsed = frame_idx / FPS
        minutes = int(elapsed) // 60
        seconds = int(elapsed) % 60
        cv2.putText(frame, f"{minutes:02d}:{seconds:02d}", (WIDTH // 2 - 30, 18),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.5, (200, 200, 200), 1)

        # Frame counter (bottom, for debugging)
        cv2.rectangle(frame, (0, HEIGHT - 25), (WIDTH, HEIGHT), (20, 20, 20), -1)
        cv2.putText(frame, f"Frame {frame_idx}/{total_frames} | Phantom-Tag Test Asset",
                    (10, HEIGHT - 8), cv2.FONT_HERSHEY_SIMPLEX, 0.4, (100, 100, 100), 1)

        writer.write(frame)

        if frame_idx % (FPS * 5) == 0:
            print(f"  Frame {frame_idx}/{total_frames} ({frame_idx * 100 // total_frames}%)")

    writer.release()
    file_size = os.path.getsize(OUTPUT_FILE) / (1024 * 1024)
    print(f"\n[OK] Test video generated: {OUTPUT_FILE}")
    print(f"     Size: {file_size:.1f} MB | Duration: {DURATION_SECONDS}s | Frames: {total_frames}")


if __name__ == "__main__":
    generate_test_video()
