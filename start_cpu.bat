@echo off
title WhisperX Local Transcriber (CPU Mode)
echo Starting WhisperX Local Transcriber on CPU...
set WHISPER_DEVICE=cpu
set WHISPER_COMPUTE_TYPE=int8
python whisperAPI.py
pause
