import os
import tempfile
import time  # For timing operations
import sys  # For sys.frozen and sys._MEIPASS
from flask import Flask, request, jsonify
import whisperx
from werkzeug.utils import secure_filename
import json

# Try to import Google Generative AI - will fail gracefully if not installed
try:
    import google.generativeai as genai

    GEMINI_AVAILABLE = True
except ImportError:
    GEMINI_AVAILABLE = False
    print(
        "Warning: Google Generative AI library not installed. Gemini sentence splitting will not be available."
    )
    print("Install with: pip install google-generativeai")

# --- Determine the script's directory (especially for PyInstaller) ---
if getattr(sys, "frozen", False) and hasattr(sys, "_MEIPASS"):
    SCRIPT_DIR = sys._MEIPASS
else:
    SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))

# --- Configuration for UPLOAD_FOLDER ---
TEMP_DIR_BASE = tempfile.gettempdir()
UPLOAD_FOLDER = os.path.join(TEMP_DIR_BASE, "whisperx_api_uploads")
ALLOWED_EXTENSIONS = {"wav", "mp3", "m4a", "ogg", "flac", "aac", "opus"}


# --- Configuration ---
# WhisperX model identifier (e.g., "large-v3", "large-v2", "medium", "base", etc.)
MODEL_SIZE = "large-v3"
# DEVICE: "cpu" or "cuda" if you have a GPU and compatible PyTorch/WhisperX installed
DEVICE = "cpu"
# COMPUTE_TYPE: "int8" for CPU. For GPU, "float16" or "bfloat16" (if supported) are common.
COMPUTE_TYPE = "int8"
# Language is now auto-detected.

BATCH_SIZE = 16  # Batch size for transcription

# --- Initialize Flask App ---
app = Flask(__name__)
app.config["UPLOAD_FOLDER"] = UPLOAD_FOLDER

# --- Load WhisperX Model ---
print(
    f"Loading WhisperX model: {MODEL_SIZE} (language: auto-detect) on {DEVICE} with {COMPUTE_TYPE} compute type..."
)
model = None  # Initialize model to None
try:
    model = whisperx.load_model(
        MODEL_SIZE,
        device=DEVICE,
        compute_type=COMPUTE_TYPE,
        language=None,  # Set to None for automatic language detection
    )
    print(f"WhisperX Model {MODEL_SIZE} (Language: auto-detect) loaded successfully.")
except Exception as e:
    print(f"Error loading WhisperX model: {e}")
    print(
        "Please ensure you have a working internet connection for the first download,"
    )
    print("and that the model size/type is correct and WhisperX is installed properly.")
    # model remains None

# --- Create UPLOAD_FOLDER if it doesn't exist ---
if not os.path.exists(UPLOAD_FOLDER):
    try:
        os.makedirs(UPLOAD_FOLDER, exist_ok=True)
        print(f"Successfully created/ensured uploads folder at: {UPLOAD_FOLDER}")
    except PermissionError as e:
        print(
            f"Critical Error: Could not create uploads folder at '{UPLOAD_FOLDER}'. Permission denied: {e}"
        )
        print("Please check write permissions for the system's temporary directory.")
    except Exception as e:
        print(
            f"Critical Error: Failed to create uploads folder at '{UPLOAD_FOLDER}': {e}"
        )


def allowed_file(filename):
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS


