# Elephant Voice Isolation — Implementation Guide
## Multi-Layer Pipeline: Step-by-Step Navigation

---

## Overview

This document is a complete, hands-on walkthrough for building an elephant rumble isolation tool. Every tool, algorithm, and library is defined with its exact role, installation command, and usage pattern.

**Goal**: Given a noisy audio recording containing an elephant rumble overlapping with mechanical noise (airplane, car, or generator), produce a clean isolated elephant call without distortion.

**Pipeline**:
```
Raw Audio → [Layer 1: Preprocessing] → [Layer 2: Source Separation] → [Layer 3: Post-Processing] → Clean Elephant Call
```

---

## Tech Stack — Complete Definition

| Category | Tool/Library | Version | Role | Install Command |
|----------|-------------|---------|------|----------------|
| **Language** | Python | 3.10+ | Core language | System install |
| **Package Manager** | uv | Latest | Fast pip/venv | `curl -LsSf https://astral.sh/uv/install.sh \| sh` |
| **Audio I/O** | soundfile | 0.12+ | Read/write WAV/FLAC/OGG | `pip install soundfile` |
| **Audio Analysis** | librosa | 0.10+ | Spectrograms, STFT, pitch tracking | `pip install librosa` |
| **Numerical** | numpy | 1.24+ | Array operations | `pip install numpy` |
| **Scientific** | scipy | 1.11+ | Signal processing (filters, FFT) | `pip install scipy` |
| **Visualization** | matplotlib | 3.7+ | Spectrogram plots | `pip install matplotlib` |
| **ML Framework** | torch (PyTorch) | 2.1+ | Neural network training | `pip install torch torchaudio` |
| **Separation Toolkit** | asteroid | Latest | Modular source separation | `pip install asteroid` |
| **Separation Model** | demucs | 4.x | Pretrained hybrid transformer | `pip install demucs` |
| **Augmentation** | audiomentations | 0.35+ | Audio data augmentation | `pip install audiomentations` |
| **Evaluation** | mir_eval | 0.7+ | SDR/SIR/SAR metrics | `pip install mir_eval` |
| **Feature Matching** | scikit-learn | 1.3+ | PCA, similarity metrics | `pip install scikit-learn` |
| **Progress** | tqdm | Latest | Training progress bars | `pip install tqdm` |
| **Experiment Tracking** | tensorboard | 2.14+ | Log training curves | `pip install tensorboard` |
| **Jupyter** | jupyter | Latest | Interactive notebooks | `pip install jupyter` |

### One-Line Full Install
```bash
pip install numpy scipy matplotlib librosa soundfile torch torchaudio asteroid demucs audiomentations mir_eval scikit-learn tqdm tensorboard jupyter
```

---

## Project Structure

```
elephant-separator/
├── data/
│   ├── recordings/          # 44 input recordings (WAV)
│   ├── annotations.csv      # filename, start_time, end_time, noise_type
│   ├── clean_samples/       # Collected clean elephant calls (for testing)
│   └── noise_samples/       # Collected noise-only samples (for training)
├── src/
│   ├── __init__.py
│   ├── layer1_preprocess.py       # Layer 1: Preprocessing
│   ├── layer2_separate.py         # Layer 2: Source Separation (NMF + DL)
│   ├── layer3_postprocess.py      # Layer 3: Post-Processing
│   ├── feature_matching.py        # PCA-based feature matching
│   ├── evaluate.py                # Evaluation metrics
│   ├── dataset.py                 # Data loading & augmentation
│   └── visualize.py               # Spectrogram visualization
├── models/
│   ├── saved_models/              # Trained model checkpoints
│   └── nmf_components/            # NMF dictionary matrices
├── notebooks/
│   ├── 01_data_exploration.ipynb
│   ├── 02_nmf_baseline.ipynb
│   ├── 03_deep_learning.ipynb
│   └── 04_feature_matching.ipynb
├── results/
│   ├── spectrograms/              # Before/after spectrogram comparisons
│   └── separated_calls/           # Output WAV files
├── experiments/
│   ├── results.tsv                # autoresearch experiment log
│   ├── train.py                   # autoresearch training script
│   └── program.md                 # autoresearch agent instructions
├── tests/
│   ├── test_preprocess.py
│   ├── test_nmf.py
│   └── test_dl_model.py
├── pyproject.toml
├── requirements.txt
└── README.md
```

---

## LAYER 1: Preprocessing

### What It Does
Transforms raw audio into a form optimized for source separation. Handles noise-type-specific cleanup before the deep learning model.

### 1.1 Audio Loading & Resampling

**Tool**: `soundfile` + `librosa`

```python
# src/layer1_preprocess.py

import numpy as np
import soundfile as sf
import librosa

def load_recording(filepath, target_sr=44100):
    """
    Load audio and resample to target sample rate.
    
    Why 44100 Hz?
    - Captures the full elephant spectrum (10-1000 Hz)
    - Standard sample rate for most audio tools
    - Demucs and other models expect this rate
    
    Parameters:
        filepath: path to WAV file
        target_sr: sample rate (default 44100)
    
    Returns:
        audio: numpy array, shape (n_samples,)
        sr: sample rate
    """
    # soundfile for fast I/O, librosa for resampling
    audio, sr = librosa.load(filepath, sr=target_sr, mono=True)
    return audio, sr
```

**Navigation**: 
- `soundfile.read()` → reads WAV/FLAC/OGG directly, returns (samples, samplerate)
- `librosa.load(sr=target_sr)` → auto-resamples to target rate
- Always use **mono** (single channel) — stereo doesn't matter for elephants

### 1.2 High-Resolution STFT (Short-Time Fourier Transform)

**Tool**: `scipy.signal.stft` or `librosa.stft`

```python
from scipy.signal import stft, istft

def compute_stft(audio, sr=44100, n_fft=16384, hop_length=512):
    """
    Compute STFT with high frequency resolution for low-frequency elephant calls.
    
    Why n_fft=16384?
    - Frequency resolution = sr / n_fft = 44100 / 16384 ≈ 2.7 Hz
    - This resolves the 10-20 Hz fundamental frequency range
    - Window duration = 16384 / 44100 ≈ 370 ms
    
    Why hop_length=512?
    - Time resolution = 512 / 44100 ≈ 11.6 ms
    - Good balance between time and frequency detail
    
    Trade-off:
    - LARGER n_fft → better frequency resolution, worse time resolution
    - SMALLER hop_length → better time resolution, more data
    
    For model training (lighter):
    - n_fft=4096 (freq resolution ~10.7 Hz, window ~93 ms)
    - hop_length=256
    
    Parameters:
        audio: numpy array
        sr: sample rate
        n_fft: FFT window size
        hop_length: hop between windows
    
    Returns:
        frequencies: frequency bins
        times: time frames
        Zxx: complex STFT matrix (n_freqs × n_times)
    """
    frequencies, times, Zxx = stft(audio, fs=sr, nperseg=n_fft, 
                                     noverlap=n_fft - hop_length)
    return frequencies, times, Zxx

def stft_to_spectrogram(Zxx):
    """Convert complex STFT to magnitude spectrogram (for visualization/processing)."""
    return np.abs(Zxx)

def stft_to_power_spectrogram(Zxx):
    """Convert to power spectrogram (magnitude squared). NMF works better with power."""
    return np.abs(Zxx) ** 2
```

**Navigation**:
- `scipy.signal.stft()` → returns (frequencies, times, complex_matrix)
- `np.abs(Zxx)` → magnitude spectrogram
- `np.angle(Zxx)` → phase (needed for reconstruction)
- `scipy.signal.istft()` → inverse STFT (complex → time domain)

