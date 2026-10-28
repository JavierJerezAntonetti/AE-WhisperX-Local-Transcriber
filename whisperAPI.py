import os
import tempfile
import time  # For timing operations
import sys  # For sys.frozen and sys._MEIPASS
import json
import warnings
import logging

# --- Configure Warnings and Logging to Suppress False-Alarm Framework Notices ---
warnings.filterwarnings("ignore", category=FutureWarning)
warnings.filterwarnings("ignore", category=UserWarning)
warnings.filterwarnings("ignore", message=".*weights_only.*")
warnings.filterwarnings("ignore", message=".*Model was trained with.*")
warnings.filterwarnings("ignore", message=".*Bad things.*")
warnings.filterwarnings("ignore", message=".*automatically upgraded your loaded checkpoint.*")

for _logger_name in [
    "pytorch_lightning",
    "lightning_fabric",
    "lightning",
    "lightning.fabric",
    "lightning.pytorch",
    "lightning.pytorch.utilities.migration.utils",
    "pytorch_lightning.utilities.migration.utils",
    "pyannote",
    "speechbrain",
    "werkzeug",
    "google_genai",
    "google_genai.models",
]:
    _l = logging.getLogger(_logger_name)
    _l.setLevel(logging.ERROR)
    _l.propagate = False

# Patch pyannote's version check print false-alarms
try:
    import pyannote.audio.core.model
    import pyannote.audio.core.pipeline
    import pyannote.audio.core.inference
    import pyannote.audio.utils.version

    pyannote.audio.core.model.check_version = lambda *a, **kw: None
    pyannote.audio.core.pipeline.check_version = lambda *a, **kw: None
    pyannote.audio.core.inference.check_version = lambda *a, **kw: None
    pyannote.audio.utils.version.check_version = lambda *a, **kw: None
except Exception:
    pass

from flask import Flask, request, jsonify
import whisperx
from werkzeug.utils import secure_filename

# Try importing waitress for production WSGI serving (avoids Flask dev server warnings)
try:
    from waitress import serve
    USE_WAITRESS = True
except ImportError:
    USE_WAITRESS = False

# Try to import Google GenAI (new official SDK) or fallback gracefully to legacy google.generativeai
GEMINI_SDK_TYPE = None
GEMINI_AVAILABLE = False
try:
    from google import genai
    from google.genai import types

    GEMINI_AVAILABLE = True
    GEMINI_SDK_TYPE = "genai"
except ImportError:
    try:
        with warnings.catch_warnings():
            warnings.filterwarnings("ignore", category=FutureWarning)
            import google.generativeai as legacy_genai

        GEMINI_AVAILABLE = True
        GEMINI_SDK_TYPE = "legacy"
    except ImportError:
        GEMINI_AVAILABLE = False
        GEMINI_SDK_TYPE = None
        print(
            "Warning: Google GenAI library not installed. Gemini sentence splitting will not be available."
        )
        print("Install with: pip install google-genai")

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
MODEL_SIZE = os.environ.get("WHISPER_MODEL", "large-v3-turbo")
# Gemini model used for sentence splitting.
GEMINI_MODEL_NAME = os.environ.get("GEMINI_MODEL", "gemini-3.8-flash")
GEMINI_MODEL_LABEL = "Gemini 3.8 Flash"
# DEVICE: "cpu" (default for maximum compatibility) or "cuda" if GPU is available
DEVICE = os.environ.get("WHISPER_DEVICE", "cpu").lower()
# COMPUTE_TYPE: "int8" for CPU. For GPU, "float16" or "bfloat16" (if supported) are common.
COMPUTE_TYPE = os.environ.get(
    "WHISPER_COMPUTE_TYPE", "int8" if DEVICE == "cpu" else "float16"
)
# Concurrency tuning: 8 CPU threads matches physical Zen 3 cores on Ryzen 5800X
BATCH_SIZE = int(os.environ.get("BATCH_SIZE", "8"))
CPU_THREADS = int(os.environ.get("CPU_THREADS", "8"))

# In-memory cache for wav2vec2 alignment models: (language_code, device) -> (align_model, metadata)
ALIGNMENT_MODELS_CACHE = {}


def get_alignment_model(language_code, device):
    """
    Retrieves or loads the alignment model for the specified language.
    Cached in RAM so subsequent requests don't waste 2+ seconds reloading from disk.
    """
    cache_key = (language_code, device)
    if cache_key not in ALIGNMENT_MODELS_CACHE:
        print(f"Loading alignment model for detected language: {language_code}...")
        align_model_start_time = time.time()
        align_model, metadata = whisperx.load_align_model(
            language_code=language_code, device=device
        )
        align_model_duration = time.time() - align_model_start_time
        print(
            f"Alignment model for '{language_code}' loaded in {align_model_duration:.2f}s and cached in RAM."
        )
        ALIGNMENT_MODELS_CACHE[cache_key] = (align_model, metadata)
    else:
        print(f"Using in-memory cached alignment model for '{language_code}'.")
    return ALIGNMENT_MODELS_CACHE[cache_key]

