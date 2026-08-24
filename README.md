# AE WhisperX Local Transcriber

Transcribe audio directly within Adobe After Effects using a local WhisperX API. This tool creates styled, word-level text layers from your audio, enabling precise subtitle and kinetic typography workflows. It also includes utilities for arranging and combining the generated text layers.

![Panel Screenshot](https://github.com/user-attachments/assets/758d627d-f3f9-4037-bd39-cb1cc3a15207)

## Table of Contents

- [Features](#features)
- [How it Works](#how-it-works)
- [Prerequisites](#prerequisites)
- [Installation & Setup](#installation--setup)
  - [1. Clone / Download Repository](#1-clone--download-repository)
  - [2. Set Up Python Virtual Environment](#2-set-up-python-virtual-environment)
  - [3. Install Dependencies](#3-install-dependencies)
  - [4. Run the Python API Server](#4-run-the-python-api-server)
- [After Effects Script Setup](#after-effects-script-setup)
- [Usage](#usage)
  - [1. Render Audio (Optional)](#1-render-audio-optional)
  - [2. Manage Presets & Text Styling](#2-manage-presets--text-styling)
  - [3. Transcribe Audio](#3-transcribe-audio)
  - [4. Text Layer Utilities](#4-text-layer-utilities)
- [API Configuration (Optional)](#api-configuration-optional)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)
- [License](#license)

---

## Features

- **Local Transcription:** Keep your audio data private. No cloud uploads required after initial model download.
- **WhisperX Powered:** Leverages the speed and accuracy of WhisperX for transcription and word-level timestamps.
- **Flexible Transcription Modes:**
  - **Word-by-Word Mode:** Creates individual text layers for each word with precise timing (default).
  - **Sentence Level Mode:** Creates one text layer per sentence for faster processing.
  - **Separate Text Layers Mode:** Combines the best of both - uses word-level timing with sentence-corrected text, automatically arranged side-by-side.
- **AI-Powered Sentence Splitting:** Optional integration with Google Gemini (e.g. Gemini 3.6 Flash) to intelligently split long sentences into short, captionable chunks (max 9 words per segment).
- **Manual Language Selection:** Enter a language code (e.g., "en", "es") to skip auto-detection and speed up transcription.
- **After Effects Integration:** Dockable ScriptUI panel for a seamless experience.
- **Smart Persistence:** Your settings for Language Code, Transcription Level, Separate Text Layers mode, and Gemini API Key are automatically saved and restored between sessions.
- **Preset System:** Save and load different text styling and layout configurations. Your last used preset is automatically loaded when you restart After Effects.
- **Text Layer Utilities:** Arrange individual word layers into centered paragraphs or combine them into a single, formatted text layer.
- **Right-to-Left (RTL) Language Support:** Automatically detects RTL languages (like Arabic, Hebrew) and provides a manual override for correct layout when arranging or combining text.
- **Automated Pre-comping:** Generated word layers are automatically grouped into a "Subtitles" pre-comp.
- **Audio Rendering Utility:** Helper function to quickly render audio from your active AE composition.
- **Silent Processing:** Runs without interrupting alerts - only shows warnings if something goes wrong.
- **Lightweight Local Python Server:** Fast local API powered by Flask / Waitress with CPU and NVIDIA CUDA GPU acceleration support.

---

## How it Works

1.  **Start the Local API:** Run the `whisperAPI.py` script. This starts the API server on your local machine (`http://127.0.0.1:5000`).
2.  **Open the AE Panel:** Launch After Effects and open the "Whisper Transcriber & Audio Tools" panel.
3.  **Render Audio:**
    - Optionally, use the panel to render audio from your active composition.
    - Select an existing audio file (`.wav`, `.mp3`, etc.).
4.  **Configure Styles & Presets:** Adjust font, size, and color settings in the panel. You can save these settings as a preset for quick recall later.
5.  **Choose Transcription Mode:**
    - **Word-by-Word (Default):** Creates individual text layers for each word with precise timing.
    - **Sentence Level:** Creates one text layer per sentence. Optionally use Gemini API key for intelligent sentence splitting into captionable chunks (max 9 words).
    - **Separate Text Layers:** When Sentence Level is selected, this mode makes two API calls - one for word timing and one for sentence text - then combines them to create word layers with sentence-corrected text, automatically arranged side-by-side.
6.  **Transcribe:** Click "Select Audio File & Start Transcription".
    - The AE script sends the audio file to the local API with your selected transcription mode.
    - The API transcribes the audio using WhisperX:
      - **Word-by-Word:** Performs word-level alignment and returns timed words.
      - **Sentence Level:** Returns sentence-level segments. If a Gemini API key is provided, uses Gemini to split long sentences into shorter, captionable chunks (max 9 words each).
    - The AE script parses the JSON response:
      - Creates text layers (word-by-word or sentence-by-sentence based on mode).
      - Applies the configured styles and sets in/out points.
      - Automatically detects RTL languages and enables RTL layout mode.
      - In Separate Text Layers mode, automatically arranges words side-by-side.
    - All created text layers are pre-composed into a "Subtitles" comp.
    - The process runs silently - you'll only see alerts if there were warnings or fallbacks.
7.  **Arrange/Combine (Optional):** Use the Text Layer Utilities to further format the newly created text layers into paragraphs (if not already arranged in Separate Text Layers mode).

---

## Prerequisites

Before you begin, ensure you have the following installed:

1.  **Adobe After Effects:** (e.g., AE 2023, 2024, 2025).
2.  **Python:**
    - Python version **must be LESS THAN 3.13** (e.g., `3.10`, `3.11`, `3.12`) due to Whisper / WhisperX compatibility.
    - You can download compatible Python versions from [python.org](https://www.python.org/downloads/).
    - Ensure `pip` is installed and Python is added to your system's PATH.
3.  **FFmpeg:**
    - WhisperX requires FFmpeg to process audio files.
    - It **must** be installed and accessible in your system's PATH.
    - **Windows Guide:** [How to Install FFmpeg on Windows (phoenixnap.com)](https://phoenixnap.com/kb/ffmpeg-windows)
4.  **Curl:**
    - The After Effects script uses `curl` to communicate with the local API.
    - **Windows:** Modern Windows 10/11 includes `curl` by default.
5.  **(Optional) Google Gemini API Key:**
    - Required only if you want to use intelligent sentence splitting for Sentence Level transcription.
    - Get your free API key from [Google AI Studio](https://aistudio.google.com/app/apikey).
    - The API key is saved in After Effects settings, so you only need to enter it once.

---

## Installation & Setup

Follow these steps to set up and run the local WhisperX API server:

### 1. Clone / Download Repository

Clone the repository or download the ZIP:

```bash
git clone https://github.com/JavierJerezAntonetti/AE-WhisperX-Local-Transcriber.git
cd AE-WhisperX-Local-Transcriber
```

### 2. Set Up Python Virtual Environment

It is strongly recommended to use a Python virtual environment:

```bash
# Create a virtual environment using a compatible Python version (3.10 - 3.12)
python -m venv venv

# Activate the virtual environment
# Windows (PowerShell / Command Prompt):
venv\Scripts\activate

# macOS / Linux:
source venv/bin/activate
```

### 3. Install Dependencies

Install the required packages from `requirements.txt`:

```bash
pip install -r requirements.txt
```

> **GPU Acceleration (Optional, for NVIDIA GPUs):**  
> If you have a compatible NVIDIA GPU and want faster processing via CUDA, install a CUDA-enabled build of PyTorch. Visit [PyTorch.org](https://pytorch.org/get-started/locally/) for your specific CUDA version (e.g., `pip install torch torchaudio --index-url https://download.pytorch.org/whl/cu124`). Then, change `DEVICE = "cuda"` and `COMPUTE_TYPE = "float16"` at the top of `whisperAPI.py`.

### 4. Run the Python API Server

Start the API server by running:

```bash
python whisperAPI.py
```

- When run for the first time, WhisperX will download the model files (requires an internet connection). Subsequent starts will load cached models quickly.
- When ready, the terminal will show messages confirming the model is loaded and the server is running on `http://127.0.0.1:5000`:
  ```text
  Loading WhisperX model: large-v3 (language: auto-detect) on cpu with int8 compute type...
  WhisperX Model large-v3 (Language: auto-detect) loaded successfully.
  Starting API server on host 127.0.0.1, port 5000
  ```
- **Keep this terminal / console window open while using the After Effects script.** Closing it stops the API server.

---

## After Effects Script Setup

1.  **Locate the Script:**
    - Find `SubtitlesGeneratorWhisper.jsx` in the repository folder.
2.  **Copy the Script to AE's ScriptUI Panels Folder:**
    - **Windows:** `C:\Program Files\Adobe\Adobe After Effects <YEAR>\Support Files\Scripts\ScriptUI Panels\`  
      _(Replace `<YEAR>` with your After Effects version, e.g., 2025)_
    - **macOS:** `/Applications/Adobe After Effects <YEAR>/Scripts/ScriptUI Panels/`
3.  **Launch / Relaunch After Effects:**
    - Restart After Effects.
    - Open the panel from the top menu: **Window > SubtitlesGeneratorWhisper.jsx** (titled "Whisper Transcriber & Audio Tools").

---

## Usage

Once `python whisperAPI.py` is running and the After Effects script is installed:

1.  Open After Effects and create or open a project and a composition.
2.  Open the "Whisper Transcriber & Audio Tools" panel from the **Window** menu.

### 1. Render Audio (Optional)

If your audio is part of your After Effects composition and you want to transcribe it, you can use the panel's render button.

- **IMPORTANT:** For this button to work reliably, you must first create an **Output Module Template** in After Effects for rendering WAV audio. You only need to do this once.

- **How to Create the WAV Template:**
  1.  Go to `Edit > Templates > Output Modules...`.
  2.  In the Output Module Templates dialog, click **New...**.
  3.  Set the **Format** to **WAV**.
  4.  Under **Audio Output**, ensure it is checked and set to your desired sample rate (e.g., 48.000 kHz, 16 Bits, Stereo).
  5.  In the **Template Name** field at the top, name it exactly `WAV Audio Only`.
  6.  Click **OK** to save the template.

- **Using the Render Button:**
  1.  Ensure the desired composition is active.
  2.  Click the "**Render Active Comp Audio (WAV)**" button in the panel.
  3.  This will render a `.wav` file to a `Rendered_Audio` subfolder in your project directory.
  4.  You can then use this rendered file for transcription.

### 2. Manage Presets & Text Styling

The panel includes a preset system to save and quickly load your favorite settings for text styling and layout.

- **Presets Dropdown:** Shows a list of all your saved presets. Selecting one will instantly apply its settings to the UI fields. The last selected preset is remembered when you restart After Effects.
- **Save Button:** Saves the current values from all styling and layout fields as a new preset. You will be prompted to enter a name.
- **Delete Button:** Deletes the currently selected preset from the dropdown.

Before transcribing, you can either load a preset or manually set the appearance for the generated text layers:

- **Font Name:** On After Effects 24.0 and newer, this is a dropdown list of all fonts installed on your system. On older versions, you must enter the PostScript name of the font manually (e.g., `ArialMT`, `Poppins-SemiBold`).
- **Font Size (pt):** The size of the text in points.
- **Fill Color (R,G,B):** Red, Green, and Blue values (0.0 to 1.0). White is `1.0, 1.0, 1.0`.
- **Stroke Width (pt):** The width of the text outline. Set to `0` for no stroke.
- **Stroke Color (R,G,B):** Red, Green, and Blue values for the stroke.

The preset also saves the **Max Chars/Line** and **Max Words/Line** values from the "Text Layer Utilities" section.

### 3. Transcribe Audio

1.  Ensure your chosen composition is active (this is where the text layers will be created).

2.  **Choose Your Transcription Mode:**
    - **Transcription Level Dropdown:**
      - **Word-by-Word (Default):** Creates individual text layers for each word with precise timing. Best for kinetic typography and word-by-word animations.
      - **Sentence Level:** Creates one text layer per sentence. Faster processing, ideal for subtitle workflows. Optionally use Gemini for intelligent sentence splitting.

    - **Separate Text Layers Checkbox:**
      - Only available when "Sentence Level" is selected.
      - When checked, makes two API calls (word + sentence) and combines them:
        - Uses word-level timing for precise appearance of each word.
        - Uses sentence-level corrected text for better accuracy.
        - Automatically arranges words side-by-side in proper sentence formation.
        - Perfect for creating word-by-word animations with correct sentence structure.

    - **Gemini API Key (Optional):**
      - Enter your Google Gemini API key to enable intelligent sentence splitting.
      - Only used when "Sentence Level" is selected.
      - Splits long sentences into short, captionable chunks (max 9 words per sentence).
      - The API key is automatically saved in After Effects settings.
      - Get your free API key from [Google AI Studio](https://aistudio.google.com/app/apikey).

3.  Click the "**Select Audio File & Start Transcription**" button.

4.  Select the audio file you want to transcribe (e.g., `.wav`, `.mp3`, `.m4a`).

5.  The script sends the audio to the local WhisperX API (`http://127.0.0.1:5000`) with your selected mode.

6.  **Processing:**
    - The process runs silently without interrupting alerts.
    - For "Separate Text Layers" mode, two API calls are made automatically.
    - If a Gemini API key is provided with Sentence Level, sentences are intelligently split.
    - RTL languages are automatically detected and handled.

7.  **Once complete:**
    - Text layers are created based on your selected mode:
      - **Word-by-Word:** One layer per word with precise timing.
      - **Sentence Level:** One layer per sentence (or split sentence if Gemini is used).
      - **Separate Text Layers:** One layer per word with sentence text, automatically arranged side-by-side.
    - All layers are styled according to your preset/settings.
    - All new text layers are automatically pre-composed into a comp named "**Subtitles**".
    - If any warnings or fallbacks occurred, you'll see a summary at the end. Otherwise, the process completes silently.

**Transcription Mode Comparison:**

| Mode                    | Layers Created         | Timing         | Text Source                    | Auto-Arranged | Best For                               |
| ----------------------- | ---------------------- | -------------- | ------------------------------ | ------------- | -------------------------------------- |
| Word-by-Word            | One per word           | Word-level     | Word transcription             | No            | Kinetic typography, word animations    |
| Sentence Level          | One per sentence       | Sentence-level | Sentence transcription         | No            | Simple subtitles                       |
| Sentence Level + Gemini | One per split sentence | Sentence-level | Sentence transcription (split) | No            | Captionable subtitles (max 9 words)    |
| Separate Text Layers    | One per word           | Word-level     | Sentence transcription         | Yes           | Word animations with correct sentences |

### 4. Text Layer Utilities

After generating text layers, you can use the utilities to format them into paragraphs. These tools work on any selected text layers.

**Note:** If you used "Separate Text Layers" mode, words are already automatically arranged side-by-side. You can still use these utilities to rearrange or combine layers if needed.

- **Configuration:**
  - **Max Chars/Line:** The maximum number of characters allowed on a single line before forcing a line break.
  - **Max Words/Line:** The maximum number of words allowed on a single line.
  - **Force RTL Layout:** A checkbox to manually enable Right-to-Left layout for the **Arrange Words Side-by-Side** function. This is automatically checked if an RTL language (e.g., Arabic, Hebrew) is detected during transcription, but can be toggled manually.

- **Arrange Words Side-by-Side:**
  1.  In your composition (likely inside the "Subtitles" pre-comp), **select the word layers** you want to arrange.
  2.  Set your desired character and word limits in the panel.
  3.  Click "**Arrange Words Side-by-Side**".
  4.  The script will reposition the selected layers to form a centered paragraph, breaking lines when either the character or word limit is reached. The animation and timing of each layer are preserved. If RTL mode is active, words will be arranged from right to left.

- **Combine Selected Text Layers:**
  1.  **Select the text layers** you want to merge.
  2.  Set your desired character and word limits.
  3.  Click "**Combine Selected Text Layers**".
  4.  The script combines the text from all selected layers into the _first selected layer_. It applies line breaks based on your limits. All other selected layers are deleted. The timing of the first layer is preserved and extended to cover the duration of all original layers. After Effects' text engine will automatically handle the correct display order for RTL languages.

---

## API Configuration (Optional)

You can configure WhisperX model settings by editing the variables at the top of `whisperAPI.py`:

- `MODEL_SIZE`: Whisper model size (`"tiny"`, `"base"`, `"small"`, `"medium"`, `"large-v3"`). Larger models are more accurate but require more memory. `"large-v3"` is the default.
- `DEVICE`: Set to `"cpu"` (default) or `"cuda"` if using an NVIDIA GPU.
- `COMPUTE_TYPE`: Optimization precision. `"int8"` for CPU, `"float16"` or `"bfloat16"` for CUDA.
- `BATCH_SIZE`: Batch size for transcription (default: `16`).
- `CPU_THREADS`: Number of CPU threads used by WhisperX (default: `4`).

**Note:** The API accepts a `language` parameter directly from the AE script UI. If provided, it overrides automatic language detection.

---

## Troubleshooting

- **"API call failed..." / "Received HTML instead of JSON" in AE:**
  - Ensure the Python API server is running in your terminal: `python whisperAPI.py`.
  - Verify that FFmpeg is installed and added to your system's PATH.
  - Check that no firewall or antivirus is blocking local connections to `http://127.0.0.1:5000`.
- **"Error calling system command (curl)" in AE:**
  - Ensure `curl` is accessible from your command prompt / terminal.
- **Audio Render Button Fails:**
  - Make sure you have created the `WAV Audio Only` output module template in After Effects as described in the [Usage section](#1-render-audio-optional).
- **Slow Transcription:**
  - Use a smaller `MODEL_SIZE` in `whisperAPI.py` (e.g., `"small"` or `"base"`).
  - Use an NVIDIA GPU by setting `DEVICE = "cuda"` in `whisperAPI.py` (requires CUDA PyTorch installation).
- **Incorrect Word Timing / Alignment Issues:**
  - Clear audio quality is crucial. Background noise or unclear speech can affect alignment accuracy.
- **Gemini Sentence Splitting Not Working:**
  - Ensure you've entered a valid Gemini API key in the panel.
  - Verify `google-genai` is installed: `pip install google-genai`.
  - Check the API server console for any Gemini error messages.
  - If Gemini fails, the API will automatically fall back to original Whisper segments.
- **Separate Text Layers Mode Issues:**
  - This mode makes two API calls, so it takes slightly longer to complete.
  - If word and sentence transcriptions diverge, try using Word-by-Word mode instead.

---

## Contributing

Contributions are welcome! Fork the repository, create a new branch, make your changes, and open a Pull Request.

---

## License

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details.
