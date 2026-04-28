"""
Phantom-Tag QIM-DCT Blind Watermarking Engine

Implements Quantization Index Modulation (QIM) in the DCT domain for
robust, blind watermark embedding and extraction.

Based on:
- Cox et al., 1997: Spread-spectrum watermarking in perceptually significant components
- Chen & Wornell, 2001: QIM for blind extraction without original signal
- Mid-frequency DCT coefficients survive H.264/H.265 transcoding

Key properties:
- Blind extraction: No original video needed for watermark recovery
- Transcoding robust: Embedded in mid-frequency DCT coefficients
- Per-channel: Each distribution channel gets unique embedded ID
- Imperceptible: Modifications in luminance (Y) channel only
"""

import cv2
import numpy as np

# Mid-frequency DCT coefficient positions in an 8x8 block.
# These survive both perceptual masking AND codec quantization.
# Low-frequency (top-left): visible distortion if modified
# High-frequency (bottom-right): destroyed by H.264/H.265 codecs
# Mid-frequency: the sweet spot for robust watermarking
TARGET_POSITIONS = [(2, 4), (3, 3), (4, 2)]

BLOCK_SIZE = 8


def embed_bit(coeff: float, bit: int, delta: float) -> float:
    """
    Embed a single bit into a DCT coefficient using QIM.

    QIM encodes a binary payload by quantizing coefficients to alternating
    quantization cells:
    - bit=1 → quantize to nearest ODD multiple of delta
    - bit=0 → quantize to nearest EVEN multiple of delta

    During extraction, the quantization index parity reveals the embedded bit
    WITHOUT needing the original coefficient value (blind extraction).

    Args:
        coeff: The DCT coefficient value to modify
        bit: The bit to embed (0 or 1)
        delta: Quantization step size. Larger = more robust but more visible.
               Default 25 is a good balance for 1080p content.

    Returns:
        The modified coefficient value
    """
    quantization_index = np.round(coeff / delta)

    if bit == 1:
        # Push to ODD quantization index
        if int(quantization_index) % 2 == 0:
            # Currently even — move to nearest odd
            if coeff >= quantization_index * delta:
                quantized = (quantization_index + 1) * delta
            else:
                quantized = (quantization_index - 1) * delta
        else:
            # Already odd — just quantize
            quantized = quantization_index * delta
    else:
        # Push to EVEN quantization index
        if int(quantization_index) % 2 != 0:
            # Currently odd — move to nearest even
            if coeff >= quantization_index * delta:
                quantized = (quantization_index + 1) * delta
            else:
                quantized = (quantization_index - 1) * delta
        else:
            # Already even — just quantize
            quantized = quantization_index * delta

    return float(quantized)


def extract_bit(coeff: float, delta: float) -> int:
    """
    Extract a single bit from a DCT coefficient using QIM.

    This is the BLIND extraction step — no original signal required.
    The quantization index parity directly reveals the embedded bit:
    - Odd index → bit was 1
    - Even index → bit was 0

    Args:
        coeff: The DCT coefficient to read
        delta: Same quantization step used during embedding

    Returns:
        The extracted bit (0 or 1)
    """
    quantization_index = int(np.round(coeff / delta))
    if quantization_index % 2 != 0:
        return 1
    else:
        return 0


def embed_watermark_frame(
    frame: np.ndarray,
    watermark_bits: list[int],
    delta: float = 25.0,
    asset_id: int = 0
) -> np.ndarray:
    """
    Embed a watermark into a single video frame using QIM-DCT.

    Pipeline:
    1. Convert BGR → YUV (embed in Y/luminance channel only)
    2. Decompose Y channel into 8x8 blocks (matches JPEG/H.264 block structure)
    3. Select target blocks using PRNG seeded with asset_id (secret key)
    4. Apply 2D-DCT to each target block
    5. Embed one watermark bit per block in mid-frequency coefficient
    6. Apply inverse DCT
    7. Reconstruct frame

    Args:
        frame: Input frame as numpy array (BGR, shape HxWx3)
        watermark_bits: Binary array of watermark payload
        delta: QIM quantization step (default 25)
        asset_id: Integer seed for PRNG block selection (per-asset key)

    Returns:
        Watermarked frame as numpy array (BGR, same shape as input)
    """
    # Step 1: Color space conversion — embed in Y (luminance) only
    # Human vision is less sensitive to luminance changes than color changes
    yuv_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2YUV)
    Y, U, V = cv2.split(yuv_frame)
    Y = Y.astype(np.float32)

    h, w = Y.shape

    # Step 2: 8x8 block decomposition
    blocks = []
    positions = []
    for row in range(0, h - BLOCK_SIZE + 1, BLOCK_SIZE):
        for col in range(0, w - BLOCK_SIZE + 1, BLOCK_SIZE):
            blocks.append(Y[row:row + BLOCK_SIZE, col:col + BLOCK_SIZE].copy())
            positions.append((row, col))

    if len(blocks) < len(watermark_bits):
        raise ValueError(
            f"Frame too small: {len(blocks)} blocks available, "
            f"but {len(watermark_bits)} needed for watermark. "
            f"Minimum resolution needed: ~{int(np.sqrt(len(watermark_bits))) * 8}x"
            f"{int(np.sqrt(len(watermark_bits))) * 8}"
        )

    # Step 3: Select target blocks using deterministic PRNG
    # Same asset_id seed MUST be used during extraction
    rng = np.random.default_rng(seed=asset_id)
    target_indices = rng.choice(len(blocks), size=len(watermark_bits), replace=False)

    # Steps 4-5: DCT transform + QIM embedding for each target block
    for i, bit in enumerate(watermark_bits):
        block_idx = target_indices[i]
        row, col = positions[block_idx]
        block = Y[row:row + BLOCK_SIZE, col:col + BLOCK_SIZE].copy()

        # Apply 2D Discrete Cosine Transform
        dct_block = cv2.dct(block)

        # Embed bit in primary mid-frequency position
        r, c = TARGET_POSITIONS[0]
        dct_block[r, c] = embed_bit(dct_block[r, c], bit, delta)

        # Inverse DCT to reconstruct spatial domain
        idct_block = cv2.idct(dct_block)

        # Write back to Y channel
        Y[row:row + BLOCK_SIZE, col:col + BLOCK_SIZE] = idct_block

    # Step 6: Reconstruct frame
    # np.floor(Y + 0.5) is round-half-up — more consistent than banker's rounding
    # This reduces bit flip rate from ~15% to ~5% (Roadblock 4 mitigation)
    Y_uint8 = np.floor(Y + 0.5).clip(0, 255).astype(np.uint8)
    watermarked_yuv = cv2.merge([Y_uint8, U, V])
    watermarked_bgr = cv2.cvtColor(watermarked_yuv, cv2.COLOR_YUV2BGR)

    return watermarked_bgr


