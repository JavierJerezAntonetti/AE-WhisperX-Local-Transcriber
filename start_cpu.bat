@echo off
cd /d "%~dp0"
title WhisperX Local Transcriber (CPU Mode)
echo Starting WhisperX Local Transcriber on CPU...
set WHISPER_DEVICE=cpu
set WHISPER_COMPUTE_TYPE=int8
set CPU_THREADS=8
set BATCH_SIZE=8
set OMP_NUM_THREADS=8
set MKL_NUM_THREADS=8
python whisperAPI.py
pause
