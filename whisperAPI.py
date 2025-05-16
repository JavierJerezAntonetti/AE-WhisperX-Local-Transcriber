import os
import tempfile
import time # For timing operations
import sys # For sys.frozen and sys._MEIPASS
from flask import Flask, request, jsonify
import whisperx
from werkzeug.utils import secure_filename

# --- Determine the script's directory (especially for PyInstaller) ---
if getattr(sys, 'frozen', False) and hasattr(sys, '_MEIPASS'):
    SCRIPT_DIR = sys._MEIPASS
else:
    SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))

# --- Configuration for UPLOAD_FOLDER ---
TEMP_DIR_BASE = tempfile.gettempdir()
UPLOAD_FOLDER = os.path.join(TEMP_DIR_BASE, "whisperx_api_uploads")
ALLOWED_EXTENSIONS = {'wav', 'mp3', 'm4a', 'ogg', 'flac', 'aac', 'opus'}


# --- Configuration ---
# WhisperX model identifier (e.g., "large-v3", "large-v2", "medium", "base", etc.)
MODEL_SIZE = "large-v3"
# DEVICE: "cpu" or "cuda" if you have a GPU and compatible PyTorch/WhisperX installed
DEVICE = "cpu"
# COMPUTE_TYPE: "int8" for CPU. For GPU, "float16" or "bfloat16" (if supported) are common.
COMPUTE_TYPE = "int8"
# Language is now auto-detected.

BATCH_SIZE = 16 # Batch size for transcription

# --- Initialize Flask App ---
app = Flask(__name__)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

# --- Load WhisperX Model ---
print(f"Loading WhisperX model: {MODEL_SIZE} (language: auto-detect) on {DEVICE} with {COMPUTE_TYPE} compute type...")
model = None # Initialize model to None
try:
    model = whisperx.load_model(
        MODEL_SIZE,
        device=DEVICE,
        compute_type=COMPUTE_TYPE,
        language=None # Set to None for automatic language detection
    )
    print(f"WhisperX Model {MODEL_SIZE} (Language: auto-detect) loaded successfully.")
except Exception as e:
    print(f"Error loading WhisperX model: {e}")
    print("Please ensure you have a working internet connection for the first download,")
    print("and that the model size/type is correct and WhisperX is installed properly.")
    # model remains None

# --- Create UPLOAD_FOLDER if it doesn't exist ---
if not os.path.exists(UPLOAD_FOLDER):
    try:
        os.makedirs(UPLOAD_FOLDER, exist_ok=True)
        print(f"Successfully created/ensured uploads folder at: {UPLOAD_FOLDER}")
    except PermissionError as e:
        print(f"Critical Error: Could not create uploads folder at '{UPLOAD_FOLDER}'. Permission denied: {e}")
        print("Please check write permissions for the system's temporary directory.")
    except Exception as e:
        print(f"Critical Error: Failed to create uploads folder at '{UPLOAD_FOLDER}': {e}")


