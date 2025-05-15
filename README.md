# AE WhisperX Local Transcriber

Transcribe audio directly within Adobe After Effects using a local WhisperX API. This tool creates styled, word-level text layers from your audio, enabling precise subtitle and kinetic typography workflows.

![Panel Screenshot](https://github.com/user-attachments/assets/ce20222a-fc8c-47b3-ada8-ce34224ca118)

## Table of Contents

- [Features](#features)
- [How it Works](#how-it-works)
- [Prerequisites](#prerequisites)
- [Installation & Setup](#installation--setup)
  - [Method 1: Using the Pre-compiled API (Recommended for most users)](#method-1-using-the-pre-compiled-api-recommended-for-most-users)
  - [Method 2: Running the API from Python Source (For developers/advanced users)](#method-2-running-the-api-from-python-source-for-developersadvanced-users)
- [After Effects Script Setup](#after-effects-script-setup)
- [Usage](#usage)
  - [1. Render Audio (Optional)](#1-render-audio-optional)
  - [2. Configure Text Styling](#2-configure-text-styling)
  - [3. Transcribe Audio](#3-transcribe-audio)
- [API Configuration (Optional)](#api-configuration-optional)
- [Troubleshooting](#troubleshooting)
- [For Developers](#for-developers)
  - [Building the .exe](#building-the-exe)
- [Contributing](#contributing)
- [License](#license)

## Features

* **Local Transcription:** Keep your audio data private. No cloud uploads required after initial model download.
* **WhisperX Powered:** Leverages the speed and accuracy of WhisperX for transcription and word-level timestamps.
* **Word-Level Accuracy:** Creates individual text layers for each word, perfectly timed.
* **After Effects Integration:** Dockable ScriptUI panel for a seamless experience.
* **Customizable Styling:** Control font, size, fill color, stroke color, and stroke width for the generated text layers directly from the AE panel.
* **Automated Pre-comping:** Generated word layers are automatically grouped into a "Subtitles" pre-comp.
* **Audio Rendering Utility:** Helper function to quickly render audio from your active AE composition.
* **Pre-compiled API Option:** Includes a bundled `.exe` for the API server, eliminating the need for users to install Python and dependencies manually.

## How it Works

1.  **Start the Local API:** Run the `WhisperX API.exe` (or `whisperAPI.py` script). This starts a Flask server on your local machine (`http://127.0.0.1:5000`).
2.  **Open the AE Panel:** Launch After Effects and open the "Whisper Transcriber & Audio Tools" panel.
3.  **Render Audio:**
    * Optionally, use the panel to render audio from your active composition.
    * Select an existing audio file (`.wav`, `.mp3`, etc.).
4.  **Configure Styles:** Adjust font, size, and color settings in the panel.
5.  **Transcribe:** Click "Select Audio File & Start Transcription".
    * The AE script sends the audio file to the local API.
    * The API transcribes the audio using WhisperX, performs word-level alignment, and returns a JSON response with timed words.
    * The AE script parses the JSON, creates a new text layer for each word in your active composition, applies the configured styles, and sets its in/out points.
    * Finally, all created text layers are pre-composed.

## Prerequisites

Before you begin, ensure you have the following installed:

1.  **Adobe After Effects:** (e.g., AE 2023, 2024, 2025). The script is placed in the `ScriptUI Panels` folder.
2.  **FFmpeg:**
    * WhisperX (and therefore this API) requires FFmpeg to process audio.
    * It **must** be installed and accessible in your system's PATH.
    * **Windows Guide:** [How to Install FFmpeg on Windows (phoenixnap.com)](https://phoenixnap.com/kb/ffmpeg-windows)
3.  **Curl (for AE Script):**
    * The After Effects script uses `curl` to communicate with the local API.
    * **Windows:** Modern Windows 10/11 includes `curl`. If not, you might need to install it or ensure it's in your PATH.
4.  **(Optional - For running API from source only) Python:**
    * If you choose *not* to use the pre-compiled `WhisperX API.exe`, you'll need Python.
    * **Crucially, Python version must be LESS THAN 3.13** (e.g., 3.10, 3.11, 3.12) due to Whisper/WhisperX compatibility. You can download older Python versions from [python.org](https://www.python.org/downloads/).
    * `pip` (Python package installer) is also required.

## Installation & Setup

Choose **one** of the following methods to set up the API:

### Method 1: Using the Pre-compiled API (Recommended for most users)

This is the simplest way to get started, especially if you don't want to deal with Python environments.

1.  **Download the Release:**
    * Go to the [Releases page](https://github.com/JavierJerezAntonetti/AE-WhisperX-Local-Transcriber/releases) of this repository.
    * Download the latest release ZIP file. It should contain `WhisperX API.exe` and the After Effects script.
2.  **Place `WhisperX API.exe`:**
    * Extract the ZIP file.
    * Place `WhisperX API.exe` in a convenient location on your computer.
3.  **Run the API:**
    * Double-click `WhisperX API.exe`.
    * A console window will appear. The first time you run it, it will download the WhisperX model files. This may take some time and requires an internet connection. Subsequent runs will be faster as models are cached.
    * You should see messages indicating the model is loading and the Flask server is starting (e.g., `Starting Flask server on host 127.0.0.1, port 5000`).
    * **Keep this console window open while you are using the After Effects script.** Closing it will stop the API.
4.  **Proceed to [After Effects Script Setup](#after-effects-script-setup).**

### Method 2: Running the API from Python Source (For developers/advanced users)

This method gives you more control and is necessary if you want to modify the API code.

1.  **Download the Release:**
    * Go to the [Releases page](https://github.com/JavierJerezAntonetti/AE-WhisperX-Local-Transcriber/releases) of this repository.
    * Download the latest release ZIP file of the Full Files version. It should contain `whisperAPI.py` and the After Effects script.
2.  **Set up a Python Environment (Recommended):**
    * Ensure you have Python installed (version < 3.13).
    * It's highly recommended to use a virtual environment:
        ```bash
        python -m venv venv
        # On Windows
        venv\Scripts\activate
        ```
3.  **Install Dependencies:**
    * The `requirements.txt` file lists all necessary Python packages.
        ```bash
        pip install -r requirements.txt
        ```
    * **Note on PyTorch:** If you have a compatible NVIDIA GPU and want to use CUDA for faster processing, you might need a specific PyTorch version. The `requirements.txt` installs the standard CPU version. Visit [PyTorch.org](https://pytorch.org/get-started/locally/) for instructions on installing with CUDA support. If you do, remember to change the `DEVICE` setting in `whisperAPI.py` to `"cuda"`.
4.  **Run the API:**
    ```bash
    python whisperAPI.py
    ```
    * A console window will appear. The first time you run it, it will download the WhisperX model files. This may take some time and requires an internet connection.
    * You should see messages indicating the model is loading and the Flask server is starting (e.g., `Starting Flask server on host 127.0.0.1, port 5000`).
    * **Keep this console window open while you are using the After Effects script.**
5.  **Proceed to [After Effects Script Setup](#after-effects-script-setup).**

## After Effects Script Setup

1.  **Locate the Script:**
    * Find the `Whisper Transcriber Panel.jsx` file (or a similar `.jsx` file name) from the downloaded release.
2.  **Copy the Script to AE's ScriptUI Panels Folder:**
    * **Windows:** `C:\Program Files\Adobe\Adobe After Effects <YEAR>\Support Files\Scripts\ScriptUI Panels\`
    *(Replace `<YEAR>` with your After Effects version, e.g., 2025)*
3.  **Launch/Relaunch After Effects:**
    * If After Effects was open, you might need to restart it, or go to `Window > Find Script` and select it if AE supports dynamic loading of new panels.
    * The panel should now be available under the "Window" menu in After Effects, titled "Whisper Transcriber & Audio Tools".

## Usage

Once the API is running and the After Effects script is installed:

1.  Open After Effects and create or open a project and a composition.
2.  Open the "Whisper Transcriber & Audio Tools" panel from the "Window" menu.

### 1. Render Audio (Optional)

* If your audio is part of your After Effects composition and you want to transcribe it:
    1.  Ensure the desired composition is active.
    2.  Click the "**Render Active Comp Audio (WAV)**" button in the panel.
    3.  This will render a `.wav` file to a `Rendered_Audio` subfolder in your project directory.
    4.  You can then use this rendered file for transcription.

### 2. Configure Text Styling

Before transcribing, you can set the default appearance for the generated text layers:

* **Font Name:** Enter the PostScript name of the font (e.g., `ArialMT`, `Poppins-SemiBold`). You can usually find this in font management software or design tools.
* **Font Size (pt):** The size of the text in points.
* **Fill Color (R,G,B):** Set the Red, Green, and Blue values for the text fill, each between 0.0 and 1.0 (e.g., White is `1.0, 1.0, 1.0`).
* **Stroke Width (pt):** The width of the text outline. Set to `0` for no stroke.
* **Stroke Color (R,G,B):** Set the Red, Green, and Blue values for the text stroke, each between 0.0 and 1.0.

### 3. Transcribe Audio

1.  Ensure your chosen composition is active in After Effects (this is where the text layers will be created).
2.  Click the "**Select Audio File & Start Transcription**" button.
3.  A file dialog will appear. Select the audio file you want to transcribe (e.g., `.wav`, `.mp3`, `.m4a`).
4.  The script will send the audio to the local WhisperX API. You'll see activity in the API's console window.
5.  Once transcription is complete:
    * Individual text layers for each word will be created in your active composition.
    * These layers will be styled according to your settings and timed to match the audio.
    * A pop-up will confirm the number of layers created.
    * All new text layers will be automatically pre-composed into a new comp named "Subtitles".
      ### Notes:
    * The text layers are created with a small pop-in effect by keyframing the scale.

## API Configuration (Optional)

You can configure the WhisperX model and language by editing the `whisperAPI.py` script before running it (or before building the `.exe`).

Key variables at the top of `whisperAPI.py`:

* `MODEL_SIZE`: Specifies the Whisper model size. Options include `"tiny"`, `"base"`, `"small"`, `"medium"`, `"large-v1"`, `"large-v2"`, `"large-v3"`. Larger models are more accurate but slower and require more resources. `"large-v3"` is the default.
    * For non-English languages, some models have multilingual variants (e.g., `tiny.en`, `base.en`). The script currently uses the general models which should autodetect the language.
* `DEVICE`: Set to `"cpu"` (default) or `"cuda"` if you have an NVIDIA GPU and want to use it for faster processing (requires compatible PyTorch installation).
* `COMPUTE_TYPE`: Optimization for the model.
    * For `DEVICE="cpu"`: `"int8"` (default) is generally good.
    * For `DEVICE="cuda"`: `"float16"` or `"bfloat16"` (if supported) are common.
* `BATCH_SIZE`: Affects transcription speed, especially on GPU. Default is `16`.

If you change these settings after the API has already downloaded models for previous settings, it might need to download new model files when it next starts.

## Troubleshooting

* **"API call failed or produced no response file" / "Received HTML instead of JSON" in AE:**
    * Ensure the `WhisperX API.exe` or `python whisperAPI.py` server is running. Check its console window for errors.
    * Verify FFmpeg is installed and in your system PATH. The API console will usually show an error if FFmpeg is missing.
    * Make sure no firewall is blocking local connections to `http://127.0.0.1:5000`.
    * Check the API console for errors like "Error loading WhisperX model". This could happen if the model download was interrupted or if there's an issue with the cached model files. Try deleting the model cache (usually in `~/.cache/whisperx` or `C:\Users\YourUser\.cache\whisperx`) and letting the API re-download.
* **"Error calling system command (curl)" in AE:**
    * Ensure `curl` is installed and accessible from your system's command line.
* **Slow Transcription:**
    * Larger audio files will take longer.
    * Using larger `MODEL_SIZE` (e.g., "large-v3") is more accurate but slower. Consider a smaller model if speed is critical and accuracy is less so.
    * If you have a compatible NVIDIA GPU, ensure `DEVICE` is set to `"cuda"` in `whisperAPI.py` and you have the correct PyTorch version installed (see Python setup).
* **Incorrect Word Timing / Alignment Issues:**
    * Clear audio quality is important. Background noise or unclear speech can affect accuracy.
    * WhisperX alignment quality can vary by language. If alignment fails, the script will still create segment-level text (if available) but without word-level timing.
* **Python Version Error when running from source:**
    * Make sure your Python version is less than 3.13 (e.g., 3.10, 3.11, 3.12).
* **AE Script Not Appearing in Window Menu:**
    * Double-check that the `.jsx` file is in the correct `ScriptUI Panels` folder for your AE version.
    * Restart After Effects.

## For Developers

### Building the .exe

The provided `WhisperX_API.exe` was bundled using PyInstaller. If you modify `whisperAPI.py` or its dependencies and want to create your own executable:

1.  **Install PyInstaller:**
    ```bash
    pip install pyinstaller
    ```
2.  **Run the PyInstaller Command:**
    * Open your terminal/command prompt in the repository's root directory (where `whisperAPI.py` is).
    * The command used is quite specific due to WhisperX's complex dependencies. You'll need to adjust paths in the `--add-data` arguments to match your Python environment's `site-packages` location.
    * **Example command structure (adapt paths!):**
        ```bash
        pyinstaller --name WhisperX_API --onefile --noconfirm --icon="path/to/your/icon.ico" \
        --hidden-import=torch \
        --hidden-import=torchaudio \
        --hidden-import=torchvision \
        --hidden-import=whisper \
        --hidden-import=whisperx \
        --hidden-import=whisperx.alignment \
        --hidden-import=whisperx.asr \
        --hidden-import=whisperx.audio \
        --hidden-import=whisperx.diarize \
        --hidden-import=whisperx.types \
        --hidden-import=whisperx.utils \
        --hidden-import=faster_whisper \
        --hidden-import=vad \
        --hidden-import=pyannote.audio \
        --hidden-import=pyannote.audio.models \
        --hidden-import=pyannote.audio.pipelines \
        --hidden-import=asteroid_filterbanks \
        --hidden-import=sklearn.metrics._pairwise_distances_reduction._middle_term_computer \
        --add-data "C:\Path\To\Your\Python\Lib\site-packages\lightning_fabric:lightning_fabric" \
        --add-data "C:\Path\To\Your\Python\Lib\site-packages\speechbrain:speechbrain" \
        --add-data "C:\Path\To\Your\Python\Lib\site-packages\whisperx:whisperx" \
        --add-data "C:\Path\To\Your\Python\Lib\site-packages\pyannote\audio:pyannote/audio" \
        --add-data "C:\Path\To\Your\Python\Lib\site-packages\asteroid_filterbanks:asteroid_filterbanks" \
        whisperAPI.py
        ```
    * Replace `"C:\Path\To\Your\Python\Lib\site-packages..."` with the actual path to these packages in your Python environment (especially if using a virtual environment). You can find your site-packages path by running:
        ```python
        import site; print(site.getsitepackages())
        ```
    * The `--icon` argument is optional.
3.  The `.exe` will be created in a `dist` subfolder.

## Contributing

Contributions are welcome! If you have improvements, bug fixes, or new features:

1.  Fork the repository.
2.  Create a new branch (`git checkout -b feature/YourAmazingFeature`).
3.  Make your changes.
4.  Commit your changes (`git commit -m 'Add some AmazingFeature'`).
5.  Push to the branch (`git push origin feature/YourAmazingFeature`).
6.  Open a Pull Request.

Please try to follow existing code style and provide clear descriptions of your changes.

## License

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details.
---