### 1.3 Noise-Type-Specific Pre-Filtering

**Tool**: `scipy.signal` (Butterworth filters, notch filters, iirnotch)

#### 1.3a Generator Noise — Adaptive Notch Filter

```python
from scipy.signal import iirnotch, sosfiltfilt, butter, sosfilt

def remove_generator_harmonics(audio, sr=44100, fundamental=50, num_harmonics=10):
    """
    Remove tonal generator noise at 50 Hz (or 60 Hz) and its harmonics.
    
    How notch filters work:
    - A notch filter removes a very narrow band of frequencies
    - Q factor controls bandwidth: higher Q = narrower notch
    - Q=100 means ~1 Hz bandwidth — removes just the tone, preserves nearby harmonics
    
    Why this matters:
    - Generator fundamental at 50/60 Hz is close to elephant F0 (10-20 Hz) 
      harmonics at 50, 60, 75, 100 Hz
    - Use narrow notches to avoid damaging elephant harmonics
    - Only apply if generator noise is confirmed (check annotation: noise_type)
    
    Parameters:
        audio: numpy array
        sr: sample rate
        fundamental: 50 (most of world) or 60 (Americas)
        num_harmonics: how many harmonics to notch
    
    Returns:
        filtered_audio: numpy array
    """
    filtered = audio.copy()
    
    for h in range(1, num_harmonics + 1):
        freq = fundamental * h  # 50, 100, 150, 200, ...
        
        # Skip if frequency overlaps with expected elephant harmonics
        # Elephant F0 = 10-20 Hz, so harmonics at 50-1000 Hz
        # We'll keep narrow notches even in overlap regions (Q=100 = ~0.5 Hz wide)
        
        if freq < sr / 2:  # Must be below Nyquist
            # Design notch filter
            Q = 100  # Very narrow — only removes the exact tone
            b, a = iirnotch(freq, Q, fs=sr)
            filtered = scipy.signal.filtfilt(b, a, filtered)
    
    return filtered
```

**Navigation**:
- `scipy.signal.iirnotch(w0, Q, fs)` → designs a notch filter at frequency w0
- `w0` = center frequency (Hz), `Q` = quality factor (bandwidth = w0/Q)
- `scipy.signal.filtfilt(b, a, x)` → zero-phase filtering (no phase distortion)
- **Critical**: Use `filtfilt` (not `lfilter`) to avoid phase shift — phase matters for separation quality

#### 1.3b Airplane Noise — Spectral Subtraction

```python
def spectral_subtraction(Zxx, noise_start_frame, noise_end_frame):
    """
    Reduce stationary airplane noise using spectral subtraction.
    
    How it works:
    1. Estimate noise spectrum from a noise-only segment (before/after call)
    2. Subtract the noise estimate from the mixed signal
    3. Apply spectral floor to prevent negative values (musical noise)
    
    Why for airplanes:
    - Airplane noise is relatively stationary (slowly changing)
    - The noise profile can be estimated from segments without elephant calls
    
    Parameters:
        Zxx: complex STFT matrix (n_freqs × n_frames)
        noise_start_frame: frame index where noise-only region starts
        noise_end_frame: frame index where noise-only region ends
    
    Returns:
        cleaned_Zxx: complex STFT with reduced noise
    """
    magnitude = np.abs(Zxx)
    phase = np.angle(Zxx)
    
    # Step 1: Estimate noise spectrum (mean of noise-only frames)
    noise_mean = np.mean(magnitude[:, noise_start_frame:noise_end_frame], axis=1, keepdims=True)
    
    # Step 2: Over-subtraction factor (1.0-2.0)
    # Higher = more noise removal, but more risk to elephant signal
    alpha = 1.5
    
    # Step 3: Subtract noise estimate
    cleaned_magnitude = magnitude - alpha * noise_mean
    
    # Step 4: Spectral floor (prevents musical noise artifacts)
    # Set minimum to beta * noise_mean
    beta = 0.01
    spectral_floor = beta * noise_mean
    cleaned_magnitude = np.maximum(cleaned_magnitude, spectral_floor)
    
    # Step 5: Reconstruct complex STFT
    cleaned_Zxx = cleaned_magnitude * np.exp(1j * phase)
    
    return cleaned_Zxx
```

**Navigation**:
- The **noise reference segment** comes from the annotation data — use 1-2 seconds BEFORE the call start time
- `alpha` (over-subtraction factor): start at 1.0, increase if noise persists. Above 2.0 causes artifacts
- `beta` (spectral floor): typically 0.01-0.1. Too low = musical noise (random tones). Too high = residual noise

#### 1.3c Car Noise — Bandpass Pre-Emphasis

```python
def car_noise_preemphasis(audio, sr=44100):
    """
    Mild high-pass emphasis to reduce car engine/drive train low-freq rumble.
    
    Unlike generators (tonal) or airplanes (broadband stationary), car noise is:
    - Semi-stationary (varies with engine RPM)
    - Has tonal components at engine firing frequency
    - Strong below 200 Hz
    
    Strategy: Gentle high-pass filter that preserves elephant harmonics
    but reduces the strongest car noise floor.
    
    This is a PRE-processing step — the deep learning model handles
    the actual separation.
    """
    from scipy.signal import butter, sosfiltfilt
    
    # Very gentle 2nd-order Butterworth high-pass at 8 Hz
    # Preserves elephant F0 (10-20 Hz) but removes sub-8 Hz rumble
    sos = butter(2, 8, btype='high', fs=sr, output='sos')
    filtered = sosfiltfilt(sos, audio)
    
    return filtered
```

### 1.4 Layer 1 Integration

```python
def preprocess(audio, sr, noise_type, call_start_time, call_end_time,
               n_fft=16384, hop_length=512):
    """
    Full Layer 1 preprocessing pipeline.
    
    Parameters:
        audio: raw audio array
        sr: sample rate
        noise_type: 'airplane', 'car', or 'generator'
        call_start_time: seconds
        call_end_time: seconds
    
    Returns:
        frequencies, times, Zxx: STFT of preprocessed audio
    """
    # Step 1: Noise-type-specific filtering
    if noise_type == 'generator':
        audio = remove_generator_harmonics(audio, sr, fundamental=50)
    elif noise_type == 'car':
        audio = car_noise_preemphasis(audio, sr)
    elif noise_type == 'airplane':
        pass  # Airplane handled in spectral domain (Step 3)
    
    # Step 2: Compute STFT
    hop_samples = int(hop_length)
    frame_start = int((call_start_time - 1.0) * sr / hop_samples)  # 1 sec before call
    frame_end = int((call_end_time + 1.0) * sr / hop_samples)     # 1 sec after call
    
    # Step 3: Spectral subtraction for airplanes
    frequencies, times, Zxx = compute_stft(audio, sr, n_fft, hop_length)
    
    if noise_type == 'airplane' and frame_start > 0:
        Zxx = spectral_subtraction(Zxx, 
                                   max(0, frame_start), 
                                   min(frame_start + int(1.0 * sr / hop_samples), Zxx.shape[1]))
    
    return frequencies, times, Zxx
```

---

## LAYER 2: Source Separation

### Two-Track Approach
1. **Track A (Classical)**: NMF separation — fast, interpretable, no GPU needed
2. **Track B (Deep Learning)**: Fine-tuned Demucs/DPRNN — higher quality, needs GPU

### 2.1 Track A: NMF Separation

**Tool**: `sklearn.decomposition.NMF` + `librosa`

