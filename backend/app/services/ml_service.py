"""
ML Service — wasteClassify.keras integration.

Model metadata (from wasteClassify.keras archive):
  - Saved with  : Keras 3.13.2
  - Input shape : (None, 224, 224, 3)  — RGB, uint8-range
  - Output shape: (None, 5)            — softmax probabilities
  - Preprocessing: Rescaling(1/255) is BUILT INTO the model graph.
                   DO NOT normalise the image before passing it in.
  - Architecture: Augmentation → Rescaling → MobileNet-style backbone
                  → GlobalAveragePooling2D → Dense(128, relu)
                  → Dropout(0.3) → Dense(5, softmax)

Keras 3.12 / 3.13 compat fix:
  Dense gained a `quantization_config` kwarg in 3.13.
  Since PyPI only ships Keras 3.12.x for Python 3.10 we patch
  Dense.from_config to silently drop unknown kwargs before loading.
"""

from __future__ import annotations

import io
import logging
import os
from typing import Any, Dict, List, Optional

import numpy as np
from PIL import Image

logger = logging.getLogger(__name__)

# ──────────────────────────────────────────────────────────────────────────────
# Class labels (5-class waste classification model)
# Order matches the model's output neuron indices.
# ──────────────────────────────────────────────────────────────────────────────
CLASS_LABELS: List[str] = [
    "cardboard",
    "glass",
    "metal",
    "paper",
    "plastic",
]

RECYCLABLE: Dict[str, bool] = {
    "cardboard": True,
    "glass":     True,
    "metal":     True,
    "paper":     True,
    "plastic":   True,
}

DISPOSAL_INSTRUCTIONS: Dict[str, str] = {
    "cardboard": (
        "Flatten and place in the paper/cardboard recycling bin. "
        "Remove any tape or staples first."
    ),
    "glass": (
        "Rinse clean and place in the glass recycling bin. "
        "Do not mix with ceramics or broken glass — drop those at a recycling centre."
    ),
    "metal": (
        "Rinse tins and cans, then place in the metal recycling bin. "
        "Aluminium foil can also be recycled when clean."
    ),
    "paper": (
        "Bundle dry, uncontaminated paper and place in the paper recycling bin. "
        "Shredded paper is best composted or bagged separately."
    ),
    "plastic": (
        "Check the recycling symbol (1–7) on the item. "
        "Rinse, remove lids if instructed locally, and place in the plastics bin."
    ),
}

RECYCLING_IDEAS: Dict[str, List[str]] = {
    "cardboard": [
        "Reuse boxes for storage or moving.",
        "Cut into craft shapes for DIY projects.",
        "Use as mulch liner in the garden.",
    ],
    "glass": [
        "Reuse jars for food storage or homemade candles.",
        "Upcycle bottles as decorative vases.",
        "Drop at a neighbourhood glass bank.",
    ],
    "metal": [
        "Collect cans for scrap recycling centres.",
        "Reuse tins as planters or desk organisers.",
        "Aluminium can be recycled indefinitely — always recycle!",
    ],
    "paper": [
        "Use both sides before discarding.",
        "Compost non-glossy, non-inked paper.",
        "Bundle and donate to schools for craft activities.",
    ],
    "plastic": [
        "Reuse sturdy containers for storage.",
        "Collect soft plastics for supermarket drop-off points.",
        "Join a local plastic recycling drive.",
    ],
}

# ──────────────────────────────────────────────────────────────────────────────
# Model constants
# ──────────────────────────────────────────────────────────────────────────────
MODEL_INPUT_SIZE = (224, 224)
# Resize to slightly larger than input, then take 5 crops for TTA
TTA_RESIZE = (256, 256)
# Confidence below this threshold is flagged as low-confidence
LOW_CONFIDENCE_THRESHOLD = 0.50
MODEL_PATH = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    "models", "ml_model", "wasteClassify.keras",
)

