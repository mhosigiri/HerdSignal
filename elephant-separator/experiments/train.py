"""
Autoresearch training script for elephant rumble separation.
Single-GPU, single-file. Adapted from nanochat.
Usage: python train.py
"""

import os
os.environ["PYTORCH_ALLOC_CONF"] = "expandable_segments:True"

import gc
import math
import time
import uuid
from dataclasses import dataclass

import torch
import torch.nn as nn
import torch.nn.functional as F

from prepare import N_FREQ, N_FRAMES, TIME_BUDGET, make_dataloader, evaluate

# ---------------------------------------------------------------------------
# Separation Model (2D CNN soft-mask baseline)
# ---------------------------------------------------------------------------

# Only process frequency bins that contain elephant energy (10 Hz – 2756 Hz).
# Full spatial activations (B, 32, 2049, 1378) would be ~720 MB in bf16.
# Truncating to 256 bins → ~90 MB: memory-safe with batch_size=4.
N_FREQ_USED = 256  # bins 0-255 → 0–2756 Hz at 10.8 Hz/bin

@dataclass
class SepConfig:
    n_freq_used: int = N_FREQ_USED
    n_hidden:    int = 32
    n_layers:    int = 6
    kernel_size: int = 3


class SeparationModel(nn.Module):
    """
    Soft-mask CNN: predicts a [0, 1] gain mask over the relevant frequency range.

    Forward pass:
        x           (B, 1, N_FREQ, N_FRAMES)  — full log-magnitude noisy spectrogram
        → truncate  (B, 1, n_freq_used, N_FRAMES)
        → CNN       (B, 1, n_freq_used, N_FRAMES)  — predicted low-freq mask
        → zero-pad  (B, 1, N_FREQ, N_FRAMES)  — high-freq mask = 0 (attenuate noise)
        return full mask in (0, 1)

    Reconstruction: mask * noisy ≈ clean elephant spectrogram.
    """

    def __init__(self, cfg: SepConfig = SepConfig()):
        super().__init__()
        self.cfg = cfg
        layers: list[nn.Module] = []
        in_ch = 1
        p = cfg.kernel_size // 2
        for i in range(cfg.n_layers):
            out_ch = cfg.n_hidden if i < cfg.n_layers - 1 else 1
            layers.append(nn.Conv2d(in_ch, out_ch, kernel_size=cfg.kernel_size, padding=p))
            if i < cfg.n_layers - 1:
                layers.append(nn.ReLU())
            in_ch = out_ch
        self.net = nn.Sequential(*layers)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        B, _, F, T = x.shape
        nf = self.cfg.n_freq_used
        x_low = x[:, :, :nf, :]                               # (B, 1, nf, T)
        # Normalize per-sample to [0,1] range so gradients are meaningful
        # regardless of absolute recording amplitude (~0.0001 raw → ~1.0 normalized)
        scale = x_low.amax(dim=(-2, -1), keepdim=True).clamp(min=1e-8)
        x_low_n = x_low / scale
        mask_low = torch.sigmoid(self.net(x_low_n))           # (B, 1, nf, T)
        pad = torch.zeros(B, 1, F - nf, T, device=x.device, dtype=x.dtype)
        return torch.cat([mask_low, pad], dim=2)              # (B, 1, F, T)

    def num_params(self) -> int:
        return sum(p.numel() for p in self.parameters())

    def estimate_flops_per_sample(self) -> float:
        """Rough MACs: 2 × params × spatial footprint (ignores padding effects)."""
        spatial = self.cfg.n_freq_used * N_FRAMES
        return 2.0 * self.num_params() * spatial

    def setup_optimizer(
        self,
        lr: float = 1e-3,
        weight_decay: float = 1e-4,
        betas: tuple = (0.9, 0.999),
    ) -> torch.optim.Optimizer:
        """Default: AdamW over all parameters.
        To try Muon, group Linear params into MuonAdamW (see MuonAdamW below)."""
        optimizer = torch.optim.AdamW(self.parameters(), lr=lr,
                                      weight_decay=weight_decay, betas=betas, eps=1e-8)
        for group in optimizer.param_groups:
            group["initial_lr"] = group["lr"]
        return optimizer


