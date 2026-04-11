# Elephant Voice Separation — Autonomous Research

## Context
You are optimizing an audio source separation model for isolating elephant rumbles from mechanical noise. Elephant rumbles have fundamentals at 10-20 Hz with harmonics to 1000 Hz. Noise types: airplane, car, generator.

## What You Can Modify
- `train.py` model architecture
- optimizer choice
- hyperparameters
- loss function

## What You Cannot Modify
- data preparation contract
- `TIME_BUDGET`
- the fixed evaluation interface

## Metric
`val_loss` measured as reconstruction MSE on spectrogram targets. Lower is better.

## Strategy Ideas
- test a deeper or wider CNN baseline
- try residual or attention-style blocks
- split low and high frequency bands before masking
- compare L1, L2, SDR-style, or hybrid losses

