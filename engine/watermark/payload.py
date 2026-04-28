"""
Phantom-Tag Watermark Payload Generator

Generates unique binary sequences for each asset+channel combination.
Uses SHA-256 for deterministic, collision-resistant bit generation.

Each distribution channel gets a unique 80-bit watermark payload
derived from the combination of asset_id and channel_id.
"""

import hashlib


def generate_watermark_bits(asset_id: int, channel_id: int, length: int = 80) -> list[int]:
    """
    Generates a unique binary sequence for a specific asset+channel combination.

    The payload is deterministic: same (asset_id, channel_id) always produces
    the same bit sequence. Different channel_ids for the same asset produce
    entirely different sequences (avalanche property of SHA-256).

    Args:
        asset_id: Unique identifier for the media asset
        channel_id: Unique identifier for the distribution channel
        length: Number of bits in the watermark payload (default 80).
                80 bits provides enough entropy for matching while being
                embeddable in a standard 1080p frame.

    Returns:
        List of integers (0 or 1) of the specified length
    """
    seed_string = f"{asset_id}:{channel_id}"
    hash_bytes = hashlib.sha256(seed_string.encode()).digest()

    bits = []
    for byte in hash_bytes:
        for i in range(8):
            bits.append((byte >> i) & 1)
        if len(bits) >= length:
            break

    return bits[:length]


def bits_to_hex(bits: list[int]) -> str:
    """Convert a bit array to a hex string for storage/display."""
    byte_chunks = [bits[i:i + 8] for i in range(0, len(bits), 8)]
    hex_str = ""
    for chunk in byte_chunks:
        byte_val = 0
        for i, bit in enumerate(chunk):
            byte_val |= (bit << i)
        hex_str += f"{byte_val:02x}"
    return hex_str


def hex_to_bits(hex_str: str, length: int = 80) -> list[int]:
    """Convert a hex string back to a bit array."""
    bits = []
    for i in range(0, len(hex_str), 2):
        byte_val = int(hex_str[i:i + 2], 16)
        for j in range(8):
            bits.append((byte_val >> j) & 1)
    return bits[:length]


def bits_to_string(bits: list[int]) -> str:
    """Convert a bit array to a binary string (e.g., '10110100...')."""
    return "".join(str(b) for b in bits)


def string_to_bits(s: str) -> list[int]:
    """Convert a binary string back to a bit array."""
    return [int(c) for c in s]