# ──────────────────────────────────────────────────────────────────────────────
# Keras 3.12 → 3.13 compatibility patch
# ──────────────────────────────────────────────────────────────────────────────
def _apply_keras_compat_patch() -> None:
    """
    Keras 3.x introduced extra kwargs in layer configs.
    Patch Dense.from_config to silently drop unknown kwargs for forward compat.
    """
    try:
        from keras.src.layers.core.dense import Dense

        _orig_from_config = Dense.from_config.__func__  # type: ignore[attr-defined]

        @classmethod  # type: ignore[misc]
        def _patched_from_config(cls, config: dict):
            safe = {
                k: v for k, v in config.items()
                if k not in ("quantization_config",)
            }
            return _orig_from_config(cls, safe)

        Dense.from_config = _patched_from_config  # type: ignore[method-assign]
        logger.debug("Keras compat patch applied to Dense.from_config")
    except Exception as exc:
        logger.debug("Keras compat patch skipped: %s", exc)


# ──────────────────────────────────────────────────────────────────────────────
# Global model instance — loaded once at startup
# ──────────────────────────────────────────────────────────────────────────────
_model: Optional[Any] = None


def load_model() -> Any:
    """Load the Keras model once and cache it globally."""
    global _model
    if _model is not None:
        return _model

    _apply_keras_compat_patch()

    if not os.path.isfile(MODEL_PATH):
        raise FileNotFoundError(
            f"Model file not found at: {MODEL_PATH}\n"
            "Expected: backend/app/models/ml_model/wasteClassify.keras"
        )

    logger.info("Loading model from: %s", MODEL_PATH)

    # Try TensorFlow first (local dev), fall back to standalone keras (Render/jax)
    try:
        import os as _os
        _os.environ.setdefault("TF_CPP_MIN_LOG_LEVEL", "3")
        import tensorflow as tf  # noqa: PLC0415
        _model = tf.keras.models.load_model(MODEL_PATH, compile=False)
        logger.info("✅ Model loaded via TensorFlow")
    except ImportError:
        import os as _os
        _os.environ.setdefault("KERAS_BACKEND", "jax")
        import keras  # noqa: PLC0415
        _model = keras.models.load_model(MODEL_PATH, compile=False)
        logger.info("✅ Model loaded via keras+jax")

    logger.info(
        "Model shapes — input: %s  output: %s",
        _model.input_shape,
        _model.output_shape,
    )
    return _model


def get_model() -> Any:
    """Return cached model, loading it on first call."""
    return load_model()


# ──────────────────────────────────────────────────────────────────────────────
# Image preprocessing
# ──────────────────────────────────────────────────────────────────────────────
def _crop_to_224(arr: np.ndarray, top: int, left: int) -> np.ndarray:
    """Return a (1, 224, 224, 3) float32 crop from a (256, 256, 3) array."""
    return np.expand_dims(
        arr[top:top + 224, left:left + 224].astype(np.float32), axis=0
    )


def preprocess_image(image_bytes: bytes) -> np.ndarray:
    """
    Convert raw image bytes → model-ready numpy array.

    The model's Rescaling(1/255) layer handles normalisation internally,
    so we pass pixel values in the [0, 255] uint8 range.

    Returns:
        np.ndarray of shape (1, 224, 224, 3), dtype float32, values [0, 255].
    """
    img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    img = img.resize(MODEL_INPUT_SIZE, Image.LANCZOS)
    arr = np.array(img, dtype=np.float32)   # shape (224, 224, 3)
    arr = np.expand_dims(arr, axis=0)        # shape (1, 224, 224, 3)
    return arr


def preprocess_image_tta(image_bytes: bytes) -> list:
    """
    Test-Time Augmentation: resize to 256×256 then take 5 crops
    (center + 4 corners), each 224×224.

    Averaging predictions over multiple crops reduces sensitivity to
    object position and improves accuracy on real-world photos.

    Returns:
        List of 5 np.ndarray, each shape (1, 224, 224, 3), float32.
    """
    img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    img = img.resize(TTA_RESIZE, Image.LANCZOS)
    arr = np.array(img, dtype=np.uint8)  # (256, 256, 3)

    crops = [
        _crop_to_224(arr, 16, 16),   # center
        _crop_to_224(arr,  0,  0),   # top-left
        _crop_to_224(arr,  0, 32),   # top-right
        _crop_to_224(arr, 32,  0),   # bottom-left
        _crop_to_224(arr, 32, 32),   # bottom-right
    ]
    return crops