**How NMF works (plain English)**:
1. Take the spectrogram (a 2D image of frequency vs time)
2. Decompose it into: **Basis spectra** (W) × **Time activations** (H)
3. W = what each source "sounds like" (its frequency fingerprint)
4. H = when each source is active (temporal pattern)
5. Force this to use a small number of components (e.g., 3 = elephant, noise, other)
6. Identify which component is the elephant by checking: which one is active during the labeled call time?

```python
# src/layer2_separate.py

from sklearn.decomposition import NMF
import librosa

class NMFSeparator:
    """
    Non-negative Matrix Factorization separator for elephant rumbles.
    
    Algorithm:
    - Input: Power spectrogram S (n_freqs × n_times)
    - Decompose: S ≈ W × H where W ≥ 0, H ≥ 0
    - W: (n_freqs × n_components) — spectral dictionary (what each source looks like)
    - H: (n_components × n_times) — activations (when each source is active)
    - Identify elephant component from call timing annotations
    - Reconstruct elephant-only spectrogram: S_elephant = W_elephant × H_elephant
    """
    
    def __init__(self, n_components=3, max_iter=1000, random_state=42):
        self.n_components = n_components
        self.model = NMF(
            n_components=n_components,
            init='nndsvda',      # NNDSVD with zeros filled (better than random)
            max_iter=max_iter,
            random_state=random_state,
            beta_loss='frobenius',  # Standard Euclidean distance
            solver='mu',            # Multiplicative update (good for sparse data)
        )
    
    def separate(self, Zxx, sr, call_start_time, call_end_time, hop_length=512):
        """
        Perform NMF separation and identify the elephant component.
        
        Parameters:
            Zxx: complex STFT matrix (n_freqs × n_times)
            sr: sample rate
            call_start_time: seconds when elephant call starts
            call_end_time: seconds when elephant call ends
            hop_length: STFT hop length
        
        Returns:
            elephant_Zxx: complex STFT of isolated elephant
            elephant_audio: time-domain elephant audio
            component_info: dict with component analysis
        """
        # Use power spectrogram (better for NMF)
        S = np.abs(Zxx) ** 2
        
        # Decompose
        W = self.model.fit_transform(S)  # (n_freqs × n_components)
        H = self.model.components_        # (n_components × n_times)
        
        # Time frames corresponding to the call
        call_start_frame = int(call_start_time * sr / hop_length)
        call_end_frame = int(call_end_time * sr / hop_length)
        n_frames = S.shape[1]
        
        # Before-call frames (noise reference)
        before_frames = slice(max(0, call_start_frame - int(0.5*sr/hop_length)), 
                              max(0, call_start_frame))
        
        # During-call frames
        during_frames = slice(call_start_frame, min(call_end_frame, n_frames))
        
        # Identify elephant component:
        # The elephant component should have HIGH energy during call, LOW energy before
        ratios = []
        for i in range(self.n_components):
            energy_during = np.mean(H[i, during_frames]) + 1e-10
            energy_before = np.mean(H[i, before_frames]) + 1e-10
            ratios.append(energy_during / energy_before)
        
        elephant_idx = np.argmax(ratios)
        
        # Reconstruct elephant source
        elephant_S = W[:, elephant_idx:elephant_idx+1] @ H[elephant_idx:elephant_idx+1, :]
        elephant_magnitude = np.sqrt(elephant_S)  # Convert power → magnitude
        
        # Use original phase for reconstruction
        phase = np.angle(Zxx)
        elephant_Zxx = elephant_magnitude * phase
        
        # Inverse STFT to get audio
        from scipy.signal import istft
        elephant_audio, _ = istft(elephant_Zxx, fs=sr, nperseg=Zxx.shape[0]*2-1,
                                   noverlap=(Zxx.shape[0]*2-1) - hop_length)
        
        component_info = {
            'elephant_idx': elephant_idx,
            'ratios': ratios,
            'W': W,
            'H': H,
            'n_components': self.n_components,
        }
        
        return elephant_Zxx, elephant_audio, component_info
```

**NMF Hyperparameter Tuning Guide**:

| Parameter | What It Does | Recommended Range | Effect of Increasing |
|-----------|-------------|-------------------|---------------------|
| `n_components` | Number of sources to separate | 2-5 | More = more granular, but harder to identify elephant |
| `max_iter` | Optimization iterations | 200-2000 | More = better convergence, but diminishing returns |
| `beta_loss` | Divergence measure | 'frobenius', 'kullback-leibler', 'itakura-saito' | KL/IS better for audio, Frobenius faster |
| `solver` | Optimization algorithm | 'mu', 'cd' | 'mu' = multiplicative update, better for sparse |
| `alpha` | Sparsity regularization | 0-1 | More = sparser components = sharper separation |

**Recommended NMF configurations by noise type**:

| Noise Type | n_components | beta_loss | alpha | Notes |
|-----------|-------------|-----------|-------|-------|
| Generator | 4 | 'itakura-saito' | 0.1 | Generator + elephant + wind + other |
| Airplane | 3 | 'kullback-leibler' | 0.05 | Airplane + elephant + other |
| Car | 3 | 'frobenius' | 0.1 | Engine + elephant + other |

### 2.2 Track B: Deep Learning — Demucs Fine-Tuning

**Tool**: `demucs` (PyTorch)

#### How Demucs Works (Architecture)

```
Input Audio (44100 Hz, mono)
    │
    ├─── Spectrogram Branch ────┐
    │   STFT → U-Net Encoder    │
    │   (spectrogram features)   │
    │                            ├── Cross-Domain ──→ U-Net Decoder ──→ ISTFT ──┐
    └─── Waveform Branch ───────┘    Transformer                                  │
        1D Conv → U-Net Encoder                                                Combine
        (waveform features)                                                         │
                                                                             Output Audio
                                                                        (elephant + noise stems)
```

**Key concepts**:
- **U-Net**: Encoder-decoder with skip connections. Encoder shrinks the representation, decoder expands it back. Skip connections preserve detail.
- **Hybrid**: Processes both spectrogram (frequency) and waveform (time) representations
- **Cross-domain Transformer**: The "brain" — uses attention to connect what it learns from frequency domain to what it learns from time domain
- **Output**: N separate audio stems (in our case, 2: elephant + noise)

#### Setup & Fine-Tuning

```python
# src/layer2_separate.py (continued)

import torch
import torchaudio
from demucs.pretrained import get_model
from demucs.apply import apply_model

class DemucsElephantSeparator:
    """
    Fine-tuned Demucs for elephant/noise separation.
    
    Strategy:
    1. Load pretrained Demucs (trained on music — strong harmonic separation prior)
    2. Modify for 2-source output (elephant vs noise)
    3. Fine-tune on 44 recordings with augmentation
    4. Use as the primary separation engine
    """
    
    def __init__(self, model_name='htdemucs', device=None):
        """
        Parameters:
            model_name: 'htdemucs' (best), 'hdemucs' (faster), 'demucs' (fastest)
            device: 'cuda' for GPU, 'cpu' for CPU, None = auto-detect
        """
        self.device = device or ('cuda' if torch.cuda.is_available() else 'cpu')
        
        # Load pretrained model
        self.model = get_model(model_name)
        self.model.to(self.device)
        self.model.eval()
        
        # The pretrained model outputs 4 stems: drums, bass, other, vocals
        # For elephant separation, we map:
        #   bass → closest to elephant rumbles (low frequency harmonic content)
        #   other → likely contains the noise
        # This is our zero-shot starting point
    
    def separate(self, audio_path, output_dir='results/separated_calls'):
        """
        Separate a recording into elephant and noise stems.
        
        Parameters:
            audio_path: path to WAV file
            output_dir: where to save separated stems
        
        Returns:
            elephant_audio: numpy array of isolated elephant
            noise_audio: numpy array of isolated noise
        """
        # Load audio
        wav, sr = torchaudio.load(audio_path)
        wav = wav.mean(dim=0, keepdim=True)  # Mix to mono
        wav = wav.to(self.device)
        
        # Apply model
        # apply_model handles the full pipeline: load → separate → save
        refs = apply_model(self.model, wav[None], 
                          device=self.device, 
                          split=True,    # Process in chunks to save memory
                          overlap=0.25,  # 25% overlap between chunks
                          progress=True)
        
        # refs shape: (1, n_sources, n_channels, n_samples)
        # With htdemucs: sources are [drums, bass, other, vocals]
        
        sources = refs[0].squeeze(1).cpu().numpy()  # (n_sources, n_samples)
        
        # Initial mapping (before fine-tuning):
        # For elephant rumbles (low freq harmonic), 'bass' stem is closest
        # 'other' stem likely contains mechanical noise
        bass_idx = 1   # Index of bass in htdemucs
        other_idx = 2  # Index of other
        
        elephant_audio = sources[bass_idx]
        noise_audio = sources[other_idx]
        
        return elephant_audio, noise_audio
```

