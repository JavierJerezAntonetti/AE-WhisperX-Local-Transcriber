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
CPU_THREADS = 4  # Number of CPU threads for WhisperX

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
        threads=CPU_THREADS,
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


def _call_gemini_split(text, detected_language, gemini_api_key):
    """
    Helper function to call Gemini and return a list of sentence strings.
    """
    try:
        try:
            model = genai.GenerativeModel("gemini-2.0-flash")
        except Exception:
            try:
                model = genai.GenerativeModel("gemini-1.5-flash")
            except Exception:
                model = genai.GenerativeModel("gemini-1.5-flash")

        language_name = (
            detected_language.upper() if detected_language else "the detected language"
        )

        prompt = f"""You are a professional subtitle editor. Your task is to split the following transcription text into short, readable, captionable segments suitable for video subtitles.

CRITICAL RULES:
    1. LENGTH CONSTRAINT: Maximum 9 words per segment, keep it natural.
    2. GRAMMATICAL GLUE (High Priority):
      - NEVER separate a pronoun from its verb (e.g., keep "se merece", "te quiero", "it is" together).
      - NEVER separate a preposition from its noun (e.g., keep "con [Name]", "in the house", "para ti" together).
      - NEVER separate an article from its noun (e.g., keep "la casa", "the car" together).
    3. NO ORPHANS: Do not end a line with a weak word like "y", "que", "de", "el", "la", "a", "con", "the", "and", "or". Push them to the next segment mantaining the natural flow and grammatical structure.
    4. NATURAL FLOW:
      - Split at natural pauses (commas, periods).
      - Segments MUST NOT end with a comma (,) or a period (.), just ignore those punctuation marks at the end of each segment, only use them in between segments to guide splits.
    5. FORMAT:
      - Capitalize the first word of a segment ONLY if it starts a new sentence.
      - Return ONLY a JSON array of strings.

    ### PATTERN EXAMPLES (Follow this Logic):

    TYPE A: The "Preposition/Article" Split
    BAD:  ["I went to the", "park with my friend"]
    GOOD: ["I went to the park", "with my friend"]
    (Reason: Keep "to the park" and "with my friend" as complete units.)

    TYPE B: The "Pronoun/Verb" Split
    BAD:  ["Lo que realmente se", "merece es esto"]
    GOOD: ["Lo que realmente se merece", "es esto"]
    (Reason: "se" belongs to "merece". Never split them.)

Transcription text (in {language_name}):
{text}

Return the JSON array of segments:"""

        generation_config = {
            "temperature": 0.2,
            "max_output_tokens": 8192,
        }

        try:
            config_with_json = generation_config.copy()
            config_with_json["response_mime_type"] = "application/json"
            response = model.generate_content(
                prompt, generation_config=config_with_json
            )
        except Exception:
            print(
                "Note: JSON MIME type enforcement not supported/failed, falling back to standard text generation."
            )
            response = model.generate_content(
                prompt, generation_config=generation_config
            )

        response_text = response.text.strip()

        # Robust JSON Parsing
        cleaned_text = response_text
        import re

        code_block = re.search(
            r"```(?:json)?\s*(.*?)```", response_text, re.DOTALL | re.IGNORECASE
        )
        if code_block:
            cleaned_text = code_block.group(1).strip()

        sentences = []
        try:
            sentences = json.loads(cleaned_text)
        except json.JSONDecodeError:
            json_array_match = re.search(r"(\[.*\])", response_text, re.DOTALL)
            if json_array_match:
                try:
                    sentences = json.loads(json_array_match.group(1))
                except json.JSONDecodeError:
                    print(
                        f"DEBUG: Failed to parse extracted JSON array. Raw snippet: {json_array_match.group(1)[:200]}..."
                    )
                    # Recover from truncated JSON
                    try:
                        potential_json = json_array_match.group(1)
                        if not potential_json.strip().endswith("]"):
                            print(
                                "DEBUG: JSON appears truncated. Attempting simple repair..."
                            )
                            last_quote_idx = potential_json.rfind('"')
                            if last_quote_idx > 0:
                                repair_attempt = (
                                    potential_json[: last_quote_idx + 1] + "]"
                                )
                                sentences = json.loads(repair_attempt)
                                print("DEBUG: Repair successful.")
                    except:
                        pass

                    if not sentences:
                        raise ValueError("Could not parse Gemini response as JSON")
            else:
                print(
                    f"DEBUG: No valid JSON found. Raw Gemini Response: {response_text[:500]}"
                )
                if response_text.strip().startswith(
                    "["
                ) and not response_text.strip().endswith("]"):
                    print(
                        "DEBUG: Response starts with '[' but does not end with ']'. Likely token limit reached."
                    )
                raise ValueError("Could not parse Gemini response as JSON")

        return sentences

    except Exception as e:
        print(f"Error in Gemini call: {e}")
        return None