# ---------------------------------------------------------------------------
# MuonAdamW optimizer (kept for experimentation — use for Linear params)
# ---------------------------------------------------------------------------

polar_express_coeffs = [
    (8.156554524902461, -22.48329292557795, 15.878769915207462),
    (4.042929935166739, -2.808917465908714, 0.5000178451051316),
    (3.8916678022926607, -2.772484153217685, 0.5060648178503393),
    (3.285753657755655, -2.3681294933425376, 0.46449024233003106),
    (2.3465413258596377, -1.7097828382687081, 0.42323551169305323),
]

@torch.compile(dynamic=False, fullgraph=True)
def adamw_step_fused(p, grad, exp_avg, exp_avg_sq, step_t, lr_t, beta1_t, beta2_t, eps_t, wd_t):
    p.mul_(1 - lr_t * wd_t)
    exp_avg.lerp_(grad, 1 - beta1_t)
    exp_avg_sq.lerp_(grad.square(), 1 - beta2_t)
    bias1 = 1 - beta1_t ** step_t
    bias2 = 1 - beta2_t ** step_t
    denom = (exp_avg_sq / bias2).sqrt() + eps_t
    step_size = lr_t / bias1
    p.add_(exp_avg / denom, alpha=-step_size)

@torch.compile(dynamic=False, fullgraph=True)
def muon_step_fused(stacked_grads, stacked_params, momentum_buffer, second_momentum_buffer,
                    momentum_t, lr_t, wd_t, beta2_t, ns_steps, red_dim):
    momentum = momentum_t.to(stacked_grads.dtype)
    momentum_buffer.lerp_(stacked_grads, 1 - momentum)
    g = stacked_grads.lerp_(momentum_buffer, momentum)
    X = g.bfloat16()
    X = X / (X.norm(dim=(-2, -1), keepdim=True) * 1.02 + 1e-6)
    if g.size(-2) > g.size(-1):
        for a, b, c in polar_express_coeffs[:ns_steps]:
            A = X.mT @ X
            B = b * A + c * (A @ A)
            X = a * X + X @ B
    else:
        for a, b, c in polar_express_coeffs[:ns_steps]:
            A = X @ X.mT
            B = b * A + c * (A @ A)
            X = a * X + B @ X
    g = X
    beta2 = beta2_t.to(g.dtype)
    v_mean = g.float().square().mean(dim=red_dim, keepdim=True)
    red_dim_size = g.size(red_dim)
    v_norm_sq = v_mean.sum(dim=(-2, -1), keepdim=True) * red_dim_size
    v_norm = v_norm_sq.sqrt()
    second_momentum_buffer.lerp_(v_mean.to(dtype=second_momentum_buffer.dtype), 1 - beta2)
    step_size = second_momentum_buffer.clamp_min(1e-10).rsqrt()
    scaled_sq_sum = (v_mean * red_dim_size) * step_size.float().square()
    v_norm_new = scaled_sq_sum.sum(dim=(-2, -1), keepdim=True).sqrt()
    final_scale = step_size * (v_norm / v_norm_new.clamp_min(1e-10))
    g = g * final_scale.to(g.dtype)
    lr = lr_t.to(g.dtype)
    wd = wd_t.to(g.dtype)
    mask = (g * stacked_params) >= 0
    stacked_params.sub_(lr * g + lr * wd * stacked_params * mask)


