# Elephant Voice Isolation: Comprehensive Research Report
## Hackathon Challenge — ElephantVoices Noise Extraction

---

## Table of Contents
1. [Problem Analysis](#1-problem-analysis)
2. [Technical Landscape: Audio Source Separation](#2-technical-landscape)
3. [Core Architectures & Tools](#3-core-architectures--tools)
4. [Recommended Approach: Multi-Layer Pipeline](#4-recommended-approach)
5. [Data Preparation Strategy](#5-data-preparation)
6. [Using autoresearch-macos for Hyperparameter Search](#6-autoresearch-macos)
7. [Using hermes-agent for Workflow Orchestration](#7-hermes-agent)
8. [Implementation Plan](#8-implementation-plan)
9. [Evaluation Metrics](#9-evaluation)
10. [Existing AI Tools Assessment](#10-existing-ai-tools)
11. [Risks & Mitigations](#11-risks)

---

## 1. Problem Analysis

### The Signal
- **Elephant rumbles**: Fundamental frequency (F0) = 10–20 Hz, with harmonics at 2×F0, 3×F0, etc., extending to ~1000 Hz
- **Harmonic structure**: Stacked horizontal bands in spectrograms — harmonics of a single caller never cross
- **Multiple callers**: Identified by crossing harmonics — different elephants have different F0 trajectories
- **Sub-audible range**: F0 is below human hearing threshold; only higher harmonics are audible

### The Noise
- **Airplanes**: Broadband low-frequency rumble (20–200 Hz core), with jet/engine tones at specific frequencies
- **Cars/trucks**: Engine noise (30–150 Hz), tire noise (500–1000 Hz), wind noise (broadband)
- **Generators**: Very tonal, narrowband at ~50/60 Hz (electrical grid) + harmonics, plus mechanical rumble

### The Challenge
The elephant rumble frequency range **overlaps** with all three noise types. This is NOT a simple high-pass/low-pass filtering problem — the signals occupy the same spectral space. We need **intelligent separation**, not filtering.

### Key Difficulty
- 44 recordings, 212 labeled calls — **very small dataset** for training a deep learning model from scratch
- Same-frequency overlap means time-domain and frequency-domain separation alone are insufficient
- Some calls overlap with each other (multiple elephants)

---

## 2. Technical Landscape: Audio Source Separation

### 2.1 Classical Approaches (Spectral Domain)

#### Non-negative Matrix Factorization (NMF)
- **How it works**: Decomposes a spectrogram V ≈ W × H, where W = basis spectra (frequency patterns), H = activation weights (temporal patterns)
- **For elephant isolation**: The harmonic structure of rumbles creates a distinctive W matrix — stacked bands at integer multiples of F0. Mechanical noise has different basis patterns (broadband, tonal at grid frequencies)
- **Advantages**: Interpretable, works on small datasets, no GPU needed
- **Disadvantages**: Assumes linear mixing, struggles with overlapping harmonics
- **Python**: `sklearn.decomposition.NMF`, `librosa.decompose.decompose`
- **Best for**: Baseline separation, especially when noise has tonal components (generators)

#### Robust Principal Component Analysis (RPCA)
- **How it works**: Decomposes a matrix into low-rank (structured signal) + sparse (noise/outliers) components
- **For elephant isolation**: If we frame the spectrogram properly, elephant rumbles (harmonic structure) can be the low-rank component, and transient noise bursts as sparse
- **Caveat**: This assumption may not hold — airplane noise is also structured/low-rank
- **Python**: `cvxpy`, `r_pca` library, or `sklearn` implementations

#### Spectral Subtraction / Wiener Filtering
- **Classical noise reduction**: Estimate noise spectrum from "noise-only" segments, subtract it
- **Challenge**: Requires clean noise reference, which we don't always have
- **Adaptive version**: Use segments before/after the elephant call as noise reference

#### Adaptive Notch Filtering (for generators)
- Generators produce strong tones at exactly 50 Hz, 100 Hz, 150 Hz, 200 Hz, etc.
- Adaptive notch filters can remove these specific frequencies with narrow bandwidth
- Risk: Elephant harmonics may coincide with grid harmonics

### 2.2 Deep Learning Approaches

#### The Paradigm Shift
Modern source separation treats the problem as: **given a mixed spectrogram, predict a mask that isolates each source**. The model learns what "elephant" looks like vs "airplane" in the spectrogram.

#### Key Architectures

**1. U-Net Based (Demucs, Open-Unmix)**
- Encode the spectrogram to a latent representation, decode with skip connections
- Output: a time-frequency mask (soft or binary) that, multiplied with the input spectrogram, isolates the target
- Demucs v4 (Hybrid Transformer): Dual U-Net — one branch for waveform, one for spectrogram, cross-domain Transformer in the middle
- Open-Unmix: Specifically designed for music source separation, STFT-based, outputs per-source spectrograms

**2. Masking Networks (Conv-TasNet, DPRNN)**
- Work directly in the time domain (no STFT)
- Learn an encoder to represent audio as frames, then apply a mask
- Conv-TasNet: Convolutional encoder + TCN (Temporal Convolutional Network) separator
- DPRNN: Dual-path RNN — processes both intra-chunk and inter-chunk temporal patterns

**3. Band-Split RNN (BS-RoFormer / BS-RNN)**
- **Critical for this problem**: Splits the frequency spectrum into bands, processes each band independently with an RNN, then recombines
- Why it matters: Elephant rumbles span 10–1000 Hz, but the characteristics change dramatically across this range. Low frequencies (F0) have very different temporal dynamics than high harmonics
- Band splitting allows the model to learn frequency-specific patterns — e.g., "in the 10-30 Hz band, elephant rumbles look like X, airplane noise looks like Y"
- RoFormer (Rotary Position Embedding Transformer) variant adds attention-based modeling within each band

**4. Music Source Separation Transformers (MusicTag / HT-Demucs)**
- Attention mechanisms capture long-range temporal dependencies
- Elephant rumbles can be several seconds long — attention helps model the full call structure

### 2.3 Self-Supervised Audio Representations

#### wav2vec 2.0 / HuBERT / AudioMAE
- Pretrained on large amounts of unlabeled audio
- Learn general-purpose audio representations that can be fine-tuned
- **For elephants**: Could provide a powerful feature extractor even without domain-specific pretraining
- The representations capture pitch, timbre, and temporal patterns — relevant for harmonic structure detection
- Fine-tune with just 44 recordings using a classification head or mask prediction head

---

## 3. Core Architectures & Tools (Detailed)

### 3.1 Demucs (Facebook/Meta)
**Repository**: https://github.com/facebookresearch/demucs (forked to github.com/adefossez/demucs)

**Architecture**: Dual U-Net
- Spectrogram branch: STFT → encoder → decoder → ISTFT
- Waveform branch: Direct waveform processing
- Cross-domain Transformer between encoder and decoder outputs

**For elephant separation**:
- Replace the 4-source output (drums/bass/vocals/other) with 2-source: elephant vs noise
- Fine-tune on the 44 labeled recordings
- The hybrid approach (spectrogram + waveform) is valuable because elephant rumbles have structure in both domains

**Fine-tuning**:
```python
# Pseudocode for fine-tuning Demucs for elephant separation
from demucs.pretrained import get_model
model = get_model('htdemucs')  # or htdemucs_ft

# Modify output layer for 2 sources instead of 4
model.sources = ['elephant', 'noise']
# Reinitialize the final layer accordingly

# Training loop: input = noisy recording, target = isolated elephant
# Loss: negative SDR (Signal-to-Distortion Ratio)
```

**Pros**: State-of-the-art separation quality, well-documented, PyTorch
**Cons**: Designed for music (4 stems), needs architectural modification, may not handle sub-20 Hz well

### 3.2 Asteroid Toolkit
**Repository**: https://github.com/asteroid-team/asteroid

**What it provides**:
- Modular building blocks: filterbanks, encoders, maskers, decoders
- Pre-implemented architectures: Conv-TasNet, DPRNN, DPTNet, DCCRNet, SudoRMRF, Open-Unmix
- Recipe system for reproducible experiments
- Built-in data loaders for common separation datasets

**For elephant separation**:
- Start with a pretrained Conv-TasNet or DPRNN model
- Create a custom dataset class that loads the 44 recordings + annotations (start/end times)
- Fine-tune with 2-source separation: elephant vs noise
- The modular design makes it easy to swap architectures

```python
# Conceptual Asteroid setup
from asteroid.models import ConvTasNet
from asteroid.data import CustomDataset
from asteroid.losses import PITLossWrapper, pairwise_neg_sisdr

model = ConvTasNet(n_src=2, ...)

# Custom dataset: pairs of (noisy_audio, clean_elephant_audio)
# During training, use the noise-only segments as the "noise" source
# and the labeled segments (with additional cleaning) as "elephant" source
```

**Pros**: Best toolkit for research/experimentation, modular, easy to swap models
**Cons**: No built-in bioacoustic support, need custom data pipeline

### 3.3 Band-Split RNN / BS-RoFormer
**Architecture concept**:
1. Input audio → STFT → split into N frequency bands (e.g., 0-100 Hz, 100-300 Hz, 300-600 Hz, 600-1000 Hz)
2. Each band → independent RNN/Transformer → learns band-specific patterns
3. Recombine bands → ISTFT → output

**Why this is ideal for elephant rumbles**:
- The 0-100 Hz band contains the fundamental frequency — needs long temporal context to track F0 modulation
- The 100-300 Hz band contains lower harmonics — moderate temporal dynamics
- The 300-1000 Hz band contains higher harmonics — more transient, shorter temporal patterns
- Different noise types dominate different bands differently:
  - Generators: strong at 50/100/150 Hz
  - Airplanes: broadband 20-200 Hz
  - Cars: 30-150 Hz (engine) + 500-1000 Hz (tire noise)

**Implementation**: Would need to be built from scratch or adapted from existing implementations. The BandSplitRNN paper (Luo et al., 2021) reported SDR of 8.2 on MUSDB without extra data — the best spectrogram-only model at the time.

### 3.4 Open-Unmix
**Repository**: https://github.com/sigsep/open-unmix

- Spectrogram-based, uses bi-directional LSTM
- Outputs per-source spectrograms via learned masks
- Specifically designed to be interpretable and easy to fine-tune

**For elephants**: The spectrogram-based approach means we can directly visualize what the model is learning — which frequency bands it associates with elephants vs noise. This interpretability is valuable for a hackathon.

### 3.5 AudioMAE (Self-Supervised)
- Masked Autoencoder for audio — learns to reconstruct masked audio patches
- Pretrained on AudioSet (2M+ audio clips, 527 categories)
- **Strategy**: Use AudioMAE as a feature extractor, then add a lightweight separation head
- Fine-tune end-to-end on the 44 recordings

---

## 4. Recommended Approach: Multi-Layer Pipeline

Given the constraints (small dataset, specific domain, multiple noise types), I recommend a **layered pipeline** that combines classical signal processing with deep learning:

### Layer 1: Preprocessing & Frequency Analysis
```
Input → High-pass filter (remove DC/below 5 Hz) → 
        STFT (4096+ window for 1 Hz frequency resolution at low end) →
        Spectrogram (magnitude + phase)
```

**Critical parameter**: Window size. For resolving 10-20 Hz fundamentals:
- At 44100 Hz sample rate, a 4096-sample window = ~93 ms → frequency resolution of ~10.7 Hz
- This is BARELY enough to resolve the 10-20 Hz range
- Use 8192 or 16384 samples for better low-frequency resolution
- Trade-off: larger window = worse time resolution for transients

### Layer 2: Noise-Specific Pre-Separation
Apply noise-type-specific preprocessing BEFORE the deep learning model:

**For generator noise**:
- Adaptive notch filter at 50/60 Hz and harmonics
- Track the exact fundamental of generator tone using autocorrelation
- Remove with very narrow notch (Q factor > 100) to minimize elephant harmonic damage

**For airplane noise**:
- Airplane noise tends to be relatively stationary (slowly varying)
- Use the segments before/after the elephant call to build a noise profile
- Apply spectral subtraction with over-subtraction factor and spectral floor
- This reduces the airplane baseline before DL processing

**For car noise**:
- Most complex — broadband + tonal + impulsive
- Best handled entirely by the DL model

### Layer 3: Deep Learning Source Separation
**Recommended model**: Fine-tuned **Demucs** (or **Asteroid/DPRNN** if resources limited)

**Why Demucs**:
- Hybrid spectrogram + waveform approach captures both frequency structure and temporal dynamics
- Pretrained on music gives it a strong prior for separating harmonic signals
- Elephant rumbles ARE harmonic — the music separation prior is partially transferable

**Why DPRNN (if lightweight needed)**:
- Runs on CPU reasonably well
- Fast training
- Good for small datasets
- Available in Asteroid with one-line instantiation

**Training strategy** (for fine-tuning on 44 recordings):
1. **Data augmentation is critical** with only 44 recordings:
   - Time stretching (0.8× to 1.2× speed) — changes pitch slightly, simulating different elephants
   - Pitch shifting (±2 semitones) — simulates different-sized elephants
   - Background noise mixing — add samples from freesound.org (wind, insects, rain)
   - Random cropping of 2-5 second segments centered on the labeled call
   - Mixup: blend two recordings at random ratios
   - SpecAugment: mask random time-frequency regions during training
   
2. **Training target**:
   - If we can get reasonably clean elephant segments (from the labeled time windows, after classical pre-processing), use those as targets
   - If not, train with a "noise-aware" loss: use the pre/post-call segments as noise reference

3. **Loss function**:
   - Primary: Negative SDR (Signal-to-Distortion Ratio)
   - Auxiliary: Multi-resolution STFT loss (captures quality at different frequency resolutions)
   - Optional: Perceptual loss using AudioMAE features

### Layer 4: Post-Processing
```
DL output → Harmonic enhancement filter →
            Temporal smoothing (elephant rumbles are smooth, not impulsive) →
            Phase reconstruction ( Griffin-Lim or use original phase from STFT) →
            Output clean elephant rumble
```

**Harmonic enhancement**:
- Detect the fundamental frequency trajectory (using pYIN or similar pitch tracker)
- Reinforce only integer-multiple harmonics of the detected F0
- Suppress everything else
- This leverages the prior knowledge that elephant rumbles are HARMONIC

**Phase reconstruction**:
- Magnitude-only processing (spectral masks) destroys phase
- Use the original mixture's phase (Wiener-like reconstruction) or Griffin-Lim iteration
- For best quality: use a model that outputs both magnitude and phase (like Demucs hybrid)

---

## 5. Data Preparation Strategy

### 5.1 Parsing the Annotations
```python
import pandas as pd
import soundfile as sf
import numpy as np

# Load spreadsheet
df = pd.read_csv('annotations.csv')  # columns: filename, start_time, end_time

# For each recording:
for _, row in df.iterrows():
    audio, sr = sf.read(f'recordings/{row.filename}')
    start_sample = int(row.start_time * sr)
    end_sample = int(row.end_time * sr)
    
    # Extract the call segment
    call_segment = audio[start_sample:end_sample]
    
    # Extract noise reference (e.g., 1 second before the call)
    noise_start = max(0, start_sample - sr)
    noise_reference = audio[noise_start:start_sample]
```

### 5.2 Creating Training Pairs
The key challenge: we have **noisy recordings with labeled call times**, but no **clean isolated elephant calls**. This means we can't do standard supervised separation training.

**Solutions**:

**Option A: Weakly Supervised / Noise-Aware Training**
- Use the labeled segments as "noisy elephant" references
- Use the pre/post-call segments as "noise-only" references
- Train the model to map noisy elephant → cleaner elephant using:
  - Noise-aware loss (compare DL output to noise reference, penalize similarity)
  - The segment before the call has no elephant → should produce silence
  - The segment during the call has elephant → should produce elephant

**Option B: Self-Supervised Pre-training + Fine-tuning**
1. Pre-train on large bioacoustic datasets (e.g., bird sounds from xeno-canto, whale calls)
2. Fine-tune on the 44 elephant recordings using the weakly supervised approach above

**Option C: NMF-Based Bootstrapping**
1. Use classical NMF to get an initial rough separation
2. Use these rough separations as training targets
3. Train a deep learning model to improve on the NMF baseline
4. Iteratively refine (model output → new training target → retrain)

**Recommended**: Start with Option A (simplest), add Option C as improvement

### 5.3 Data Augmentation Pipeline
```python
import audiomentations
from audiomentations import (
    AddGaussianNoise, TimeStretch, PitchShift, 
    Gain, Shift, SpecFrequencyMask
)

augment = audiomentations.Compose([
    AddGaussianNoise(min_amplitude=0.001, max_amplitude=0.015, p=0.5),
    TimeStretch(min_rate=0.8, max_rate=1.25, p=0.5),
    PitchShift(min_semitones=-2, max_semitones=2, p=0.3),
    Gain(min_gain_in_db=-12, max_gain_in_db=12, p=0.7),
    Shift(p=0.5),
])
```

---

## 6. Using autoresearch-macos for Hyperparameter Search

### What autoresearch-macos Is
autoresearch-macos is an autonomous AI research agent framework by Karpathy. It's designed to:
- Have an AI agent (Claude, Codex, etc.) autonomously modify code, run experiments, evaluate results
- Keep improvements, discard regressions
- Run overnight — ~100 experiments in 8 hours

### How to Adapt It for Elephant Separation

**Step 1: Set up the project structure**
```bash
git clone https://github.com/miolini/autoresearch-macos.git
cd autoresearch-macos

# Modify for our use case:
# prepare.py → elephant data loading, STFT, evaluation metrics
# train.py → our separation model (Demucs/DPRNN variant)
# program.md → instructions for the AI agent about elephant separation
```

**Step 2: Create a `train.py` for elephant separation**
Instead of training an LLM (as in the original), modify `train.py` to:
- Load elephant recordings and annotations
- Define a source separation model (e.g., lightweight U-Net on spectrograms)
- Train for a fixed time budget (5 minutes)
- Evaluate using a custom metric: SDR on the validation set, or a custom "harmonic fidelity" score

**Step 3: Create `program.md` for the agent**
```markdown
# Autonomous Elephant Separation Research

You are optimizing an audio source separation model for isolating elephant rumbles 
from mechanical noise (airplanes, cars, generators).

## Context
- Elephant rumbles: 10-20 Hz fundamental, harmonics to 1000 Hz
- 44 recordings with 212 labeled calls
- Noise types: airplane (broadband low-freq), car (engine+tire), generator (tonal 50/60 Hz)

## What you CAN modify
- train.py — model architecture, loss function, hyperparameters, data augmentation
- Everything in the model is fair game

## What you CANNOT modify  
- prepare.py — data loading and evaluation

## Metric
- val_sdr: Signal-to-Distortion Ratio on validation set (higher is better)
- harmonic_score: How well harmonic structure is preserved (higher is better)

## Ideas to try
- Different STFT window sizes (2048, 4096, 8192, 16384)
- Different model architectures (U-Net, Conv-TasNet, simple CNN)
- Different loss functions (L1, L2, negative SDR, multi-resolution STFT loss)
- Data augmentation strategies
- Pre-processing: spectral subtraction, notch filtering for generators
- Post-processing: harmonic enhancement, F0-guided filtering
- Band-split architectures
```

**Step 4: Define evaluation in `prepare.py`**
```python
def evaluate(model, val_loader):
    """Evaluate separation quality"""
    total_sdr = 0
    for noisy, clean_ref, noise_ref in val_loader:
        estimated = model(noisy)
        
        # SDR computation
        sdr = compute_sdr(estimated, clean_ref)
        total_sdr += sdr
        
        # Harmonic fidelity: check that output has integer-multiple harmonics
        harmonic_score = compute_harmonic_fidelity(estimated)
    
    return {
        'val_sdr': total_sdr / len(val_loader),
        'harmonic_score': harmonic_score
    }
```

**Step 5: Run overnight**
The AI agent will autonomously:
1. Start with a baseline (e.g., simple U-Net)
2. Try modifications: change window size, add band-splitting, try different losses
3. Keep improvements, discard regressions
4. After 100 iterations over 8 hours, you'll have a well-optimized model

### Advantages of This Approach
- **Autonomous**: Set it up, let it run, come back to results
- **Exhaustive**: Tries many more combinations than a human could
- **Platform-adapted**: The macOS fork runs on Apple Silicon (MPS)
- **Systematic**: Logs every experiment in results.tsv for full reproducibility

---

## 7. Using hermes-agent for Workflow Orchestration

### What hermes-agent Is
Hermes is a self-improving AI agent by Nous Research with:
- A learning loop: creates skills from experience, improves them during use
- Memory persistence across sessions
- Cron scheduling for automated tasks
- Sub-agent delegation for parallel work
- Multi-platform: CLI, Telegram, Discord, Slack, WhatsApp

### How to Use It for This Project

**1. Project Management & Workflow**
```bash
hermes  # Start interactive session
```
Then tell Hermes:
> "We're working on an elephant voice isolation hackathon. Set up a project workspace 
> with the following tasks: [list tasks]. Create a skill for the separation pipeline 
> and schedule daily progress checks."

Hermes can:
- Create a project skill with the full separation pipeline
- Break down the hackathon into subtasks
- Spawn sub-agents to work on different parts in parallel:
  - Agent 1: Data preprocessing and augmentation
  - Agent 2: Model training and evaluation
  - Agent 3: Spectrogram visualization and quality assessment

**2. Autonomous Training Loops**
Use Hermes's cron scheduling:
```
/hermes cron add "0 */2 * * *" "Run the next autoresearch experiment and report results"
```
This checks on the training every 2 hours and reports findings.

**3. Cross-Session Memory**
Hermes remembers across sessions:
- What model architectures were tried
- Which hyperparameters worked best
- What the current best SDR is
- What issues were encountered

**4. Skill Creation for Separation Pipeline**
After developing the pipeline, Hermes can create a reusable skill:
```
/skills create elephant-separator "Given an audio file and call annotations, 
isolate elephant rumbles from mechanical noise using the fine-tuned model"
```
This skill can be shared and improved over time.

**5. Fine-tuning with hermes-agent as the orchestrator**
```bash
# Hermes can orchestrate the full pipeline:
hermes cron add "0 9 * * *" "Review overnight autoresearch results, update model, start new batch"
```

### Integration: autoresearch-macos + hermes-agent
```
┌──────────────────────────────────────────────────────┐
│                   hermes-agent                        │
│  (Orchestrator: scheduling, memory, communication)    │
│                                                      │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────┐ │
│  │ Sub-agent 1  │  │ Sub-agent 2  │  │ Sub-agent 3│ │
│  │ Data prep &  │  │ autoresearch │  │ Evaluation │ │
│  │ augmentation │  │ (model training)│ & reporting│ │
│  └──────────────┘  └──────────────┘  └────────────┘ │
│                                                      │
│  ┌──────────────────────────────────────────────────┐│
│  │  Shared Memory: experiments.log, best_model.pt   ││
│  └──────────────────────────────────────────────────┘│
└──────────────────────────────────────────────────────┘
```

---

## 8. Implementation Plan

### Phase 1: Foundation (Day 1)
1. **Set up environment**
   ```bash
   conda create -n elephant-sep python=3.10
   conda activate elephant-sep
   pip install torch torchaudio librosa soundfile audiomentations
   pip install asteroid demucs scikit-learn matplotlib
   ```

2. **Load and visualize data**
   ```python
   import librosa
   import librosa.display
   import matplotlib.pyplot as plt
   
   audio, sr = librosa.load('recording.wav', sr=None)
   S = librosa.stft(audio, n_fft=16384, hop_length=512)
   S_db = librosa.amplitude_to_db(abs(S), ref=np.max)
   
   plt.figure(figsize=(16, 8))
   librosa.display.specshow(S_db, sr=sr, hop_length=512, 
                            x_axis='time', y_axis='hz')
   plt.colorbar(format='%+2.0f dB')
   plt.ylim(0, 1000)  # Focus on elephant frequency range
   plt.title('Spectrogram - Elephant + Noise')
   plt.savefig('spectrogram_analysis.png', dpi=150)
   ```

3. **Create data pipeline** (see Section 5)

### Phase 2: Baseline Model (Day 1-2)
1. **Classical baseline**: NMF separation
   ```python
   import librosa
   from sklearn.decomposition import NMF
   
   # Compute spectrogram with high resolution for low frequencies
   S = np.abs(librosa.stft(audio, n_fft=16384, hop_length=512))
   
   # Apply NMF with 2 components (elephant + noise)
   model = NMF(n_components=2, init='random', max_iter=500)
   W = model.fit_transform(S)  # Time activations
   H = model.components_        # Frequency patterns
   
   # Reconstruct each source
   elephant_est = W[:, 0:1] @ H[0:1, :]
   noise_est = W[:, 1:2] @ H[1:2, :]
   ```

2. **Deep learning baseline**: Fine-tuned DPRNN via Asteroid
   ```python
   from asteroid.models import DPRNN
   from asteroid.engine import System
   from asteroid.losses import PITLossWrapper, pairwise_neg_sisdr
   
   model = DPRNN(
       n_src=2,              # elephant + noise
       rnn_type='lstm',
       hidden_size=128,
       num_layers=4,
       bidirectional=True,
       n_repeats=4,
       kernel_size=3,
       norm_type='gLN',
       mask_nonlinear='softmax',
   )
   
   # Wrap with PIT loss
   loss_func = PITLossWrapper(pairwise_neg_sisdr, pit_from='pw_mtx')
   ```

### Phase 3: Advanced Model (Day 2-3)
1. **Fine-tune Demucs** (if GPU available)
2. **Implement band-split architecture** (custom)
3. **Add harmonic-aware post-processing**

### Phase 4: Optimization with autoresearch-macos (Day 3-overnight)
1. Set up autoresearch with elephant separation train.py
2. Configure program.md with domain-specific instructions
3. Launch overnight — wake up to optimized model

### Phase 5: Final Assembly & Submission (Day 4)
1. Assemble the full pipeline
2. Run on all 44 recordings
3. Generate before/after spectrograms
4. Package as a tool/platform

---

## 9. Evaluation Metrics

### Primary Metrics
1. **SDR (Signal-to-Distortion Ratio)**: The gold standard for source separation. Higher = better.
2. **SIR (Signal-to-Interference Ratio)**: How much of the remaining signal is from other sources.
3. **SAR (Signal-to-Artifact Ratio)**: How much distortion/artifacts the processing introduces.

### Domain-Specific Metrics
4. **Harmonic Fidelity Score**: Measure how well the harmonic structure is preserved:
   - Track F0 trajectory (pYIN algorithm)
   - Measure spectral coherence at harmonic frequencies
   - Penalize energy at non-harmonic frequencies
   
5. **Spectral Flatness**: Elephant rumbles are tonal (low flatness) — post-separation should maintain this

6. **Spectrogram Visual Inspection**: Before/after comparison — the hackathon explicitly uses spectrograms

### Practical Metric
7. **Usability Score**: Can a biologist measure the acoustic properties (F0, duration, harmonics) from the output? Yes/No/Partial

---

## 10. Existing AI Tools Assessment

### Commercial Tools (from hackathon list)

| Tool | Approach | Elephant Suitability | API Available |
|------|----------|---------------------|---------------|
| **Lalal.ai** | Neural network separation, trained on music/vocals | Low — optimized for music, may not handle sub-20 Hz | Yes (paid) |
| **Media.io** | AI noise removal | Medium — generic noise removal might reduce but not isolate | Web only |
| **Podcastle.ai** | Speech enhancement | Very Low — designed for human speech frequencies | No |
| **Veed.io** | Video/audio editing with AI cleanup | Low — generic tool | Web only |
| **Weet.co** | Audio/video editing | Low — generic | Web only |
| **Kapwing.com** | Media editing | Low — generic | Web only |
| **RGBD.com** | Audio separation | Unknown — newer tool | Unknown |
| **Aspose.app** | Audio processing utilities | Low — basic tools | API available |

**Verdict**: None of these tools are designed for sub-20 Hz wildlife vocalizations. They might help with high-frequency noise removal but cannot isolate elephant rumbles from same-frequency mechanical noise.

### Open-Source Tools More Relevant
- **Demucs**: Best starting point — modify for 2-source separation
- **Asteroid**: Best research framework — modular, easy to experiment
- **Spleeter** (Deezer): Fast but music-specific, less adaptable
- **Open-Unmix**: Good baseline, interpretable
- **RNNoise**: Real-time noise suppression — could be a pre-processing step
- **DeepFilterNet**: Real-time speech enhancement — potentially adaptable

---

## 11. Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| **Only 44 recordings** | Insufficient for training deep model from scratch | Fine-tune pretrained models; heavy augmentation; NMF bootstrapping |
| **No clean targets** | Can't do standard supervised training | Use weakly supervised approach (noise-aware loss); NMF bootstrap |
| **Sub-20 Hz fundamentals** | Many models/downsampling ignore this range | Use high sample rate (44.1 kHz +); large STFT windows; explicit low-frequency modeling |
| **Phase reconstruction** | Magnitude-only processing loses phase | Use hybrid models (Demucs); or original phase |
| **Harmonics overlap with noise harmonics** | Can't distinguish by frequency alone | Use temporal patterns + harmonic structure priors |
| **Multiple elephants calling** | Which harmonic set belongs to which elephant | F0 tracking + cross-elimination; separate then recombine |
| **GPU not available** | Slow training | Use DPRNN/Asteroid (CPU-friendly); or use cloud GPU (Google Colab free) |
| **Overfitting to 44 recordings** | Model memorizes instead of generalizing | Cross-validation; strong augmentation; simple models; regularization |

---

## Appendix A: Key Python Libraries

```bash
# Core audio processing
pip install librosa soundfile scipy numpy

# Deep learning
pip install torch torchaudio

# Source separation frameworks  
pip install demucs asteroid

# Data augmentation
pip install audiomentations

# Visualization
pip install matplotlib seaborn

# Evaluation
pip install mir_eval  # Music Information Retrieval evaluation metrics
```

## Appendix B: Spectrogram Parameters for Elephant Analysis

```python
# For visualizing elephant rumbles (reproduce Audacity-style view)
import librosa

# High frequency resolution for low frequencies
n_fft = 16384           # Window size: ~370ms at 44.1kHz
hop_length = 512        # ~11.6ms hop
win_length = 16384      # Match n_fft for rectangular window
window = 'hann'         # Hann window for spectral leakage reduction

# For model input (lower resolution, faster)
model_n_fft = 4096      # ~93ms
model_hop = 256         # ~5.8ms
```

## Appendix C: Quick Start Code

```python
#!/usr/bin/env python3
"""Elephant Rumple Separator - Quick Start"""

import numpy as np
import librosa
from sklearn.decomposition import NMF
import soundfile as sf
import matplotlib.pyplot as plt

def separate_elephant_nmf(audio_path, call_start, call_end, sr=44100):
    """Baseline NMF separation of elephant rumble from noise."""
    
    # Load audio
    audio, _ = librosa.load(audio_path, sr=sr)
    
    # Compute high-resolution STFT
    S = np.abs(librosa.stft(audio, n_fft=16384, hop_length=512))
    S_power = S ** 2
    
    # Apply NMF
    nmf = NMF(n_components=3, init='nndsvda', max_iter=1000, random_state=42)
    W = nmf.fit_transform(S_power)  # Time activations (n_frames × n_components)
    H = nmf.components_             # Spectral patterns (n_components × n_freqs)
    
    # Identify which component is the elephant call
    call_start_frame = int(call_start * sr / 512)
    call_end_frame = int(call_end * sr / 512)
    
    # The elephant component should be most active during the call
    component_energy_during_call = [np.mean(W[call_start_frame:call_end_frame, i]) 
                                     for i in range(3)]
    component_energy_outside_call = [np.mean(W[:call_start_frame, i]) +
                                      np.mean(W[call_end_frame:, i])
                                      for i in range(3)]
    
    # Elephant component: high during call, low outside
    ratios = [e_during / max(e_outside, 1e-10) 
              for e_during, e_outside in zip(component_energy_during_call, 
                                              component_energy_outside_call)]
    elephant_idx = np.argmax(ratios)
    
    # Reconstruct elephant source
    elephant_mag = W[:, elephant_idx:elephant_idx+1] @ H[elephant_idx:elephant_idx+1, :]
    elephant_mag = np.sqrt(elephant_mag)  # Convert back to magnitude
    
    # Use original phase
    _, phase = librosa.magphase(librosa.stft(audio, n_fft=16384, hop_length=512))
    elephant_stft = elephant_mag * phase
    
    # Inverse STFT
    elephant_audio = librosa.istft(elephant_stft, hop_length=512)
    
    # Extract just the call segment
    call_start_sample = int(call_start * sr)
    call_end_sample = int(call_end * sr)
    elephant_call = elephant_audio[call_start_sample:call_end_sample]
    
    # Save
    sf.write('elephant_call_isolated.wav', elephant_call, sr)
    
    # Visualize
    fig, axes = plt.subplots(3, 1, figsize=(16, 12))
    
    # Original spectrogram
    S_db = librosa.amplitude_to_db(S, ref=np.max)
    librosa.display.specshow(S_db, sr=sr, hop_length=512, 
                            x_axis='time', y_axis='hz', ax=axes[0])
    axes[0].set_title('Original (Elephant + Noise)')
    axes[0].set_ylim(0, 1000)
    
    # Elephant component
    E_db = librosa.amplitude_to_db(elephant_mag, ref=np.max)
    librosa.display.specshow(E_db, sr=sr, hop_length=512,
                            x_axis='time', y_axis='hz', ax=axes[1])
    axes[1].set_title('Isolated Elephant Rumble (NMF)')
    axes[1].set_ylim(0, 1000)
    
    # Spectral patterns (what each component "looks like")
    for i in range(3):
        label = f'Component {i} {"(ELEPHANT)" if i == elephant_idx else ""}'
        axes[2].plot(H[i] / H[i].max(), label=label, alpha=0.7)
    axes[2].set_xlabel('Frequency Bin')
    axes[2].set_ylabel('Normalized Magnitude')
    axes[2].set_title('NMF Spectral Patterns')
    axes[2].legend()
    
    plt.tight_layout()
    plt.savefig('nmf_separation_result.png', dpi=150)
    plt.show()
    
    return elephant_call, sr


# Usage:
# separate_elephant_nmf('recording.wav', call_start=5.2, call_end=8.7)
```

---

*Report generated for ElephantVoices Hackathon Challenge*
*Date: April 11, 2026*