#### Fine-Tuning Demucs for 2-Source Elephant Separation

```python
def fine_tune_demucs(model, train_loader, val_loader, num_epochs=50, 
                     lr=1e-4, device='cuda'):
    """
    Fine-tune Demucs on elephant recordings.
    
    Key modifications:
    1. Change output from 4 sources → 2 sources (elephant, noise)
    2. Train with weakly supervised loss (no clean targets available)
    3. Use data augmentation to compensate for small dataset
    
    Loss function strategy (weakly supervised):
    - We DON'T have clean elephant targets
    - We DO know WHEN the elephant is calling (start/end times)
    - We DO have noise-only segments (before/after the call)
    
    Training approach:
    - During call: model output should contain harmonic content
    - Before/after call: model 'elephant' output should be silent
    - Use spectral coherence loss: elephant output should have harmonic structure
    """
    import torch.optim as optim
    from torch.nn.functional import mse_loss
    
    # Modify model for 2 sources
    # (This requires modifying the Demucs source code — change n_sources=4 → 2)
    # For the hackathon, an easier approach:
    # Use the 4-source model, then POST-PROCESS to combine relevant stems
    
    optimizer = optim.Adam(model.parameters(), lr=lr)
    scheduler = optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=num_epochs)
    
    best_loss = float('inf')
    
    for epoch in range(num_epochs):
        model.train()
        epoch_loss = 0
        
        for batch in train_loader:
            noisy_audio, call_mask, noise_mask = batch
            noisy_audio = noisy_audio.to(device)
            call_mask = call_mask.to(device)    # 1 during call, 0 otherwise
            noise_mask = noise_mask.to(device)  # 1 during noise-only, 0 otherwise
            
            # Forward pass
            sources = model(noisy_audio)  # (batch, 2, channels, samples)
            elephant_est = sources[:, 0]  # Estimated elephant
            noise_est = sources[:, 1]     # Estimated noise
            
            # Loss 1: Elephant should be silent during noise-only segments
            elephant_during_noise = elephant_est * (1 - call_mask)
            silence_loss = mse_loss(elephant_during_noise, torch.zeros_like(elephant_during_noise))
            
            # Loss 2: Total reconstruction should match input
            reconstruction = elephant_est + noise_est
            recon_loss = mse_loss(reconstruction, noisy_audio)
            
            # Loss 3: Elephant should preserve harmonic structure during call
            # (spectral coherence — harmonics at integer multiples of F0)
            harmonic_loss = compute_harmonic_coherence_loss(
                elephant_est * call_mask, sr=44100
            )
            
            # Total loss
            loss = silence_loss + 0.5 * recon_loss + 0.1 * harmonic_loss
            
            optimizer.zero_grad()
            loss.backward()
            optimizer.step()
            
            epoch_loss += loss.item()
        
        scheduler.step()
        
        # Validation
        val_loss = validate(model, val_loader, device)
        print(f"Epoch {epoch}: train={epoch_loss/len(train_loader):.4f}, val={val_loss:.4f}")
        
        if val_loss < best_loss:
            best_loss = val_loss
            torch.save(model.state_dict(), 'models/saved_models/best_demucs.pt')
    
    return model
```

### 2.3 Track C: Lightweight Alternative — DPRNN via Asteroid

**Tool**: `asteroid` (PyTorch toolkit)

**When to use this instead of Demucs**:
- No GPU available (DPRNN runs reasonably on CPU)
- Faster iteration needed
- Prefer a modular/research-friendly framework

**How DPRNN works**:
```
Input Audio → Conv Encoder (learned filterbank) → 
    DPRNN Separator (Dual-Path RNN):
        ├── Intra-chunk RNN: processes temporal patterns within each chunk
        └── Inter-chunk RNN: processes patterns across chunks
    → Mask estimation → Apply mask → Conv Decoder → Output
```

```python
from asteroid.models import DPRNN
from asteroid.losses import PITLossWrapper, pairwise_neg_sisdr
from asteroid.engine import System

def setup_dprnn():
    """
    Setup DPRNN model via Asteroid.
    
    DPRNN advantages for elephant separation:
    - Processes raw waveform (no STFT — avoids window size trade-offs)
    - Dual-path RNN captures both local (intra-chunk) and global (inter-chunk) patterns
    - Elephant rumbles are long-duration signals — inter-chunk RNN captures this
    - Much lighter than Demucs — faster training and inference
    """
    model = DPRNN(
        n_src=2,               # 2 sources: elephant + noise
        rnn_type='lstm',       # LSTM captures temporal dependencies well
        hidden_size=128,       # Model capacity (increase if GPU available)
        num_layers=4,          # RNN depth
        bidirectional=True,    # Process forward + backward in time
        n_repeats=4,           # Number of dual-path iterations
        kernel_size=3,         # 1D conv kernel in the RNN
        norm_type='gLN',       # Global Layer Norm (works well for variable-length audio)
        mask_nonlinear='softmax',  # Softmax ensures masks sum to 1
    )
    return model

def train_dprnn(model, train_dataset, val_dataset):
    """
    Train DPRNN using Asteroid's System class.
    
    System handles:
    - Optimizer setup
    - Training loop
    - Validation
    - Checkpointing
    - Logging to TensorBoard
    """
    loss_func = PITLossWrapper(pairwise_neg_sisdr, pit_from='pw_mtx')
    
    system = System(
        model=model,
        loss_func=loss_func,
        optimizer='adam',
        lr=1e-3,
    )
    
    # Train
    system.fit(
        train_dataset,
        val_dataset,
        epochs=100,
        batch_size=4,       # Small batch (small dataset)
        num_workers=2,
        checkpoint_path='models/saved_models/dprnn/',
    )
    
    return system
```

**Navigation — Asteroid Key Classes**:

| Class | Role | When to Use |
|-------|------|-------------|
| `DPRNN` | Dual-Path RNN separator | Best for small datasets, CPU-friendly |
| `ConvTasNet` | Convolutional separator | Fast, good baseline |
| `DPTNet` | Dual-Path Transformer | Better long-range modeling |
| `PITLossWrapper` | Permutation Invariant Training loss | Always use with unknown source ordering |
| `pairwise_neg_sisdr` | SDR-based loss | Standard for separation training |
| `System` | Training loop manager | Wraps model + loss + optimizer |