class MuonAdamW(torch.optim.Optimizer):
    """Combined optimizer: Muon for 2D matrix params, AdamW for others.
    Muon expects params to be 2D tensors (H, W). For Conv2d weights,
    reshape them to (out_ch, in_ch * kH * kW) before grouping."""

    def __init__(self, param_groups):
        super().__init__(param_groups, defaults={})
        self._adamw_step_t    = torch.tensor(0.0, dtype=torch.float32, device="cpu")
        self._adamw_lr_t      = torch.tensor(0.0, dtype=torch.float32, device="cpu")
        self._adamw_beta1_t   = torch.tensor(0.0, dtype=torch.float32, device="cpu")
        self._adamw_beta2_t   = torch.tensor(0.0, dtype=torch.float32, device="cpu")
        self._adamw_eps_t     = torch.tensor(0.0, dtype=torch.float32, device="cpu")
        self._adamw_wd_t      = torch.tensor(0.0, dtype=torch.float32, device="cpu")
        self._muon_momentum_t = torch.tensor(0.0, dtype=torch.float32, device="cpu")
        self._muon_lr_t       = torch.tensor(0.0, dtype=torch.float32, device="cpu")
        self._muon_wd_t       = torch.tensor(0.0, dtype=torch.float32, device="cpu")
        self._muon_beta2_t    = torch.tensor(0.0, dtype=torch.float32, device="cpu")

    def _step_adamw(self, group):
        for p in group['params']:
            if p.grad is None:
                continue
            state = self.state[p]
            if not state:
                state['step'] = 0
                state['exp_avg'] = torch.zeros_like(p)
                state['exp_avg_sq'] = torch.zeros_like(p)
            state['step'] += 1
            self._adamw_step_t.fill_(state['step'])
            self._adamw_lr_t.fill_(group['lr'])
            self._adamw_beta1_t.fill_(group['betas'][0])
            self._adamw_beta2_t.fill_(group['betas'][1])
            self._adamw_eps_t.fill_(group['eps'])
            self._adamw_wd_t.fill_(group['weight_decay'])
            adamw_step_fused(p, p.grad, state['exp_avg'], state['exp_avg_sq'],
                             self._adamw_step_t, self._adamw_lr_t, self._adamw_beta1_t,
                             self._adamw_beta2_t, self._adamw_eps_t, self._adamw_wd_t)

    def _step_muon(self, group):
        params = group['params']
        if not params:
            return
        p = params[0]
        state = self.state[p]
        num_params = len(params)
        shape, device, dtype = p.shape, p.device, p.dtype
        if "momentum_buffer" not in state:
            state["momentum_buffer"] = torch.zeros(num_params, *shape, dtype=dtype, device=device)
        if "second_momentum_buffer" not in state:
            state_shape = (num_params, shape[-2], 1) if shape[-2] >= shape[-1] else (num_params, 1, shape[-1])
            state["second_momentum_buffer"] = torch.zeros(state_shape, dtype=dtype, device=device)
        red_dim = -1 if shape[-2] >= shape[-1] else -2
        stacked_grads = torch.stack([p.grad for p in params])
        stacked_params = torch.stack(params)
        self._muon_momentum_t.fill_(group["momentum"])
        self._muon_beta2_t.fill_(group["beta2"] if group["beta2"] is not None else 0.0)
        self._muon_lr_t.fill_(group["lr"] * max(1.0, shape[-2] / shape[-1]) ** 0.5)
        self._muon_wd_t.fill_(group["weight_decay"])
        muon_step_fused(stacked_grads, stacked_params,
                        state["momentum_buffer"], state["second_momentum_buffer"],
                        self._muon_momentum_t, self._muon_lr_t, self._muon_wd_t,
                        self._muon_beta2_t, group["ns_steps"], red_dim)
        torch._foreach_copy_(params, list(stacked_params.unbind(0)))

    @torch.no_grad()
    def step(self):
        for group in self.param_groups:
            if group['kind'] == 'adamw':
                self._step_adamw(group)
            elif group['kind'] == 'muon':
                self._step_muon(group)


# ---------------------------------------------------------------------------
# Hyperparameters (edit these freely — this section is the agent's playground)
# ---------------------------------------------------------------------------

# Model architecture
N_HIDDEN    = 64          # channels in Conv2d hidden layers
N_LAYERS     = 6           # number of Conv2d layers
KERNEL_SIZE  = 3           # convolution kernel size

# Optimization
DEVICE_BATCH_SIZE = 4      # spectrograms per forward pass (reduce to 2 if OOM)
TOTAL_BATCH_SIZE  = 8      # spectrograms per optimizer step
LR            = 1e-3       # AdamW learning rate
WEIGHT_DECAY  = 1e-4       # L2 regularization
ADAM_BETAS    = (0.9, 0.999)
WARMUP_RATIO    = 0.05     # fraction of TIME_BUDGET for LR warmup
WARMDOWN_RATIO  = 0.4      # fraction of TIME_BUDGET for LR warmdown (cosine decay)
FINAL_LR_FRAC   = 0.1      # final LR as fraction of peak

