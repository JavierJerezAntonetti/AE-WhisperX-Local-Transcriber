# AE WhisperX Local Transcriber

Transcribe audio directly within Adobe After Effects using a local WhisperX API. This tool creates styled, word-level text layers from your audio, enabling precise subtitle and kinetic typography workflows. It also includes utilities for arranging and combining the generated text layers.

![Panel Screenshot](https://github.com/user-attachments/assets/f4fec037-9aa9-4a41-bd77-d06ffc2d4573)

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
  - [4. Text Layer Utilities](#4-text-layer-utilities)
- [API Configuration (Optional)](#api-configuration-optional)
- [Troubleshooting](#troubleshooting)
- [For Developers](#for-developers)
  - [Building the .exe](#building-the-exe)
- [Contributing](#contributing)
- [License](#license)

---

## Features

* **Local Transcription:** Keep your audio data private. No cloud uploads required after initial model download.
* **WhisperX Powered:** Leverages the speed and accuracy of WhisperX for transcription and word-level timestamps.
* **Word-Level Accuracy:** Creates individual text layers for each word, perfectly timed.
* **After Effects Integration:** Dockable ScriptUI panel for a seamless experience.
* **Customizable Styling:** Control font, size, fill color, stroke color, and stroke width for the generated text layers directly from the AE panel.
* **Text Layer Utilities:** Arrange individual word layers into centered paragraphs or combine them into a single, formatted text layer.
* **Automated Pre-comping:** Generated word layers are automatically grouped into a "Subtitles" pre-comp.
* **Audio Rendering Utility:** Helper function to quickly render audio from your active AE composition.
* **Pre-compiled API Option:** Includes a bundled `.exe` for the API server, eliminating the need for users to install Python and dependencies manually.

---

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
6.  **Arrange/Combine (Optional):** Use the Text Layer Utilities to format the newly created word layers into paragraphs.

---

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

---

## Installation & Setup

Choose **one** of the following methods to set up the API:

### Method 1: Using the Pre-compiled API (Recommended for most users)

This is the simplest way to get started, especially if you don't want to deal with Python environments.

1.  **Download the Files:**
    * Go to the [Releases page](https://github.com/JavierJerezAntonetti/AE-WhisperX-Local-Transcriber/releases) of this repository.
    * Download the latest release of the WhisperX API.exe file.
2.  **Place `WhisperX API.exe`:**
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
    * Download the `whisperAPI.py` from the repository files.
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

---

## After Effects Script Setup

1.  **Locate the Script:**
    * Download the `SubtitlesGeneratorWhisper.jsx` file from the repository files.
2.  **Copy the Script to AE's ScriptUI Panels Folder:**
    * **Windows:** `C:\Program Files\Adobe\Adobe After Effects <YEAR>\Support Files\Scripts\ScriptUI Panels\`
    *(Replace `<YEAR>` with your After Effects version, e.g., 2025)*
3.  **Launch/Relaunch After Effects:**
    * If After Effects was open, you might need to restart it, or go to `Window > Find Script` and select it if AE supports dynamic loading of new panels.
    * The panel should now be available under the "Window" menu in After Effects, titled "Whisper Transcriber & Audio Tools".

---

## Usage

Once the API is running and the After Effects script is installed:

1.  Open After Effects and create or open a project and a composition.
2.  Open the "Whisper Transcriber & Audio Tools" panel from the "Window" menu.

### 1. Render Audio (Optional)

If your audio is part of your After Effects composition and you want to transcribe it, you can use the panel's render button.

* **IMPORTANT:** For this button to work reliably, you must first create an **Output Module Template** in After Effects for rendering WAV audio. You only need to do this once.

* **How to Create the WAV Template:**
    1.  Go to `Edit > Templates > Output Modules...`.
    2.  In the Output Module Templates dialog, click **New...**.
    3.  Set the **Format** to **WAV**.
    4.  Under **Audio Output**, ensure it is checked and set to your desired sample rate (e.g., 48.000 kHz, 16 Bits, Stereo).
    5.  In the **Template Name** field at the top, name it exactly `WAV Audio Only`.
    6.  Click **OK** to save the template.

* **Using the Render Button:**
    1.  Ensure the desired composition is active.
    2.  Click the "**Render Active Comp Audio (WAV)**" button in the panel.
    3.  This will render a `.wav` file to a `Rendered_Audio` subfolder in your project directory.
    4.  You can then use this rendered file for transcription.

### 2. Configure Text Styling

Before transcribing, set the default appearance for the generated text layers:

* **Font Name:** The PostScript name of the font (e.g., `ArialMT`, `Poppins-SemiBold`).
* **Font Size (pt):** The size of the text in points.
* **Fill Color (R,G,B):** Red, Green, and Blue values (0.0 to 1.0). White is `1.0, 1.0, 1.0`.
* **Stroke Width (pt):** The width of the text outline. Set to `0` for no stroke.
* **Stroke Color (R,G,B):** Red, Green, and Blue values for the stroke.

### 3. Transcribe Audio

1.  Ensure your chosen composition is active (this is where the text layers will be created).
2.  Click the "**Select Audio File & Start Transcription**" button.
3.  Select the audio file you want to transcribe (e.g., `.wav`, `.mp3`, `.m4a`).
4.  The script sends the audio to the local WhisperX API.
5.  Once complete:
    * Individual, styled, and timed text layers for each word will be created.
    * A pop-up will confirm the number of layers created.
    * All new text layers are automatically pre-composed into a comp named "**Subtitles**".
    * **Note:** The text layers are created with a small pop-in scale animation.

### 4. Text Layer Utilities

After generating word layers, you can use the utilities to format them into paragraphs. These tools work on any selected text layers.

* **Configuration:**
    * **Max Chars/Line:** The maximum number of characters allowed on a single line before forcing a line break.
    * **Max Words/Line:** The maximum number of words allowed on a single line.

* **Arrange Words Side-by-Side:**
    1.  In your composition (likely inside the "Subtitles" pre-comp), **select the word layers** you want to arrange.
    2.  Set your desired character and word limits in the panel.
    3.  Click "**Arrange Words Side-by-Side**".
    4.  The script will reposition the selected layers to form a centered paragraph, breaking lines when either the character or word limit is reached. The animation and timing of each layer are preserved.

* **Combine Selected Text Layers:**
    1.  **Select the text layers** you want to merge.
    2.  Set your desired character and word limits.
    3.  Click "**Combine Selected Text Layers**".
    4.  The script combines the text from all selected layers into the *first selected layer*. It applies line breaks based on your limits. All other selected layers are deleted. The timing of the first layer is preserved and extended to cover the duration of all original layers.

---

## API Configuration (Optional)

You can configure the WhisperX model and language by editing the `whisperAPI.py` script before running it (or before building the `.exe`).

Key variables at the top of `whisperAPI.py`:

* `MODEL_SIZE`: Whisper model size (`"tiny"`, `"base"`, `"small"`, `"medium"`, `"large-v3"`). Larger models are more accurate but slower. `"large-v3"` is the default.
* `DEVICE`: Set to `"cpu"` (default) or `"cuda"` if you have an NVIDIA GPU.
* `COMPUTE_TYPE`: Optimization for the model. `"int8"` for CPU, `"float16"` for CUDA are good starting points.
* `BATCH_SIZE`: Affects transcription speed, especially on GPU. Default is `16`.

If you change these settings, the API might need to download new model files on the next run.

---

## Troubleshooting

* **"API call failed..." / "Received HTML instead of JSON" in AE:**
    * Ensure the `WhisperX API.exe` or `python whisperAPI.py` server is running.
    * Verify FFmpeg is installed and in your system PATH.
    * Check for firewalls blocking local connections to `http://127.0.0.1:5000`.
* **"Error calling system command (curl)" in AE:**
    * Ensure `curl` is installed and accessible from your system's command line.
* **Audio Render Button Fails:**
    * Make sure you have created the `WAV Audio Only` output module template in After Effects as described in the [Usage section](#1-render-audio-optional).
* **Slow Transcription:**
    * Use a smaller `MODEL_SIZE`.
    * Use a GPU by setting `DEVICE` to `"cuda"` in `whisperAPI.py` (requires correct PyTorch installation).
* **Incorrect Word Timing / Alignment Issues:**
    * Clear audio quality is crucial. Background noise or unclear speech can affect accuracy.

---

## For Developers

### Building the .exe

The provided `WhisperX API.exe` was bundled using PyInstaller. If you modify `whisperAPI.py` and want to create your own executable:

1.  **Install PyInstaller:**
    ```bash
    pip install pyinstaller
    ```
2.  **Run the PyInstaller Command:**
    * Open your terminal in the repository's root directory. The command is complex due to dependencies. You **must** adapt the `--add-data` paths to match your Python environment's `site-packages` location.
    * **Example command structure (adapt paths!):**
        ```bash
        pyinstaller --name WhisperX_API --onefile --noconfirm --icon="path/to/your/icon.ico" \
        --hidden-import=torch \
        --hidden-import=torchaudio \
        --hidden-import=torchvision \
        --hidden-import=whisper \
        --hidden-import=whisperx \
        --hidden-import=whisperx.alignment \
        --hidden-import=faster_whisper \
        --add-data "C:\Path\To\venv\Lib\site-packages\whisperx:whisperx" \
        --add-data "C:\Path\To\venv\Lib\site-packages\pyannote\audio:pyannote/audio" \
        whisperAPI.py
        ```
    * Find your `site-packages` path by running:
        ```python
        import site; print(site.getsitepackages())
        ```

---

## Contributing

Contributions are welcome! Fork the repository, create a new branch, make your changes, and open a Pull Request.

---

## License

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details.
