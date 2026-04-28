"""
Phantom-Tag Flask Engine API

Endpoints:
  POST /forge  — Watermark video with N channel variants
  POST /scout  — Analyze suspect video, extract watermark, match fingerprint
  GET  /health — Health check

Runs on port 5001 locally, Cloud Run in production.
"""

import os
import sys
import time
import hashlib
import tempfile
import traceback
from flask import Flask, request, jsonify
from flask_cors import CORS

# Add engine root to path
sys.path.insert(0, os.path.dirname(__file__))

from watermark.qim_dct import hamming_distance, match_confidence
from watermark.payload import generate_watermark_bits, bits_to_string, string_to_bits
from watermark.video import watermark_video, extract_watermark_from_video, get_keyframes
from storage.local_store import get_path, save_file, ensure_directories, file_exists

app = Flask(__name__)
CORS(app, origins=["http://localhost:5173", "http://localhost:3000"])

# PCA model loaded at startup (not per-request)
pca_model = None


def get_pca_model():
    """Lazy-load PCA model."""
    global pca_model
    if pca_model is None:
        try:
            from fingerprint.pca_model import load_pca_model
            pca_model = load_pca_model()
            print("[ENGINE] PCA model loaded successfully")
        except FileNotFoundError:
            print("[ENGINE] WARNING: PCA model not found. Run scripts/fit_pca_model.py first.")
            print("[ENGINE] Fingerprinting will be disabled until PCA model is available.")
    return pca_model


def compute_file_hash(filepath):
    """Compute SHA-256 hash of a file for evidence."""
    sha256 = hashlib.sha256()
    with open(filepath, "rb") as f:
        for chunk in iter(lambda: f.read(8192), b""):
            sha256.update(chunk)
    return f"sha256:{sha256.hexdigest()[:16]}"


@app.route("/health", methods=["GET"])
def health():
    """Health check endpoint."""
    pca = get_pca_model()
    return jsonify({
        "status": "healthy",
        "service": "phantom-tag-engine",
        "pca_model_loaded": pca is not None,
        "timestamp": time.time(),
    })


@app.route("/forge", methods=["POST"])
def forge():
    """
    THE FORGE — Watermark a video with N distribution-channel variants.

    Expects JSON body:
    {
        "input_path": "path/to/input.mp4" or uploaded via multipart,
        "asset_id": 1001,
        "channels": [
            {"channel_id": 1, "channel_name": "Official YouTube"},
            {"channel_id": 2, "channel_name": "Broadcast Partner ESPN"}
        ],
        "delta": 25
    }
    """
    try:
        ensure_directories()

        # Handle file upload or path reference
        if "video" in request.files:
            video_file = request.files["video"]
            temp_input = tempfile.mktemp(suffix=".mp4")
            video_file.save(temp_input)
            input_path = temp_input
        else:
            data = request.get_json()
            input_path = data.get("input_path", "")

        # Parse parameters
        if request.content_type and "multipart" in request.content_type:
            asset_id = int(request.form.get("asset_id", 1001))
            delta = float(request.form.get("delta", 25.0))
            import json
            channels = json.loads(request.form.get("channels", "[]"))
        else:
            data = request.get_json()
            asset_id = data.get("asset_id", 1001)
            delta = data.get("delta", 25.0)
            channels = data.get("channels", [])

        if not channels:
            return jsonify({"error": "No channels provided"}), 400

        if not os.path.exists(input_path):
            return jsonify({"error": f"Input file not found: {input_path}"}), 404

        # Save original to storage
        original_filename = f"asset_{asset_id}.mp4"
        save_file(input_path, "originals", original_filename)

        # Generate fingerprint if PCA model available
        fingerprint_hash = None
        pca = get_pca_model()
        if pca is not None:
            try:
                from fingerprint.cnn_hash import (
                    extract_video_fingerprint, fingerprint_to_string
                )
                fp = extract_video_fingerprint(input_path, pca)
                fingerprint_hash = fingerprint_to_string(fp)
            except Exception as e:
                print(f"[ENGINE] Fingerprint extraction failed: {e}")

        # Process each channel variant
        channel_results = []
        total_start = time.time()

        for ch in channels:
            ch_id = ch["channel_id"]
            ch_name = ch["channel_name"]
            output_filename = f"asset_{asset_id}_ch{ch_id}.mp4"
            output_path = get_path("watermarked", output_filename)

            print(f"[FORGE] Processing channel {ch_id}: {ch_name}")
            result = watermark_video(
                input_path, output_path, asset_id, ch_id, delta
            )

            wm_bits = generate_watermark_bits(asset_id, ch_id)

            channel_results.append({
                "channel_id": ch_id,
                "channel_name": ch_name,
                "output_path": output_path,
                "watermark_bits_hash": hashlib.sha256(
                    bits_to_string(wm_bits).encode()
                ).hexdigest()[:12],
                "watermark_bits": bits_to_string(wm_bits),
                "fingerprint_hash": fingerprint_hash,
                **result,
            })

        total_time = round(time.time() - total_start, 2)

        # Clean up temp file if uploaded
        if "video" in request.files and os.path.exists(temp_input):
            os.remove(temp_input)

        return jsonify({
            "status": "success",
            "asset_id": asset_id,
            "variants_created": len(channel_results),
            "channels": channel_results,
            "processing_time_seconds": total_time,
            "evidence_hash": compute_file_hash(
                get_path("originals", original_filename)
            ),
        })

    except Exception as e:
        traceback.print_exc()
        return jsonify({"status": "error", "error": str(e)}), 500


