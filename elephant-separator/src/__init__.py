"""Elephant separator package scaffold."""

from .evaluate import evaluate_separation
from .layer1_preprocess import load_recording, preprocess
from .layer2_separate import NMFSeparator
from .layer3_postprocess import postprocess

__all__ = ["NMFSeparator", "evaluate_separation", "load_recording", "postprocess", "preprocess"]