def split_segments_with_gemini(segments, gemini_api_key, detected_language="en"):
    """
    Use Gemini 2.5 Flash to intelligently split long segments into shorter,
    human-readable, captionable sentences (max 9 words each).

    Args:
        segments: List of WhisperX segments with 'text', 'start', 'end'
        gemini_api_key: Gemini API key
        detected_language: Language code for better context

    Returns:
        List of new segments with better sentence splitting
    """
    if not GEMINI_AVAILABLE:
        print("Google Generative AI library not available. Returning segments as-is.")
        return segments

    if not gemini_api_key:
        print("No Gemini API key provided. Returning segments as-is.")
        return segments

    try:
        genai.configure(api_key=gemini_api_key)
    except Exception as e:
        print(f"Error configuring Gemini API: {e}")
        return segments

    # Combine all segment texts for processing
    all_texts = []
    segment_metadata = []  # Store original timing info

    for seg in segments:
        text = seg.get("text", "").strip()
        if text:
            all_texts.append(text)
            segment_metadata.append(
                {
                    "start": seg.get("start", 0.0),
                    "end": seg.get("end", 0.0),
                    "original_text": text,
                }
            )

    if not all_texts:
        return segments

    # Combine into one text for Gemini processing
    combined_text = " ".join(all_texts)

    # Calculate total duration
    total_start = segment_metadata[0]["start"] if segment_metadata else 0.0
    total_end = segment_metadata[-1]["end"] if segment_metadata else 0.0
    total_duration = total_end - total_start

    # Prepare prompt for Gemini
    language_name = (
        detected_language.upper() if detected_language else "the detected language"
    )

    prompt = f"""You are a professional subtitle editor. Your task is to split the following transcription text into short, readable, captionable segments suitable for video subtitles.

CRITICAL RULES:
- Maximum 9 words per segment (strict limit)
- Split into natural phrases or complete sentences
- Do NOT force capitalization at the start of each segment. Only capitalize if it is a proper noun or the actual start of a sentence in the original text.
- Preserve the original casing as much as possible.
- Preserve the original meaning and wording exactly
- Do NOT add or remove words, only split at natural break points
- Return ONLY a JSON array of strings, where each string is one segment
- Example format: ["this is a segment", "that continues here", "And this is a new sentence."]

Transcription text (in {language_name}):
{combined_text}

Return the JSON array of segments (max 9 words each):"""

    try:
        print(
            "Calling Gemini 2.0 Flash to split sentences into captionable chunks (max 9 words)..."
        )
        # Try gemini-2.0-flash-exp first, fallback to gemini-1.5-flash if not available
        try:
            model = genai.GenerativeModel("gemini-2.0-flash-exp")
        except Exception:
            try:
                model = genai.GenerativeModel("gemini-1.5-flash")
                print("Using gemini-1.5-flash (gemini-2.0-flash-exp not available)")
            except Exception:
                model = genai.GenerativeModel("gemini-1.5-flash")

        response = model.generate_content(
            prompt,
            generation_config={
                "temperature": 0.3,
                "max_output_tokens": 2000,
            },
        )

        response_text = response.text.strip()

        # Try to extract JSON from response (handle markdown code blocks)
        if response_text.startswith("```"):
            # Remove markdown code block markers
            lines = response_text.split("\n")
            response_text = "\n".join(lines[1:-1]) if len(lines) > 2 else response_text

        # Parse JSON
        try:
            sentences = json.loads(response_text)
        except json.JSONDecodeError:
            # Try to extract JSON array manually
            import re

            json_match = re.search(r"\[.*\]", response_text, re.DOTALL)
            if json_match:
                sentences = json.loads(json_match.group())
            else:
                raise ValueError("Could not parse Gemini response as JSON")

        if not isinstance(sentences, list) or len(sentences) == 0:
            print("Gemini returned invalid format. Using original segments.")
            return segments

        print(
            f"Gemini split text into {len(sentences)} captionable sentences (from {len(segments)} segments)"
        )

        # Distribute timing proportionally based on character count
        total_chars = len(combined_text)
        new_segments = []
        current_char_pos = 0

        for i, sentence in enumerate(sentences):
            if not sentence or not sentence.strip():
                continue

            sentence = sentence.strip()
            sentence_chars = len(sentence)

            # Calculate proportional timing
            if total_chars > 0:
                char_proportion_start = current_char_pos / total_chars
                char_proportion_end = (current_char_pos + sentence_chars) / total_chars
            else:
                char_proportion_start = i / len(sentences)
                char_proportion_end = (i + 1) / len(sentences)

            sentence_start = total_start + (total_duration * char_proportion_start)
            sentence_end = total_start + (total_duration * char_proportion_end)

            # Ensure sentence_end doesn't exceed total_end
            sentence_end = min(sentence_end, total_end)

            new_segments.append(
                {"text": sentence, "start": sentence_start, "end": sentence_end}
            )

            current_char_pos += sentence_chars + 1  # +1 for space

        return new_segments

    except Exception as e:
        print(f"Error calling Gemini for sentence splitting: {e}")
        print("Falling back to original segments.")
        return segments


