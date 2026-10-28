@echo off
title WhisperX Local Transcriber (GPU Mode)
echo Starting WhisperX Local Transcriber on GPU (AMD ROCm / CUDA)...
set WHISPER_DEVICE=cuda
set WHISPER_COMPUTE_TYPE=float16
python whisperAPI.py
pause
