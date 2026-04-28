"""
PCA Model Utilities for Perceptual Fingerprinting.

The PCA model reduces ResNet-50's 2048-dim features to 128-dim
before binarization. Must be pre-fitted offline — NEVER at request time.
"""

import os
import numpy as np
import joblib
from sklearn.decomposition import PCA

DEFAULT_MODEL_PATH = os.path.join(
    os.path.dirname(os.path.dirname(__file__)), "models", "pca_128.joblib"
)


def fit_pca_model(feature_vectors: np.ndarray, n_components: int = 128) -> PCA:
    """
    Fit a PCA model on a corpus of ResNet-50 feature vectors.

    Args:
        feature_vectors: Array of shape [N, 2048] from ResNet-50
        n_components: Target dimensionality (default 128)

    Returns:
        Fitted PCA model
    """
    pca = PCA(n_components=n_components)
    pca.fit(feature_vectors)
    return pca


def save_pca_model(pca_model: PCA, path: str = DEFAULT_MODEL_PATH):
    """Save fitted PCA model to disk."""
    os.makedirs(os.path.dirname(path), exist_ok=True)
    joblib.dump(pca_model, path)


def load_pca_model(path: str = DEFAULT_MODEL_PATH) -> PCA:
    """Load pre-fitted PCA model from disk."""
    if not os.path.exists(path):
        raise FileNotFoundError(
            f"PCA model not found at {path}. "
            f"Run scripts/fit_pca_model.py to generate it."
        )
    return joblib.load(path)
