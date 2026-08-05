import { useState, useEffect, useCallback } from "react";
import {
  processImageFile,
  textToBase64Image,
  captureVideoFrame,
} from "../utils/imagePreprocessor";

const API_GRADE_DUAL = "/api/ocr/grade-dual";
const DIRECT_GRADE_DUAL = "http://localhost:8080/api/ocr/grade-dual";
const DIRECT_HEALTH = "http://localhost:8080/health";
const PROXY_HEALTH = "/health";

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

const STOPWORDS = new Set([
  "a", "an", "the", "is", "are", "was", "were", "be", "been", "in", "on", "at", 
  "to", "for", "from", "by", "with", "and", "or", "what", "how", "define", 
  "explain", "describe", "write", "its", "of", "this", "that", "which"
]);

function sigmoid(x) {
  return 1 / (1 + Math.exp(-x));
}

export function useTargetEngine() {
  const [isBackendOnline, setIsBackendOnline] = useState(false);
  const [isHealthChecking, setIsHealthChecking] = useState(true);

  const [activeSubjectKey, setActiveSubjectKey] = useState("physics");
  const activePreset =
    DEFAULT_SUBJECT_PRESETS[activeSubjectKey] ||
    DEFAULT_SUBJECT_PRESETS.physics;

  const [questionText, setQuestionText] = useState(activePreset.questionText);
  const [questionBase64, setQuestionBase64] = useState(null);
  const [questionPreviewUrl, setQuestionPreviewUrl] = useState(null);

  const [answerText, setAnswerText] = useState(activePreset.answerText);
  const [answerBase64, setAnswerBase64] = useState(null);
  const [answerPreviewUrl, setAnswerPreviewUrl] = useState(null);

  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evaluationError, setEvaluationError] = useState(null);
  const [evaluationResult, setEvaluationResult] = useState(null);

  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [cameraTarget, setCameraTarget] = useState("answer");
  const [cameraStream, setCameraStream] = useState(null);
  const [cameraError, setCameraError] = useState(null);

  const checkHealth = useCallback(async () => {
    try {
      setIsHealthChecking(true);
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 2000);

      let online = false;

      try {
        const res = await fetch(DIRECT_HEALTH, {
          method: "GET",
          signal: controller.signal,
        });
        if (res.ok) online = true;
      } catch {
        try {
          const proxyRes = await fetch(PROXY_HEALTH, {
            method: "GET",
            signal: controller.signal,
          });
          if (proxyRes.ok) online = true;
        } catch {
          // Engine offline
        }
      }

      clearTimeout(timer);
      setIsBackendOnline(online);
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

  const evaluateDualScripts = useCallback(
    async (qOverride, aOverride) => {
      const finalQText = qOverride !== undefined ? qOverride : questionText;
      const finalAText = aOverride !== undefined ? aOverride : answerText;

      setIsEvaluating(true);
      setEvaluationError(null);

      let qBase64 = questionBase64;
      if (!qBase64 && finalQText) {
        qBase64 = textToBase64Image(finalQText).base64;
      }

      let aBase64 = answerBase64;
      if (!aBase64 && finalAText) {
        aBase64 = textToBase64Image(finalAText).base64;
      }

      if (!qBase64 || !aBase64) {
        setEvaluationError(
          "Please provide both Question and Answer text or image scripts.",
        );
        setIsEvaluating(false);
        return;
      }

      const payload = {
        question_img_base64: qBase64,
        answer_img_base64: aBase64,
      };

      let resData = null;

      try {
        const res = await fetch(API_GRADE_DUAL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (res.ok) resData = await res.json();
      } catch {
        try {
          const directRes = await fetch(DIRECT_GRADE_DUAL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });

          if (directRes.ok) resData = await directRes.json();
        } catch {
          // Local fallback
        }
      }

      if (resData) {
        const rawLogit =
          typeof resData.raw_logit_score === "number"
            ? resData.raw_logit_score
            : -4.5;
        const relScore =
          typeof resData.relevance_score === "number"
            ? resData.relevance_score
            : sigmoid(rawLogit);
        const gradePct =
          typeof resData.grade_percentage === "number"
            ? resData.grade_percentage
            : Math.round(relScore * 100);

        setEvaluationResult({
          question_text: resData.question_text || finalQText,
          answer_text: resData.answer_text || finalAText,
          raw_logit_score: Math.round(rawLogit * 1000) / 1000,
          relevance_score: Math.round(relScore * 10000) / 10000,
          grade_percentage: gradePct,
          passed:
            typeof resData.passed === "boolean"
              ? resData.passed
              : gradePct >= 75,
          isSimulated: false,
        });
        if (resData.question_text) setQuestionText(resData.question_text);
        if (resData.answer_text) setAnswerText(resData.answer_text);
      } else {
        const qWords = (finalQText || "")
          .toLowerCase()
          .replace(/[^\w\s]/g, "")
          .split(/\s+/)
          .filter((w) => w.length > 2 && !STOPWORDS.has(w));

        const aWords = (finalAText || "")
          .toLowerCase()
          .replace(/[^\w\s]/g, "")
          .split(/\s+/)
          .filter((w) => w.length > 2 && !STOPWORDS.has(w));

        let count = 0;
        qWords.forEach((w) => {
          if (aWords.some((aw) => aw === w || aw.includes(w) || w.includes(aw))) count++;
        });

        const ratio = qWords.length > 0 ? count / qWords.length : 0.0;
        let rawLogit, relScore, gradePct;

        if (count === 0) {
          rawLogit = -4.5;
          relScore = sigmoid(rawLogit);
          gradePct = 1;
        } else {
          rawLogit = (ratio - 0.5) * 6.0;
          relScore = sigmoid(rawLogit);
          gradePct = Math.round(relScore * 100);
        }

        setEvaluationResult({
          question_text: finalQText,
          answer_text: finalAText,
          raw_logit_score: Math.round(rawLogit * 1000) / 1000,
          relevance_score: Math.round(relScore * 10000) / 10000,
          grade_percentage: gradePct,
          passed: gradePct >= 75,
          isSimulated: true,
        });
      }

      setIsEvaluating(false);
    },
    [questionText, answerText, questionBase64, answerBase64],
  );

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
      setEvaluationError(`Failed to process image: ${err.message}`);
    }
  }, []);

  const openCamera = useCallback(async (target = "answer") => {
    setCameraError(null);
    setCameraTarget(target);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      setCameraStream(stream);
      setIsCameraOpen(true);
    } catch (err) {
      setCameraError(`Camera unavailable: ${err.message}`);
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
        setCameraError(`Failed to capture snapshot: ${err.message}`);
      }
    },
    [cameraTarget, closeCamera],
  );

  return {
    isBackendOnline,
    isHealthChecking,
    checkHealth,

    activeSubjectKey,
    setActiveSubjectKey,
    handleLoadPreset,

    questionText,
    setQuestionText,
    questionBase64,
    questionPreviewUrl,

    answerText,
    setAnswerText,
    answerBase64,
    answerPreviewUrl,

    isEvaluating,
    evaluationError,
    evaluationResult,
    evaluateDualScripts,

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