@app.route("/transcribe", methods=["POST"])
def transcribe_audio():
    if model is None:
        return (
            jsonify({"error": "WhisperX model is not loaded. Check server logs."}),
            500,
        )

    if "audio" not in request.files:
        return jsonify({"error": "No audio file part in the request"}), 400

    file = request.files["audio"]
    if file.filename == "":
        return jsonify({"error": "No selected file"}), 400

    # Get transcription level parameter (word or sentence)
    transcription_level = request.form.get("transcription_level", "word")
    if transcription_level not in ["word", "sentence"]:
        transcription_level = "word"

    # Get Gemini API key (optional, only needed for sentence-level splitting)
    gemini_api_key = request.form.get("gemini_api_key", "").strip()

    if file and allowed_file(file.filename):
        filename = secure_filename(file.filename)
        temp_file_path = None

        try:
            if not os.path.exists(app.config["UPLOAD_FOLDER"]):
                print(
                    f"Upload folder {app.config['UPLOAD_FOLDER']} not found during request. Attempting to create."
                )
                try:
                    os.makedirs(app.config["UPLOAD_FOLDER"], exist_ok=True)
                except Exception as e_mkdir:
                    print(f"Failed to create upload folder during request: {e_mkdir}")
                    return (
                        jsonify(
                            {
                                "error": "Server configuration issue: cannot create upload directory."
                            }
                        ),
                        500,
                    )

            temp_fd, temp_file_path = tempfile.mkstemp(
                suffix=os.path.splitext(filename)[1], dir=app.config["UPLOAD_FOLDER"]
            )

            with os.fdopen(temp_fd, "wb") as tmp:
                file.save(tmp)

            print(f"Loading audio for WhisperX: {temp_file_path}")
            audio = whisperx.load_audio(temp_file_path)

            print(
                f"Transcribing with WhisperX model ({MODEL_SIZE}, Language: auto-detect)..."
            )
            transcribe_start_time = time.time()
            # When language=None in load_model, transcribe will detect the language.
            result = model.transcribe(audio, batch_size=BATCH_SIZE)
            transcribe_duration = time.time() - transcribe_start_time

            detected_language = result.get("language")
            if not detected_language:
                print("Error: WhisperX could not detect the language of the audio.")
                return jsonify({"error": "Language detection failed."}), 500

            print(
                f"Initial transcription completed in {transcribe_duration:.2f}s. Detected language: {detected_language}"
            )

            final_segments = result["segments"]
            full_text = " ".join(
                [
                    segment["text"].strip()
                    for segment in final_segments
                    if "text" in segment
                ]
            )

            # Only perform word-level alignment if transcription_level is 'word'
            if transcription_level == "word":
                try:
                    print(
                        f"Loading alignment model for detected language: {detected_language}..."
                    )
                    align_model_start_time = time.time()
                    align_model, metadata = whisperx.load_align_model(
                        language_code=detected_language, device=DEVICE
                    )
                    align_model_duration = time.time() - align_model_start_time
                    print(
                        f"Alignment model for '{detected_language}' loaded in {align_model_duration:.2f}s."
                    )

                    print("Aligning transcription...")
                    align_start_time = time.time()
                    result_aligned = whisperx.align(
                        result["segments"],
                        align_model,
                        metadata,
                        audio,
                        DEVICE,
                        return_char_alignments=False,
                    )
                    align_duration = time.time() - align_start_time
                    print(f"Alignment completed in {align_duration:.2f}s.")

                    final_segments = result_aligned["segments"]
                    full_text = " ".join(
                        [
                            segment["text"].strip()
                            for segment in final_segments
                            if "text" in segment
                        ]
                    )

                except Exception as align_e:
                    print(
                        f"Could not align transcription for language '{detected_language}': {align_e}"
                    )
                    print(
                        "Proceeding with segment-level timestamps only from initial transcription."
                    )
                    # final_segments is already from model.transcribe if alignment fails
                    for seg in final_segments:
                        seg["words_error"] = (
                            f"Alignment failed for language {detected_language}: {str(align_e)}"
                        )
            else:
                print(
                    f"Sentence-level transcription requested. Skipping word alignment."
                )
                # Use Gemini to intelligently split long segments into shorter sentences
                if gemini_api_key:
                    print(
                        "Using Gemini 2.0 Flash to split segments into captionable sentences (max 9 words)..."
                    )
                    final_segments = split_segments_with_gemini(
                        final_segments, gemini_api_key, detected_language
                    )
                    # Recalculate full_text after Gemini splitting
                    full_text = " ".join(
                        [
                            segment["text"].strip()
                            for segment in final_segments
                            if "text" in segment
                        ]
                    )
                else:
                    print("No Gemini API key provided. Using original segments as-is.")

            audio_duration = 0
            if final_segments and "end" in final_segments[-1]:
                audio_duration = final_segments[-1]["end"]

            response_data = {
                "language": detected_language,
                "duration_seconds": audio_duration,
                "full_text": full_text.strip(),
                "segments": final_segments,
                "transcription_level": transcription_level,
            }
            return jsonify(response_data), 200

        except Exception as e:
            print(f"Error during WhisperX transcription or alignment: {e}")
            import traceback

            traceback.print_exc()
            return jsonify({"error": f"Transcription failed: {str(e)}"}), 500
        finally:
            if temp_file_path and os.path.exists(temp_file_path):
                try:
                    os.remove(temp_file_path)
                    print(f"Cleaned up temporary file: {temp_file_path}")
                except Exception as e_remove:
                    print(
                        f"Error cleaning up temporary file {temp_file_path}: {e_remove}"
                    )
    else:
        return jsonify({"error": "File type not allowed"}), 400


