# AE WhisperX Local Transcriber

Transcribe audio directly within Adobe After Effects using a local WhisperX API. This tool creates styled, word-level text layers from your audio, enabling precise subtitle and kinetic typography workflows. It also includes utilities for arranging and combining the generated text layers.

![Panel Screenshot](https://github.com/user-attachments/assets/0a93e050-333d-494b-8968-2d292b0a3454)

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
  - [2. Manage Presets & Text Styling](#2-manage-presets--text-styling)
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

- **Local Transcription:** Keep your audio data private. No cloud uploads required after initial model download.
- **WhisperX Powered:** Leverages the speed and accuracy of WhisperX for transcription and word-level timestamps.
- **Flexible Transcription Modes:**
  - **Word-by-Word Mode:** Creates individual text layers for each word with precise timing (default).
  - **Sentence Level Mode:** Creates one text layer per sentence for faster processing.
  - **Separate Text Layers Mode:** Combines the best of both - uses word-level timing with sentence-corrected text, automatically arranged side-by-side.
- **AI-Powered Sentence Splitting:** Optional integration with Google Gemini 2.0 Flash to intelligently split long sentences into short, captionable chunks (max 9 words per sentence).
- **Manual Language Selection:** Enter a language code (e.g., "en", "es") to skip auto-detection and speed up transcription.
- **After Effects Integration:** Dockable ScriptUI panel for a seamless experience.
- **Customizable Styling:** Control font, size, fill color, stroke color, and stroke width for the generated text layers directly from the AE panel.
- **Language Pre-definition:** Option to manually specify the language code (e.g., 'en', 'es') to skip auto-detection and speed up transcription.
- **Dynamic Font Selector:** Automatically populates a dropdown with all system fonts on After Effects 24.0+, with a fallback to manual input for older versions.
- **Smart Persistence:** Your settings for Language Code, Transcription Level, Separate Text Layers mode, and Gemini API Key are automatically saved and restored between sessions.
- **Preset System:** Save and load different text styling and layout configurations. Your last used preset is automatically loaded when you restart After Effects.
- **Text Layer Utilities:** Arrange individual word layers into centered paragraphs or combine them into a single, formatted text layer.
- **Right-to-Left (RTL) Language Support:** Automatically detects RTL languages (like Arabic, Hebrew) and provides a manual override for correct layout when arranging or combining text.
- **Automated Pre-comping:** Generated word layers are automatically grouped into a "Subtitles" pre-comp.
- **Audio Rendering Utility:** Helper function to quickly render audio from your active AE composition.
- **Silent Processing:** Runs without interrupting alerts - only shows warnings if something goes wrong.
- **Pre-compiled API Option:** Includes a bundled `.exe` for the API server, eliminating the need for users to install Python and dependencies manually.

---

## How it Works

1.  **Start the Local API:** Run the `WhisperX API.exe` (or `whisperAPI.py` script). This starts a Flask server on your local machine (`http://127.0.0.1:5000`).
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
      - **Sentence Level:** Returns sentence-level segments. If a Gemini API key is provided, uses Gemini 2.0 Flash to split long sentences into shorter, captionable chunks (max 9 words each).
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

1.  **Adobe After Effects:** (e.g., AE 2023, 2024, 2025). The script is placed in the `ScriptUI Panels` folder.
2.  **FFmpeg:**
    - WhisperX (and therefore this API) requires FFmpeg to process audio.
    - It **must** be installed and accessible in your system's PATH.
    - **Windows Guide:** [How to Install FFmpeg on Windows (phoenixnap.com)](https://phoenixnap.com/kb/ffmpeg-windows)
3.  **Curl (for AE Script):**
    - The After Effects script uses `curl` to communicate with the local API.
    - **Windows:** Modern Windows 10/11 includes `curl`. If not, you might need to install it or ensure it's in your PATH.
4.  **(Optional - For running API from source only) Python:**
    - If you choose _not_ to use the pre-compiled `WhisperX API.exe`, you'll need Python.
    - **Crucially, Python version must be LESS THAN 3.13** (e.g., 3.10, 3.11, 3.12) due to Whisper/WhisperX compatibility. You can download older Python versions from [python.org](https://www.python.org/downloads/).
    - `pip` (Python package installer) is also required.
5.  **(Optional) Google Gemini API Key:**
    - Required only if you want to use intelligent sentence splitting for Sentence Level transcription.
    - Get your free API key from [Google AI Studio](https://aistudio.google.com/app/apikey).
    - The API key is saved in After Effects settings, so you only need to enter it once.

---

## Installation & Setup

Choose **one** of the following methods to set up the API:

### Method 1: Using the Pre-compiled API (Recommended for most users)

This is the simplest way to get started, especially if you don't want to deal with Python environments.

1.  **Download the Files:**
    - Go to the [Releases page](https://github.com/JavierJerezAntonetti/AE-WhisperX-Local-Transcriber/releases) of this repository.
    - Download the latest release of the WhisperX API.exe file.
2.  **Place `WhisperX API.exe`:**
    - Place `WhisperX API.exe` in a convenient location on your computer.
3.  **Run the API:**
    - Double-click `WhisperX API.exe`.
    - A console window will appear. The first time you run it, it will download the WhisperX model files. This may take some time and requires an internet connection. Subsequent runs will be faster as models are cached.
    - You should see messages indicating the model is loading and the Flask server is starting (e.g., `Starting Flask server on host 127.0.0.1, port 5000`).
    - **Keep this console window open while you are using the After Effects script.** Closing it will stop the API.
4.  **Proceed to [After Effects Script Setup](#after-effects-script-setup).**

### Method 2: Running the API from Python Source (For developers/advanced users)

This method gives you more control and is necessary if you want to modify the API code.

1.  **Download the Release:**
    - Go to the [Releases page](https://github.com/JavierJerezAntonetti/AE-WhisperX-Local-Transcriber/releases) of this repository.
    - Download the `whisperAPI.py` from the repository files.
2.  **Set up a Python Environment (Recommended):**
    - Ensure you have Python installed (version < 3.13).
    - It's highly recommended to use a virtual environment:
      ```bash
      python -m venv venv
      # On Windows
      venv\Scripts\activate
      ```
3.  **Install Dependencies:**
    - The `requirements.txt` file lists all necessary Python packages.
      ```bash
      pip install -r requirements.txt
      ```
    - **Note:** The `google-generativeai` package is included for optional Gemini sentence splitting. If you don't plan to use this feature, you can skip installing it, but the API will gracefully handle its absence.
    - **Note on PyTorch:** If you have a compatible NVIDIA GPU and want to use CUDA for faster processing, you might need a specific PyTorch version. The `requirements.txt` installs the standard CPU version. Visit [PyTorch.org](https://pytorch.org/get-started/locally/) for instructions on installing with CUDA support. If you do, remember to change the `DEVICE` setting in `whisperAPI.py` to `"cuda"`.
4.  **Run the API:**
    ```bash
    python whisperAPI.py
    ```
    - A console window will appear. The first time you run it, it will download the WhisperX model files. This may take some time and requires an internet connection.
    - You should see messages indicating the model is loading and the Flask server is starting (e.g., `Starting Flask server on host 127.0.0.1, port 5000`).
    - **Keep this console window open while you are using the After Effects script.**
5.  **Proceed to [After Effects Script Setup](#after-effects-script-setup).**

---

## After Effects Script Setup

1.  **Locate the Script:**
    - Download the `SubtitlesGeneratorWhisper.jsx` file from the repository files.
2.  **Copy the Script to AE's ScriptUI Panels Folder:**
    - **Windows:** `C:\Program Files\Adobe\Adobe After Effects <YEAR>\Support Files\Scripts\ScriptUI Panels\`
      _(Replace `<YEAR>` with your After Effects version, e.g., 2025)_
3.  **Launch/Relaunch After Effects:**
    - If After Effects was open, you might need to restart it, or go to `Window > Find Script` and select it if AE supports dynamic loading of new panels.
    - The panel should now be available under the "Window" menu in After Effects, titled "Whisper Transcriber & Audio Tools".

---

## Usage

Once the API is running and the After Effects script is installed:

1.  Open After Effects and create or open a project and a composition.
2.  Open the "Whisper Transcriber & Audio Tools" panel from the "Window" menu.

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

5.  The script sends the audio to the local WhisperX API with your selected mode.

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

You can configure the WhisperX model and language by editing the `whisperAPI.py` script before running it (or before building the `.exe`).

Key variables at the top of `whisperAPI.py`:

- `MODEL_SIZE`: Whisper model size (`"tiny"`, `"base"`, `"small"`, `"medium"`, `"large-v3"`). Larger models are more accurate but slower. `"large-v3"` is the default.
- `DEVICE`: Set to `"cpu"` (default) or `"cuda"` if you have an NVIDIA GPU.
- `COMPUTE_TYPE`: Optimization for the model. `"int8"` for CPU, `"float16"` for CUDA are good starting points.
- `BATCH_SIZE`: Affects transcription speed, especially on GPU. Default is `16`.

**Note:** The API now accepts a `language` parameter from the AE script. If provided, it overrides the auto-detection logic.

If you change these settings, the API might need to download new model files on the next run.

---

## Troubleshooting

- **"API call failed..." / "Received HTML instead of JSON" in AE:**
  - Ensure the `WhisperX API.exe` or `python whisperAPI.py` server is running.
  - Verify FFmpeg is installed and in your system PATH.
  - Check for firewalls blocking local connections to `http://127.0.0.1:5000`.
- **"Error calling system command (curl)" in AE:**
  - Ensure `curl` is installed and accessible from your system's command line.
- **Audio Render Button Fails:**
  - Make sure you have created the `WAV Audio Only` output module template in After Effects as described in the [Usage section](#1-render-audio-optional).
- **Slow Transcription:**
  - Use a smaller `MODEL_SIZE`.
  - Use a GPU by setting `DEVICE` to `"cuda"` in `whisperAPI.py` (requires correct PyTorch installation).
- **Incorrect Word Timing / Alignment Issues:**
  - Clear audio quality is crucial. Background noise or unclear speech can affect accuracy.
- **Gemini Sentence Splitting Not Working:**
  - Ensure you've entered a valid Gemini API key in the panel.
  - Verify `google-generativeai` is installed if running from source: `pip install google-generativeai`
  - Check the API console for Gemini-related error messages.
  - If Gemini fails, the API will fall back to using original segments automatically.
- **Separate Text Layers Mode Issues:**
  - This mode makes two API calls, so it takes longer. Be patient.
  - If word and sentence transcriptions don't match well, try using Word-by-Word mode instead.
  - Check the summary alert at the end if there were any warnings during processing.

---

## For Developers

### Building the .exe

The provided `WhisperX API.exe` was bundled using PyInstaller. If you modify `whisperAPI.py` and want to create your own executable:

1.  **Install PyInstaller:**
    ```bash
    pip install pyinstaller
    ```
2.  **Run the PyInstaller Command:**
    - Open your terminal in the repository's root directory. The command is complex due to dependencies. You **must** adapt the `--add-data` paths to match your Python environment's `site-packages` location.
    - **Example command structure (adapt paths!):**
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
    - Find your `site-packages` path by running:
      ```python
      import site; print(site.getsitepackages())
      ```

---

## Contributing

Contributions are welcome! Fork the repository, create a new branch, make your changes, and open a Pull Request.

---

## License

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details.
