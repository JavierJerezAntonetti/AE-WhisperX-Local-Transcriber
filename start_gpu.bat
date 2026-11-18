@echo off
cd /d "%~dp0"
title WhisperX Local Transcriber (GPU Mode)
echo Starting WhisperX Local Transcriber on GPU (AMD ROCm / CUDA)...
if exist "C:\Program Files\AMD\ROCm\7.2\bin" set "PATH=C:\Program Files\AMD\ROCm\7.2\bin;%PATH%"
set WHISPER_DEVICE=cuda
set WHISPER_COMPUTE_TYPE=float16
set CPU_THREADS=8
set BATCH_SIZE=8
set OMP_NUM_THREADS=8
set MKL_NUM_THREADS=8
python whisperAPI.py
pause
