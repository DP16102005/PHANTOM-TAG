"""
Local Filesystem Storage Adapter

Replaces Google Cloud Storage for local development.
Maintains GCS-compatible API patterns for easy migration.
"""

import os
import shutil

# Base storage directory (project root /storage/)
STORAGE_ROOT = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "storage"
)

BUCKETS = {
    "originals": os.path.join(STORAGE_ROOT, "originals"),
    "watermarked": os.path.join(STORAGE_ROOT, "watermarked"),
    "suspects": os.path.join(STORAGE_ROOT, "suspects"),
    "dmca_pdfs": os.path.join(STORAGE_ROOT, "dmca_pdfs"),
}


def ensure_directories():
    """Create all storage directories if they don't exist."""
    for path in BUCKETS.values():
        os.makedirs(path, exist_ok=True)


def get_path(bucket: str, filename: str) -> str:
    """Get absolute path for a file in a storage bucket."""
    if bucket not in BUCKETS:
        raise ValueError(f"Unknown bucket: {bucket}. Options: {list(BUCKETS.keys())}")
    return os.path.join(BUCKETS[bucket], filename)


def save_file(source_path: str, bucket: str, filename: str) -> str:
    """Copy a file to a storage bucket. Returns the destination path."""
    ensure_directories()
    dest = get_path(bucket, filename)
    shutil.copy2(source_path, dest)
    return dest


def file_exists(bucket: str, filename: str) -> bool:
    """Check if a file exists in a storage bucket."""
    return os.path.exists(get_path(bucket, filename))


def list_files(bucket: str) -> list[str]:
    """List all files in a storage bucket."""
    path = BUCKETS.get(bucket, "")
    if not os.path.exists(path):
        return []
    return [f for f in os.listdir(path) if os.path.isfile(os.path.join(path, f))]


def get_storage_root() -> str:
    """Get the root storage directory path."""
    return STORAGE_ROOT
