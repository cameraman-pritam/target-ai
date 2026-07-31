import { useState, useEffect, useCallback } from "react";
import {
  processImageFile,
  textToBase64Image,
  captureVideoFrame,
} from "../utils/imagePreprocessor";

const PRIMARY_GRADE_DUAL_URL = "/api/ocr/grade-dual";
const DIRECT_GRADE_DUAL_URL = "http://localhost:8080/api/ocr/grade-dual";
const DIRECT_HEALTH_URL = "http://localhost:8080/health";
const PROXY_HEALTH_URL = "/health";

// Pre-packaged CBSE Board Exam Question + Answer Subject Presets
export const DEFAULT_SUBJECT_PRESETS = {
  physics: {
    id: "physics",
    subject: "CBSE 12th Physics - Ohm's Law",
    questionText:
      "Define Ohm's Law and write its mathematical relation between voltage and current.",
    answerText:
      "Voltage across a conductor is directly proportional to current flowing through it at constant temperature, V = I * R.",
  },
  biology: {
    id: "biology",
    subject: "CBSE 12th Biology - Cellular Respiration",
    questionText:
      "Explain the function of mitochondria in cellular energy production.",
    answerText:
      "The mitochondria is the powerhouse of the cell that generates ATP energy through aerobic respiration.",
  },
  chemistry: {
    id: "chemistry",
    subject: "CBSE 12th Chemistry - Organic Reaction Kinetics",
    questionText:
      "Describe the key mechanism and intermediate of SN1 substitution reaction.",
    answerText:
      "SN1 is a two-step nucleophilic substitution forming a carbocation intermediate during the rate determining step.",
  },
  cs: {
    id: "cs",
    subject: "CBSE 12th Computer Science - Data Structures",
    questionText:
      "Explain the operational principle of Stack data structure and its push pop operations.",
    answerText:
      "Stack operates on Last-In-First-Out (LIFO) principle using PUSH to insert elements and POP to remove top elements.",
  },
};

// Sigmoid normalization formula for CBSE-Neural-Evaluator-v2: S(x) = 1 / (1 + e^-x)
function sigmoid(x) {
  return 1 / (1 + Math.exp(-x));
}