### 2.4 Data Pipeline & Augmentation

**Tool**: `audiomentations`

```python
# src/dataset.py

import torch
from torch.utils.data import Dataset, DataLoader
import audiomentations
import pandas as pd
import soundfile as sf
import numpy as np
import librosa

class ElephantCallDataset(Dataset):
    """
    Dataset for elephant rumble separation training.
    
    Each sample consists of:
    - Input: A segment of noisy audio containing an elephant call
    - Call mask: Binary mask indicating when the elephant is calling
    - Noise reference: A segment of audio without elephant (noise-only)
    
    This is a WEAKLY SUPERVISED setup — we don't have clean targets.
    The model learns by knowing WHEN the elephant is active vs not.
    """
    
    def __init__(self, annotations_csv, recordings_dir, sr=44100, 
                 segment_duration=8.0, augment=True):
        """
        Parameters:
            annotations_csv: CSV with columns [filename, start_time, end_time, noise_type]
            recordings_dir: path to WAV files
            sr: sample rate
            segment_duration: length of each training segment in seconds
            augment: whether to apply data augmentation
        """
        self.df = pd.read_csv(annotations_csv)
        self.recordings_dir = recordings_dir
        self.sr = sr
        self.segment_samples = int(segment_duration * sr)
        self.augment = augment
        
        # Augmentation pipeline
        self.augmentor = audiomentations.Compose([
            audiomentations.AddGaussianNoise(
                min_amplitude=0.001, max_amplitude=0.015, p=0.5
            ),
            audiomentations.TimeStretch(
                min_rate=0.8, max_rate=1.25, p=0.5
            ),
            audiomentations.PitchShift(
                min_semitones=-2, max_semitones=2, p=0.3
            ),
            audiomentations.Gain(
                min_gain_in_db=-12, max_gain_in_db=12, p=0.7
            ),
            audiomentations.Shift(min_fraction=-0.2, max_fraction=0.2, p=0.5),
            audiomentations.Fade(min_gain_db=-30, max_gain_db=0, p=0.3),
        ])
        
        # Cache loaded audio to avoid repeated I/O
        self._cache = {}
    
    def _load_audio(self, filename):
        if filename not in self._cache:
            path = f"{self.recordings_dir}/{filename}"
            audio, _ = librosa.load(path, sr=self.sr, mono=True)
            self._cache[filename] = audio
        return self._cache[filename].copy()
    
    def __len__(self):
        return len(self.df) * 5  # 5x through augmentation variety
    
    def __getitem__(self, idx):
        row = self.df.iloc[idx % len(self.df)]
        
        # Load full recording
        audio = self._load_audio(row['filename'])
        total_samples = len(audio)
        
        call_start = int(row['start_time'] * self.sr)
        call_end = int(row['end_time'] * self.sr)
        
        # Center segment around the call
        call_center = (call_start + call_end) // 2
        seg_start = max(0, call_center - self.segment_samples // 2)
        seg_end = min(total_samples, seg_start + self.segment_samples)
        
        if seg_end - seg_start < self.segment_samples:
            # Pad if recording is shorter than segment
            pad_length = self.segment_samples - (seg_end - seg_start)
            audio_seg = np.pad(audio[seg_start:seg_end], (0, pad_length))
            offset = seg_start
        else:
            audio_seg = audio[seg_start:seg_end]
            offset = seg_start
        
        # Create call mask (1 during elephant call, 0 otherwise)
        call_mask = np.zeros(self.segment_samples)
        local_call_start = max(0, call_start - offset)
        local_call_end = min(self.segment_samples, call_end - offset)
        call_mask[local_call_start:local_call_end] = 1.0
        
        # Create noise reference mask (1 for noise-only regions)
        noise_mask = 1.0 - call_mask
        
        # Apply augmentation
        if self.augment:
            audio_seg = self.augmentor(samples=audio_seg, sample_rate=self.sr)
        
        # Convert to tensors
        audio_tensor = torch.FloatTensor(audio_seg).unsqueeze(0)  # (1, samples)
        call_mask_tensor = torch.FloatTensor(call_mask).unsqueeze(0)
        
        return audio_tensor, call_mask_tensor
```

**Augmentation Strategy Explained**:

| Augmentation | What It Does | Why It Helps |
|-------------|-------------|-------------|
| `AddGaussianNoise` | Adds random white noise | Makes model robust to sensor noise |
| `TimeStretch` | Speeds up/slows down audio | Simulates different elephant sizes/distances |
| `PitchShift` | Shifts pitch ±2 semitones | Simulates different elephants (different F0) |
| `Gain` | Random volume change | Normalizes volume variation across recordings |
| `Shift` | Shifts audio in time | Simulates different recording positions |
| `Fade` | Fades in/out edges | Reduces edge artifacts in segments |

---

## LAYER 3: Post-Processing

### What It Does
Takes the separated output from Layer 2 and enhances it using domain knowledge about elephant vocalizations.

### 3.1 Fundamental Frequency (F0) Tracking

**Tool**: `librosa.pyin`

```python
# src/layer3_postprocess.py

import librosa
import numpy as np

def track_f0(audio, sr=44100, fmin=8, fmax=25):
    """
    Track the fundamental frequency of an elephant rumble.
    
    How pYIN works:
    - Probabilistic extension of YIN pitch tracker
    - YIN: measures the periodicity of the signal
    - pYIN: outputs a probability distribution over possible F0 values
    - More robust than autocorrelation in noisy conditions
    
    Parameters:
        audio: separated elephant audio
        sr: sample rate
        fmin: minimum expected F0 (elephants: ~8 Hz — some individuals go lower)
        fmax: maximum expected F0 (elephants: ~25 Hz)
    
    Returns:
        f0_array: array of F0 values per frame (NaN where no pitch detected)
        voiced_flag: boolean array (True where pitch detected)
        voiced_probs: probability of voiced detection
    """
    f0, voiced_flag, voiced_probs = librosa.pyin(
        audio, 
        fmin=fmin, 
        fmax=fmax,
        sr=sr,
        frame_length=8192,  # Long frame for low-frequency resolution
        hop_length=512,
    )
    return f0, voiced_flag, voiced_probs
```

### 3.2 Harmonic Enhancement Filter

**Tool**: Custom implementation using `scipy.signal` + `librosa`

```python
def harmonic_enhance(audio, sr, f0_array, n_harmonics=50, bandwidth=3.0):
    """
    Reinforce only the harmonic frequencies of an elephant rumble.
    Suppress everything else.
    
    How it works:
    1. For each time frame, use the tracked F0 to calculate harmonic frequencies
       H_n = n × F0 (n = 1, 2, 3, ...)
    2. Design a comb filter that passes only at harmonic frequencies
    3. Apply the filter to the separated audio
    
    Why this matters:
    - Elephant rumbles are HARMONIC — energy exists only at integer multiples of F0
    - Any remaining noise is likely NOT harmonic at the elephant's F0
    - This filter exploits this structure to clean up residual noise
    
    Parameters:
        audio: separated elephant audio
        sr: sample rate
        f0_array: per-frame F0 values from track_f0()
        n_harmonics: number of harmonics to preserve
        bandwidth: Hz width of each harmonic band
    
    Returns:
        enhanced_audio: harmonically cleaned elephant audio
    """
    from scipy.signal import butter, sosfiltfilt
    
    enhanced = np.copy(audio)
    
    # Process in frames matching the F0 array
    frame_length = 8192
    hop = 512
    
    for i, f0 in enumerate(f0_array):
        if np.isnan(f0):
            continue  # Skip unvoiced frames
        
        start = i * hop
        end = min(start + frame_length, len(audio))
        frame = audio[start:end]
        
        if len(frame) == 0:
            continue
        
        # Compute STFT of this frame
        freqs = np.fft.rfftfreq(len(frame), 1/sr)
        frame_fft = np.fft.rfft(frame)
        magnitude = np.abs(frame_fft)
        phase = np.angle(frame_fft)
        
        # Create harmonic mask
        harmonic_mask = np.zeros_like(magnitude)
        for h in range(1, n_harmonics + 1):
            harm_freq = h * f0
            if harm_freq > sr / 2:
                break
            # Gaussian-shaped band around each harmonic
            harmonic_mask += np.exp(-0.5 * ((freqs - harm_freq) / bandwidth) ** 2)
        
        # Apply mask
        harmonic_mask = np.minimum(harmonic_mask, 1.0)
        enhanced_fft = magnitude * harmonic_mask * np.exp(1j * phase)
        enhanced[start:end] = np.fft.irfft(enhanced_fft, n=len(frame))
    
    return enhanced
```