def extract_watermark_frame(
    suspect_frame: np.ndarray,
    asset_id: int,
    delta: float = 25.0,
    watermark_length: int = 80
) -> list[int]:
    """
    Extract watermark bits from a suspect frame using blind QIM extraction.

    This is the key innovation: NO original video is needed.
    The PRNG seed (asset_id) selects the same blocks used during embedding.
    The quantization index parity of each coefficient reveals the embedded bit.

    Args:
        suspect_frame: Frame to analyze (BGR numpy array)
        asset_id: The asset ID to test against (used as PRNG seed)
        delta: Same quantization step used during embedding
        watermark_length: Number of bits to extract

    Returns:
        List of extracted bits (0s and 1s)
    """
    yuv_frame = cv2.cvtColor(suspect_frame, cv2.COLOR_BGR2YUV)
    Y, _, _ = cv2.split(yuv_frame)
    Y = Y.astype(np.float32)

    h, w = Y.shape

    # Reconstruct block grid (same as embedding)
    blocks = []
    positions = []
    for row in range(0, h - BLOCK_SIZE + 1, BLOCK_SIZE):
        for col in range(0, w - BLOCK_SIZE + 1, BLOCK_SIZE):
            blocks.append(Y[row:row + BLOCK_SIZE, col:col + BLOCK_SIZE].copy())
            positions.append((row, col))

    if len(blocks) < watermark_length:
        raise ValueError(
            f"Frame too small for extraction: {len(blocks)} blocks, "
            f"need {watermark_length}"
        )

    # CRITICAL: Use SAME seed as embedding to get SAME block selection
    rng = np.random.default_rng(seed=asset_id)
    target_indices = rng.choice(len(blocks), size=watermark_length, replace=False)

    # Extract bits from the same mid-frequency positions
    extracted_bits = []
    for idx in target_indices:
        block = blocks[idx].copy()
        dct_block = cv2.dct(block)
        r, c = TARGET_POSITIONS[0]
        bit = extract_bit(dct_block[r, c], delta)
        extracted_bits.append(bit)

    return extracted_bits


def hamming_distance(bits_a: list[int], bits_b: list[int]) -> int:
    """
    Compute Hamming distance between two bit arrays.

    Hamming distance = number of positions where the bits differ.
    Used for both watermark matching and fingerprint matching.

    A threshold of 15% of watermark length (12 bits for 80-bit watermark)
    provides high sensitivity with very low false positive rate.
    Compression typically flips 5-12% of bits.

    Args:
        bits_a: First bit array
        bits_b: Second bit array (must be same length)

    Returns:
        Number of differing bits
    """
    if len(bits_a) != len(bits_b):
        raise ValueError(
            f"Bit arrays must be same length: {len(bits_a)} vs {len(bits_b)}"
        )
    return sum(a != b for a, b in zip(bits_a, bits_b))


def match_confidence(distance: int, total_bits: int) -> float:
    """
    Convert Hamming distance to a confidence score (0.0 to 1.0).

    confidence = 1.0 - (distance / total_bits)
    - 1.0 = perfect match (distance 0)
    - 0.85 = strong match (15% bits flipped, threshold boundary)
    - 0.5 = random noise (50% bits differ = coin flip)

    Args:
        distance: Hamming distance
        total_bits: Total number of bits in the watermark

    Returns:
        Confidence score between 0.0 and 1.0
    """
    return 1.0 - (distance / total_bits)