@app.route("/health", methods=["GET"])
def health_check():
    if model is not None:
        return (
            jsonify(
                {
                    "status": "API is running",
                    "model_loaded": True,
                    "model_type": "WhisperX",
                    "model_size": MODEL_SIZE,
                    "language_setting": "auto-detect",
                }
            ),
            200,
        )
    else:
        return (
            jsonify(
                {
                    "status": "API is running",
                    "model_loaded": False,
                    "language_setting": "auto-detect",
                    "error": "WhisperX Model failed to load",
                }
            ),
            500,
        )


if __name__ == "__main__":
    if model is None:
        print(
            "CRITICAL: WhisperX model could not be loaded. The API will not function correctly."
        )
        # Consider exiting if model loading is absolutely critical for the app to even start
        # sys.exit(1)

    if not os.path.exists(UPLOAD_FOLDER):
        print(
            f"Upload folder '{UPLOAD_FOLDER}' does not exist at startup. Attempting to create it."
        )
        try:
            os.makedirs(UPLOAD_FOLDER, exist_ok=True)
            print(f"Successfully created/ensured uploads folder: {UPLOAD_FOLDER}")
        except Exception as e:
            print(
                f"CRITICAL FAILURE: Could not create uploads folder '{UPLOAD_FOLDER}' at startup: {e}"
            )
            print(
                "The application might not work correctly. Please check permissions or create the folder manually."
            )
            # sys.exit(1)

    print("Starting Flask server on host 127.0.0.1, port 5000")
    print(f"Uploads will be temporarily stored in: {UPLOAD_FOLDER}")
    app.run(host="127.0.0.1", port=5000, debug=False)