# ---------------------------------------------------------------------------
# Setup: model, optimizer, dataloaders
# ---------------------------------------------------------------------------

t_start = time.time()
torch.manual_seed(42)
device = "cuda" if torch.cuda.is_available() else "cpu"
autocast_ctx = torch.amp.autocast(device_type=device, dtype=torch.bfloat16,
                                  enabled=(device == "cuda"))

assert TOTAL_BATCH_SIZE % DEVICE_BATCH_SIZE == 0, \
    "TOTAL_BATCH_SIZE must be divisible by DEVICE_BATCH_SIZE"
grad_accum_steps = TOTAL_BATCH_SIZE // DEVICE_BATCH_SIZE

cfg = SepConfig(n_freq_used=N_FREQ_USED, n_hidden=N_HIDDEN,
                n_layers=N_LAYERS, kernel_size=KERNEL_SIZE)
model = SeparationModel(cfg).to(device)

num_params = model.num_params()
flops_per_sample = model.estimate_flops_per_sample()
print(f"Model parameters: {num_params:,}")
print(f"Estimated FLOPs/sample: {flops_per_sample:.2e}")
print(f"Input spectrogram: (B, 1, {N_FREQ}, {N_FRAMES}) — processing first {N_FREQ_USED} freq bins")
print(f"Time budget: {TIME_BUDGET}s  |  grad_accum_steps: {grad_accum_steps}")

# NOTE: setup_optimizer uses LR/WEIGHT_DECAY/ADAM_BETAS from module scope above.
# If you change those constants, the model must be re-instantiated before this line.
optimizer = model.setup_optimizer(lr=LR, weight_decay=WEIGHT_DECAY, betas=ADAM_BETAS)

model = torch.compile(model)

# Infinite iterator over the training DataLoader
train_loader = make_dataloader("train", DEVICE_BATCH_SIZE, num_workers=0)

def _iter_forever(loader):
    while True:
        yield from loader

train_iter = _iter_forever(train_loader)
noisy, clean = next(train_iter)  # prefetch first batch
noisy, clean = noisy.to(device), clean.to(device)

# ---------------------------------------------------------------------------
# LR schedule (time-based, mirrors nanochat)
# ---------------------------------------------------------------------------

def get_lr_multiplier(progress: float) -> float:
    if progress < WARMUP_RATIO:
        return progress / WARMUP_RATIO if WARMUP_RATIO > 0 else 1.0
    elif progress < 1.0 - WARMDOWN_RATIO:
        return 1.0
    else:
        # cosine warmdown
        t = (progress - (1.0 - WARMDOWN_RATIO)) / WARMDOWN_RATIO
        return FINAL_LR_FRAC + 0.5 * (1.0 - FINAL_LR_FRAC) * (1.0 + math.cos(math.pi * t))

# ---------------------------------------------------------------------------
# Training loop
# ---------------------------------------------------------------------------

t_start_training = time.time()
smooth_train_loss = 0.0
total_training_time = 0.0
step = 0

