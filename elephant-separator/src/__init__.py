"""Elephant separator package scaffold."""

from .dataset import ElephantCallDataset, load_annotations
from .evaluate import evaluate_separation
from .feature_matching import ElephantCallMatcher, extract_features
from .layer1_preprocess import load_recording, preprocess
from .layer2_separate import DeepLearningSeparator, NMFSeparator, SpectrogramMaskNet
from .layer3_postprocess import postprocess

__all__ = [
    "DeepLearningSeparator",
    "ElephantCallDataset",
    "ElephantCallMatcher",
    "NMFSeparator",
    "SpectrogramMaskNet",
    "evaluate_separation",
    "extract_features",
    "load_annotations",
    "load_recording",
    "postprocess",
    "preprocess",
]
