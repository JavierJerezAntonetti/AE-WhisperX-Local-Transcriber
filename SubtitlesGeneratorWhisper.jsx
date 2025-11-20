if (typeof JSON !== "object") {
  JSON = {};
}

(function () {
  "use strict";

  var rx_one = /^[\],:{}\s]*$/;
  var rx_two = /\\(?:["\\\/bfnrt]|u[0-9a-fA-F]{4})/g;
  var rx_three =
    /"[^"\\\n\r]*"|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?/g;
  var rx_four = /(?:^|:|,)(?:\s*\[)+/g;
  var rx_escapable =
    /[\\"\u0000-\u001f\u007f-\u009f\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g;
  var rx_dangerous =
    /[\u0000\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g;

  function f(n) {
    return n < 10 ? "0" + n : n;
  }

  function this_value() {
    return this.valueOf();
  }

  if (typeof Date.prototype.toJSON !== "function") {
    Date.prototype.toJSON = function () {
      return isFinite(this.valueOf())
        ? this.getUTCFullYear() +
            "-" +
            f(this.getUTCMonth() + 1) +
            "-" +
            f(this.getUTCDate()) +
            "T" +
            f(this.getUTCHours()) +
            ":" +
            f(this.getUTCMinutes()) +
            ":" +
            f(this.getUTCSeconds()) +
            "Z"
        : null;
    };

    Boolean.prototype.toJSON = this_value;
    Number.prototype.toJSON = this_value;
    String.prototype.toJSON = this_value;
  }

  var gap;
  var indent;
  var meta;
  var rep;

  function quote(string) {
    rx_escapable.lastIndex = 0;
    return rx_escapable.test(string)
      ? '"' +
          string.replace(rx_escapable, function (a) {
            var c = meta[a];
            return typeof c === "string"
              ? c
              : "\\u" + ("0000" + a.charCodeAt(0).toString(16)).slice(-4);
          }) +
          '"'
      : '"' + string + '"';
  }

  function str(key, holder) {
    var i;
    var k;
    var v;
    var length;
    var mind = gap;
    var partial;
    var value = holder[key];

    if (
      value &&
      typeof value === "object" &&
      typeof value.toJSON === "function"
    ) {
      value = value.toJSON(key);
    }

    if (typeof rep === "function") {
      value = rep.call(holder, key, value);
    }

    switch (typeof value) {
      case "string":
        return quote(value);

      case "number":
        return isFinite(value) ? String(value) : "null";

      case "boolean":
      case "null":
        return String(value);

      case "object":
        if (!value) {
          return "null";
        }

        gap += indent;
        partial = [];

        if (Object.prototype.toString.apply(value) === "[object Array]") {
          length = value.length;
          for (i = 0; i < length; i += 1) {
            partial[i] = str(i, value) || "null";
          }

          v =
            partial.length === 0
              ? "[]"
              : gap
              ? "[\n" + gap + partial.join(",\n" + gap) + "\n" + mind + "]"
              : "[" + partial.join(",") + "]";
          gap = mind;
          return v;
        }

        if (rep && typeof rep === "object") {
          length = rep.length;
          for (i = 0; i < length; i += 1) {
            if (typeof rep[i] === "string") {
              k = rep[i];
              v = str(k, value);
              if (v) {
                partial.push(quote(k) + (gap ? ": " : ":") + v);
              }
            }
          }
        } else {
          for (k in value) {
            if (Object.prototype.hasOwnProperty.call(value, k)) {
              v = str(k, value);
              if (v) {
                partial.push(quote(k) + (gap ? ": " : ":") + v);
              }
            }
          }
        }

        v =
          partial.length === 0
            ? "{}"
            : gap
            ? "{\n" + gap + partial.join(",\n" + gap) + "\n" + mind + "}"
            : "{" + partial.join(",") + "}";
        gap = mind;
        return v;
    }
  }

  if (typeof JSON.stringify !== "function") {
    meta = {
      // table of character substitutions
      "\b": "\\b",
      "\t": "\\t",
      "\n": "\\n",
      "\f": "\\f",
      "\r": "\\r",
      '"': '\\"',
      "\\": "\\\\",
    };
    JSON.stringify = function (value, replacer, space) {
      var i;
      gap = "";
      indent = "";

      if (typeof space === "number") {
        for (i = 0; i < space; i += 1) {
          indent += " ";
        }
      } else if (typeof space === "string") {
        indent = space;
      }

      rep = replacer;
      if (
        replacer &&
        typeof replacer !== "function" &&
        (typeof replacer !== "object" || typeof replacer.length !== "number")
      ) {
        throw new Error("JSON.stringify");
      }

      return str("", { "": value });
    };
  }

  if (typeof JSON.parse !== "function") {
    JSON.parse = function (text, reviver) {
      var j;

      function walk(holder, key) {
        var k;
        var v;
        var value = holder[key];
        if (value && typeof value === "object") {
          for (k in value) {
            if (Object.prototype.hasOwnProperty.call(value, k)) {
              v = walk(value, k);
              if (v !== undefined) {
                value[k] = v;
              } else {
                delete value[k];
              }
            }
          }
        }
        return reviver.call(holder, key, value);
      }

      text = String(text);
      rx_dangerous.lastIndex = 0;
      if (rx_dangerous.test(text)) {
        text = text.replace(rx_dangerous, function (a) {
          return "\\u" + ("0000" + a.charCodeAt(0).toString(16)).slice(-4);
        });
      }

      if (
        rx_one.test(
          text.replace(rx_two, "@").replace(rx_three, "]").replace(rx_four, "")
        )
      ) {
        j = eval("(" + text + ")");

        return typeof reviver === "function" ? walk({ "": j }, "") : j;
      }

      throw new SyntaxError("JSON.parse");
    };
  }
})();

// Script Name: Whisper Transcriber Panel (Word-Level - Select Audio & Render & Precomp Preset)
// Description: Prompts user to select an audio file, transcribes it using a local WhisperX API,
//              and creates individual, styled text layers for each WORD.
//              Also includes a button to render audio from the active composition.

(function createAndRunWhisperPanel(thisObj) {
  // --- Configuration ---
  var SCRIPT_VERSION = "3.2"; // Current version of the script
  var GITHUB_RAW_URL =
    "https://raw.githubusercontent.com/JavierJerezAntonetti/AE-WhisperX-Local-Transcriber/main/SubtitlesGeneratorWhisper.jsx";
  var WHISPER_API_URL = "http://127.0.0.1:5000/transcribe";
  // Name of the script shown in update messages
  var SCRIPT_NAME = "AE Whisper X Local Transcriber";

  // Helper to build the "new version available" message including the script name
  function getNewVersionMessage(remoteVersion) {
    return (
      "A new version (" +
      remoteVersion +
      ") of " +
      SCRIPT_NAME +
      " is available.\n\n" +
      "Please visit the GitHub repository to download the update."
    );
  }
  var TEMP_FOLDER_PATH;

  if (Folder.temp) {
    TEMP_FOLDER_PATH = Folder.temp.fsName;
  } else {
    TEMP_FOLDER_PATH = $.os.indexOf("Windows") > -1 ? $.getenv("TEMP") : "/tmp";
  }
  var SCRIPT_TEMP_SUBFOLDER = "AETempWhisper";
  var TEMP_RESPONSE_FILENAME = "whisper_api_response.json";
  var MAX_LAYER_NAME_WORD_LENGTH = 15;
  var RENDERED_AUDIO_SUBFOLDER = "Rendered_Audio";
  var PRECOMP_NAME = "Subtitles";

  // --- RTL Configuration ---
  var RTL_LANGUAGES = ["ar", "he", "fa", "ur", "yi", "syr", "dv"]; // Arabic, Hebrew, Persian, Urdu, Yiddish, Syriac, Dhivehi
  var isRtlMode = false; // Global flag for RTL processing

  // --- Styling Configuration (These are now DEFAULTS for UI inputs) ---
  var DEFAULT_TEXT_FONT_POSTSCRIPT_NAME = "Poppins-SemiBold";
  var DEFAULT_TEXT_FONT_SIZE = 60;
  var DEFAULT_TEXT_FILL_COLOR = [1, 1, 1]; // [R, G, B] values 0-1
  var DEFAULT_TEXT_STROKE_COLOR = [0, 0, 0]; // [R, G, B] values 0-1
  var DEFAULT_TEXT_STROKE_WIDTH = 0;
  var DEFAULT_MAX_CHARS_PER_LINE = 20;
  var DEFAULT_MAX_WORDS_PER_LINE = 3;

  // --- UI Element Variables (will be defined in buildUI) ---
  var fontNameInput, fontSizeInput;
  var isFontDropdown = false; // Flag to check if font input is a dropdown
  var fontSearchInput; // Search box for font dropdown
  var availableFonts = []; // Cached list of available fonts for filtering
  var fillRInput, fillGInput, fillBInput;
  var strokeRInput, strokeGInput, strokeBInput;
  var strokeWidthInput;
  var maxCharsInput, maxWordsInput;
  var forceRtlCheckbox;
  var enableAnimationsCheckbox; // checkbox to enable/disable per-word pop-in animation
  var presetDropdown, savePresetBtn, deletePresetBtn; // Preset UI elements
  var transcriptionLevelDropdown; // Dropdown for word-by-word or sentence level
  var separateTextLayersCheckbox; // Checkbox for separate text layers mode
  var geminiApiKeyInput; // Input field for Gemini API key
  var languageInput; // Input field for language code

  // --- Settings & Preset Configuration ---
  var SETTINGS_SECTION = "WhisperTranscriberPanel";
  var PRESET_LIST_KEY = "PresetList";
  var LAST_PRESET_KEY = "LastUsedPreset";
  var PRESET_PREFIX = "Preset_";

  // --- Helper Function to sanitize file names ---
  var sanitizeFileName = function (name) {
    return name.replace(/[\\\/\:\*\?\"\<\>\|]/g, "_"); // Replace invalid characters
  };

  // --- Preset Management Functions ---
  var getSetting = function (key) {
    if (app.settings.haveSetting(SETTINGS_SECTION, key)) {
      return app.settings.getSetting(SETTINGS_SECTION, key);
    }
    return null;
  };

  var saveSetting = function (key, value) {
    app.settings.saveSetting(SETTINGS_SECTION, key, value);
  };

  var deleteSetting = function (key) {
    if (app.settings.haveSetting(SETTINGS_SECTION, key)) {
      // AE has no direct delete, so we save an empty string or a specific marker
      app.settings.saveSetting(SETTINGS_SECTION, key, "");
    }
  };

  var getPresetList = function () {
    var listStr = getSetting(PRESET_LIST_KEY);
    if (listStr) {
      try {
        return JSON.parse(listStr);
      } catch (e) {
        return [];
      }
    }
    return [];
  };

  var savePresetList = function (list) {
    saveSetting(PRESET_LIST_KEY, JSON.stringify(list));
  };

  var loadPreset = function (presetName) {
    var presetStr = getSetting(PRESET_PREFIX + presetName);
    if (presetStr) {
      try {
        return JSON.parse(presetStr);
      } catch (e) {
        return null;
      }
    }
    return null;
  };

  var savePreset = function (presetName, settingsObj) {
    saveSetting(PRESET_PREFIX + presetName, JSON.stringify(settingsObj));
    var presetList = getPresetList();
    if (indexOfArray(presetList, presetName) === -1) {
      presetList.push(presetName);
      savePresetList(presetList);
    }
  };

  var deletePreset = function (presetName) {
    deleteSetting(PRESET_PREFIX + presetName);
    var presetList = getPresetList();
    var index = indexOfArray(presetList, presetName);
    if (index > -1) {
      presetList.splice(index, 1);
      savePresetList(presetList);
    }
  };

  // --- Helper Function to Combine Word Timings with Sentence Text ---
  var combineSeparateTextLayers = function (wordData, sentenceData) {
    // This function creates a hybrid structure:
    // - Uses word-level timing from wordData
    // - Uses sentence-level text from sentenceData
    // - Creates segments where each word from sentences has its own timing

    var combinedSegments = [];

    if (
      !sentenceData ||
      !sentenceData.segments ||
      !wordData ||
      !wordData.segments
    ) {
      throw new Error("Invalid data for separate text layers mode");
    }

    // Build a flat list of all words from word-level data with their timings
    var wordTimings = [];
    for (var i = 0; i < wordData.segments.length; i++) {
      var seg = wordData.segments[i];
      if (seg.words && seg.words.length > 0) {
        for (var j = 0; j < seg.words.length; j++) {
          wordTimings.push({
            word: seg.words[j].word,
            start: seg.words[j].start,
            end: seg.words[j].end,
          });
        }
      }
    }

    // Now go through sentence-level data and match with word timings
    var wordIndex = 0;
    for (var i = 0; i < sentenceData.segments.length; i++) {
      var sentenceSegment = sentenceData.segments[i];
      var sentenceText = sentenceSegment.text || "";

      // Split sentence into words (basic tokenization)
      var sentenceWords = sentenceText.trim().split(/\s+/);

      // Create a segment for this sentence with word-level data
      var hybridSegment = {
        start: sentenceSegment.start,
        end: sentenceSegment.end,
        text: sentenceText,
        words: [],
      };

      // Match sentence words with word timings
      for (
        var j = 0;
        j < sentenceWords.length && wordIndex < wordTimings.length;
        j++
      ) {
        var sentenceWord = sentenceWords[j];
        var timing = wordTimings[wordIndex];

        // Create word object using sentence text but word timing
        hybridSegment.words.push({
          word: sentenceWord,
          start: timing.start,
          end: timing.end,
        });

        wordIndex++;
      }

      if (hybridSegment.words.length > 0) {
        combinedSegments.push(hybridSegment);
      }
    }

    return combinedSegments;
  };

  // --- Helper Function to Make API Call ---
  var makeApiCall = function (
    audioFile,
    transcriptionLevel,
    scriptTempFolder,
    geminiApiKey,
    languageCode
  ) {
    var responseFilePath =
      scriptTempFolder.fsName +
      "/" +
      transcriptionLevel +
      "_" +
      TEMP_RESPONSE_FILENAME;
    var responseFile = new File(responseFilePath);
    if (responseFile.exists) responseFile.remove();

    var audioPathForCurl = audioFile.fsName.replace(/\\/g, "/");
    var responsePathForCurl = responseFile.fsName.replace(/\\/g, "/");
    var curlCommand =
      'curl -s -S -X POST -F "audio=@\\"' +
      audioPathForCurl +
      '\\"" -F "transcription_level=' +
      transcriptionLevel +
      '"';

    // Add Language Code if provided
    if (languageCode && languageCode.trim() !== "") {
      curlCommand += ' -F "language=' + languageCode.trim() + '"';
    }

    // Add Gemini API key if provided (for sentence-level splitting)
    if (
      geminiApiKey &&
      geminiApiKey.trim() !== "" &&
      transcriptionLevel === "sentence"
    ) {
      // Escape the API key for curl (handle special characters)
      var escapedApiKey = geminiApiKey.replace(/"/g, '\\"');
      curlCommand += ' -F "gemini_api_key=' + escapedApiKey + '"';
    }

    curlCommand +=
      ' "' + WHISPER_API_URL + '" -o "' + responsePathForCurl + '"';

    var systemCallResult = "";
    try {
      if ($.os.indexOf("Windows") > -1) {
        systemCallResult = system.callSystem(
          'cmd.exe /c "' + curlCommand + '"'
        );
      } else {
        systemCallResult = system.callSystem(curlCommand);
      }
    } catch (e_curl_exec) {
      throw new Error(
        "Error calling system command (curl): " +
          e_curl_exec.toString() +
          "\nEnsure curl is installed and in your system PATH.\nCommand: " +
          curlCommand
      );
    }

    if (!responseFile.exists || responseFile.length === 0) {
      throw new Error(
        "API call failed or produced no response file (or empty file). \n" +
          "Curl command was: " +
          curlCommand +
          "\n" +
          "System call result string (if any): '" +
          systemCallResult +
          "'\n" +
          "Check if your Python Whisper API server is running at " +
          WHISPER_API_URL +
          ".\n" +
          "Expected response file at: " +
          responseFilePath
      );
    }

    // Parse JSON response
    var transcriptionData;
    var responseContent = "";
    try {
      responseFile.open("r");
      responseContent = responseFile.read();
      responseFile.close();

      if (responseContent.length > 0 && responseContent.charAt(0) === "<") {
        throw new Error(
          "Received HTML instead of JSON. API server might have an error. Check server logs. Response starts with: " +
            responseContent.substring(0, 200)
        );
      }
      transcriptionData = JSON.parse(responseContent);
    } catch (e_json) {
      throw new Error(
        "Error parsing API response: " +
          e_json.toString() +
          "\nResponse content was:\n" +
          (responseContent.substring(0, 500) || "empty") +
          (responseContent.length > 500 ? "..." : "")
      );
    }

    return transcriptionData;
  };

  // --- Main Transcription Function ---
  var runTranscriptionProcess = function (selectedAudioFile) {
    if (!selectedAudioFile || !selectedAudioFile.exists) {
      alert(
        "Critical script error: Selected audio file is invalid. Please report this."
      );
      return;
    }

    try {
      app.beginUndoGroup("Whisper Transcription & Pre-comp Subtitles");

      var comp = app.project.activeItem;

      if (!(comp instanceof CompItem)) {
        alert(
          "Please select or open a composition first (for placing text layers)."
        );
        app.endUndoGroup();
        return;
      }

      // --- Get Styling Values from UI ---
      var currentFontName;
      if (isFontDropdown) {
        currentFontName = fontNameInput.selection
          ? fontNameInput.selection.properties.postScriptName
          : DEFAULT_TEXT_FONT_POSTSCRIPT_NAME;
      } else {
        currentFontName =
          fontNameInput.text || DEFAULT_TEXT_FONT_POSTSCRIPT_NAME;
      }
      var currentFontSize = parseFloat(fontSizeInput.text);
      if (isNaN(currentFontSize) || currentFontSize <= 0) {
        currentFontSize = DEFAULT_TEXT_FONT_SIZE;
        alert(
          "Invalid Font Size input. Using default: " + DEFAULT_TEXT_FONT_SIZE
        );
      }

      var currentFillR = parseFloat(fillRInput.text);
      var currentFillG = parseFloat(fillGInput.text);
      var currentFillB = parseFloat(fillBInput.text);
      var currentFillColor;
      if (
        isNaN(currentFillR) ||
        isNaN(currentFillG) ||
        isNaN(currentFillB) ||
        currentFillR < 0 ||
        currentFillR > 1 ||
        currentFillG < 0 ||
        currentFillG > 1 ||
        currentFillB < 0 ||
        currentFillB > 1
      ) {
        currentFillColor = DEFAULT_TEXT_FILL_COLOR;
        alert(
          "Invalid Fill Color input (must be R,G,B between 0-1). Using default."
        );
      } else {
        currentFillColor = [currentFillR, currentFillG, currentFillB];
      }

      var currentStrokeWidth = parseFloat(strokeWidthInput.text);
      if (isNaN(currentStrokeWidth) || currentStrokeWidth < 0) {
        currentStrokeWidth = DEFAULT_TEXT_STROKE_WIDTH;
        alert(
          "Invalid Stroke Width input. Using default: " +
            DEFAULT_TEXT_STROKE_WIDTH
        );
      }

      var currentStrokeR = parseFloat(strokeRInput.text);
      var currentStrokeG = parseFloat(strokeGInput.text);
      var currentStrokeB = parseFloat(strokeBInput.text);
      var currentStrokeColor;
      if (
        isNaN(currentStrokeR) ||
        isNaN(currentStrokeG) ||
        isNaN(currentStrokeB) ||
        currentStrokeR < 0 ||
        currentStrokeR > 1 ||
        currentStrokeG < 0 ||
        currentStrokeG > 1 ||
        currentStrokeB < 0 ||
        currentStrokeB > 1
      ) {
        currentStrokeColor = DEFAULT_TEXT_STROKE_COLOR;
        if (currentStrokeWidth > 0) {
          // Only alert if stroke is meant to be visible
          alert(
            "Invalid Stroke Color input (must be R,G,B between 0-1). Using default."
          );
        }
      } else {
        currentStrokeColor = [currentStrokeR, currentStrokeG, currentStrokeB];
      }
      // --- End Get Styling Values ---

      var scriptTempFolder = new Folder(
        TEMP_FOLDER_PATH + "/" + SCRIPT_TEMP_SUBFOLDER
      );

      if (!scriptTempFolder.exists) {
        if (!scriptTempFolder.create()) {
          alert(
            "Error: Could not create temporary folder at: " +
              scriptTempFolder.fsName
          );
          app.endUndoGroup();
          return;
        }
      }

      var audioFile = selectedAudioFile;
      if (audioFile.length === 0) {
        alert(
          "Warning: The selected audio file is empty. Transcription will likely fail."
        );
      }

      // --- Get Transcription Level ---
      var selectedTranscriptionLevel = "word"; // default
      if (transcriptionLevelDropdown && transcriptionLevelDropdown.selection) {
        if (transcriptionLevelDropdown.selection.index === 0) {
          selectedTranscriptionLevel = "word";
        } else {
          selectedTranscriptionLevel = "sentence";
        }
      }

      var useSeparateTextLayers = separateTextLayersCheckbox
        ? separateTextLayersCheckbox.value
        : false;

      // --- Get Gemini API Key ---
      var geminiApiKey = geminiApiKeyInput ? geminiApiKeyInput.text : "";

      // --- Get Language Code ---
      var languageCode = languageInput ? languageInput.text : "";

      // --- API Call(s) ---
      var transcriptionData;
      var sentenceData;
      var processWarnings = []; // Track warnings/fallbacks for end summary

      try {
        if (
          useSeparateTextLayers &&
          selectedTranscriptionLevel === "sentence"
        ) {
          // Make TWO API calls: one for word-level timing, one for sentence-level text
          transcriptionData = makeApiCall(
            audioFile,
            "word",
            scriptTempFolder,
            "",
            languageCode
          );
          sentenceData = makeApiCall(
            audioFile,
            "sentence",
            scriptTempFolder,
            geminiApiKey,
            languageCode
          );
        } else {
          // Normal mode: single API call
          var apiKeyToUse =
            selectedTranscriptionLevel === "sentence" ? geminiApiKey : "";
          transcriptionData = makeApiCall(
            audioFile,
            selectedTranscriptionLevel,
            scriptTempFolder,
            apiKeyToUse,
            languageCode
          );
        }
      } catch (e_api) {
        alert(e_api.toString());
        app.endUndoGroup();
        return;
      }

      // --- RTL Detection ---
      isRtlMode = forceRtlCheckbox.value; // Set based on UI first
      if (
        !isRtlMode &&
        transcriptionData &&
        transcriptionData.language &&
        indexOfArray(RTL_LANGUAGES, transcriptionData.language) > -1
      ) {
        isRtlMode = true;
        forceRtlCheckbox.value = true; // Update the UI checkbox state
        // RTL detected and enabled automatically - no alert needed
      }

      // --- Process Separate Text Layers Mode ---
      var processedSegments;
      var isSeparateMode = false;

      if (useSeparateTextLayers && sentenceData) {
        try {
          processedSegments = combineSeparateTextLayers(
            transcriptionData,
            sentenceData
          );
          isSeparateMode = true;
        } catch (e_combine) {
          processWarnings.push(
            "Error combining word and sentence data: " +
              e_combine.toString() +
              ". Falling back to normal mode."
          );
          processedSegments = transcriptionData.segments;
        }
      } else {
        processedSegments = transcriptionData.segments;
      }

      var createdTextLayers = [];
      if (processedSegments && processedSegments.length > 0) {
        var totalWordsCreated = 0;
        var segmentsWithIssues = 0;
        var frameDuration = comp.frameDuration;
        var timeOffset = 0;

        if (frameDuration <= 0) {
          alert(
            "Error: Composition frame duration is invalid. Cannot set keyframes or ensure layer visibility accurately. Time offset cannot be applied."
          );
        } else {
          timeOffset = 3 * frameDuration;
        }

        // Determine if we should process word-by-word or sentence-by-sentence
        var shouldProcessWords =
          selectedTranscriptionLevel === "word" || isSeparateMode;

        for (var i = 0; i < processedSegments.length; i++) {
          var segment = processedSegments[i];

          // For sentence-level (non-separate mode), create one layer per sentence
          if (!shouldProcessWords) {
            var sentenceText = segment.text || "";
            var sentenceStart = parseFloat(segment.start);
            var sentenceEnd = parseFloat(segment.end);

            if (
              sentenceText &&
              !isNaN(sentenceStart) &&
              !isNaN(sentenceEnd) &&
              sentenceEnd > sentenceStart
            ) {
              var adjustedStartTime = sentenceStart - timeOffset;
              if (adjustedStartTime < 0) adjustedStartTime = 0;
              var adjustedEndTime = sentenceEnd - timeOffset;

              var textLayer = comp.layers.addText(sentenceText);
              textLayer.name =
                "S_" +
                i +
                "_" +
                sentenceText
                  .replace(/[^a-zA-Z0-9_]/g, "")
                  .substring(0, MAX_LAYER_NAME_WORD_LENGTH);
              textLayer.inPoint = adjustedStartTime;
              textLayer.outPoint = adjustedEndTime;

              if (textLayer.outPoint <= textLayer.inPoint) {
                if (frameDuration > 0) {
                  textLayer.outPoint = textLayer.inPoint + frameDuration;
                } else {
                  textLayer.outPoint = textLayer.inPoint + 0.04;
                }
              }

              var textProp = textLayer.property("Source Text");
              if (textProp && textProp.numKeys === 0) {
                var textDocument = textProp.value;
                textDocument.font = currentFontName;
                textDocument.fontSize = currentFontSize;
                textDocument.fillColor = currentFillColor;
                textDocument.justification =
                  ParagraphJustification.CENTER_JUSTIFY;
                try {
                  textDocument.tracking = -55;
                } catch (e_tracking_set) {}
                try {
                  if (
                    typeof FontCapsOption !== "undefined" &&
                    typeof textDocument.fontCapsOption !== "undefined"
                  ) {
                    textDocument.fontCapsOption =
                      FontCapsOption.FONT_NORMAL_CAPS;
                  } else {
                    if (typeof textDocument.allCaps !== "undefined") {
                      textDocument.allCaps = false;
                    }
                    if (typeof textDocument.smallCaps !== "undefined") {
                      textDocument.smallCaps = false;
                    }
                  }
                } catch (e_fontcaps) {}
                if (currentStrokeWidth > 0) {
                  textDocument.applyStroke = true;
                  textDocument.strokeColor = currentStrokeColor;
                  textDocument.strokeWidth = currentStrokeWidth;
                  textDocument.strokeOverFill = false;
                  textDocument.lineJoinType = LineJoinType.LINE_JOIN_ROUND;
                } else {
                  textDocument.applyStroke = false;
                }
                textProp.setValue(textDocument);
              }

              try {
                var textLayerMoreOptions = textLayer
                  .property("Text")
                  .property("More Options");
                if (textLayerMoreOptions) {
                  textLayerMoreOptions.property("Fill & Stroke").setValue(2);
                }
              } catch (e_render_order) {}

              try {
                var rect = textLayer.sourceRectAtTime(adjustedStartTime, false);
                if (rect && rect.width > 0 && rect.height > 0) {
                  var newAnchorX = rect.left + rect.width / 2;
                  var newAnchorY = rect.top + rect.height / 2;
                  textLayer
                    .property("Transform")
                    .property("Anchor Point")
                    .setValue([newAnchorX, newAnchorY]);
                }
              } catch (e_anchor) {}

              var positionProp = textLayer
                .property("Transform")
                .property("Position");
              positionProp.setValue([comp.width / 2, comp.height / 2]);

              totalWordsCreated++;
              createdTextLayers.push(textLayer);
            }
            continue;
          }

          // For word-by-word processing
          if (
            segment.words_error ||
            !segment.words ||
            segment.words.length === 0
          ) {
            segmentsWithIssues++;
            continue;
          }

          for (var j = 0; j < segment.words.length; j++) {
            var wordData = segment.words[j];

            var wordText = "";
            if (
              wordData &&
              typeof wordData.word !== "undefined" &&
              wordData.word !== null
            ) {
              // Coerce to string.
              wordText = String(wordData.word);
            }

            if (wordText.slice(-1) === ".") {
              wordText = wordText.slice(0, -1);
            }
            var originalApiStartTime = parseFloat(wordData.start);
            var originalApiEndTime = parseFloat(wordData.end);

            if (
              wordText &&
              !isNaN(originalApiStartTime) &&
              !isNaN(originalApiEndTime) &&
              originalApiEndTime > originalApiStartTime
            ) {
              var adjustedStartTime = originalApiStartTime - timeOffset;
              if (adjustedStartTime < 0) {
                adjustedStartTime = 0;
              }
              var adjustedOriginalEndTime = originalApiEndTime - timeOffset;

              var textLayer = comp.layers.addText(wordText);
              var safeWordText = wordText
                .replace(/[^a-zA-Z0-9_]/g, "")
                .substring(0, MAX_LAYER_NAME_WORD_LENGTH);
              textLayer.name = "W_" + i + "" + j + "" + safeWordText;
              textLayer.inPoint = adjustedStartTime;

              var determinedOutPoint = adjustedOriginalEndTime;

              if (j < segment.words.length - 1) {
                var nextWordInSegmentData = segment.words[j + 1];
                if (
                  nextWordInSegmentData &&
                  typeof nextWordInSegmentData.start !== "undefined"
                ) {
                  var nextWordOriginalApiStartTime = parseFloat(
                    nextWordInSegmentData.start
                  );
                  if (!isNaN(nextWordOriginalApiStartTime)) {
                    var nextWordAdjustedStartTime =
                      nextWordOriginalApiStartTime - timeOffset;
                    if (nextWordAdjustedStartTime > adjustedStartTime) {
                      determinedOutPoint = nextWordAdjustedStartTime;
                    }
                  }
                }
              } else if (i < processedSegments.length - 1) {
                var nextSegmentData = processedSegments[i + 1];
                if (
                  nextSegmentData &&
                  nextSegmentData.words &&
                  nextSegmentData.words.length > 0
                ) {
                  var firstWordInNextSegmentData = nextSegmentData.words[0];
                  if (
                    firstWordInNextSegmentData &&
                    typeof firstWordInNextSegmentData.start !== "undefined"
                  ) {
                    var nextSegmentFirstWordOriginalApiStartTime = parseFloat(
                      firstWordInNextSegmentData.start
                    );
                    if (!isNaN(nextSegmentFirstWordOriginalApiStartTime)) {
                      var nextSegmentFirstWordAdjustedStartTime =
                        nextSegmentFirstWordOriginalApiStartTime - timeOffset;
                      if (
                        nextSegmentFirstWordAdjustedStartTime >
                        adjustedStartTime
                      ) {
                        determinedOutPoint =
                          nextSegmentFirstWordAdjustedStartTime;
                      }
                    }
                  }
                }
              }
              textLayer.outPoint = determinedOutPoint;

              if (textLayer.outPoint <= textLayer.inPoint) {
                if (frameDuration > 0) {
                  textLayer.outPoint = textLayer.inPoint + frameDuration;
                } else {
                  textLayer.outPoint = textLayer.inPoint + 0.04;
                }
              }

              var textProp = textLayer.property("Source Text");
              if (textProp && textProp.numKeys === 0) {
                var textDocument = textProp.value;
                textDocument.font = currentFontName;
                textDocument.fontSize = currentFontSize;
                textDocument.fillColor = currentFillColor;
                textDocument.justification =
                  ParagraphJustification.CENTER_JUSTIFY;
                // Ensure consistent character tracking (kerning) as requested
                try {
                  textDocument.tracking = -55;
                } catch (e_tracking_set) {
                  // Older AE versions may not support tracking; ignore silently
                }
                // Set font caps option if available (AE CC 2018+), otherwise
                // fall back to older allCaps/smallCaps properties for legacy AE.
                try {
                  if (
                    typeof FontCapsOption !== "undefined" &&
                    typeof textDocument.fontCapsOption !== "undefined"
                  ) {
                    textDocument.fontCapsOption =
                      FontCapsOption.FONT_NORMAL_CAPS;
                  } else {
                    if (typeof textDocument.allCaps !== "undefined") {
                      textDocument.allCaps = false;
                    }
                    if (typeof textDocument.smallCaps !== "undefined") {
                      textDocument.smallCaps = false;
                    }
                  }
                } catch (e_fontcaps) {
                  // Older AE versions or unexpected runtime errors may
                  // throw; silently ignore to keep the script robust.
                }
                if (currentStrokeWidth > 0) {
                  textDocument.applyStroke = true;
                  textDocument.strokeColor = currentStrokeColor;
                  textDocument.strokeWidth = currentStrokeWidth;
                  textDocument.strokeOverFill = false;
                  textDocument.lineJoinType = LineJoinType.LINE_JOIN_ROUND;
                } else {
                  textDocument.applyStroke = false;
                }
                textProp.setValue(textDocument);
              }

              // Set layer-level render order to "All Fills Over All Strokes"
              try {
                var textLayerMoreOptions = textLayer
                  .property("Text")
                  .property("More Options");
                if (textLayerMoreOptions) {
                  textLayerMoreOptions.property("Fill & Stroke").setValue(2); // 2 = All Fills Over All Strokes
                }
              } catch (e_render_order) {
                // This might fail on very old AE versions, but it's safe to ignore.
              }

              try {
                var rect = textLayer.sourceRectAtTime(adjustedStartTime, false);
                if (rect && rect.width > 0 && rect.height > 0) {
                  var newAnchorX = rect.left + rect.width / 2;
                  // Set the vertical anchor to 0 (the baseline)
                  // instead of the geometric center of the bounding box.
                  var newAnchorY = 0;
                  textLayer
                    .property("Transform")
                    .property("Anchor Point")
                    .setValue([newAnchorX, newAnchorY]);
                }
              } catch (e_anchor) {
                // Optional: Log this error if it occurs frequently
                // $.writeln("Anchor point error: " + e_anchor.toString());
              }
              var positionProp = textLayer
                .property("Transform")
                .property("Position");
              positionProp.setValue([comp.width / 2, comp.height / 2]);

              if (frameDuration > 0) {
                var scaleProp = textLayer
                  .property("Transform")
                  .property("Scale");
                // Only add pop-in animation if user enabled it in the UI
                if (
                  enableAnimationsCheckbox &&
                  enableAnimationsCheckbox.value
                ) {
                  var keyTime1 = adjustedStartTime;
                  var keyTime2 = adjustedStartTime + 2 * frameDuration;
                  var keyTime3 = adjustedStartTime + 4 * frameDuration;

                  scaleProp.setValueAtTime(keyTime1, [95, 95]);
                  if (keyTime2 < textLayer.outPoint) {
                    scaleProp.setValueAtTime(keyTime2, [105, 105]);
                    if (keyTime3 < textLayer.outPoint) {
                      scaleProp.setValueAtTime(keyTime3, [100, 100]);
                    } else {
                      scaleProp.setValueAtTime(textLayer.outPoint, [100, 100]);
                    }
                  } else {
                    scaleProp.setValueAtTime(textLayer.outPoint, [100, 100]);
                  }
                }
              }
              totalWordsCreated++;
              createdTextLayers.push(textLayer);
            }
          }
        }

        // Auto-arrange words side-by-side if in separate text layers mode
        if (isSeparateMode && createdTextLayers.length > 0) {
          try {
            // Group layers by segments for proper arrangement
            var currentSegmentIndex = 0;
            var segmentStartIndex = 0;

            for (var segIdx = 0; segIdx < processedSegments.length; segIdx++) {
              var seg = processedSegments[segIdx];
              if (!seg.words || seg.words.length === 0) continue;

              var segmentLayers = [];
              for (
                var wIdx = 0;
                wIdx < seg.words.length &&
                segmentStartIndex + wIdx < createdTextLayers.length;
                wIdx++
              ) {
                segmentLayers.push(createdTextLayers[segmentStartIndex + wIdx]);
              }

              if (segmentLayers.length > 0) {
                // Arrange this segment's words side by side
                var maxChars = parseInt(maxCharsInput.text, 10);
                if (isNaN(maxChars) || maxChars <= 0)
                  maxChars = DEFAULT_MAX_CHARS_PER_LINE;

                var maxWords = parseInt(maxWordsInput.text, 10);
                if (isNaN(maxWords) || maxWords <= 0)
                  maxWords = DEFAULT_MAX_WORDS_PER_LINE;

                var useRtl = forceRtlCheckbox.value;

                // Sort layers by inPoint
                segmentLayers.sort(function (a, b) {
                  return a.inPoint - b.inPoint;
                });

                var latestOutPoint = 0;
                for (var i = 0; i < segmentLayers.length; i++) {
                  if (segmentLayers[i].outPoint > latestOutPoint) {
                    latestOutPoint = segmentLayers[i].outPoint;
                  }
                }

                var lines = [];
                var currentLine = [];
                var currentLineWordCount = 0;
                var currentLineCharCount = 0;

                for (var i = 0; i < segmentLayers.length; i++) {
                  var layer = segmentLayers[i];
                  var word = layer.property("Source Text").value.text;
                  if (word === "") continue;

                  var wouldExceedLimits =
                    currentLineWordCount > 0 &&
                    (currentLineWordCount + 1 > maxWords ||
                      currentLineCharCount + 1 + word.length > maxChars);

                  if (wouldExceedLimits) {
                    lines.push(currentLine);
                    currentLine = [layer];
                    currentLineWordCount = 1;
                    currentLineCharCount = word.length;
                  } else {
                    currentLine.push(layer);
                    currentLineWordCount++;
                    currentLineCharCount +=
                      (currentLineCharCount > 0 ? 1 : 0) + word.length;
                  }
                }
                if (currentLine.length > 0) {
                  lines.push(currentLine);
                }

                var firstLayer = segmentLayers[0];
                var textProp = firstLayer.property("Source Text");
                var textDoc = textProp.value;
                var lineHeight = textDoc.fontSize * 1.05;

                var startY = firstLayer
                  .property("Transform")
                  .property("Position").value[1];

                for (var i = 0; i < lines.length; i++) {
                  var lineLayers = lines[i];
                  var totalLineWidth = 0;
                  var spaceWidth = 0;

                  for (var j = 0; j < lineLayers.length; j++) {
                    var currentLayer = lineLayers[j];
                    var rect = currentLayer.sourceRectAtTime(
                      currentLayer.inPoint + 0.001,
                      false
                    );
                    totalLineWidth += rect.width;
                    if (j < lineLayers.length - 1) {
                      var currentTextProp =
                        currentLayer.property("Source Text");
                      var currentTextDoc = currentTextProp.value;
                      spaceWidth = currentTextDoc.fontSize / 4;
                      totalLineWidth += spaceWidth;
                    }
                  }

                  var currentX = useRtl
                    ? comp.width / 2 + totalLineWidth / 2
                    : comp.width / 2 - totalLineWidth / 2;
                  var currentY = startY + i * lineHeight;

                  for (var j = 0; j < lineLayers.length; j++) {
                    var layer = lineLayers[j];
                    var rect = layer.sourceRectAtTime(
                      layer.inPoint + 0.001,
                      false
                    );

                    var newX = useRtl
                      ? currentX - rect.width / 2
                      : currentX + rect.width / 2;
                    var positionProp = layer
                      .property("Transform")
                      .property("Position");

                    if (positionProp.dimensionsSeparated) {
                      positionProp.setValue([
                        newX,
                        currentY,
                        positionProp.value[2] || 0,
                      ]);
                    } else {
                      positionProp.setValue([newX, currentY]);
                    }

                    layer.outPoint = latestOutPoint;

                    var layerTextProp = layer.property("Source Text");
                    var layerTextDoc = layerTextProp.value;
                    spaceWidth = layerTextDoc.fontSize / 4;
                    currentX += useRtl
                      ? -(rect.width + spaceWidth)
                      : rect.width + spaceWidth;
                  }
                }
              }

              segmentStartIndex += seg.words.length;
            }
          } catch (e_arrange) {
            processWarnings.push(
              "Error auto-arranging words: " + e_arrange.toString()
            );
          }
        }

        var finalMessage =
          "Transcription complete! " +
          totalWordsCreated +
          " styled " +
          (shouldProcessWords ? "word" : "sentence") +
          " layers created.";
        if (segmentsWithIssues > 0) {
          finalMessage +=
            "\n(" +
            segmentsWithIssues +
            " segments had issues with word alignment and were skipped.)";
        }
        if (
          totalWordsCreated === 0 &&
          processedSegments.length > 0 &&
          segmentsWithIssues === processedSegments.length
        ) {
          finalMessage =
            "Transcription processed, but no word-level data could be used. Check API alignment models.";
        } else if (
          totalWordsCreated === 0 &&
          (!processedSegments || processedSegments.length === 0)
        ) {
          finalMessage = "API returned no segments or words.";
        }
        // alert(finalMessage); // Removed success alert

        if (createdTextLayers.length > 0) {
          var layerIndices = [];
          for (var k = 0; k < createdTextLayers.length; k++) {
            layerIndices.push(createdTextLayers[k].index);
          }
          if (layerIndices.length > 0) {
            try {
              var subtitlePrecompLayer = comp.layers.precompose(
                layerIndices,
                PRECOMP_NAME,
                true
              );
              if (!subtitlePrecompLayer) {
                processWarnings.push(
                  "Failed to pre-compose the subtitle layers."
                );
              }
            } catch (e_precomp) {
              processWarnings.push(
                "Error during pre-composition: " + e_precomp.toString()
              );
            }
          }
        }
      } else if (transcriptionData && transcriptionData.full_text) {
        var fullTextLayer = comp.layers.addText(transcriptionData.full_text);
        fullTextLayer.name = "Full Transcription (No Segments)";
        fullTextLayer.inPoint = 0;
        fullTextLayer.outPoint = comp.duration > 0 ? comp.duration : 10;
        // alert(
        //  "Transcription complete! Full text layer created (no segment/word data found)."
        // ); // Removed success alert
      } else {
        var noDataMsg =
          "API returned a response, but no valid segments or words found.\n";
        if (transcriptionData && transcriptionData.error) {
          noDataMsg += "API Error: " + transcriptionData.error;
        } else if (
          transcriptionData &&
          typeof transcriptionData.full_text !== "undefined" &&
          transcriptionData.full_text === ""
        ) {
          noDataMsg += "The transcribed text was empty.";
        } else {
          noDataMsg +=
            "Response: " +
            responseContent.substring(0, 500) +
            (responseContent.length > 500 ? "..." : "");
        }
        alert(noDataMsg);
      }

      // Cleanup temporary response files
      try {
        var wordResponseFile = new File(
          scriptTempFolder.fsName + "/word_" + TEMP_RESPONSE_FILENAME
        );
        if (wordResponseFile.exists) wordResponseFile.remove();

        var sentenceResponseFile = new File(
          scriptTempFolder.fsName + "/sentence_" + TEMP_RESPONSE_FILENAME
        );
        if (sentenceResponseFile.exists) sentenceResponseFile.remove();
      } catch (e_cleanup) {
        // Error during cleanup
      }

      // Show summary only if there were warnings/fallbacks
      if (processWarnings.length > 0) {
        var summaryMsg = "Transcription completed with warnings:\n\n";
        for (var w = 0; w < processWarnings.length; w++) {
          summaryMsg += "• " + processWarnings[w] + "\n";
        }
        alert(summaryMsg);
      }

      app.endUndoGroup();
    } catch (e_main) {
      alert(
        "A critical error occurred in runTranscriptionProcess: \n" +
          e_main.toString() +
          "\nAt line: " +
          e_main.line +
          "\nIn file: " +
          e_main.fileName +
          "\n\nPlease check the JavaScript Console for more details."
      );
      try {
        app.endUndoGroup();
      } catch (e_undo) {}
    }
  };

  // --- Function to Render Active Comp Audio ---
  var renderActiveCompAudio = function () {
    app.beginUndoGroup("Render Comp Audio");
    try {
      var proj = app.project;
      if (!proj) {
        alert("Please open a project first.");
        app.endUndoGroup();
        return;
      }
      if (!proj.file) {
        alert(
          "Please save your project first. The audio will be rendered relative to the project file."
        );
        app.endUndoGroup();
        return;
      }

      var comp = proj.activeItem;
      if (!(comp instanceof CompItem)) {
        alert("Please select an active composition to render.");
        app.endUndoGroup();
        return;
      }

      var projectPath = proj.file.path;
      var audioOutputFolder = new Folder(
        projectPath + "/" + RENDERED_AUDIO_SUBFOLDER
      );
      if (!audioOutputFolder.exists) {
        if (!audioOutputFolder.create()) {
          alert(
            "Error: Could not create audio output folder at: " +
              audioOutputFolder.fsName
          );
          app.endUndoGroup();
          return;
        }
      }

      var sanitizedCompName = sanitizeFileName(comp.name);
      var outputFileName = sanitizedCompName + "_audio.wav";
      var outputFilePath = audioOutputFolder.fsName + "/" + outputFileName;
      var outputFile = new File(outputFilePath);

      var rqItem = proj.renderQueue.items.add(comp);
      if (!rqItem) {
        alert("Failed to add composition to the render queue.");
        app.endUndoGroup();
        return;
      }

      var om = rqItem.outputModule(1);
      if (!om) {
        alert("Failed to access output module for the render queue item.");
        if (
          rqItem.status !== RQItemStatus.USER_WATCHED &&
          rqItem.status !== RQItemStatus.RENDERING &&
          rqItem.status !== RQItemStatus.DONE
        ) {
          try {
            rqItem.remove();
          } catch (e) {}
        }
        app.endUndoGroup();
        return;
      }

      var audioTemplateFound = false;
      var templates = om.templates;
      var audioTemplates = [
        "WAV Audio Only",
        "Wave",
        "WAV",
        "MP3 Audio Only",
        "MP3",
      ];

      for (var i = 0; i < audioTemplates.length; i++) {
        if (indexOfArray(templates, audioTemplates[i]) !== -1) {
          try {
            om.applyTemplate(audioTemplates[i]);
            audioTemplateFound = true;
            om.file = outputFile;
            break;
          } catch (e) {
            // Template might exist but fail to apply
          }
        }
      }

      if (!audioTemplateFound) {
        try {
          om.applyTemplate("WAV Audio Only"); // Default attempt
          om.file = outputFile;
        } catch (e_wav_template) {
          // If default fails, just set the file; AE might use a default format
          om.file = outputFile;
        }
      }

      app.endUndoGroup();
      try {
        proj.renderQueue.render();
        if (rqItem.status === RQItemStatus.DONE) {
          // alert("Audio render complete!\nFile saved at: " + outputFilePath); // Removed success alert
        } else {
          var statusMsg =
            "Render finished but status is: " + rqItem.status.toString();
          if (
            rqItem.logType === LogType.ERRORS_ONLY ||
            rqItem.logType === LogType.ERRORS_AND_PER_FRAME_INFO
          ) {
            statusMsg +=
              "\nThere were errors during render. Please check the Render Queue panel and log.";
          }
          alert(statusMsg + "\nFile might be at: " + outputFilePath);
        }
      } catch (e_render) {
        alert(
          "Error during audio rendering: " +
            e_render.toString() +
            "\nPlease check the Render Queue panel in After Effects."
        );
      } finally {
        if (
          rqItem &&
          (rqItem.status === RQItemStatus.QUEUED ||
            rqItem.status === RQItemStatus.NEEDS_OUTPUT)
        ) {
          // try { rqItem.remove(); } catch (e_remove_rq) { /* Silently fail */ }
        }
      }
    } catch (e_render_main) {
      alert(
        "A critical error occurred in renderActiveCompAudio: \n" +
          e_render_main.toString() +
          "\nAt line: " +
          e_render_main.line +
          "\nIn file: " +
          e_render_main.fileName +
          "\n\nPlease check the JavaScript Console for more details."
      );
      app.endUndoGroup();
    }
  };

  var indexOfArray = function (arr, item) {
    for (var i = 0; i < arr.length; i++) {
      if (arr[i] === item) return i;
    }
    return -1;
  };

  // --- Function to Arrange Selected Text Layers Side-by-Side ---
  var arrangeWordsSideBySide = function () {
    app.beginUndoGroup("Arrange Words in Paragraph");
    try {
      var comp = app.project.activeItem;
      if (!(comp instanceof CompItem)) {
        alert("Please select or open a composition first.");
        return;
      }

      var selectedLayers = comp.selectedLayers;
      var textLayers = [];
      for (var i = 0; i < selectedLayers.length; i++) {
        if (selectedLayers[i] instanceof TextLayer) {
          textLayers.push(selectedLayers[i]);
        }
      }

      if (textLayers.length < 1) {
        alert("Please select at least one text layer to arrange.");
        return;
      }

      var maxChars = parseInt(maxCharsInput.text, 10);
      if (isNaN(maxChars) || maxChars <= 0) {
        maxChars = DEFAULT_MAX_CHARS_PER_LINE;
        alert("Invalid Max Characters Per Line. Using default: " + maxChars);
      }

      var maxWords = parseInt(maxWordsInput.text, 10);
      if (isNaN(maxWords) || maxWords <= 0) {
        maxWords = DEFAULT_MAX_WORDS_PER_LINE;
        alert("Invalid Max Words Per Line. Using default: " + maxWords);
      }

      var useRtl = forceRtlCheckbox.value;

      textLayers.sort(function (a, b) {
        return a.inPoint - b.inPoint;
      });

      var latestOutPoint = 0;
      for (var i = 0; i < textLayers.length; i++) {
        if (textLayers[i].outPoint > latestOutPoint) {
          latestOutPoint = textLayers[i].outPoint;
        }
      }

      var lines = [];
      var currentLine = [];
      var currentLineWordCount = 0;
      var currentLineCharCount = 0;

      for (var i = 0; i < textLayers.length; i++) {
        var layer = textLayers[i];
        var word = layer.property("Source Text").value.text;
        if (word === "") continue;

        var wouldExceedLimits =
          currentLineWordCount > 0 &&
          (currentLineWordCount + 1 > maxWords ||
            currentLineCharCount + 1 + word.length > maxChars);

        if (wouldExceedLimits) {
          lines.push(currentLine);
          currentLine = [layer];
          currentLineWordCount = 1;
          currentLineCharCount = word.length;
        } else {
          currentLine.push(layer);
          currentLineWordCount++;
          currentLineCharCount +=
            (currentLineCharCount > 0 ? 1 : 0) + word.length;
        }
      }
      if (currentLine.length > 0) {
        lines.push(currentLine);
      }

      var firstLayer = textLayers[0];
      var textProp = firstLayer.property("Source Text");
      var textDoc = textProp.value;
      // Use a slightly tighter line height so multiple lines fit better
      // Default was 1.2; reduce to 1.05 for more compact paragraphs
      var lineHeight = textDoc.fontSize * 1.05;

      var startY = firstLayer.property("Transform").property("Position")
        .value[1];

      for (var i = 0; i < lines.length; i++) {
        var lineLayers = lines[i];
        var totalLineWidth = 0;
        var spaceWidth = 0;

        for (var j = 0; j < lineLayers.length; j++) {
          var currentLayer = lineLayers[j];
          var rect = currentLayer.sourceRectAtTime(
            currentLayer.inPoint + 0.001,
            false
          );
          totalLineWidth += rect.width;
          if (j < lineLayers.length - 1) {
            var currentTextProp = currentLayer.property("Source Text");
            var currentTextDoc = currentTextProp.value;
            // Reduce inter-word spacing to half of previous value (fontSize/4)
            spaceWidth = currentTextDoc.fontSize / 4;
            totalLineWidth += spaceWidth;
          }
        }

        var currentX = useRtl
          ? comp.width / 2 + totalLineWidth / 2
          : comp.width / 2 - totalLineWidth / 2;
        var currentY = startY + i * lineHeight;

        for (var j = 0; j < lineLayers.length; j++) {
          var layer = lineLayers[j];
          var rect = layer.sourceRectAtTime(layer.inPoint + 0.001, false);

          var newX = useRtl
            ? currentX - rect.width / 2
            : currentX + rect.width / 2;
          var positionProp = layer.property("Transform").property("Position");

          if (positionProp.dimensionsSeparated) {
            positionProp.setValue([newX, currentY, positionProp.value[2] || 0]);
          } else {
            positionProp.setValue([newX, currentY]);
          }

          layer.outPoint = latestOutPoint;

          var layerTextProp = layer.property("Source Text");
          var layerTextDoc = layerTextProp.value;
          // Use reduced inter-word spacing (fontSize/4)
          spaceWidth = layerTextDoc.fontSize / 4;
          currentX += useRtl
            ? -(rect.width + spaceWidth)
            : rect.width + spaceWidth;
        }
      }
    } catch (e) {
      alert(
        "Error arranging text layers: " + e.toString() + "\nLine: " + e.line
      );
    } finally {
      app.endUndoGroup();
    }
  };

  // --- Function to Combine Selected Text Layers ---
  var combineSelectedTextLayers = function () {
    app.beginUndoGroup("Combine Text Layers");
    try {
      var comp = app.project.activeItem;
      if (!(comp instanceof CompItem)) {
        alert("Please select or open a composition first.");
        app.endUndoGroup();
        return;
      }

      var selectedLayers = comp.selectedLayers;
      var textLayers = [];
      for (var i = 0; i < selectedLayers.length; i++) {
        if (selectedLayers[i] instanceof TextLayer) {
          textLayers.push(selectedLayers[i]);
        }
      }

      if (textLayers.length < 2) {
        alert("Please select at least two text layers to combine.");
        app.endUndoGroup();
        return;
      }

      // Sort layers by inPoint
      textLayers.sort(function (a, b) {
        return a.inPoint - b.inPoint;
      });

      var targetLayer = textLayers[0]; // The first layer is the one we'll keep and modify.
      var otherLayers = textLayers.slice(1); // All other layers will be removed.

      var maxChars = parseInt(maxCharsInput.text, 10);
      if (isNaN(maxChars) || maxChars <= 0) {
        maxChars = DEFAULT_MAX_CHARS_PER_LINE;
        alert("Invalid Max Characters Per Line. Using default: " + maxChars);
      }

      var maxWords = parseInt(maxWordsInput.text, 10);
      if (isNaN(maxWords) || maxWords <= 0) {
        maxWords = DEFAULT_MAX_WORDS_PER_LINE;
        alert("Invalid Max Words Per Line. Using default: " + maxWords);
      }

      var useRtl = forceRtlCheckbox.value;

      var combinedTextContent = "";
      var currentLine = "";
      var currentLineWordCount = 0;
      var lastLayerOutPoint = textLayers[textLayers.length - 1].outPoint;

      for (var i = 0; i < textLayers.length; i++) {
        var layerText = textLayers[i].property("Source Text").value.text;
        if (layerText === "") continue;

        var wordsInLayer = layerText.split(/\s+/); // Split by spaces

        for (var j = 0; j < wordsInLayer.length; j++) {
          var word = wordsInLayer[j];
          if (word === "") continue;

          if (currentLineWordCount > 0) {
            // If not the first word on the current line
            if (
              currentLineWordCount >= maxWords ||
              currentLine.length + 1 + word.length > maxChars
            ) {
              // Line break condition met
              combinedTextContent += currentLine + "\r"; // Add current line to main text with a newline
              currentLine = word; // Start new line with current word
              currentLineWordCount = 1;
            } else {
              // Add word to current line
              currentLine += " " + word;
              currentLineWordCount++;
            }
          } else {
            // First word on the current line
            currentLine = word;
            currentLineWordCount = 1;
          }
        }
      }
      if (currentLine !== "") {
        combinedTextContent += currentLine; // Add the last line
      }

      if (combinedTextContent === "") {
        alert("No text content found in selected layers to combine.");
        app.endUndoGroup();
        return;
      }

      // Modify the target layer instead of creating a new one
      targetLayer.name = "Combined Text";
      targetLayer.outPoint = lastLayerOutPoint;

      var textProp = targetLayer.property("Source Text");
      var textDoc = textProp.value;
      textDoc.text = combinedTextContent;
      textProp.setValue(textDoc);

      // Center anchor point and position based on new text content
      try {
        var rect = targetLayer.sourceRectAtTime(
          targetLayer.inPoint + 0.001,
          false
        ); // Use a time slightly after inPoint
        if (rect && rect.width > 0 && rect.height > 0) {
          var newAnchorX = rect.left + rect.width / 2;
          var newAnchorY = rect.top + rect.height / 2;
          targetLayer
            .property("Transform")
            .property("Anchor Point")
            .setValue([newAnchorX, newAnchorY]);
        }
      } catch (e_anchor) {
        // Optional: Log error
      }
      targetLayer
        .property("Transform")
        .property("Position")
        .setValue([comp.width / 2, comp.height / 2]);

      // Delete the other original layers
      for (var k = otherLayers.length - 1; k >= 0; k--) {
        otherLayers[k].remove();
      }

      // alert(
      //  "Selected " +
      //    textLayers.length +
      //    " text layers combined into one layer, preserving the first layer's animation."
      // ); // Removed success alert
    } catch (e) {
      alert(
        "Error combining text layers: " + e.toString() + "\nLine: " + e.line
      );
    } finally {
      app.endUndoGroup();
    }
  };

  // --- Function to check for script updates from GitHub ---
  var checkForUpdates = function () {
    if (GITHUB_RAW_URL.indexOf("YOUR_USERNAME") > -1) {
      // Don't run if the URL is still the placeholder
      return;
    }

    var tempFile = new File(Folder.temp.fsName + "/ae_script_update_check.jsx");

    try {
      var curlCommand;
      var tempFilePathForCurl = tempFile.fsName.replace(/\\/g, "/");

      // Use -L to follow redirects, which is common with raw GitHub URLs
      curlCommand =
        'curl -s -L "' + GITHUB_RAW_URL + '" -o "' + tempFilePathForCurl + '"';

      if ($.os.indexOf("Windows") > -1) {
        system.callSystem('cmd.exe /c "' + curlCommand + '"');
      } else {
        system.callSystem(curlCommand);
      }

      if (tempFile.exists && tempFile.length > 0) {
        tempFile.open("r");
        var remoteContent = tempFile.read();
        tempFile.close();
        tempFile.remove();

        // Use regex to find the version string in the remote file
        var versionRegex = /var\s+SCRIPT_VERSION\s*=\s*["']([^"']+)["']/;
        var match = remoteContent.match(versionRegex);

        if (match && match[1]) {
          var remoteVersion = match[1];
          if (remoteVersion !== SCRIPT_VERSION) {
            alert(getNewVersionMessage(remoteVersion));
          }
        }
      }
    } catch (e) {
      // Silently fail on any error to not disrupt the user's workflow.
      // You could write to the console for debugging if needed:
      // $.writeln("Update check failed: " + e.toString());
    } finally {
      if (tempFile.exists) {
        try {
          tempFile.remove();
        } catch (e_remove) {}
      }
    }
  };

  var win;
  var buildUI = function (uiTargetObj) {
    win =
      uiTargetObj instanceof Panel
        ? uiTargetObj
        : new Window(
            "palette",
            "Whisper Transcriber & Audio Tools",
            undefined,
            { resizeable: true, closeButton: true }
          );

    if (win === null) {
      alert("Failed to create UI window or panel.");
      return null;
    }

    win.orientation = "column";
    win.alignChildren = ["fill", "top"];
    // Reduced spacing/margins so the panel is more compact and fits better
    win.spacing = 6;
    win.margins = 8;

    // --- Preset Panel ---
    var presetPanel = win.add("panel", undefined, "Presets");
    presetPanel.orientation = "row";
    presetPanel.alignChildren = ["left", "center"];
    // Tighter preset panel spacing
    presetPanel.spacing = 6;
    presetPanel.margins = 6;

    presetDropdown = presetPanel.add("dropdownlist", undefined, []);
    presetDropdown.size = [180, 25];
    presetDropdown.helpTip = "Select a saved settings preset.";

    savePresetBtn = presetPanel.add("button", undefined, "Save");
    savePresetBtn.size = [60, 25];
    savePresetBtn.helpTip = "Save the current settings as a new preset.";

    deletePresetBtn = presetPanel.add("button", undefined, "Delete");
    deletePresetBtn.size = [60, 25];
    deletePresetBtn.helpTip = "Delete the selected preset.";

    win.add("statictext", undefined, "1. Render Audio (Optional):").alignment =
      "left";
    var renderAudioBtn = win.add(
      "button",
      undefined,
      "Render Active Comp Audio (WAV)"
    );
    renderAudioBtn.helpTip =
      "Renders audio from the current active composition to a 'Rendered_Audio' subfolder in your project directory (as .wav).";
    renderAudioBtn.onClick = function () {
      renderActiveCompAudio();
    };

    win.add("panel"); // Separator

    win.add(
      "statictext",
      undefined,
      "2. Transcribe Audio to Text Layers:"
    ).alignment = "left";

    // --- Transcription Level Dropdown ---
    var transcriptionLevelGroup = win.add("group");
    transcriptionLevelGroup.orientation = "row";
    transcriptionLevelGroup.add(
      "statictext",
      undefined,
      "Transcription Level:"
    );
    transcriptionLevelDropdown = transcriptionLevelGroup.add(
      "dropdownlist",
      undefined,
      ["Word-by-Word", "Sentence Level"]
    );
    transcriptionLevelDropdown.selection = 0; // Default to Word-by-Word
    transcriptionLevelDropdown.helpTip =
      "Choose between word-by-word or sentence level transcription.";

    // --- Separate Text Layers Checkbox ---
    var separateLayersGroup = win.add("group");
    separateLayersGroup.orientation = "row";
    separateTextLayersCheckbox = separateLayersGroup.add(
      "checkbox",
      undefined,
      "Separate Text Layers (Sentence + Word Timing)"
    );
    separateTextLayersCheckbox.value = false;
    separateTextLayersCheckbox.helpTip =
      "When checked with Sentence Level selected, creates individual word layers with word timings but uses sentence-level text. Automatically arranges words side-by-side.";

    // --- Gemini API Key Input (for sentence splitting) ---
    var geminiApiKeyGroup = win.add("group");
    geminiApiKeyGroup.orientation = "row";
    geminiApiKeyGroup.add("statictext", undefined, "Gemini API Key:");
    geminiApiKeyInput = geminiApiKeyGroup.add("edittext", undefined, "");
    geminiApiKeyInput.characters = 60;
    geminiApiKeyInput.helpTip =
      "Optional: Enter your Gemini API key to use Gemini 2.0 Flash for intelligent sentence splitting (max 9 words per sentence). Only used when Transcription Level is set to 'Sentence Level'. Leave empty to use original segments.";

    // --- Language Input ---
    var languageGroup = win.add("group");
    languageGroup.orientation = "row";
    languageGroup.add("statictext", undefined, "Language Code (Optional):");
    languageInput = languageGroup.add("edittext", undefined, "");
    languageInput.characters = 10;
    languageInput.helpTip =
      "Predefine language (e.g., 'en' for English, 'es' for Spanish) to speed up transcription. Leave empty for auto-detect.";

    // Try to load saved API key
    var savedApiKey = getSetting("Gemini_API_Key");
    if (savedApiKey) {
      geminiApiKeyInput.text = savedApiKey;
    }

    // Save API key when changed
    geminiApiKeyInput.onChange = function () {
      saveSetting("Gemini_API_Key", this.text);
    };

    // Try to load saved Language Code
    var savedLanguage = getSetting("Language_Code");
    if (savedLanguage) {
      languageInput.text = savedLanguage;
    }

    // Save Language Code when changed
    languageInput.onChange = function () {
      saveSetting("Language_Code", this.text);
    };

    // Try to load saved Transcription Level
    var savedLevel = getSetting("Transcription_Level");
    if (savedLevel === "sentence") {
      transcriptionLevelDropdown.selection = 1;
    } else {
      transcriptionLevelDropdown.selection = 0;
    }

    // Save Transcription Level when changed
    transcriptionLevelDropdown.onChange = function () {
      saveSetting(
        "Transcription_Level",
        this.selection.index === 1 ? "sentence" : "word"
      );
    };

    // Try to load saved Separate Text Layers setting
    var savedSeparateLayers = getSetting("Separate_Text_Layers");
    if (savedSeparateLayers === "true") {
      separateTextLayersCheckbox.value = true;
    } else {
      separateTextLayersCheckbox.value = false;
    }

    // Save Separate Text Layers setting when changed
    separateTextLayersCheckbox.onClick = function () {
      saveSetting("Separate_Text_Layers", this.value.toString());
    };

    var stylePanel = win.add("panel", undefined, "Text Styling Options");
    stylePanel.orientation = "column";
    stylePanel.alignChildren = "left";
    // Reduce vertical spacing inside styling options
    stylePanel.spacing = 4;
    stylePanel.margins = 6;

    // Search box for fonts (will filter the dropdown below)
    var fontSearchGroup = stylePanel.add("group");
    fontSearchGroup.orientation = "row";
    fontSearchGroup.add("statictext", undefined, "Search Fonts:");
    fontSearchInput = fontSearchGroup.add("edittext", undefined, "");
    fontSearchInput.characters = 20;
    fontSearchInput.helpTip =
      "Type to filter the font dropdown by family/style or PostScript name.";

    var fontNameGroup = stylePanel.add("group");
    fontNameGroup.orientation = "row";
    fontNameGroup.add("statictext", undefined, "Font Name:");

    // Check for After Effects 24.0+ font API
    if (app.fonts && typeof app.fonts.allFonts !== "undefined") {
      isFontDropdown = true;
      fontNameInput = fontNameGroup.add("dropdownlist", undefined, []);
      fontNameInput.size = [220, 25];
      fontNameInput.helpTip = "Select a font from your system.";

      try {
        var allFonts = app.fonts.allFonts;
        var defaultFontPostScript = null;
        availableFonts = [];
        for (var i = 0; i < allFonts.length; i++) {
          var familyGroup = allFonts[i];
          for (var j = 0; j < familyGroup.length; j++) {
            var font = familyGroup[j];
            if (font && font.postScriptName) {
              var displayName = font.familyName + " - " + font.styleName;
              availableFonts.push({
                postScriptName: font.postScriptName,
                displayName: displayName,
              });
              if (font.postScriptName === DEFAULT_TEXT_FONT_POSTSCRIPT_NAME) {
                defaultFontPostScript = font.postScriptName;
              }
            }
          }
        }

        // Populate the dropdown from the cached list (supports filtering)
        var populateFontDropdown = function (query) {
          query = (query || "").toString().toLowerCase();
          fontNameInput.removeAll();
          for (var k = 0; k < availableFonts.length; k++) {
            var f = availableFonts[k];
            if (
              query === "" ||
              f.displayName.toLowerCase().indexOf(query) !== -1 ||
              f.postScriptName.toLowerCase().indexOf(query) !== -1
            ) {
              var it = fontNameInput.add("item", f.displayName);
              it.properties = { postScriptName: f.postScriptName };
            }
          }
          if (fontNameInput.items.length > 0) {
            // Try to select the default font if visible, otherwise first
            var foundSel = false;
            if (defaultFontPostScript) {
              for (var m = 0; m < fontNameInput.items.length; m++) {
                if (
                  fontNameInput.items[m].properties.postScriptName ===
                  defaultFontPostScript
                ) {
                  fontNameInput.selection = m;
                  foundSel = true;
                  break;
                }
              }
            }
            if (!foundSel) fontNameInput.selection = 0;
          }
        };

        // Initially populate with no filter
        populateFontDropdown("");

        // Wire search input to filter the dropdown live
        if (fontSearchInput) {
          fontSearchInput.onChanging = function () {
            try {
              populateFontDropdown(this.text || "");
            } catch (e_pf) {}
          };
          fontSearchInput.onChange = function () {
            try {
              populateFontDropdown(this.text || "");
            } catch (e_pf) {}
          };
        }
      } catch (e) {
        // Fallback in case of error with font API
        isFontDropdown = false;
        // Remove dropdown if it was added
        if (fontNameInput) {
          try {
            fontNameGroup.remove(fontNameInput);
          } catch (e_rem) {}
        }
        fontNameInput = fontNameGroup.add(
          "edittext",
          undefined,
          DEFAULT_TEXT_FONT_POSTSCRIPT_NAME
        );
        fontNameInput.characters = 25;
        fontNameInput.helpTip =
          "Font dropdown failed. Enter PostScript name (e.g., ArialMT, Poppins-SemiBold).";
      }
    } else {
      // Fallback for older AE versions
      isFontDropdown = false;
      fontNameInput = fontNameGroup.add(
        "edittext",
        undefined,
        DEFAULT_TEXT_FONT_POSTSCRIPT_NAME
      );
      fontNameInput.characters = 25;
      fontNameInput.helpTip =
        "Enter the PostScript name of the font (e.g., ArialMT, TimesNewRomanPSMT, Poppins-SemiBold).";
    }

    var fontSizeGroup = stylePanel.add("group");
    fontSizeGroup.orientation = "row";
    fontSizeGroup.add("statictext", undefined, "Font Size (pt):");
    fontSizeInput = fontSizeGroup.add(
      "edittext",
      undefined,
      DEFAULT_TEXT_FONT_SIZE.toString()
    );
    fontSizeInput.characters = 5;

    // Checkbox to enable/disable per-word pop-in animations (disabled by default)
    var animsGroup = stylePanel.add("group");
    animsGroup.orientation = "row";
    enableAnimationsCheckbox = animsGroup.add(
      "checkbox",
      undefined,
      "Enable Text Animations (Pop-in)"
    );
    enableAnimationsCheckbox.helpTip =
      "When checked, each word layer will receive a small pop-in scale animation. Disabled by default.";
    enableAnimationsCheckbox.value = false;

    stylePanel.add(
      "statictext",
      undefined,
      "Fill Color (R,G,B values 0.0 - 1.0):"
    );
    var fillColorGroup = stylePanel.add("group");
    fillColorGroup.orientation = "row";
    fillColorGroup.add("statictext", undefined, "R:");
    fillRInput = fillColorGroup.add(
      "edittext",
      undefined,
      DEFAULT_TEXT_FILL_COLOR[0].toString()
    );
    fillRInput.characters = 4;
    fillColorGroup.add("statictext", undefined, "G:");
    fillGInput = fillColorGroup.add(
      "edittext",
      undefined,
      DEFAULT_TEXT_FILL_COLOR[1].toString()
    );
    fillGInput.characters = 4;
    fillColorGroup.add("statictext", undefined, "B:");
    fillBInput = fillColorGroup.add(
      "edittext",
      undefined,
      DEFAULT_TEXT_FILL_COLOR[2].toString()
    );
    fillBInput.characters = 4;

    var strokeWidthGroup = stylePanel.add("group");
    strokeWidthGroup.orientation = "row";
    strokeWidthGroup.add("statictext", undefined, "Stroke Width (pt):");
    strokeWidthInput = strokeWidthGroup.add(
      "edittext",
      undefined,
      DEFAULT_TEXT_STROKE_WIDTH.toString()
    );
    strokeWidthInput.characters = 5;
    strokeWidthInput.helpTip = "Set to 0 for no stroke.";

    stylePanel.add(
      "statictext",
      undefined,
      "Stroke Color (R,G,B values 0.0 - 1.0):"
    );
    var strokeColorGroup = stylePanel.add("group");
    strokeColorGroup.orientation = "row";
    strokeColorGroup.add("statictext", undefined, "R:");
    strokeRInput = strokeColorGroup.add(
      "edittext",
      undefined,
      DEFAULT_TEXT_STROKE_COLOR[0].toString()
    );
    strokeRInput.characters = 4;
    strokeColorGroup.add("statictext", undefined, "G:");
    strokeGInput = strokeColorGroup.add(
      "edittext",
      undefined,
      DEFAULT_TEXT_STROKE_COLOR[1].toString()
    );
    strokeGInput.characters = 4;
    strokeColorGroup.add("statictext", undefined, "B:");
    strokeBInput = strokeColorGroup.add(
      "edittext",
      undefined,
      DEFAULT_TEXT_STROKE_COLOR[2].toString()
    );
    strokeBInput.characters = 4;

    var transcribeBtn = win.add(
      "button",
      undefined,
      "Select Audio File & Start Transcription"
    );
    transcribeBtn.helpTip =
      "Prompts to select an audio file, calls WhisperX API, creates styled text layer per WORD (using settings above), and pre-comps them.";

    transcribeBtn.onClick = function () {
      if (!app.project || !(app.project.activeItem instanceof CompItem)) {
        alert(
          "Please open or select a composition first (this is where text layers will be added)."
        );
        return;
      }

      var audioFileExtensions = "*.wav;*.mp3;*.m4a;*.ogg;*.flac;*.aac;*.opus";
      var selectedFile = File.openDialog(
        "Select your audio file for transcription",
        audioFileExtensions,
        false
      );

      if (selectedFile) {
        runTranscriptionProcess(selectedFile);
      }
    };

    win.add("panel");

    var combinePanel = win.add("panel", undefined, "Text Layer Utilities");
    combinePanel.orientation = "column";
    combinePanel.alignChildren = "left";
    // Tighter utilities panel
    combinePanel.spacing = 4;
    combinePanel.margins = 6;

    combinePanel.add("statictext", undefined, "Combine Selected Text Layers:");

    var maxCharsGroup = combinePanel.add("group");
    maxCharsGroup.orientation = "row";
    maxCharsGroup.add("statictext", undefined, "Max Chars/Line:");
    maxCharsInput = maxCharsGroup.add(
      "edittext",
      undefined,
      DEFAULT_MAX_CHARS_PER_LINE.toString()
    );
    maxCharsInput.characters = 4;
    maxCharsInput.helpTip = "Maximum characters per line for combined text.";

    var maxWordsGroup = combinePanel.add("group");
    maxWordsGroup.orientation = "row";
    maxWordsGroup.add("statictext", undefined, "Max Words/Line:");
    maxWordsInput = maxWordsGroup.add(
      "edittext",
      undefined,
      DEFAULT_MAX_WORDS_PER_LINE.toString()
    );
    maxWordsInput.characters = 4;
    maxWordsInput.helpTip = "Maximum words per line for combined text.";

    var combineBtn = combinePanel.add(
      "button",
      undefined,
      "Combine Selected Text Layers"
    );
    combineBtn.helpTip =
      "Combines selected text layers into a single new layer, respecting character and word limits per line.";
    combineBtn.onClick = function () {
      combineSelectedTextLayers();
    };

    // --- New "Arrange" Button ---
    var arrangeBtn = combinePanel.add(
      "button",
      undefined,
      "Arrange Words Side-by-Side"
    );
    arrangeBtn.helpTip =
      "Arranges selected word layers into a paragraph, respecting the 'Max Chars/Line' and 'Max Words/Line' settings. Each line is centered.";
    arrangeBtn.onClick = function () {
      arrangeWordsSideBySide();
    };

    forceRtlCheckbox = combinePanel.add(
      "checkbox",
      undefined,
      "Force RTL Layout"
    );
    forceRtlCheckbox.value = isRtlMode;
    forceRtlCheckbox.helpTip =
      "Forces Right-to-Left layout for 'Arrange' and 'Combine' functions. Automatically checked if an RTL language is detected during transcription.";

    // --- UI LOGIC FOR PRESETS ---
    var applyPresetToUI = function (presetName) {
      var settings = loadPreset(presetName);
      if (!settings) return;

      if (isFontDropdown) {
        var fontToSelect =
          settings.fontName || DEFAULT_TEXT_FONT_POSTSCRIPT_NAME;
        var foundFont = false;
        for (var i = 0; i < fontNameInput.items.length; i++) {
          if (
            fontNameInput.items[i].properties.postScriptName === fontToSelect
          ) {
            fontNameInput.selection = i;
            foundFont = true;
            break;
          }
        }
        if (!foundFont) {
          // If font not found, select default or first item
          if (fontNameInput.items.length > 0) fontNameInput.selection = 0;
        }
      } else {
        fontNameInput.text =
          settings.fontName || DEFAULT_TEXT_FONT_POSTSCRIPT_NAME;
      }
      fontSizeInput.text = settings.fontSize || DEFAULT_TEXT_FONT_SIZE;
      fillRInput.text = settings.fillColor
        ? settings.fillColor[0]
        : DEFAULT_TEXT_FILL_COLOR[0];
      fillGInput.text = settings.fillColor
        ? settings.fillColor[1]
        : DEFAULT_TEXT_FILL_COLOR[1];
      fillBInput.text = settings.fillColor
        ? settings.fillColor[2]
        : DEFAULT_TEXT_FILL_COLOR[2];
      strokeWidthInput.text =
        typeof settings.strokeWidth !== "undefined"
          ? settings.strokeWidth
          : DEFAULT_TEXT_STROKE_WIDTH;
      strokeRInput.text = settings.strokeColor
        ? settings.strokeColor[0]
        : DEFAULT_TEXT_STROKE_COLOR[0];
      strokeGInput.text = settings.strokeColor
        ? settings.strokeColor[1]
        : DEFAULT_TEXT_STROKE_COLOR[1];
      strokeBInput.text = settings.strokeColor
        ? settings.strokeColor[2]
        : DEFAULT_TEXT_STROKE_COLOR[2];
      // Restore animation checkbox state if present in preset
      if (typeof settings.enableAnimations !== "undefined") {
        try {
          if (enableAnimationsCheckbox) {
            enableAnimationsCheckbox.value = !!settings.enableAnimations;
          }
        } catch (e_anim_restore) {
          // Ignore any errors restoring the checkbox state
        }
      }
      maxCharsInput.text = settings.maxChars || DEFAULT_MAX_CHARS_PER_LINE;
      maxWordsInput.text = settings.maxWords || DEFAULT_MAX_WORDS_PER_LINE;
    };

    var populatePresetDropdown = function () {
      var presets = getPresetList();
      presetDropdown.removeAll();
      for (var i = 0; i < presets.length; i++) {
        presetDropdown.add("item", presets[i]);
      }
    };

    presetDropdown.onChange = function () {
      if (presetDropdown.selection) {
        var selectedPreset = presetDropdown.selection.text;
        applyPresetToUI(selectedPreset);
        saveSetting(LAST_PRESET_KEY, selectedPreset);
      }
    };

    savePresetBtn.onClick = function () {
      var presetName = prompt("Enter a name for this preset:", "My Preset");
      if (presetName) {
        var fontValue;
        if (isFontDropdown) {
          fontValue = fontNameInput.selection
            ? fontNameInput.selection.properties.postScriptName
            : "";
        } else {
          fontValue = fontNameInput.text;
        }
        var settings = {
          fontName: fontValue,
          fontSize: fontSizeInput.text,
          fillColor: [fillRInput.text, fillGInput.text, fillBInput.text],
          strokeWidth: strokeWidthInput.text,
          strokeColor: [
            strokeRInput.text,
            strokeGInput.text,
            strokeBInput.text,
          ],
          maxChars: maxCharsInput.text,
          maxWords: maxWordsInput.text,
          // Persist animation checkbox state
          enableAnimations:
            enableAnimationsCheckbox && enableAnimationsCheckbox.value
              ? true
              : false,
        };
        savePreset(presetName, settings);
        populatePresetDropdown();
        // Find and select the new preset
        for (var i = 0; i < presetDropdown.items.length; i++) {
          if (presetDropdown.items[i].text === presetName) {
            presetDropdown.selection = i;
            break;
          }
        }
        saveSetting(LAST_PRESET_KEY, presetName);
      }
    };

    deletePresetBtn.onClick = function () {
      if (presetDropdown.selection) {
        var presetNameToDelete = presetDropdown.selection.text;
        if (
          confirm(
            "Are you sure you want to delete the preset '" +
              presetNameToDelete +
              "'?"
          )
        ) {
          deletePreset(presetNameToDelete);
          populatePresetDropdown();
          if (presetDropdown.items.length > 0) {
            presetDropdown.selection = 0;
            saveSetting(LAST_PRESET_KEY, presetDropdown.selection.text);
          } else {
            saveSetting(LAST_PRESET_KEY, ""); // No presets left
          }
        }
      } else {
        alert("Please select a preset to delete.");
      }
    };

    // --- Initial Load ---
    populatePresetDropdown();
    var lastPreset = getSetting(LAST_PRESET_KEY);
    if (lastPreset) {
      var found = false;
      for (var i = 0; i < presetDropdown.items.length; i++) {
        if (presetDropdown.items[i].text === lastPreset) {
          presetDropdown.selection = i;
          applyPresetToUI(lastPreset);
          found = true;
          break;
        }
      }
      if (!found) {
        // Last preset was deleted, select first if available
        if (presetDropdown.items.length > 0) {
          presetDropdown.selection = 0;
        }
      }
    } else if (presetDropdown.items.length > 0) {
      presetDropdown.selection = 0; // Select first one if no last preset is stored
    }
    if (presetDropdown.selection) {
      applyPresetToUI(presetDropdown.selection.text);
    }

    win.layout.layout(true);
    win.layout.resize();
    win.onResizing = win.onResize = function () {
      this.layout.resize();
    };
    return win;
  };

  var uiObject = buildUI(thisObj);

  if (uiObject !== null) {
    if (uiObject instanceof Window) {
      uiObject.center();
      uiObject.show();
    } else {
      // For ScriptUI Panels embedded in AE
      if (win && typeof win.layout !== "undefined") {
        win.layout.layout(true); // Apply layout to the panel
      }
    }
    // Run the update check after the UI has been built and is ready to be shown
    checkForUpdates();
  }
})(this);
