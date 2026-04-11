# Elephant Audio Samples & Resources Guide
## Collected for Feature Matching & Test Data

---

## Overview

This document catalogs all discovered audio resources for:
- **Clean elephant call reference samples** (for PCA feature matching baseline)
- **Mixed/noise-contaminated recordings** (for testing separation pipeline)
- **Background noise samples** (airplane, car, generator — for synthetic data augmentation)

---

## ✅ Downloaded: Clean Elephant Calls (Local)

**Location**: `data/clean_elephant_calls/`
**Source**: [HiruDewmi/Audio-Classification-for-Elephant-Sounds](https://github.com/HiruDewmi/Audio-Classification-for-Elephant-Sounds)
**Format**: WAV, 44100 Hz, mono, 32-bit float, ~6 seconds each
**License**: Open source (research use)

| Category | Count | Files | Use |
|----------|-------|-------|-----|
| **Rumbles** | 78 | Rumble01.wav – Rumble111.wav | **Primary reference** — low-frequency harmonic calls |
| **Trumpets** | 72 | Trumpet02.wav – Trumpet64.wav | Secondary reference — high-frequency calls |
| **Roars** | 82 | Roar01.wav – Roar63.wav | Secondary reference — mid-frequency calls |
| **Total** | **232** | | |

**How to use for feature matching**:
```python
# Extract features from all clean calls for PCA reference database
from pathlib import Path
import librosa
import numpy as np

calls = list(Path('data/clean_elephant_calls').glob('Rumble*.wav'))
features = []
labels = []
for path in calls:
    audio, sr = librosa.load(str(path), sr=44100, mono=True)
    feat = extract_features(audio, sr)  # From feature_matching.py
    features.append(feat)
    labels.append(path.stem)
```

---

## 🌐 Online Resources: Elephant Vocalization Datasets

### 1. Freesound.org
**URL**: https://freesound.org/search/?q=elephant
**Total**: 449 elephant sounds
**Registration**: Free (account created: m****@proton.me)

**Key recordings found**:

| Recording | URL | Duration | Format | Notes |
|-----------|-----|----------|--------|-------|
| Night in the Serengeti with elephant rumble | [link](https://freesound.org/people/zachrau/sounds/818986/) | 0:29 | WAV | Field recording, Mara Tanzania, elephant rumble at 0:05 — **good mixed sample** |
| elephant growls | [link](https://freesound.org/people/mokasza/sounds/810176/) | 0:02 | MP3 | Short elephant vocalizations |
| Elephant sound | [link](https://freesound.org/people/ikbenraar/sounds/819668/) | 0:08 | WAV | Clean elephant call |
| ElephantTrumpetCall | [link](https://freesound.org/people/AdrianaSpalinky/sounds/52249/) | 0:11 | WAV | Trumpet call |
| Elephant + Whale Call | [link](https://freesound.org/people/trainer2/sounds/536623/) | 0:08 | WAV | Mixed species — useful for multi-source separation testing |
| Defensible Twister | [link](https://freesound.org/people/Brazililo123/sounds/625450/) | 7:13 | WAV | Ambient Serengeti sounds — **good noise background** |

### 2. Xeno-Canto.org
**URL**: https://xeno-canto.org/explore?query=elephant
**Total**: 20+ elephant recordings
**Registration**: Free (account created: m****@proton.me)
**Download**: Direct MP3 download per recording

**Key recordings**:

| Recording | URL | Duration | Species | Location |
|-----------|-----|----------|---------|----------|
| XC1031363 | [link](https://xeno-canto.org/1031363) | 2:38 | Asian Elephant | Malaysia |
| Direct download | http://www.xeno-canto.org/1031363/download | — | — | — |

### 3. Macaulay Library (Cornell Lab)
**URL**: https://search.macaulaylibrary.org/catalog?taxonCode=t-12077674
**Total**: 23 audio recordings, 15 tagged "call"
**Registration**: Free

**Key recordings**:

| Recording | URL | Duration | Format | Species | Location |
|-----------|-----|----------|--------|---------|----------|
| ML236675 | [link](https://macaulaylibrary.org/asset/236675) | 1:01 | MP3 320kbps | Forest Elephant | Central African Republic |
| ML audio search | [link](https://search.macaulaylibrary.org/catalog?taxonCode=t-12077674&mediaType=audio&tag=call) | — | — | Various | Various |

### 4. ElephantVoices SoundCloud
**URL**: https://soundcloud.com/elephantvoices
**Total**: ~250 tracks of elephant vocalizations
**Features**: Annotated recordings with behavioral context
**Best for**: Understanding call types and getting reference spectrograms
**Note**: Audio hosted on SoundCloud — requires browser download

### 5. ElephantVoices Elephant Ethogram
**URL**: https://www.elephantvoices.org/elephant-ethogram.html
**Content**: 322 Behaviors, 103 Behavioral Constellations, ~3000 media files
**Best for**: Understanding elephant call types, spectrograms, behavioral context
**Audio**: Hosted on SoundCloud via individual ethogram entries

### 6. LDC Asian Elephant Vocalizations Dataset
**URL**: https://catalog.ldc.upenn.edu/LDC2010S05
**Content**: 57.5 hours of audio, 31.25 hours annotated
**Format**: 48,000 Hz, 24-bit PCM
**Species**: Asian Elephant (Elephas maximus)
**Location**: Uda Walawe National Park, Sri Lanka
**License**: LDC User Agreement (may require subscription/fees)
**Best for**: Large-scale training data (if accessible)

### 7. Congo Soundscapes (Elephant Listening Project)
**URL**: https://registry.opendata.aws/elp-nouabale-landscape/
**AWS S3**: `s3://congo8khz-pnnn` (region: us-west-2)
**Content**: African forest elephant vocalizations in natural rainforest environment
**Features**: Real-world noise contamination (rain, insects, other animals)
**License**: Free for scientific study
**Access**: No AWS account required for public S3 bucket
**Best for**: Testing separation with natural environmental noise

---

## 🌐 Online Resources: Background Noise Samples

### Airplane Noise
| Source | URL | Type | Notes |
|--------|-----|------|-------|
| Pixabay Aeroplane | [link](https://pixabay.com/sound-effects/city-aeroplane-327235/) | MP3, 0:07 | Clean airplane pass-by |
| Pixabay Airplane search | https://pixabay.com/sound-effects/search/aeroplane/ | Multiple | Free collection |
| myNoise.net | https://mynoise.net/noiseMachines.php | Generator | Adjustable aircraft cabin noise |
| AeroSonicDB (Kaggle) | Search "AeroSonicDB" | Dataset | Low-flying aircraft recordings |
| Freesound airplane | https://freesound.org/search/?q=airplane+pass | Multiple | Community recordings |

### Car/Traffic Noise
| Source | URL | Type | Notes |
|--------|-----|------|-------|
| myNoise.net | https://mynoise.net/noiseMachines.php | Generator | Traffic noise generator |
| Vehicle Interior (Kaggle) | Search "Vehicle Interior Sound Dataset" | 5900+ files | Car interior sounds |
| 531-Hours-In-Car-Noise | [GitHub](https://github.com/CyanideCN/531-Hours-In-Car-Noise-Data) | 531 hours | Different road types, speeds |
| Freesound car | https://freesound.org/search/?q=car+engine | Multiple | Engine, tire noise |

### Generator Noise
| Source | URL | Type | Notes |
|--------|-----|------|-------|
| myNoise.net | https://mynoise.net/noiseMachines.php | Generator | Industrial noise generator |
| Freesound generator | https://freesound.org/search/?q=generator+hum | Multiple | Generator hum/buzz |
| Freesound diesel | https://freesound.org/search/?q=diesel+generator | Multiple | Diesel generator specific |

### General Environmental Noise
| Source | URL | Type | Notes |
|--------|-----|------|-------|
| FSD50K | [GitHub](https://github.com/tylin/fsd50k) | 51,197 clips | Open audio dataset with animal sounds |
| Background Noise Detection (HF) | Search "Background Noise Detection" Hugging Face | 50+ hours | Real-world ambient noise |

---

## Synthetic Mixed Data: How to Create Training Samples

Since finding natural elephant+airplane recordings is rare, create synthetic mixes:

```python
# create_synthetic_mixes.py
import numpy as np
import librosa
import soundfile as sf
from pathlib import Path
import random

def create_mix(elephant_path, noise_path, output_path, snr_db=-5, sr=44100):
    """
    Mix an elephant call with noise at a specified SNR.
    
    Parameters:
        elephant_path: path to clean elephant WAV
        noise_path: path to noise WAV
        output_path: where to save the mixed file
        snr_db: signal-to-noise ratio in dB (negative = noise louder)
        sr: sample rate
    """
    elephant, _ = librosa.load(elephant_path, sr=sr, mono=True)
    noise, _ = librosa.load(noise_path, sr=sr, mono=True)
    
    # Match lengths (loop noise if shorter)
    if len(noise) < len(elephant):
        repeats = int(np.ceil(len(elephant) / len(noise)))
        noise = np.tile(noise, repeats)
    noise = noise[:len(elephant)]
    
    # Random offset for noise (not aligned with elephant start)
    offset = random.randint(0, max(0, len(noise) - len(elephant)))
    if offset > 0:
        noise = noise[offset:offset+len(elephant)]
    
    # Calculate mixing weights for target SNR
    elephant_power = np.mean(elephant ** 2)
    noise_power = np.mean(noise ** 2)
    
    target_noise_power = elephant_power / (10 ** (snr_db / 10))
    noise_scale = np.sqrt(target_noise_power / (noise_power + 1e-10))
    
    mixed = elephant + noise_scale * noise
    mixed = mixed / (np.max(np.abs(mixed)) + 1e-10) * 0.9
    
    sf.write(output_path, mixed, sr)
    
    return {
        'output': output_path,
        'snr_db': snr_db,
        'elephant_duration': len(elephant) / sr,
    }

# Generate synthetic mixes for all 3 noise types
clean_calls = sorted(Path('data/clean_elephant_calls').glob('Rumble*.wav'))
noise_files = {
    'airplane': 'data/noise_samples/airplane.mp3',
    'car': 'data/noise_samples/car_engine.wav',
    'generator': 'data/noise_samples/generator_hum.wav',
}

# Create training data
for call_path in clean_calls[:50]:  # First 50 rumbles
    for noise_type, noise_path in noise_files.items():
        if Path(noise_path).exists():
            output = f'data/mixed_recordings/{call_path.stem}_{noise_type}.wav'
            create_mix(call_path, noise_path, output, snr_db=random.uniform(-10, 5))
```

---

## PCA Feature Matching: Quick Start

```python
# Using the downloaded clean calls as reference database
from sklearn.decomposition import PCA
from sklearn.preprocessing import StandardScaler
import numpy as np
import librosa
from pathlib import Path

def extract_features(audio, sr=44100):
    """20-dimensional feature vector for PCA matching."""
    mfccs = librosa.feature.mfcc(y=audio, sr=sr, n_mfcc=13, n_fft=4096, hop_length=512)
    centroid = librosa.feature.spectral_centroid(y=audio, sr=sr, n_fft=4096, hop_length=512)
    bandwidth = librosa.feature.spectral_bandwidth(y=audio, sr=sr, n_fft=4096, hop_length=512)
    flatness = librosa.feature.spectral_flatness(y=audio, n_fft=4096, hop_length=512)
    rms = librosa.feature.rms(y=audio, frame_length=4096, hop_length=512)
    f0, _, _ = librosa.pyin(audio, fmin=8, fmax=25, sr=sr, frame_length=8192, hop_length=512)
    f0_valid = f0[~np.isnan(f0)]
    
    features = np.concatenate([
        np.mean(mfccs, axis=1),          # 13 values
        [np.mean(centroid)],             # 1
        [np.mean(bandwidth)],            # 1
        [np.mean(flatness)],             # 1
        [np.mean(f0_valid) if len(f0_valid) > 0 else 0],  # mean F0
        [np.std(f0_valid) if len(f0_valid) > 0 else 0],   # F0 std
        [np.max(f0_valid) - np.min(f0_valid) if len(f0_valid) > 0 else 0],  # F0 range
        [np.mean(rms)],                  # RMS
    ])
    return features

# Build reference database
calls = sorted(Path('data/clean_elephant_calls').glob('Rumble*.wav'))
ref_features = []
ref_labels = []
for path in calls:
    audio, sr = librosa.load(str(path), sr=44100, mono=True)
    feat = extract_features(audio, sr)
    ref_features.append(feat)
    ref_labels.append(path.stem)

ref_features = np.array(ref_features)
scaler = StandardScaler().fit(ref_features)
pca = PCA(n_components=3).fit(scaler.transform(ref_features))

# Now compare a separated (test) call against the database
# test_audio = your separated elephant rumble
# test_feat = extract_features(test_audio, 44100)
# test_pca = pca.transform(scaler.transform([test_feat]))
# similarities = cosine_similarity(test_pca, pca.transform(scaler.transform(ref_features)))
# print(f"Best match: {ref_labels[np.argmax(similarities)]} (score: {np.max(similarities):.3f})")
```

---

## Resource Summary Table

| Resource | Type | Access | Best For |
|----------|------|--------|----------|
| **GitHub HiruDewmi** | 232 clean WAV files | ✅ Downloaded locally | PCA reference database, clean targets |
| **Freesound.org** | 449 elephant sounds | Free (registered) | Mixed/noisy field recordings |
| **Xeno-Canto.org** | 20+ field recordings | Free (registered) | Real-world noise contamination |
| **Macaulay Library** | 23 scientific recordings | Free (registered) | High-quality reference spectrograms |
| **ElephantVoices SoundCloud** | ~250 annotated tracks | Free streaming | Behavioral context, call type reference |
| **LDC Dataset** | 57.5 hours annotated | Subscription | Large-scale training (if available) |
| **Congo Soundscapes** | AWS S3 public bucket | Free | Real rainforest noise + elephants |
| **Pixabay** | SFX (elephants + noise) | Free | Airplane/car noise samples |
| **myNoise.net** | Browser generators | Free | Adjustable noise synthesis |

---

*Resource guide compiled: April 11, 2026*
*232 clean elephant calls downloaded locally for immediate use*