### 3.3 Temporal Smoothing

```python
def temporal_smooth(audio, sr, smoothing_ms=50):
    """
    Smooth the audio to remove transient artifacts.
    
    Elephant rumbles are continuous, smooth signals.
    Sharp transients are likely artifacts from separation.
    A gentle low-pass filter in the time domain removes these.
    
    Parameters:
        audio: elephant audio
        sr: sample rate
        smoothing_ms: smoothing time constant in milliseconds
    """
    from scipy.signal import butter, sosfiltfilt
    
    # Low-pass at 1/smoothing_ms Hz for envelope smoothing
    cutoff = 1.0 / (smoothing_ms / 1000.0)
    if cutoff < sr / 2:
        sos = butter(2, cutoff, btype='low', fs=sr, output='sos')
        smoothed = sosfiltfilt(sos, audio)
    else:
        smoothed = audio
    
    return smoothed
```

### 3.4 Layer 3 Full Pipeline

```python
def postprocess(separated_audio, sr, n_harmonics=50):
    """
    Full Layer 3 post-processing pipeline.
    
    Steps:
    1. Track F0 (fundamental frequency trajectory)
    2. Apply harmonic enhancement filter
    3. Apply temporal smoothing
    4. Normalize output level
    """
    # Step 1: F0 tracking
    f0, voiced_flag, voiced_probs = track_f0(separated_audio, sr)
    
    # Step 2: Harmonic enhancement
    enhanced = harmonic_enhance(separated_audio, sr, f0, n_harmonics)
    
    # Step 3: Temporal smoothing
    smoothed = temporal_smooth(enhanced, sr)
    
    # Step 4: Normalize
    smoothed = smoothed / (np.max(np.abs(smoothed)) + 1e-10) * 0.9
    
    return smoothed, f0, voiced_flag
```

---

## Feature Matching & PCA Analysis

### Purpose
Compare separated elephant calls against known clean calls to:
1. **Validate separation quality** — does the separated call look like a real elephant call?
2. **Categorize calls** — group similar calls together
3. **Identify noise residue** — flag calls that still have significant noise contamination

### Tool: `scikit-learn` PCA + `librosa` features

```python
# src/feature_matching.py

import numpy as np
from sklearn.decomposition import PCA
from sklearn.preprocessing import StandardScaler
from sklearn.metrics.pairwise import cosine_similarity
import librosa

def extract_features(audio, sr=44100):
    """
    Extract a feature vector from an elephant call for comparison.
    
    Features extracted:
    1. MFCCs (Mel-frequency cepstral coefficients) — 13 coefficients
       → Captures timbral characteristics (spectral envelope)
    2. Spectral centroid — 1 value
       → Brightness/dominant frequency
    3. Spectral bandwidth — 1 value
       → Frequency spread
    4. Spectral flatness — 1 value
       → Tonality (low = tonal, high = noisy)
    5. F0 statistics — 3 values (mean, std, range)
       → Pitch characteristics
    6. RMS energy — 1 value
       → Loudness
    
    Total: 20-dimensional feature vector
    """
    # MFCCs
    mfccs = librosa.feature.mfcc(y=audio, sr=sr, n_mfcc=13, n_fft=4096, hop_length=512)
    mfcc_mean = np.mean(mfccs, axis=1)  # (13,)
    mfcc_std = np.std(mfccs, axis=1)    # (13,)
    
    # Spectral features
    spec_centroid = librosa.feature.spectral_centroid(y=audio, sr=sr, n_fft=4096, hop_length=512)
    spec_bandwidth = librosa.feature.spectral_bandwidth(y=audio, sr=sr, n_fft=4096, hop_length=512)
    spec_flatness = librosa.feature.spectral_flatness(y=audio, n_fft=4096, hop_length=512)
    rms = librosa.feature.rms(y=audio, frame_length=4096, hop_length=512)
    
    # F0 tracking
    f0, _, _ = librosa.pyin(audio, fmin=8, fmax=25, sr=sr, frame_length=8192, hop_length=512)
    f0_valid = f0[~np.isnan(f0)]
    
    # Assemble feature vector
    features = np.concatenate([
        mfcc_mean,                          # 13 values
        [np.mean(spec_centroid)],           # 1 value
        [np.mean(spec_bandwidth)],          # 1 value
        [np.mean(spec_flatness)],           # 1 value
        [np.mean(f0_valid) if len(f0_valid) > 0 else 0],  # mean F0
        [np.std(f0_valid) if len(f0_valid) > 0 else 0],   # F0 std
        [np.max(f0_valid) - np.min(f0_valid) if len(f0_valid) > 0 else 0],  # F0 range
        [np.mean(rms)],                     # RMS energy
    ])
    
    return features


class ElephantCallMatcher:
    """
    PCA-based feature matching for elephant calls.
    
    Workflow:
    1. Extract features from all separated calls (test samples)
    2. Extract features from clean reference calls (known good calls)
    3. Apply PCA to reduce dimensions and visualize clustering
    4. Compute cosine similarity between each test call and reference calls
    5. Flag calls with low similarity (likely still contaminated)
    """
    
    def __init__(self, n_components=3):
        self.pca = PCA(n_components=n_components)
        self.scaler = StandardScaler()
        self.reference_features = None
        self.reference_labels = None
    
    def fit_reference(self, reference_audios, reference_labels, sr=44100):
        """
        Build the reference database from clean, known-good elephant calls.
        
        Parameters:
            reference_audios: dict of {label: audio_array}
            reference_labels: list of call type labels
            sr: sample rate
        """
        features = []
        labels = []
        
        for label, audio in reference_audios.items():
            feat = extract_features(audio, sr)
            features.append(feat)
            labels.append(label)
        
        self.reference_features = np.array(features)
        self.reference_labels = np.array(labels)
        
        # Fit PCA on reference features
        self.scaler.fit(self.reference_features)
        scaled = self.scaler.transform(self.reference_features)
        self.pca.fit(scaled)
    
    def match(self, test_audio, sr=44100):
        """
        Compare a test (separated) call against the reference database.
        
        Parameters:
            test_audio: separated elephant call audio
            sr: sample rate
        
        Returns:
            similarity_scores: cosine similarity to each reference call
            best_match_idx: index of closest reference call
            best_match_label: label of closest reference
            pca_coords: PCA coordinates for visualization
            contamination_score: 0-1 score (higher = more likely contaminated)
        """
        test_feat = extract_features(test_audio, sr)
        test_scaled = self.scaler.transform([test_feat])
        test_pca = self.pca.transform(test_scaled)
        
        ref_scaled = self.scaler.transform(self.reference_features)
        
        # Cosine similarity to each reference
        similarities = cosine_similarity(test_scaled, ref_scaled)[0]
        
        best_idx = np.argmax(similarities)
        
        # Contamination score: based on spectral flatness
        # Clean elephant calls are tonal (low flatness)
        # Contaminated calls are noisier (higher flatness)
        from librosa.feature import spectral_flatness
        flatness = np.mean(spectral_flatness(y=test_audio, n_fft=4096, hop_length=512))
        
        # Reference flatness baseline
        ref_flatnesses = []
        for _, audio in self.reference_audios.items():
            ref_flatnesses.append(np.mean(spectral_flatness(y=audio, n_fft=4096, hop_length=512)))
        avg_ref_flatness = np.mean(ref_flatnesses)
        
        contamination_score = min(1.0, max(0.0, (flatness - avg_ref_flatness) / 0.3))
        
        return {
            'similarity_scores': similarities,
            'best_match_idx': best_idx,
            'best_match_label': self.reference_labels[best_idx],
            'best_match_score': similarities[best_idx],
            'pca_coords': test_pca[0],
            'contamination_score': contamination_score,
        }
    
    def visualize_pca(self, test_audios=None, save_path='results/pca_analysis.png'):
        """
        Visualize PCA projection of reference and test calls.
        
        - Reference calls: colored circles
        - Test calls: colored triangles with contamination score as alpha
        """
        import matplotlib.pyplot as plt
        
        ref_scaled = self.scaler.transform(self.reference_features)
        ref_pca = self.pca.transform(ref_scaled)
        
        fig = plt.figure(figsize=(12, 8))
        ax = fig.add_subplot(111, projection='3d')
        
        # Plot reference calls
        for i, label in enumerate(self.reference_labels):
            ax.scatter(ref_pca[i, 0], ref_pca[i, 1], ref_pca[i, 2],
                      c='green', marker='o', s=100, label=f'Ref: {label}' if i == 0 else '')
        
        # Plot test calls
        if test_audios:
            for i, (label, audio) in enumerate(test_audios.items()):
                feat = extract_features(audio)
                scaled = self.scaler.transform([feat])
                pca = self.pca.transform(scaled)
                result = self.match(audio)
                ax.scatter(pca[0, 0], pca[0, 1], pca[0, 2],
                          c='red', marker='^', s=100,
                          alpha=1.0 - result['contamination_score'])
                ax.text(pca[0, 0], pca[0, 1], pca[0, 2], label, fontsize=8)
        
        ax.set_xlabel('PC1')
        ax.set_ylabel('PC2')
        ax.set_zlabel('PC3')
        ax.set_title('Elephant Call Feature Space (PCA)')
        plt.savefig(save_path, dpi=150)
        plt.close()
```