def split_segments_with_gemini(segments, gemini_api_key, detected_language="en"):
    """
    Use Gemini 2.0 Flash to intelligently split long segments.
    Processes in chunks to avoid token limits.
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

    if not segments:
        return segments

    try:
        print("Using Gemini 2.0 Flash to split segments (with chunking)...")

        # 1. Chunk segments by duration (e.g. 120 seconds per chunk)
        CHUNK_DURATION_SECONDS = 120
        chunks = []
        current_chunk = []
        chunk_start = segments[0].get("start", 0)

        for seg in segments:
            current_chunk.append(seg)
            if seg.get("end", 0) - chunk_start >= CHUNK_DURATION_SECONDS:
                chunks.append(current_chunk)
                current_chunk = []
                # Will set start time at next iteration or after loop
                if segments.index(seg) + 1 < len(segments):
                    chunk_start = segments[segments.index(seg) + 1].get("start", 0)

        if current_chunk:
            chunks.append(current_chunk)

        print(
            f"Split {len(segments)} segments into {len(chunks)} chunks for processing."
        )

        final_processed_segments = []

        for i, chunk in enumerate(chunks):
            print(f"Processing chunk {i+1}/{len(chunks)} ({len(chunk)} segments)...")

            # Prepare text for this chunk
            chunk_texts = [
                s.get("text", "").strip() for s in chunk if s.get("text", "").strip()
            ]
            if not chunk_texts:
                continue

            combined_text = " ".join(chunk_texts)

            # Calculate chunk boundaries
            chunk_start_time = chunk[0].get("start", 0)
            chunk_end_time = chunk[-1].get("end", 0)
            chunk_duration = chunk_end_time - chunk_start_time

            # Call Gemini
            sentences = _call_gemini_split(
                combined_text, detected_language, gemini_api_key
            )

            if not sentences or not isinstance(sentences, list) or len(sentences) == 0:
                print(f"Gemini failed for chunk {i+1}, using original chunk segments.")
                final_processed_segments.extend(chunk)
                continue

            # Map sentences to timestamps
            total_chars = len(combined_text)
            current_char_pos = 0

            for j, sentence in enumerate(sentences):
                if not sentence or not sentence.strip():
                    continue

                sentence = sentence.strip()
                sentence_chars = len(sentence)

                # Calculate proportional timing relative to chunk start
                if total_chars > 0:
                    char_proportion_start = current_char_pos / total_chars
                    char_proportion_end = (
                        current_char_pos + sentence_chars
                    ) / total_chars
                else:
                    char_proportion_start = j / len(sentences)
                    char_proportion_end = (j + 1) / len(sentences)

                sentence_start = chunk_start_time + (
                    chunk_duration * char_proportion_start
                )
                sentence_end = chunk_start_time + (chunk_duration * char_proportion_end)

                # Clamp to chunk boundaries
                sentence_end = min(sentence_end, chunk_end_time)

                final_processed_segments.append(
                    {"text": sentence, "start": sentence_start, "end": sentence_end}
                )

                current_char_pos += sentence_chars + 1  # +1 for space

        return final_processed_segments

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

    # Get language (optional, to skip auto-detection)
    language_code = request.form.get("language", "").strip()
    if language_code == "":
        language_code = None  # Use auto-detect if empty

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
                f"Transcribing with WhisperX model ({MODEL_SIZE}, Language: {language_code if language_code else 'auto-detect'})..."
            )
            transcribe_start_time = time.time()
            # When language=None in load_model, transcribe will detect the language.
            # If language_code is provided, transcribe refers to it.
            result = model.transcribe(
                audio, batch_size=BATCH_SIZE, language=language_code
            )
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
                        "Using Gemini 2.0 Flash to split segments into captionable sentences..."
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