export function useTargetEngine() {
  // Backend Connection Health State
  const [isBackendOnline, setIsBackendOnline] = useState(false);
  const [isHealthChecking, setIsHealthChecking] = useState(true);

  // Active Subject Preset
  const [activeSubjectKey, setActiveSubjectKey] = useState("physics");
  const activePreset =
    DEFAULT_SUBJECT_PRESETS[activeSubjectKey] ||
    DEFAULT_SUBJECT_PRESETS.physics;

  // Question Ingestion State
  const [questionText, setQuestionText] = useState(activePreset.questionText);
  const [questionBase64, setQuestionBase64] = useState(null);
  const [questionPreviewUrl, setQuestionPreviewUrl] = useState(null);

  // Student Answer Ingestion State
  const [answerText, setAnswerText] = useState(activePreset.answerText);
  const [answerBase64, setAnswerBase64] = useState(null);
  const [answerPreviewUrl, setAnswerPreviewUrl] = useState(null);

  // Engine Evaluation State
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evaluationError, setEvaluationError] = useState(null);
  const [evaluationResult, setEvaluationResult] = useState(null);

  // Camera Modal Viewfinder State
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [cameraTarget, setCameraTarget] = useState("answer"); // 'question' | 'answer'
  const [cameraStream, setCameraStream] = useState(null);
  const [cameraError, setCameraError] = useState(null);

  // Poll Backend Connection Health (GET http://localhost:8080/health -> {"status": "OK", "message": "Vision Engine Online"})
  const checkHealth = useCallback(async () => {
    try {
      setIsHealthChecking(true);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);

      let isOnline = false;

      // Primary check: direct call to C++ backend on http://localhost:8080/health
      try {
        const response = await fetch(DIRECT_HEALTH_URL, {
          method: "GET",
          signal: controller.signal,
        });
        if (response.ok) isOnline = true;
      } catch {
        // Fallback check: Vite dev server proxy route /health
        try {
          const proxyRes = await fetch(PROXY_HEALTH_URL, {
            method: "GET",
            signal: controller.signal,
          });
          if (proxyRes.ok) isOnline = true;
        } catch {
          // Offline
        }
      }

      clearTimeout(timeoutId);
      setIsBackendOnline(isOnline);
    } catch {
      setIsBackendOnline(false);
    } finally {
      setIsHealthChecking(false);
    }
  }, []);

  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, 5000);
    return () => clearInterval(interval);
  }, [checkHealth]);

  /**
   * Executes CBSE-Neural-Evaluator-v2 Dual Grading Evaluation
   * Endpoint: POST http://localhost:8080/api/ocr/grade-dual
   * Payload: { "question_img_base64": "...", "answer_img_base64": "..." }
   * Response: { "question_text": "...", "answer_text": "...", "raw_logit_score": 3.824, "grade_percentage": 97, "passed": true }
   */
  const evaluateDualScripts = useCallback(
    async (qTextOverride, aTextOverride) => {
      const finalQText =
        qTextOverride !== undefined ? qTextOverride : questionText;
      const finalAText =
        aTextOverride !== undefined ? aTextOverride : answerText;

      setIsEvaluating(true);
      setEvaluationError(null);

      // Prepare Question Base64
      let qBase64 = questionBase64;
      if (!qBase64 && finalQText) {
        qBase64 = textToBase64Image(finalQText).base64;
      }

      // Prepare Answer Base64
      let aBase64 = answerBase64;
      if (!aBase64 && finalAText) {
        aBase64 = textToBase64Image(finalAText).base64;
      }

      if (!qBase64 || !aBase64) {
        setEvaluationError(
          "Please provide both Question and Answer scripts (via Image upload, Camera snapshot, or Text).",
        );
        setIsEvaluating(false);
        return;
      }

      const payload = {
        question_img_base64: qBase64,
        answer_img_base64: aBase64,
      };

      let responseData = null;

      // Primary call through Vite dev server proxy
      try {
        const response = await fetch(PRIMARY_GRADE_DUAL_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (response.ok) {
          responseData = await response.json();
        }
      } catch {
        // Fallback direct call to C++ Crow server
        try {
          const directResponse = await fetch(DIRECT_GRADE_DUAL_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });

          if (directResponse.ok) {
            responseData = await directResponse.json();
          }
        } catch {
          // Handled below with simulation fallback
        }
      }

      if (responseData) {
        const rawLogit =
          typeof responseData.raw_logit_score === "number"
            ? responseData.raw_logit_score
            : 3.824;
        const relScore =
          typeof responseData.relevance_score === "number"
            ? responseData.relevance_score
            : sigmoid(rawLogit);
        const gradePct =
          typeof responseData.grade_percentage === "number"
            ? responseData.grade_percentage
            : Math.round(relScore * 100);

        setEvaluationResult({
          question_text: responseData.question_text || finalQText,
          answer_text: responseData.answer_text || finalAText,
          raw_logit_score: Math.round(rawLogit * 1000) / 1000,
          relevance_score: Math.round(relScore * 10000) / 10000,
          grade_percentage: gradePct,
          passed:
            typeof responseData.passed === "boolean"
              ? responseData.passed
              : gradePct >= 75,
          isSimulated: false,
        });
        if (responseData.question_text)
          setQuestionText(responseData.question_text);
        if (responseData.answer_text) setAnswerText(responseData.answer_text);
      } else {
        // Offline fallback simulation for CBSE-Neural-Evaluator-v2 using Sigmoid S(x) = 1/(1+e^-x)
        const qWords = (finalQText || "")
          .toLowerCase()
          .split(/\s+/)
          .filter(Boolean);
        const aWords = (finalAText || "")
          .toLowerCase()
          .split(/\s+/)
          .filter(Boolean);

        let matchedCount = 0;
        qWords.forEach((w) => {
          if (aWords.some((aw) => aw.includes(w) || w.includes(aw)))
            matchedCount++;
        });

        const wordMatchRatio =
          qWords.length > 0 ? matchedCount / qWords.length : 0.85;
        const rawLogit = (wordMatchRatio - 0.5) * 8.0 + 1.2; // e.g. 3.824 logit
        const relScore = sigmoid(rawLogit);
        const gradePct = Math.round(relScore * 100);

        setEvaluationResult({
          question_text: finalQText,
          answer_text: finalAText,
          raw_logit_score: Math.round(rawLogit * 1000) / 1000,
          relevance_score: Math.round(relScore * 10000) / 10000,
          grade_percentage: gradePct,
          passed: gradePct >= 75,
          isSimulated: true,
        });
        setEvaluationError(
          "Vision Engine offline. Active results running in local simulated mode.",
        );
      }

      setIsEvaluating(false);
    },
    [questionText, answerText, questionBase64, answerBase64],
  );

  // Load Preset Subject Scenario
  const handleLoadPreset = useCallback(
    (presetKey) => {
      setActiveSubjectKey(presetKey);
      const preset = DEFAULT_SUBJECT_PRESETS[presetKey];
      if (preset) {
        setQuestionText(preset.questionText);
        setQuestionBase64(null);
        setQuestionPreviewUrl(null);

        setAnswerText(preset.answerText);
        setAnswerBase64(null);
        setAnswerPreviewUrl(null);

        evaluateDualScripts(preset.questionText, preset.answerText);
      }
    },
    [evaluateDualScripts],
  );

  // File Upload Ingestion Handler for Question / Answer
  const handleFileUpload = useCallback(async (file, target = "answer") => {
    try {
      const { base64, dataUrl } = await processImageFile(file);
      if (target === "question") {
        setQuestionBase64(base64);
        setQuestionPreviewUrl(dataUrl);
      } else {
        setAnswerBase64(base64);
        setAnswerPreviewUrl(dataUrl);
      }
    } catch (err) {
      setEvaluationError(`Image processing failed: ${err.message}`);
    }
  }, []);

  // Camera Management
  const openCamera = useCallback(async (target = "answer") => {
    setCameraError(null);
    setCameraTarget(target);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment",
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });
      setCameraStream(stream);
      setIsCameraOpen(true);
    } catch (err) {
      setCameraError(`Camera permission denied or unavailable: ${err.message}`);
    }
  }, []);

  const closeCamera = useCallback(() => {
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop());
    }
    setCameraStream(null);
    setIsCameraOpen(false);
  }, [cameraStream]);

  const captureCameraSnapshot = useCallback(
    async (videoElement) => {
      try {
        const { base64, dataUrl } = await captureVideoFrame(videoElement);
        if (cameraTarget === "question") {
          setQuestionBase64(base64);
          setQuestionPreviewUrl(dataUrl);
        } else {
          setAnswerBase64(base64);
          setAnswerPreviewUrl(dataUrl);
        }
        closeCamera();
      } catch (err) {
        setCameraError(`Snapshot capture failed: ${err.message}`);
      }
    },
    [cameraTarget, closeCamera],
  );

  return {
    // Backend health
    isBackendOnline,
    isHealthChecking,
    checkHealth,

    // Active preset
    activeSubjectKey,
    setActiveSubjectKey,
    handleLoadPreset,

    // Question Ingestion
    questionText,
    setQuestionText,
    questionBase64,
    questionPreviewUrl,

    // Answer Ingestion
    answerText,
    setAnswerText,
    answerBase64,
    answerPreviewUrl,

    // Evaluation Execution & Results
    isEvaluating,
    evaluationError,
    evaluationResult,
    evaluateDualScripts,

    // Camera Viewfinder
    isCameraOpen,
    cameraTarget,
    cameraStream,
    cameraError,
    openCamera,
    closeCamera,
    captureCameraSnapshot,
    handleFileUpload,
  };
}
