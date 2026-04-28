"""
PCA Model Fitting Script for Phantom-Tag

Generates synthetic diverse frames, extracts ResNet-50 features,
and fits a PCA model for dimensionality reduction (2048 -> 128).

Saves the model to engine/models/pca_128.joblib
Must be run ONCE before starting the engine.
"""

import os
import sys
import numpy as np

# Add engine to path
ENGINE_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "engine")
sys.path.insert(0, ENGINE_DIR)

MODEL_PATH = os.path.join(ENGINE_DIR, "models", "pca_128.joblib")


def generate_diverse_frames(count=200):
    """Generate diverse synthetic frames for PCA fitting."""
    print(f"Generating {count} diverse synthetic frames...")
    frames = []
    rng = np.random.default_rng(42)

    for i in range(count):
        # Create varied frames: gradients, patterns, random scenes
        frame = np.zeros((224, 224, 3), dtype=np.uint8)

        if i % 4 == 0:
            # Random color blocks
            for _ in range(rng.integers(3, 12)):
                x, y = rng.integers(0, 180, 2)
                w, h = rng.integers(20, 80, 2)
                color = rng.integers(0, 256, 3).tolist()
                frame[y:y+h, x:x+w] = color
        elif i % 4 == 1:
            # Gradient
            for c in range(3):
                base = rng.integers(0, 200)
                frame[:, :, c] = np.linspace(base, 255, 224).reshape(1, -1).astype(np.uint8)
        elif i % 4 == 2:
            # Circles and lines
            import cv2
            bg = rng.integers(0, 100, 3).tolist()
            frame[:] = bg
            for _ in range(rng.integers(5, 20)):
                center = tuple(rng.integers(0, 224, 2).tolist())
                radius = int(rng.integers(10, 60))
                color = rng.integers(100, 256, 3).tolist()
                cv2.circle(frame, center, radius, color, -1)
        else:
            # Random noise with structure
            base = rng.integers(0, 100, (224, 224, 3), dtype=np.uint8)
            frame = base + rng.integers(0, 50, (224, 224, 3), dtype=np.uint8)

        # Random augmentation
        if rng.random() > 0.5:
            frame = np.fliplr(frame)
        if rng.random() > 0.5:
            brightness = rng.integers(-30, 30)
            frame = np.clip(frame.astype(np.int16) + brightness, 0, 255).astype(np.uint8)

        frames.append(frame)

        if (i + 1) % 50 == 0:
            print(f"  Generated {i + 1}/{count} frames")

    return frames


def main():
    print("=" * 50)
    print("  Phantom-Tag PCA Model Fitting")
    print("=" * 50)

    # Generate diverse frames
    frames = generate_diverse_frames(200)

    # Extract features using ResNet-50
    print("\nExtracting ResNet-50 features (this may take a minute)...")
    from fingerprint.cnn_hash import extract_raw_features

    features = []
    for i, frame in enumerate(frames):
        feat = extract_raw_features(frame)
        features.append(feat)
        if (i + 1) % 50 == 0:
            print(f"  Extracted {i + 1}/{len(frames)} features")

    feature_matrix = np.stack(features)
    print(f"\nFeature matrix shape: {feature_matrix.shape}")

    # Fit PCA
    print("Fitting PCA (2048 -> 128 dimensions)...")
    from fingerprint.pca_model import fit_pca_model, save_pca_model

    pca = fit_pca_model(feature_matrix, n_components=128)
    explained = sum(pca.explained_variance_ratio_) * 100
    print(f"Explained variance: {explained:.1f}%")

    # Save model
    save_pca_model(pca, MODEL_PATH)
    model_size = os.path.getsize(MODEL_PATH) / 1024
    print(f"\n[OK] PCA model saved: {MODEL_PATH}")
    print(f"     Size: {model_size:.1f} KB")
    print(f"     Components: {pca.n_components_}")


if __name__ == "__main__":
    main()