def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@app.route('/transcribe', methods=['POST'])
def transcribe_audio():
    if model is None:
        return jsonify({"error": "WhisperX model is not loaded. Check server logs."}), 500

    if 'audio' not in request.files:
        return jsonify({"error": "No audio file part in the request"}), 400

    file = request.files['audio']
    if file.filename == '':
        return jsonify({"error": "No selected file"}), 400

    if file and allowed_file(file.filename):
        filename = secure_filename(file.filename)
        temp_file_path = None

        try:
            if not os.path.exists(app.config['UPLOAD_FOLDER']):
                print(f"Upload folder {app.config['UPLOAD_FOLDER']} not found during request. Attempting to create.")
                try:
                    os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
                except Exception as e_mkdir:
                    print(f"Failed to create upload folder during request: {e_mkdir}")
                    return jsonify({"error": "Server configuration issue: cannot create upload directory."}), 500

            temp_fd, temp_file_path = tempfile.mkstemp(
                suffix=os.path.splitext(filename)[1],
                dir=app.config['UPLOAD_FOLDER']
            )

            with os.fdopen(temp_fd, 'wb') as tmp:
                file.save(tmp)

            print(f"Loading audio for WhisperX: {temp_file_path}")
            audio = whisperx.load_audio(temp_file_path)

            print(f"Transcribing with WhisperX model ({MODEL_SIZE}, Language: auto-detect)...")
            transcribe_start_time = time.time()
            # When language=None in load_model, transcribe will detect the language.
            result = model.transcribe(audio, batch_size=BATCH_SIZE)
            transcribe_duration = time.time() - transcribe_start_time

            detected_language = result.get("language")
            if not detected_language:
                print("Error: WhisperX could not detect the language of the audio.")
                return jsonify({"error": "Language detection failed."}), 500

            print(f"Initial transcription completed in {transcribe_duration:.2f}s. Detected language: {detected_language}")

            final_segments = result["segments"]
            full_text = " ".join([segment['text'].strip() for segment in final_segments if 'text' in segment])

            try:
                print(f"Loading alignment model for detected language: {detected_language}...")
                align_model_start_time = time.time()
                align_model, metadata = whisperx.load_align_model(language_code=detected_language, device=DEVICE)
                align_model_duration = time.time() - align_model_start_time
                print(f"Alignment model for '{detected_language}' loaded in {align_model_duration:.2f}s.")

                print("Aligning transcription...")
                align_start_time = time.time()
                result_aligned = whisperx.align(result["segments"], align_model, metadata, audio, DEVICE, return_char_alignments=False)
                align_duration = time.time() - align_start_time
                print(f"Alignment completed in {align_duration:.2f}s.")

                final_segments = result_aligned["segments"]
                full_text = " ".join([segment['text'].strip() for segment in final_segments if 'text' in segment])

            except Exception as align_e:
                print(f"Could not align transcription for language '{detected_language}': {align_e}")
                print("Proceeding with segment-level timestamps only from initial transcription.")
                # final_segments is already from model.transcribe if alignment fails
                for seg in final_segments:
                    seg['words_error'] = f"Alignment failed for language {detected_language}: {str(align_e)}"


            audio_duration = 0
            if final_segments and 'end' in final_segments[-1]:
                audio_duration = final_segments[-1]['end']

            response_data = {
                "language": detected_language,
                "duration_seconds": audio_duration,
                "full_text": full_text.strip(),
                "segments": final_segments
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
                    print(f"Error cleaning up temporary file {temp_file_path}: {e_remove}")
    else:
        return jsonify({"error": "File type not allowed"}), 400


@app.route('/health', methods=['GET'])
def health_check():
    if model is not None:
        return jsonify({
            "status": "API is running",
            "model_loaded": True,
            "model_type": "WhisperX",
            "model_size": MODEL_SIZE,
            "language_setting": "auto-detect"
        }), 200
    else:
        return jsonify({
            "status": "API is running",
            "model_loaded": False,
            "language_setting": "auto-detect",
            "error": "WhisperX Model failed to load"
        }), 500

if __name__ == '__main__':
    if model is None:
        print("CRITICAL: WhisperX model could not be loaded. The API will not function correctly.")
        # Consider exiting if model loading is absolutely critical for the app to even start
        # sys.exit(1)

    if not os.path.exists(UPLOAD_FOLDER):
        print(f"Upload folder '{UPLOAD_FOLDER}' does not exist at startup. Attempting to create it.")
        try:
            os.makedirs(UPLOAD_FOLDER, exist_ok=True)
            print(f"Successfully created/ensured uploads folder: {UPLOAD_FOLDER}")
        except Exception as e:
            print(f"CRITICAL FAILURE: Could not create uploads folder '{UPLOAD_FOLDER}' at startup: {e}")
            print("The application might not work correctly. Please check permissions or create the folder manually.")
            # sys.exit(1)

    print("Starting Flask server on host 127.0.0.1, port 5000")
    print(f"Uploads will be temporarily stored in: {UPLOAD_FOLDER}")
    app.run(host='127.0.0.1', port=5000, debug=False)