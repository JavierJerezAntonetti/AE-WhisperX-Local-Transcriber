// Script Name: Whisper Transcriber Panel (Word-Level - Select Audio & Render)
// Description: Prompts user to select an audio file, transcribes it using a local WhisperX API,
//              and creates individual, styled text layers for each WORD.
//              Also includes a button to render audio from the active composition.

(function createAndRunWhisperPanel(thisObj) {
  // --- Configuration ---
  var WHISPER_API_URL = "http://127.0.0.1:5000/transcribe";
  var TEMP_FOLDER_PATH;

  if (Folder.temp) {
    TEMP_FOLDER_PATH = Folder.temp.fsName;
  } else {
    TEMP_FOLDER_PATH = $.os.indexOf("Windows") > -1 ? $.getenv("TEMP") : "/tmp";
  }
  var SCRIPT_TEMP_SUBFOLDER = "AETempWhisper";
  var TEMP_RESPONSE_FILENAME = "whisper_api_response.json";
  var MAX_LAYER_NAME_WORD_LENGTH = 15;
  var RENDERED_AUDIO_SUBFOLDER = "Rendered_Audio"; // Subfolder for rendered audio
  var PRECOMP_NAME = "Subtitles";

  // --- Styling Configuration (These are now DEFAULTS for UI inputs) ---
  var DEFAULT_TEXT_FONT_POSTSCRIPT_NAME = "Poppins-SemiBold";
  var DEFAULT_TEXT_FONT_SIZE = 60;
  var DEFAULT_TEXT_FILL_COLOR = [1, 1, 1]; // [R, G, B] values 0-1
  var DEFAULT_TEXT_STROKE_COLOR = [0, 0, 0]; // [R, G, B] values 0-1
  var DEFAULT_TEXT_STROKE_WIDTH = 0;

  // --- UI Element Variables (will be defined in buildUI) ---
  var fontNameInput, fontSizeInput;
  var fillRInput, fillGInput, fillBInput;
  var strokeRInput, strokeGInput, strokeBInput;
  var strokeWidthInput;

  // --- Helper Function to sanitize file names ---
  function sanitizeFileName(name) {
    return name.replace(/[\\\/\:\*\?\"\<\>\|]/g, "_"); // Replace invalid characters
  }

  // --- Main Transcription Function ---
  function runTranscriptionProcess(selectedAudioFile) {
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
      var currentFontName =
        fontNameInput.text || DEFAULT_TEXT_FONT_POSTSCRIPT_NAME;
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

      // --- Curl Call Section ---
      var responseFilePath =
        scriptTempFolder.fsName + "/" + TEMP_RESPONSE_FILENAME;
      var responseFile = new File(responseFilePath);
      if (responseFile.exists) responseFile.remove();

      var curlCommand;
      var audioPathForCurl = audioFile.fsName.replace(/\\/g, "/");
      var responsePathForCurl = responseFile.fsName.replace(/\\/g, "/");
      curlCommand =
        'curl -s -S -X POST -F "audio=@\\"' +
        audioPathForCurl +
        '\\"" "' +
        WHISPER_API_URL +
        '" -o "' +
        responsePathForCurl +
        '"';

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
        alert(
          "Error calling system command (curl): " +
            e_curl_exec.toString() +
            "\nEnsure curl is installed and in your system PATH.\nCommand: " +
            curlCommand
        );
        app.endUndoGroup();
        return;
      }

      if (!responseFile.exists || responseFile.length === 0) {
        var errorMsg =
          "API call failed or produced no response file (or empty file). \n";
        errorMsg += "Curl command was: " + curlCommand + "\n";
        errorMsg +=
          "System call result string (if any): '" + systemCallResult + "'\n";
        errorMsg +=
          "Check if your Python Whisper API server is running at " +
          WHISPER_API_URL +
          ".\n";
        errorMsg +=
          "Also, check the Python server console for errors regarding this request.\n";
        errorMsg += "Expected response file at: " + responseFilePath;
        alert(errorMsg);
        app.endUndoGroup();
        return;
      }

      // --- JSON Parsing and Layer Creation ---
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
        alert(
          "Error parsing API response: " +
            e_json.toString() +
            "\nResponse content was:\n" +
            (responseContent.substring(0, 500) || "empty") +
            (responseContent.length > 500 ? "..." : "")
        );
        if (responseFile.exists) responseFile.remove();
        app.endUndoGroup();
        return;
      }

      var createdTextLayers = [];
      if (
        transcriptionData &&
        transcriptionData.segments &&
        transcriptionData.segments.length > 0
      ) {
        var totalWordsCreated = 0;
        var segmentsWithIssues = 0;
        var frameDuration = comp.frameDuration;
        var timeOffset = 0; // --- MODIFICATION START --- Initialize time offset

        if (frameDuration <= 0) {
          alert(
            "Error: Composition frame duration is invalid. Cannot set keyframes or ensure layer visibility accurately. Time offset cannot be applied."
          );
          // frameDuration remains invalid, timeOffset remains 0
        } else {
          timeOffset = 3 * frameDuration; // Calculate 3 frames in seconds
        }
        // --- MODIFICATION END ---

        for (var i = 0; i < transcriptionData.segments.length; i++) {
          var segment = transcriptionData.segments[i];
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
            var wordText = wordData.word ? wordData.word.trim() : "";
            var originalApiStartTime = parseFloat(wordData.start); // Original time from API
            var originalApiEndTime = parseFloat(wordData.end); // Original time from API

            if (
              wordText &&
              !isNaN(originalApiStartTime) &&
              !isNaN(originalApiEndTime) &&
              originalApiEndTime > originalApiStartTime
            ) {
              // --- MODIFICATION START --- Apply time offset
              var adjustedStartTime = originalApiStartTime - timeOffset;
              if (adjustedStartTime < 0) {
                adjustedStartTime = 0; // Clamp to composition start if offset makes it negative
              }
              var adjustedOriginalEndTime = originalApiEndTime - timeOffset;
              // --- MODIFICATION END ---

              var textLayer = comp.layers.addText(wordText);
              var safeWordText = wordText
                .replace(/[^a-zA-Z0-9_]/g, "")
                .substring(0, MAX_LAYER_NAME_WORD_LENGTH);
              textLayer.name = "W_" + i + "" + j + "" + safeWordText;
              textLayer.inPoint = adjustedStartTime; // Use adjusted start time

              var determinedOutPoint = adjustedOriginalEndTime; // Default to word's own (adjusted) end time

              // Determine outPoint based on the next word's (adjusted) start time
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
                    // --- MODIFICATION START --- Adjust next word's start time as well for outPoint calculation
                    var nextWordAdjustedStartTime =
                      nextWordOriginalApiStartTime - timeOffset;
                    if (nextWordAdjustedStartTime > adjustedStartTime) {
                      // Ensure positive duration and logical order
                      determinedOutPoint = nextWordAdjustedStartTime;
                    }
                    // --- MODIFICATION END ---
                  }
                }
              } else if (i < transcriptionData.segments.length - 1) {
                var nextSegmentData = transcriptionData.segments[i + 1];
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
                      // --- MODIFICATION START --- Adjust next segment's first word's start time
                      var nextSegmentFirstWordAdjustedStartTime =
                        nextSegmentFirstWordOriginalApiStartTime - timeOffset;
                      if (
                        nextSegmentFirstWordAdjustedStartTime >
                        adjustedStartTime
                      ) {
                        // Ensure positive duration
                        determinedOutPoint =
                          nextSegmentFirstWordAdjustedStartTime;
                      }
                      // --- MODIFICATION END ---
                    }
                  }
                }
              }
              textLayer.outPoint = determinedOutPoint;

              // Ensure layer has a minimum duration if outPoint is too early or invalid after adjustment
              if (textLayer.outPoint <= textLayer.inPoint) {
                if (frameDuration > 0) {
                  textLayer.outPoint = textLayer.inPoint + frameDuration; // Min 1 frame
                } else {
                  // Fallback if frameDuration is invalid (though timeOffset would be 0 in this case)
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
                  ParagraphJustification.CENTER_JUSTIFY; // Important for text alignment
                textDocument.fontCapsOption = FontCapsOption.FONT_NORMAL_CAPS;
                if (currentStrokeWidth > 0) {
                  textDocument.applyStroke = true;
                  textDocument.strokeColor = currentStrokeColor;
                  textDocument.strokeWidth = currentStrokeWidth;
                  textDocument.strokeOverFill = true;
                } else {
                  textDocument.applyStroke = false;
                }
                textProp.setValue(textDocument); // Apply all text properties
              }

              // --- MODIFICATION START: Center Anchor Point ---
              try {
                // Ensure text properties are fully applied and layer has dimensions.
                // Use a time when the text is visible; adjustedStartTime (layer's inPoint) is suitable.
                var rect = textLayer.sourceRectAtTime(adjustedStartTime, false);

                // Check if a valid rectangle was returned
                if (rect && rect.width > 0 && rect.height > 0) {
                  var newAnchorX = rect.left + rect.width / 2;
                  var newAnchorY = rect.top + rect.height / 2;
                  textLayer
                    .property("Transform")
                    .property("Anchor Point")
                    .setValue([newAnchorX, newAnchorY]);
                } else {
                  // Optional: Log a warning if sourceRect is not valid, anchor point will use default.
                  // $.writeln("Warning: sourceRectAtTime was not valid for layer " + textLayer.name + ". Anchor point not centered geometrically.");
                }
              } catch (e_anchor) {
                // Optional: Log any error during anchor point adjustment.
                // $.writeln("Error setting anchor point for " + textLayer.name + ": " + e_anchor.toString());
              }
              // --- MODIFICATION END: Center Anchor Point ---
              var positionProp = textLayer
                .property("Transform")
                .property("Position");
              // Now that the anchor point is at the geometric center of the text,
              // setting the position to comp center will align the text's center there.
              positionProp.setValue([comp.width / 2, comp.height / 2]);

              // Adjust scale animation keyframes (will now scale around the new centered anchor point)
              if (frameDuration > 0) {
                var scaleProp = textLayer
                  .property("Transform")
                  .property("Scale");
                var keyTime1 = adjustedStartTime;
                var keyTime2 = adjustedStartTime + 3 * frameDuration;
                var keyTime3 = adjustedStartTime + 5 * frameDuration;

                scaleProp.setValueAtTime(keyTime1, [90, 90]);
                if (keyTime2 < textLayer.outPoint) {
                  scaleProp.setValueAtTime(keyTime2, [110, 110]);
                  if (keyTime3 < textLayer.outPoint) {
                    scaleProp.setValueAtTime(keyTime3, [100, 100]);
                  } else {
                    scaleProp.setValueAtTime(textLayer.outPoint, [100, 100]);
                  }
                } else {
                  scaleProp.setValueAtTime(textLayer.outPoint, [100, 100]);
                }
              }
              totalWordsCreated++;
              createdTextLayers.push(textLayer);
            }
          }
        }

        var finalMessage =
          "Transcription complete! " +
          totalWordsCreated +
          " styled word layers created.";
        if (segmentsWithIssues > 0) {
          finalMessage +=
            "\n(" +
            segmentsWithIssues +
            " segments had issues with word alignment and were skipped.)";
        }
        if (
          totalWordsCreated === 0 &&
          transcriptionData.segments.length > 0 &&
          segmentsWithIssues === transcriptionData.segments.length
        ) {
          finalMessage =
            "Transcription processed, but no word-level data could be used. Check API alignment models.";
        } else if (
          totalWordsCreated === 0 &&
          (!transcriptionData.segments ||
            transcriptionData.segments.length === 0)
        ) {
          finalMessage = "API returned no segments or words.";
        }
        alert(finalMessage);

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
              if (subtitlePrecompLayer) {
                alert(
                  "Created word layers have been pre-composed into '" +
                    PRECOMP_NAME +
                    "'."
                );
              } else {
                alert("Failed to pre-compose the subtitle layers.");
              }
            } catch (e_precomp) {
              alert("Error during pre-composition: " + e_precomp.toString());
            }
          }
        }
      } else if (transcriptionData && transcriptionData.full_text) {
        var fullTextLayer = comp.layers.addText(transcriptionData.full_text);
        fullTextLayer.name = "Full Transcription (No Segments)";
        fullTextLayer.inPoint = 0;
        fullTextLayer.outPoint = comp.duration > 0 ? comp.duration : 10;
        alert(
          "Transcription complete! Full text layer created (no segment/word data found)."
        );
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

      try {
        if (responseFile.exists) responseFile.remove();
      } catch (e_cleanup) {
        // Error during cleanup
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
  }

  // --- Function to Render Active Comp Audio ---
  function renderActiveCompAudio() {
    app.beginUndoGroup("Render Comp Audio");

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
        om.applyTemplate("WAV Audio Only");
        om.file = outputFile;
      } catch (e_wav_template) {
        om.file = outputFile;
      }
    }

    try {
      proj.renderQueue.render();
      if (rqItem.status === RQItemStatus.DONE) {
        alert("Audio render complete!\nFile saved at: " + outputFilePath);
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
      app.endUndoGroup();
    }
  }

  function indexOfArray(arr, item) {
    for (var i = 0; i < arr.length; i++) {
      if (arr[i] === item) return i;
    }
    return -1;
  }

  var win;
  function buildUI(uiTargetObj) {
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
    win.spacing = 10;
    win.margins = 15;

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
      "2. Transcribe Audio to Word Layers:"
    ).alignment = "left";

    // --- NEW UI INPUTS FOR STYLING ---
    var stylePanel = win.add("panel", undefined, "Text Styling Options");
    stylePanel.orientation = "column";
    stylePanel.alignChildren = "left";
    stylePanel.spacing = 8;
    stylePanel.margins = 10;

    // Font Name
    var fontNameGroup = stylePanel.add("group");
    fontNameGroup.orientation = "row";
    fontNameGroup.add("statictext", undefined, "Font Name:");
    fontNameInput = fontNameGroup.add(
      "edittext",
      undefined,
      DEFAULT_TEXT_FONT_POSTSCRIPT_NAME
    );
    fontNameInput.characters = 25;
    fontNameInput.helpTip =
      "Enter the PostScript name of the font (e.g., ArialMT, TimesNewRomanPSMT, Poppins-SemiBold).";

    // Font Size
    var fontSizeGroup = stylePanel.add("group");
    fontSizeGroup.orientation = "row";
    fontSizeGroup.add("statictext", undefined, "Font Size (pt):");
    fontSizeInput = fontSizeGroup.add(
      "edittext",
      undefined,
      DEFAULT_TEXT_FONT_SIZE.toString()
    );
    fontSizeInput.characters = 5;

    // Fill Color (RGB)
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

    // Stroke Width
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

    // Stroke Color (RGB)
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

    // Remove old static text display of font info
    // win.add(
    //   "statictext",
    //   undefined,
    //   "Font: '" +
    //     TEXT_FONT_POSTSCRIPT_NAME + // This would now be an error as it's DEFAULT_...
    //     "' Size: " +
    //     TEXT_FONT_SIZE +
    //     "pt Color: White"
    // ).alignment = "left";
    // --- END NEW UI INPUTS ---

    var transcribeBtn = win.add(
      "button",
      undefined,
      "Select Audio File & Start Transcription"
    );
    transcribeBtn.helpTip =
      "Prompts to select an audio file, calls WhisperX API, creates styled text layer per WORD (using settings above), then pre-comps them.";

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

    win.layout.layout(true);
    win.layout.resize();
    win.onResizing = win.onResize = function () {
      this.layout.resize();
    };
    return win;
  }

  var uiObject = buildUI(thisObj);

  if (uiObject !== null) {
    if (uiObject instanceof Window) {
      uiObject.center();
      uiObject.show();
    } else {
      if (win && typeof win.layout !== "undefined") {
        win.layout.layout(true);
      }
    }
  }
})(this);
