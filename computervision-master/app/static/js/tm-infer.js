(() => {
  const configEl = document.getElementById("tm-config");
  const modelUrl = configEl?.dataset?.modelUrl;
  const metadataUrl = configEl?.dataset?.metadataUrl;
  const storePredictions = configEl?.dataset?.storePredictions === "true";
  const topPredictions = Number(configEl?.dataset?.topPredictions || 5);

  const form = document.querySelector(".upload-form");
  const runButton = document.getElementById("run-analysis");
  const fileInput = document.getElementById("image");
  const errorEl = document.getElementById("client-error");
  const statusEl = document.getElementById("model-status");
  const resultsEl = document.getElementById("results");
  const predictionsList = document.getElementById("predictions-list");
  const predictionsNote = document.getElementById("predictions-note");
  const previewImg = document.getElementById("image-preview");
  const filenameEl = document.getElementById("image-filename");
  const chipSample = document.getElementById("chip-sample-type");
  const chipLocation = document.getElementById("chip-location");
  const notesEl = document.getElementById("notes-text");
  const diagType = document.getElementById("diagnosis-type");
  const diagConfidence = document.getElementById("diagnosis-confidence");
  const diagPlaceholder = document.getElementById("diagnosis-placeholder");
  const contactNotice = document.getElementById("diagnosis-contact");
  const recTitle = document.getElementById("recommendations-title");
  const recList = document.getElementById("recommendations-list");
  const imageDetails = document.getElementById("image-details");
  const imageRecognition = document.getElementById("image-recognition");
  const contactEmail = "ajunaamos90@gmail.com";
  const DISEASE_CONFIDENCE_THRESHOLD = 0.6;
  const openCameraButton = document.getElementById("open-camera");
  const captureButton = document.getElementById("capture-camera");
  const stopCameraButton = document.getElementById("stop-camera");
  const cameraSection = document.getElementById("camera-section");
  const cameraStreamEl = document.getElementById("camera-stream");
  const cameraStatus = document.getElementById("camera-status");

  let modelPromise = null;
  let previewUrl = null;
  let capturedImageFile = null;
  let cameraStream = null;

  if (!form || !runButton || !fileInput) {
    return;
  }

  const setStatus = (message) => {
    if (statusEl) {
      statusEl.textContent = message || "";
    }
  };

  const showError = (message) => {
    if (!errorEl) {
      return;
    }
    errorEl.textContent = message;
    errorEl.classList.remove("hidden");
  };

  const clearError = () => {
    if (!errorEl) {
      return;
    }
    errorEl.textContent = "";
    errorEl.classList.add("hidden");
  };

  const resetDiagnosis = () => {
    if (diagPlaceholder) {
      diagPlaceholder.classList.remove("hidden");
    }
    if (diagType) {
      diagType.textContent = "";
      diagType.classList.add("hidden");
    }
    if (diagConfidence) {
      diagConfidence.textContent = "";
      diagConfidence.classList.add("hidden");
    }
    if (contactNotice) {
      contactNotice.textContent = "";
      contactNotice.classList.add("hidden");
    }
    if (imageRecognition) {
      imageRecognition.textContent = "";
      imageRecognition.classList.add("hidden");
    }
    if (imageDetails) {
      imageDetails.classList.add("hidden");
    }
    if (recTitle) {
      recTitle.classList.add("hidden");
    }
    if (recList) {
      recList.innerHTML = "";
      recList.classList.add("hidden");
    }
  };

  const loadModel = async () => {
    if (!modelUrl || !metadataUrl) {
      throw new Error("Model URLs are not configured.");
    }
    if (!window.tmImage || !window.tmImage.load) {
      throw new Error("Teachable Machine library failed to load.");
    }
    if (!modelPromise) {
      setStatus("Loading model...");
      modelPromise = window.tmImage.load(modelUrl, metadataUrl);
    }
    const model = await modelPromise;
    setStatus("Model ready.");
    return model;
  };

  const updatePreview = (file) => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    previewUrl = URL.createObjectURL(file);
    previewImg.src = previewUrl;
    filenameEl.textContent = file.name || "upload";

    const sampleType = document.getElementById("sample_type")?.value || "leaf";
    chipSample.textContent = sampleType.charAt(0).toUpperCase() + sampleType.slice(1);

    const locationValue = document.getElementById("location")?.value?.trim();
    if (locationValue) {
      chipLocation.textContent = locationValue;
      chipLocation.classList.remove("hidden");
    } else {
      chipLocation.textContent = "";
      chipLocation.classList.add("hidden");
    }

    const notesValue = document.getElementById("notes")?.value?.trim();
    if (notesValue) {
      notesEl.textContent = notesValue;
      notesEl.classList.remove("hidden");
    } else {
      notesEl.textContent = "";
      notesEl.classList.add("hidden");
    }

    resultsEl.classList.remove("hidden");
  };

  const waitForImage = () =>
    new Promise((resolve, reject) => {
      if (previewImg.complete && previewImg.naturalWidth > 0) {
        resolve();
        return;
      }
      const onLoad = () => {
        cleanup();
        resolve();
      };
      const onError = () => {
        cleanup();
        reject(new Error("Unable to read the uploaded image."));
      };
      const cleanup = () => {
        previewImg.removeEventListener("load", onLoad);
        previewImg.removeEventListener("error", onError);
      };
      previewImg.addEventListener("load", onLoad);
      previewImg.addEventListener("error", onError);
    });

  const showCameraSection = (show) => {
    if (!cameraSection) return;
    cameraSection.classList.toggle("hidden", !show);
    if (cameraStatus) {
      cameraStatus.textContent = show ? "Live camera ready. Tap capture when your plant is framed." : "";
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop());
      cameraStream = null;
    }
    if (cameraStreamEl) {
      cameraStreamEl.srcObject = null;
    }
    showCameraSection(false);
  };

  const openCamera = async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      showError("Camera access is not supported in this browser.");
      return;
    }
    stopCamera();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false,
      });
      cameraStream = stream;
      if (cameraStreamEl) {
        cameraStreamEl.srcObject = stream;
      }
      showCameraSection(true);
    } catch (error) {
      showError("Unable to access the camera. Check permissions and try again.");
    }
  };

  const captureCamera = async () => {
    if (!cameraStreamEl || !cameraStream) {
      showError("Start the camera before capturing an image.");
      return;
    }
    const width = cameraStreamEl.videoWidth;
    const height = cameraStreamEl.videoHeight;
    if (!width || !height) {
      showError("Camera image is not ready yet.");
      return;
    }
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      showError("Unable to capture camera image.");
      return;
    }
    ctx.drawImage(cameraStreamEl, 0, 0, width, height);
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.92));
    if (!blob) {
      showError("Unable to capture camera image.");
      return;
    }
    const file = new File([blob], "camera.jpg", { type: "image/jpeg" });
    capturedImageFile = file;
    updatePreview(file);
    stopCamera();
  };

  const renderPredictions = (predictions) => {
    predictionsList.innerHTML = "";
    const limited = predictions.slice(0, topPredictions);
    limited.forEach((prediction) => {
      const li = document.createElement("li");
      const line = document.createElement("div");
      line.className = "prediction-line";

      const label = document.createElement("strong");
      label.textContent = prediction.label;

      const confidence = document.createElement("span");
      confidence.textContent = `${(prediction.confidence * 100).toFixed(2)}%`;

      line.appendChild(label);
      line.appendChild(confidence);

      const progress = document.createElement("div");
      progress.className = "progress";
      const bar = document.createElement("div");
      bar.className = "progress-bar";
      bar.style.width = `${(prediction.confidence * 100).toFixed(2)}%`;
      progress.appendChild(bar);

      li.appendChild(line);
      li.appendChild(progress);
      predictionsList.appendChild(li);
    });

    if (predictionsNote) {
      if (storePredictions) {
        predictionsNote.classList.remove("hidden");
      } else {
        predictionsNote.classList.add("hidden");
      }
    }
  };

  const renderDiagnosis = (diagnosis) => {
    if (!diagnosis) {
      resetDiagnosis();
      return;
    }
    if (diagPlaceholder) {
      diagPlaceholder.classList.add("hidden");
    }
    if (diagType) {
      const labelText = diagnosis.label?.toLowerCase() === "healthy"
        ? "Healthy — no disease detected"
        : `Disease type: ${diagnosis.label}`;
      diagType.textContent = labelText;
      diagType.classList.remove("hidden");
    }
    if (diagConfidence) {
      diagConfidence.textContent = `Confidence ${(diagnosis.confidence * 100).toFixed(1)}%`;
      diagConfidence.classList.remove("hidden");
    }
    if (imageDetails && imageRecognition) {
      const labelValue = diagnosis.label || "Unknown";
      const statusText = diagnosis.label?.toLowerCase() === "healthy"
        ? "Healthy"
        : "Possible disease detected";
      imageRecognition.textContent = `${labelValue} · ${statusText} · Confidence ${(diagnosis.confidence * 100).toFixed(1)}%`;
      imageRecognition.classList.remove("hidden");
      imageDetails.classList.remove("hidden");
    }
    if (contactNotice) {
      const confidence = Number(diagnosis.confidence || 0);
      if (confidence < DISEASE_CONFIDENCE_THRESHOLD) {
        contactNotice.textContent = `Recognition confidence is low. Contact ${contactEmail} for research information.`;
        contactNotice.classList.remove("hidden");
      } else {
        contactNotice.textContent = "";
        contactNotice.classList.add("hidden");
      }
    }
  };

  const renderRecommendations = (recommendations) => {
    if (!recList || !recTitle) {
      return;
    }
    recList.innerHTML = "";
    if (!recommendations || recommendations.length === 0) {
      recTitle.classList.add("hidden");
      recList.classList.add("hidden");
      return;
    }
    recTitle.classList.remove("hidden");
    recList.classList.remove("hidden");
    recommendations.forEach((item) => {
      const li = document.createElement("li");
      li.textContent = item;
      recList.appendChild(li);
    });
  };

  const sendForRecommendations = async (payload) => {
    const response = await fetch("/api/diagnose", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      throw new Error("Recommendation service unavailable.");
    }
    return response.json();
  };

  const runAnalysis = async () => {
    clearError();
    resetDiagnosis();

    const file = fileInput.files?.[0] || capturedImageFile;
    if (!file) {
      showError("Choose an image or capture a photo before running prediction.");
      return;
    }

    updatePreview(file);

    runButton.disabled = true;
    runButton.textContent = "Running...";

    try {
      const model = await loadModel();
      await waitForImage();
      const rawPredictions = await model.predict(previewImg);
      const predictions = rawPredictions
        .map((item) => ({
          label: item.className,
          confidence: item.probability,
        }))
        .sort((a, b) => b.confidence - a.confidence);

      renderPredictions(predictions);
      renderDiagnosis(predictions[0]);

      const sampleType = document.getElementById("sample_type")?.value || "leaf";
      const locationValue = document.getElementById("location")?.value?.trim();
      const notesValue = document.getElementById("notes")?.value?.trim();

      try {
        const response = await sendForRecommendations({
          predictions,
          sample_type: sampleType,
          filename: file.name || "camera.jpg",
          mime_type: file.type || "image/jpeg",
          location: locationValue,
          notes: notesValue,
        });
        renderDiagnosis(response.diagnosis || predictions[0]);
        renderRecommendations(response.recommendations || []);
      } catch (err) {
        renderRecommendations([]);
      }
    } catch (err) {
      showError(err.message || "Unable to run inference right now.");
    } finally {
      runButton.disabled = false;
      runButton.textContent = "Run Diagnosis";
    }
  };

  form.addEventListener("submit", (event) => {
    event.preventDefault();
  });
  runButton.addEventListener("click", runAnalysis);
  if (openCameraButton) {
    openCameraButton.addEventListener("click", openCamera);
  }
  if (captureButton) {
    captureButton.addEventListener("click", captureCamera);
  }
  if (stopCameraButton) {
    stopCameraButton.addEventListener("click", stopCamera);
  }
  if (fileInput) {
    fileInput.addEventListener("change", () => {
      capturedImageFile = null;
      stopCamera();
    });
  }
})();