---

## Evaluation Metrics

### Tool: `mir_eval`

```python
# src/evaluate.py

import numpy as np
import mir_eval

def evaluate_separation(estimated, reference, sr=44100):
    """
    Compute source separation quality metrics.
    
    Parameters:
        estimated: separated elephant audio
        reference: ground truth clean elephant audio (if available)
                   OR the original mixed audio (for partial metrics)
        sr: sample rate
    
    Returns:
        metrics: dict of SDR, SIR, SAR scores
    """
    if reference is not None:
        # True reference available — full evaluation
        estimated = estimated[:len(reference)]
        reference = reference[:len(estimated)]
        
        sdr, sir, sar, _ = mir_eval.separation.bss_eval_sources(
            reference[np.newaxis, :], estimated[np.newaxis, :]
        )
        
        return {
            'SDR': sdr[0],
            'SIR': sir[0],
            'SAR': sar[0],
        }
    else:
        # No clean reference — use proxy metrics
        return {
            'harmonic_score': compute_harmonic_fidelity(estimated, sr),
            'spectral_flatness': np.mean(librosa.feature.spectral_flatness(y=estimated)),
            'snr_estimate': estimate_snr(estimated),
        }

def compute_harmonic_fidelity(audio, sr=44100):
    """
    Measure how well harmonic structure is preserved.
    
    A clean elephant rumble should have:
    - Strong energy at harmonic frequencies (n × F0)
    - Low energy at non-harmonic frequencies
    - Smooth F0 trajectory
    
    Returns:
        score: 0-1 (1 = perfect harmonic structure)
    """
    f0, voiced_flag, _ = librosa.pyin(audio, fmin=8, fmax=25, sr=sr, 
                                        frame_length=8192, hop_length=512)
    f0_valid = f0[~np.isnan(f0)]
    
    if len(f0_valid) == 0:
        return 0.0
    
    # Compute spectrogram
    S = np.abs(librosa.stft(audio, n_fft=4096, hop_length=512))
    freqs = librosa.fft_frequencies(sr=sr, n_fft=4096)
    
    # Measure energy at harmonic vs non-harmonic frequencies
    harmonic_energy = 0
    total_energy = 0
    
    for f0_val in f0_valid[::10]:  # Sample every 10th frame
        for h in range(1, 30):
            harm_freq = h * f0_val
            if harm_freq > sr / 2:
                break
            # Find closest frequency bin
            idx = np.argmin(np.abs(freqs - harm_freq))
            harmonic_energy += S[idx, :]
    
    total_energy = np.sum(S)
    
    return harmonic_energy / (total_energy + 1e-10)
```

---

## Visualization

### Tool: `matplotlib` + `librosa.display`

```python
# src/visualize.py

import librosa.display
import matplotlib.pyplot as plt
import numpy as np

def plot_comparison(original_audio, separated_audio, sr, call_start, call_end,
                    title_prefix='', save_path=None):
    """
    Side-by-side spectrogram comparison: before vs after separation.
    
    This is the PRIMARY evaluation format for the hackathon.
    The judges will visually inspect spectrograms.
    """
    fig, axes = plt.subplots(2, 1, figsize=(16, 10))
    
    # --- Original (noisy) ---
    S_orig = librosa.amplitude_to_db(
        np.abs(librosa.stft(original_audio, n_fft=16384, hop_length=512)),
        ref=np.max
    )
    librosa.display.specshow(S_orig, sr=sr, hop_length=512, 
                            x_axis='time', y_axis='hz', ax=axes[0])
    axes[0].axvspan(call_start, call_end, color='lime', alpha=0.2, label='Elephant Call')
    axes[0].set_ylim(0, 1000)
    axes[0].set_title(f'{title_prefix}Original Recording (with noise)')
    axes[0].legend()
    
    # --- Separated (clean) ---
    S_sep = librosa.amplitude_to_db(
        np.abs(librosa.stft(separated_audio, n_fft=16384, hop_length=512)),
        ref=np.max
    )
    librosa.display.specshow(S_sep, sr=sr, hop_length=512,
                            x_axis='time', y_axis='hz', ax=axes[1])
    axes[1].axvspan(0, call_end - call_start, color='lime', alpha=0.2, label='Isolated Call')
    axes[1].set_ylim(0, 1000)
    axes[1].set_title(f'{title_prefix}Separated Elephant Rumble')
    axes[1].legend()
    
    plt.tight_layout()
    
    if save_path:
        plt.savefig(save_path, dpi=150, bbox_inches='tight')
        plt.close()
    
    return fig
```

---

## Using autoresearch-macos for Optimization

### Setup

```bash
# 1. Clone the repo
git clone https://github.com/miolini/autoresearch-macos.git
cd autoresearch-macos

# 2. Install dependencies
curl -LsSf https://astral.sh/uv/install.sh | sh
uv sync

# 3. Modify train.py for elephant separation
#    (Replace the LLM training with separation model training)
#    See train.py content below

# 4. Modify prepare.py for elephant data loading
#    (Replace LLM data with audio data)
```