# --- Initialize Flask App ---
app = Flask(__name__)
app.config["UPLOAD_FOLDER"] = UPLOAD_FOLDER

# --- Load WhisperX Model ---
print(
    f"Loading WhisperX model: {MODEL_SIZE} (language: auto-detect) on {DEVICE} with {COMPUTE_TYPE} compute type ({CPU_THREADS} CPU threads)..."
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
    print(f"Error loading primary WhisperX model ({MODEL_SIZE}) on {DEVICE}: {e}")
    if DEVICE != "cpu":
        print("Falling back to CPU device...")
        DEVICE = "cpu"
        COMPUTE_TYPE = "int8"
        try:
            model = whisperx.load_model(
                MODEL_SIZE,
                device=DEVICE,
                compute_type=COMPUTE_TYPE,
                language=None,
                threads=CPU_THREADS,
            )
            print(f"WhisperX Model {MODEL_SIZE} loaded successfully on CPU fallback.")
        except Exception as e_cpu:
            print(f"CPU fallback for {MODEL_SIZE} failed: {e_cpu}")

    if model is None and MODEL_SIZE != "medium":
        print("Attempting fallback to cached 'medium' model...")
        try:
            MODEL_SIZE = "medium"
            model = whisperx.load_model(
                MODEL_SIZE,
                device=DEVICE,
                compute_type=COMPUTE_TYPE,
                language=None,
                threads=CPU_THREADS,
            )
            print(f"WhisperX Model {MODEL_SIZE} fallback loaded successfully.")
        except Exception as e_fb:
            print(f"Fallback to 'medium' failed: {e_fb}")
    if model is None:
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
    Helper function to call Gemini 3.6 Flash and return a list of sentence strings.
    """
    if not GEMINI_AVAILABLE or not GEMINI_SDK_TYPE:
        return None

    language_name = (
        detected_language.upper() if detected_language else "the detected language"
    )

    prompt = f"""You are a professional subtitle editor. Your task is to split the following transcription text into short, readable, captionable segments suitable for video subtitles.

CRITICAL RULES:
    1. LENGTH CONSTRAINT: Maximum around 9 words per segment, keep it natural, but you can go up to 12 words if it maintains readability and flow. Avoid very short segments (1-2 words) unless they are natural pauses or standalone phrases.
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

    try:
        response_text = ""
        models_to_try = [GEMINI_MODEL_NAME]
        for fallback_m in ["gemini-3.6-flash", "gemini-3.5-flash-lite"]:
            if fallback_m not in models_to_try:
                models_to_try.append(fallback_m)

        if GEMINI_SDK_TYPE == "genai":
            client = genai.Client(api_key=gemini_api_key)
            response = None
            for m_name in models_to_try:
                try:
                    response = client.models.generate_content(
                        model=m_name,
                        contents=prompt,
                        config=types.GenerateContentConfig(
                            temperature=0.2,
                            max_output_tokens=8192,
                            response_mime_type="application/json",
                            automatic_function_calling=types.AutomaticFunctionCallingConfig(
                                disable=True
                            ),
                        ),
                    )
                    break
                except Exception:
                    try:
                        response = client.models.generate_content(
                            model=m_name,
                            contents=prompt,
                            config=types.GenerateContentConfig(
                                temperature=0.2,
                                max_output_tokens=8192,
                                automatic_function_calling=types.AutomaticFunctionCallingConfig(
                                    disable=True
                                ),
                            ),
                        )
                        break
                    except Exception:
                        continue
            response_text = response.text.strip() if (response and response.text) else ""
        elif GEMINI_SDK_TYPE == "legacy":
            legacy_genai.configure(api_key=gemini_api_key)
            response = None
            for m_name in models_to_try:
                try:
                    model = legacy_genai.GenerativeModel(m_name)
                    generation_config = {
                        "temperature": 0.2,
                        "max_output_tokens": 8192,
                        "response_mime_type": "application/json",
                    }
                    response = model.generate_content(
                        prompt, generation_config=generation_config
                    )
                    break
                except Exception:
                    try:
                        model = legacy_genai.GenerativeModel(m_name)
                        response = model.generate_content(
                            prompt,
                            generation_config={
                                "temperature": 0.2,
                                "max_output_tokens": 8192,
                            },
                        )
                        break
                    except Exception:
                        continue
            response_text = response.text.strip() if (response and response.text) else ""

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
    Use Gemini 3.6 Flash to intelligently split long segments.
    Processes in chunks to avoid token limits.
    """
    if not GEMINI_AVAILABLE:
        print("Google GenAI library not available. Returning segments as-is.")
        return segments

    if not gemini_api_key:
        print("No Gemini API key provided. Returning segments as-is.")
        return segments

    if GEMINI_SDK_TYPE == "legacy":
        try:
            legacy_genai.configure(api_key=gemini_api_key)
        except Exception as e:
            print(f"Error configuring Gemini API: {e}")
            return segments

    if not segments:
        return segments

    try:
        print(f"Using {GEMINI_MODEL_LABEL} to split segments (with chunking)...")

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


def assign_word_timings_to_sentences(sentence_segments, aligned_segments):
    """
    Matches word timings from aligned Whisper segments to Gemini sentence segments.
    This enables separate text layers with word-level animations in After Effects
    in a single pass, without transcribing the audio twice.
    """
    all_words = []
    for seg in aligned_segments:
        if "words" in seg and isinstance(seg["words"], list):
            for w in seg["words"]:
                all_words.append(w)

    if not all_words:
        return sentence_segments

    word_idx = 0
    num_words = len(all_words)

    for seg in sentence_segments:
        sentence_text = seg.get("text", "")
        sentence_words = sentence_text.strip().split()
        seg_words = []

        for word_token in sentence_words:
            if word_idx < num_words:
                w_info = all_words[word_idx]
                seg_words.append(
                    {
                        "word": word_token,
                        "start": w_info.get("start", seg.get("start", 0)),
                        "end": w_info.get("end", seg.get("end", 0)),
                        "score": w_info.get("score", 1.0),
                    }
                )
                word_idx += 1
            else:
                seg_words.append(
                    {
                        "word": word_token,
                        "start": seg.get("start", 0),
                        "end": seg.get("end", 0),
                    }
                )

        if seg_words:
            seg["words"] = seg_words
            first_start = seg_words[0].get("start")
            last_end = seg_words[-1].get("end")
            if first_start is not None and last_end is not None:
                seg["start"] = first_start
                seg["end"] = max(last_end, first_start + 0.01)

    return sentence_segments


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

    # Get transcription level parameter (word, sentence, or both)
    transcription_level = request.form.get("transcription_level", "word")
    if transcription_level not in ["word", "sentence", "both"]:
        transcription_level = "word"

    # Flag for separate text layers (hybrid: sentence layout + word animations)
    separate_text_layers = request.form.get("separate_text_layers", "false").lower() in (
        "true",
        "1",
        "yes",
    )

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

            # Determine whether word-level alignment is needed
            needs_word_alignment = (
                transcription_level == "word"
                or separate_text_layers
                or transcription_level == "both"
            )

            aligned_segments = None
            if needs_word_alignment:
                try:
                    align_model, metadata = get_alignment_model(
                        detected_language, DEVICE
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
                    aligned_segments = result_aligned["segments"]
                except Exception as align_e:
                    print(
                        f"Could not align transcription for language '{detected_language}': {align_e}"
                    )
                    aligned_segments = result["segments"]
                    for seg in aligned_segments:
                        seg["words_error"] = (
                            f"Alignment failed for language {detected_language}: {str(align_e)}"
                        )

            # Build final segments
            if transcription_level == "word" and not separate_text_layers:
                final_segments = aligned_segments or result["segments"]
            elif transcription_level in ["sentence", "both"]:
                if gemini_api_key:
                    print(
                        f"Using {GEMINI_MODEL_LABEL} to split segments into captionable sentences..."
                    )
                    sentence_segments = split_segments_with_gemini(
                        result["segments"], gemini_api_key, detected_language
                    )
                    if separate_text_layers and aligned_segments:
                        print("Mapping word timestamps to sentence segments...")
                        final_segments = assign_word_timings_to_sentences(
                            sentence_segments, aligned_segments
                        )
                    else:
                        final_segments = sentence_segments
                else:
                    print(
                        "No Gemini API key provided. Using segments from WhisperX."
                    )
                    if separate_text_layers and aligned_segments:
                        final_segments = aligned_segments
                    else:
                        final_segments = result["segments"]
            else:
                final_segments = aligned_segments or result["segments"]

            full_text = " ".join(
                [
                    segment["text"].strip()
                    for segment in final_segments
                    if "text" in segment
                ]
            )

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

    print("Starting API server on host 127.0.0.1, port 5000")
    print(f"Uploads will be temporarily stored in: {UPLOAD_FOLDER}")
    if USE_WAITRESS:
        serve(app, host="127.0.0.1", port=5000)
    else:
        app.run(host="127.0.0.1", port=5000, debug=False)