while True:
    torch.cuda.synchronize() if device == "cuda" else None
    t0 = time.time()

    for micro_step in range(grad_accum_steps):
        with autocast_ctx:
            mask = model(noisy)
            reconstructed = mask * noisy
            # Normalize to [0,1] range for loss so gradients are large enough.
            # Raw spectrogram values are ~0.0001, making raw MSE gradients ~1e-9
            # (too small for LR=1e-3 to move weights). Normalizing fixes this.
            nf = N_FREQ_USED
            scale = noisy[:, :, :nf, :].amax(dim=(-2, -1), keepdim=True).clamp(min=1e-8)
            recon_n = reconstructed[:, :, :nf, :] / scale
            clean_n = clean[:, :, :nf, :] / scale
            # Weight signal bins 10x — elephant signal is only ~9% of bins
            signal_weight = (clean_n > 0.01).float() * 9.0 + 1.0
            loss = (signal_weight * (recon_n - clean_n) ** 2).mean() / grad_accum_steps
        loss.backward()
        noisy, clean = next(train_iter)
        noisy, clean = noisy.to(device), clean.to(device)

    # Un-scaled loss for logging (multiply back)
    train_loss_f = loss.item() * grad_accum_steps

    # Fast-fail: abort if loss explodes or goes NaN
    if math.isnan(train_loss_f) or train_loss_f > 1e6:
        print("FAIL")
        exit(1)

    # LR schedule
    progress = min(total_training_time / TIME_BUDGET, 1.0)
    lrm = get_lr_multiplier(progress)
    for group in optimizer.param_groups:
        group["lr"] = group["initial_lr"] * lrm

    torch.nn.utils.clip_grad_norm_(model.parameters(), 1.0)
    optimizer.step()
    model.zero_grad(set_to_none=True)

    torch.cuda.synchronize() if device == "cuda" else None
    t1 = time.time()
    dt = t1 - t0

    # Skip first 10 steps from timing (covers torch.compile warm-up)
    if step > 10:
        total_training_time += dt

    # EMA smoothed loss
    ema_beta = 0.9
    smooth_train_loss = ema_beta * smooth_train_loss + (1 - ema_beta) * train_loss_f
    debiased = smooth_train_loss / (1 - ema_beta ** (step + 1))

    samples_per_sec = int(TOTAL_BATCH_SIZE / dt)
    pct_done = 100.0 * progress
    remaining = max(0.0, TIME_BUDGET - total_training_time)

    print(
        f"\rstep {step:05d} ({pct_done:.1f}%) | "
        f"loss: {debiased:.6f} | "
        f"lrm: {lrm:.3f} | "
        f"dt: {dt*1000:.0f}ms | "
        f"samp/s: {samples_per_sec} | "
        f"remaining: {remaining:.0f}s    ",
        end="", flush=True,
    )

    # GC management: freeze after first step to avoid ~500 ms stalls
    if step == 0:
        gc.collect()
        gc.freeze()
        gc.disable()
    elif (step + 1) % 2000 == 0:
        gc.collect()

    step += 1

    if step > 10 and total_training_time >= TIME_BUDGET:
        break

print()  # newline after \r log

# ---------------------------------------------------------------------------
# Final evaluation (fixed metric from prepare.py — do not modify)
# ---------------------------------------------------------------------------

val_loss = evaluate(model, device=device)

# ---------------------------------------------------------------------------
# Summary + results.tsv logging
# ---------------------------------------------------------------------------

t_end = time.time()
peak_vram_mb = (torch.cuda.max_memory_allocated() / 1024 / 1024
                if device == "cuda" else 0.0)

print("---")
print(f"val_loss:         {val_loss:.6f}")
print(f"training_seconds: {total_training_time:.1f}")
print(f"total_seconds:    {t_end - t_start:.1f}")
print(f"peak_vram_mb:     {peak_vram_mb:.1f}")
print(f"num_steps:        {step}")
print(f"num_params:       {num_params:,}")

# Write one row to results.tsv
run_id = uuid.uuid4().hex[:8]
config_str = (
    f"n_freq_used={N_FREQ_USED},n_hidden={N_HIDDEN},"
    f"n_layers={N_LAYERS},kernel={KERNEL_SIZE},"
    f"lr={LR},wd={WEIGHT_DECAY},bs={TOTAL_BATCH_SIZE}"
)
model_name = f"CNN_{N_HIDDEN}ch_{N_LAYERS}L"
notes = f"steps={step},secs={total_training_time:.0f}"

results_path = os.path.join(os.path.dirname(__file__), "results.tsv")
write_header = not os.path.exists(results_path) or os.path.getsize(results_path) == 0
with open(results_path, "a") as f:
    if write_header:
        f.write("run_id\tmodel_name\tconfig\tval_loss\tnotes\n")
    f.write(f"{run_id}\t{model_name}\t{config_str}\t{val_loss:.6f}\t{notes}\n")

print(f"Results logged → results.tsv  (run_id={run_id})")