### Custom train.py (for autoresearch)

```python
# experiments/train.py — Modified for elephant separation

import torch
import torch.nn as nn
import torch.optim as optim
import numpy as np
import time
import sys

class SeparationModel(nn.Module):
    """
    Lightweight spectrogram-based separation model for autoresearch.
    
    The agent will modify this architecture:
    - Number of layers
    - Hidden dimensions
    - Kernel sizes
    - Activation functions
    - Regularization
    """
    def __init__(self, n_freq=2048, n_hidden=256, n_layers=4):
        super().__init__()
        layers = []
        in_ch = 1  # Magnitude spectrogram (single channel)
        
        for i in range(n_layers):
            out_ch = n_hidden if i < n_layers - 1 else 1
            layers.append(nn.Conv1d(in_ch, out_ch, kernel_size=7, padding=3))
            layers.append(nn.ReLU())
            in_ch = out_ch
        
        self.net = nn.Sequential(*layers)
    
    def forward(self, x):
        # x: (batch, 1, n_freq) — one time frame at a time
        mask = torch.sigmoid(self.net(x))  # Output: soft mask [0, 1]
        return mask

# Fixed parameters (DO NOT MODIFY)
TIME_BUDGET = 300  # 5 minutes
EVAL_EVERY = 50

def evaluate(model, val_data):
    """Fixed evaluation — returns metric. DO NOT MODIFY."""
    model.eval()
    total_loss = 0
    count = 0
    with torch.no_grad():
        for noisy_spec, clean_spec, mask in val_data:
            pred_mask = model(noisy_spec)
            reconstructed = pred_mask * noisy_spec
            loss = nn.functional.mse_loss(reconstructed, clean_spec)
            total_loss += loss.item()
            count += 1
    model.train()
    return total_loss / max(count, 1)  # val_loss (lower is better)
```

### Custom program.md (for autoresearch)

```markdown
# Elephant Voice Separation — Autonomous Research

## Context
You are optimizing an audio source separation model for isolating elephant rumbles 
from mechanical noise. Elephant rumbles have fundamentals at 10-20 Hz with harmonics 
to 1000 Hz. Noise types: airplane, car, generator.

## What you CAN modify
- train.py — model architecture, optimizer, hyperparameters, loss function
- Everything in SeparationModel class is fair game

## What you CANNOT modify
- prepare.py — data loading, evaluation
- TIME_BUDGET — always 300 seconds (5 minutes)
- The evaluate() function

## Metric
val_loss — MSE between reconstructed and reference spectrogram. Lower is better.

## Strategy Ideas
- Try different architectures: U-Net, TCN, Transformer
- Try band-split processing (different convolutions for different frequency ranges)
- Try different loss functions: L1, L2, negative SDR, spectral convergence loss
- Try different activation functions: ReLU, LeakyReLU, GELU, PReLU
- Try residual connections
- Try attention mechanisms
- Try deeper vs wider networks
- Try different learning rates and schedules
- Try batch normalization vs layer normalization vs group normalization

## Starting Point
The baseline is a simple 4-layer CNN. Try to improve val_loss from there.
```

---

## Using hermes-agent for Orchestration

### Setup

```bash
curl -fsSL https://raw.githubusercontent.com/NousResearch/hermes-agent/main/scripts/install.sh | bash
source ~/.bashrc
hermes setup  # Interactive setup wizard
```

### Workflow

```bash
# Start hermes
hermes

# Inside hermes, set up the project:
# /skills create elephant-pipeline "Audio separation pipeline for elephant rumbles"
# /cron add "0 */3 * * *" "Check autoresearch results, update training config"
# Spawn sub-agents for parallel work
```

### Integration Architecture

```
hermes-agent (orchestrator)
    │
    ├── Sub-agent 1: Data pipeline
    │   ├── Load recordings + annotations
    │   ├── Apply Layer 1 preprocessing
    │   ├── Generate augmented training samples
    │   └── Save to training format
    │
    ├── Sub-agent 2: Model training (autoresearch)
    │   ├── Run train.py experiments
    │   ├── Log results to results.tsv
    │   └── Save best model checkpoint
    │
    ├── Sub-agent 3: Evaluation & reporting
    │   ├── Run separation on all 44 recordings
    │   ├── Generate before/after spectrograms
    │   ├── Compute quality metrics
    │   └── Feature matching against reference calls
    │
    └── Cron jobs:
        ├── Every 3 hours: Check training progress
        └── Daily: Compile results report
```

---

## Quick Start — Minimal Working Pipeline

```bash
# 1. Install everything
pip install numpy scipy matplotlib librosa soundfile scikit-learn mir_eval

# 2. Run the baseline NMF separation on one recording
python -c "
import numpy as np
import librosa
import soundfile as sf
from sklearn.decomposition import NMF
from scipy.signal import stft, istft

# Load recording
audio, sr = librosa.load('data/recordings/recording_001.wav', sr=44100, mono=True)

# High-res STFT
f, t, Zxx = stft(audio, fs=44100, nperseg=16384, noverlap=16384-512)
S = np.abs(Zxx)**2

# NMF with 3 components
nmf = NMF(n_components=3, init='nndsvda', max_iter=1000, random_state=42)
W = nmf.fit_transform(S)
H = nmf.components_

# Identify elephant component (most active during call)
call_start = int(5.2 * sr / 512)  # Adjust to your annotation
call_end = int(8.7 * sr / 512)
ratios = [np.mean(H[i, call_start:call_end]) / (np.mean(H[i, :call_start]) + 1e-10) for i in range(3)]
elephant_idx = np.argmax(ratios)

# Reconstruct elephant
elephant_S = W[:, elephant_idx:elephant_idx+1] @ H[elephant_idx:elephant_idx+1, :]
elephant_mag = np.sqrt(elephant_S)
elephant_Zxx = elephant_mag * np.exp(1j * np.angle(Zxx))
elephant_audio, _ = istft(elephant_Zxx, fs=44100, nperseg=16384, noverlap=16384-512)

# Save
sf.write('results/separated_calls/recording_001_elephant.wav', elephant_audio, 44100)
print('Done! Saved separated elephant call.')
"
```

---

## Appendix: Algorithm Decision Tree

```
Which separation approach should I use?

┌─ Do you have a GPU?
│   ├─ YES
│   │   ├─ Do you have >44 recordings or augmented data?
│   │   │   ├─ YES → Fine-tune Demucs (best quality)
│   │   │   └─ NO → Use NMF first, then fine-tune Demucs on NMF-boosted targets
│   │   └─ Want overnight optimization?
│   │       └─ YES → autoresearch-macos with custom train.py
│   └─ NO (CPU only)
│       ├─ Need results in <1 hour?
│       │   ├─ YES → NMF (classical, fast)
│       │   └─ NO → DPRNN via Asteroid (better quality, slower)
│       └─ Both tracks → Start with NMF, improve with DPRNN

┌─ What noise type?
│   ├─ Generator → Adaptive notch filter (50/60 Hz) + NMF
│   ├─ Airplane → Spectral subtraction + Demucs
│   └─ Car → Mild HP filter + DPRNN

┌─ Do you have clean reference calls?
│   ├─ YES → Use PCA feature matching for validation
│   └─ NO → Use harmonic fidelity score for self-validation
```

---

*Implementation Guide v1.0 — ElephantVoices Hackathon*
*Date: April 11, 2026*
