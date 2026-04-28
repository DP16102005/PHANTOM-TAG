"""
Phantom-Tag CNN Perceptual Hash

ResNet-50 feature extraction → PCA to 128-dim → sign binarization → 128-bit hash.
Robust to color grading, mild compression, and minor cropping.

Corrected from Gemini: ResNet-50 outputs 2048-dim, NOT 256-bit.
PCA reduction + binarization is non-negotiable.
"""

import numpy as np
import torch
import torchvision.models as models
import torchvision.transforms as transforms

# ImageNet normalization constants
TRANSFORM = transforms.Compose([
    transforms.ToPILImage(),
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406],
                         std=[0.229, 0.224, 0.225])
])

# Lazy-loaded model singleton
_feature_extractor = None


def _get_feature_extractor():
    """Load ResNet-50 with final classification layer removed (lazy singleton)."""
    global _feature_extractor
    if _feature_extractor is None:
        resnet = models.resnet50(weights='IMAGENET1K_V2')
        _feature_extractor = torch.nn.Sequential(*list(resnet.children())[:-1])
        _feature_extractor.eval()
    return _feature_extractor


def extract_raw_features(frame: np.ndarray) -> np.ndarray:
    """Extract 2048-dim feature vector from a frame using ResNet-50."""
    import cv2
    # Convert BGR (OpenCV) to RGB for PyTorch
    rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    tensor = TRANSFORM(rgb_frame).unsqueeze(0)  # [1, 3, 224, 224]

    extractor = _get_feature_extractor()
    with torch.no_grad():
        features = extractor(tensor)  # [1, 2048, 1, 1]

    return features.squeeze().numpy()  # [2048]


def extract_fingerprint(frame: np.ndarray, pca_model) -> np.ndarray:
    """
    Generate a 128-bit perceptual hash from a video frame.

    Pipeline: frame → ResNet-50 → 2048-dim → PCA → 128-dim → binarize → 128-bit

    Args:
        frame: BGR numpy array
        pca_model: Pre-fitted sklearn PCA model (n_components=128)

    Returns:
        128-element binary numpy array (uint8, values 0 or 1)
    """
    features = extract_raw_features(frame)
    reduced = pca_model.transform(features.reshape(1, -1))  # [1, 128]
    binary_hash = (reduced[0] > 0).astype(np.uint8)
    return binary_hash


def extract_video_fingerprint(video_path: str, pca_model,
                               interval: int = 90) -> np.ndarray:
    """
    Generate a representative fingerprint for a video.
    Averages fingerprints across keyframes for stability.
    """
    import cv2
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        raise IOError(f"Cannot open: {video_path}")

    fingerprints = []
    frame_count = 0

    while True:
        ret, frame = cap.read()
        if not ret:
            break
        if frame_count % interval == 0:
            fp = extract_fingerprint(frame, pca_model)
            fingerprints.append(fp)
        frame_count += 1

    cap.release()

    if not fingerprints:
        raise ValueError("No keyframes found")

    # Average fingerprint (majority vote per bit across keyframes)
    stacked = np.stack(fingerprints)
    avg = stacked.mean(axis=0)
    return (avg > 0.5).astype(np.uint8)


def fingerprint_to_string(fp: np.ndarray) -> str:
    """Convert 128-bit fingerprint to binary string for Firestore storage."""
    return "".join(str(b) for b in fp)


def string_to_fingerprint(s: str) -> np.ndarray:
    """Convert stored binary string back to fingerprint array."""
    return np.array([int(c) for c in s], dtype=np.uint8)


def fingerprint_hamming_distance(fp_a: np.ndarray, fp_b: np.ndarray) -> int:
    """Hamming distance between two 128-bit fingerprints."""
    return int(np.sum(fp_a != fp_b))