# ──────────────────────────────────────────────────────────────────────────────
# Prediction
# ──────────────────────────────────────────────────────────────────────────────
def predict_waste_from_bytes(image_bytes: bytes) -> Dict[str, Any]:
    """
    Run the ML model on raw image bytes and return a structured prediction.

    Uses Test-Time Augmentation (5 crops) to improve accuracy on real-world
    photos where the object may not be perfectly centered.

    Returns:
        {
            "waste_type":             str,
            "confidence":             float,   # 0.0 – 1.0
            "recyclable":             bool,
            "disposal_instructions":  str,
            "ideas":                  list[str] | None,
            "low_confidence":         bool,    # True if model is uncertain
        }
    """
    model = get_model()

    # ── Test-Time Augmentation: average over 5 crops ──────────────────────
    crops = preprocess_image_tta(image_bytes)
    all_probs = []
    for crop in crops:
        preds = model.predict(crop, verbose=0)
        all_probs.append(preds[0])

    # Average probabilities across all crops
    probabilities = np.mean(all_probs, axis=0)

    class_idx = int(np.argmax(probabilities))
    confidence = float(probabilities[class_idx])

    # Gracefully handle unexpected number of output neurons
    if class_idx < len(CLASS_LABELS):
        waste_type = CLASS_LABELS[class_idx]
    else:
        waste_type = f"class_{class_idx}"

    # Flag low-confidence predictions so the frontend can warn the user
    low_confidence = confidence < LOW_CONFIDENCE_THRESHOLD

    recyclable = RECYCLABLE.get(waste_type, False)
    disposal = DISPOSAL_INSTRUCTIONS.get(
        waste_type,
        "Place in the general waste bin and check local recycling guidelines.",
    )
    ideas = RECYCLING_IDEAS.get(waste_type)

    logger.info(
        "✅ Prediction (TTA): %s (confidence=%.4f, low_confidence=%s, recyclable=%s)",
        waste_type, confidence, low_confidence, recyclable,
    )

    result: Dict[str, Any] = {
        "waste_type":            waste_type,
        "confidence":            round(confidence, 4),
        "recyclable":            recyclable,
        "disposal_instructions": disposal,
        "low_confidence":        low_confidence,
    }
    if ideas:
        result["ideas"] = ideas

    return result


# ──────────────────────────────────────────────────────────────────────────────
# Legacy helper — keeps any old call-sites working (filename-only mode)
# ──────────────────────────────────────────────────────────────────────────────
def predict_waste(file_name: str) -> Dict[str, Any]:
    """
    Deprecated stub kept for backward compatibility.
    Real predictions must go through predict_waste_from_bytes().
    """
    logger.warning(
        "predict_waste(filename) called — no actual model inference run. "
        "Use predict_waste_from_bytes() instead."
    )
    # Fallback: derive rough category from filename
    lower = file_name.lower()
    if "cardboard" in lower:
        waste_type = "cardboard"
    elif "glass" in lower:
        waste_type = "glass"
    elif "metal" in lower or "can" in lower:
        waste_type = "metal"
    elif "paper" in lower:
        waste_type = "paper"
    elif "plastic" in lower:
        waste_type = "plastic"
    else:
        waste_type = "plastic"  # safe default

    recyclable = RECYCLABLE.get(waste_type, True)
    return {
        "waste_type":            waste_type,
        "confidence":            0.0,
        "recyclable":            recyclable,
        "disposal_instructions": DISPOSAL_INSTRUCTIONS.get(waste_type, ""),
        "ideas":                 RECYCLING_IDEAS.get(waste_type),
    }