@app.route("/scout", methods=["POST"])
def scout():
    """
    THE SCOUT — Analyze a suspect video for watermark extraction + matching.

    Expects JSON body or multipart upload:
    {
        "suspect_path": "path/to/suspect.mp4",
        "test_asset_ids": [1001, 1002],
        "channels_map": {
            "1001": [
                {"channel_id": 1, "watermark_bits": "10110..."},
                {"channel_id": 2, "watermark_bits": "01101..."}
            ]
        },
        "delta": 25,
        "watermark_length": 80
    }
    """
    try:
        ensure_directories()

        # Handle file upload
        if "video" in request.files:
            video_file = request.files["video"]
            temp_suspect = tempfile.mktemp(suffix=".mp4")
            video_file.save(temp_suspect)
            suspect_path = temp_suspect
        else:
            data = request.get_json()
            suspect_path = data.get("suspect_path", "")

        # Parse parameters
        if request.content_type and "multipart" in request.content_type:
            import json
            test_asset_ids = json.loads(request.form.get("test_asset_ids", "[]"))
            channels_map = json.loads(request.form.get("channels_map", "{}"))
            delta = float(request.form.get("delta", 25.0))
            watermark_length = int(request.form.get("watermark_length", 80))
        else:
            data = request.get_json()
            test_asset_ids = data.get("test_asset_ids", [])
            channels_map = data.get("channels_map", {})
            delta = data.get("delta", 25.0)
            watermark_length = data.get("watermark_length", 80)

        if not os.path.exists(suspect_path):
            return jsonify({"error": "Suspect file not found"}), 404

        # Save suspect to storage
        suspect_filename = f"suspect_{int(time.time())}.mp4"
        save_file(suspect_path, "suspects", suspect_filename)

        # Generate fingerprint for suspect
        suspect_fingerprint = None
        pca = get_pca_model()
        if pca is not None:
            try:
                from fingerprint.cnn_hash import (
                    extract_video_fingerprint, fingerprint_to_string
                )
                fp = extract_video_fingerprint(suspect_path, pca)
                suspect_fingerprint = fingerprint_to_string(fp)
            except Exception as e:
                print(f"[ENGINE] Fingerprint extraction failed: {e}")

        best_match = None
        best_distance = float("inf")

        # Test against each asset
        for asset_id in test_asset_ids:
            asset_id_str = str(asset_id)
            asset_channels = channels_map.get(asset_id_str, [])

            try:
                extraction = extract_watermark_from_video(
                    suspect_path, int(asset_id), delta, watermark_length
                )
                extracted_bits = extraction["extracted_bits"]
            except Exception as e:
                print(f"[SCOUT] Extraction failed for asset {asset_id}: {e}")
                continue

            # Compare against each channel's stored watermark
            for ch in asset_channels:
                stored_bits = string_to_bits(ch["watermark_bits"])
                dist = hamming_distance(extracted_bits, stored_bits)
                confidence = match_confidence(dist, watermark_length)

                if dist < best_distance:
                    best_distance = dist
                    best_match = {
                        "matched_asset_id": int(asset_id),
                        "matched_channel_id": ch["channel_id"],
                        "matched_channel_name": ch.get("channel_name", "Unknown"),
                        "watermark_hamming_distance": dist,
                        "confidence": round(confidence, 4),
                        "frames_sampled": extraction["frames_sampled"],
                    }

        # Clean up temp file
        if "video" in request.files and os.path.exists(temp_suspect):
            os.remove(temp_suspect)

        # Determine match threshold (15% of watermark length)
        threshold = int(watermark_length * 0.15)

        if best_match and best_distance <= threshold:
            return jsonify({
                "status": "match_found",
                **best_match,
                "suspect_fingerprint": suspect_fingerprint,
                "suspect_file": suspect_filename,
                "evidence_hash": compute_file_hash(
                    get_path("suspects", suspect_filename)
                ),
                "interpretation": (
                    f"This content was leaked from the "
                    f"{best_match['matched_channel_name']} distribution copy."
                ),
            })
        elif best_match:
            return jsonify({
                "status": "no_match",
                "closest_match": best_match,
                "threshold": threshold,
                "message": "No confident match found. Closest result below threshold.",
            })
        else:
            return jsonify({
                "status": "no_match",
                "message": "Could not extract or match watermark from suspect video.",
            })

    except Exception as e:
        traceback.print_exc()
        return jsonify({"status": "error", "error": str(e)}), 500


if __name__ == "__main__":
    print("[ENGINE] Starting Phantom-Tag Engine on port 5001...")
    get_pca_model()  # Pre-load at startup
    app.run(host="0.0.0.0", port=5001, debug=True)
