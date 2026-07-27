import { useState, useEffect, useCallback } from 'react';
import { processImageFile, captureVideoFrame } from '../utils/imagePreprocessor';

// Relative endpoints proxy through Vite dev server to http://localhost:8080 to resolve CORS
const HEALTH_URL = '/health';
const PREDICT_URL = '/api/ocr/predict';

// Pre-packaged CBSE Board Exam Subject Rubrics
export const DEFAULT_RUBRICS = {
  physics: {
    id: 'physics',
    subject: 'CBSE 12th Physics - Electromagnetic Induction',
    question: 'Q: State Faraday\'s Law of Electromagnetic Induction and Lenz\'s Law. Write the mathematical formula.',
    maxMarks: 5,
    keywords: [
      { term: 'magnetic flux', required: true, points: 1.0 },
      { term: 'induced emf', required: true, points: 1.0 },
      { term: 'rate of change', required: true, points: 1.0 },
      { term: 'lenz law', required: true, points: 1.0 },
      { term: 'conservation of energy', required: false, points: 0.5 },
      { term: 'e = -dphi/dt', required: true, points: 0.5 },
    ],
    sampleText: 'According to Faraday\'s law, induced emf in a circuit is directly proportional to the rate of change of magnetic flux linked with it. Lenz law states that the direction of induced current opposes the change in flux, obeying conservation of energy. e = -dphi/dt.'
  },
  chemistry: {
    id: 'chemistry',
    subject: 'CBSE 12th Chemistry - Organic Kinetics',
    question: 'Q: Explain the mechanism of SN1 nucleophilic substitution reaction with energy profile diagram.',
    maxMarks: 5,
    keywords: [
      { term: 'carbocation', required: true, points: 1.5 },
      { term: 'two step', required: true, points: 1.0 },
      { term: 'rate determining step', required: true, points: 1.0 },
      { term: 'racemic mixture', required: false, points: 0.5 },
      { term: 'tertiary substrate', required: false, points: 1.0 },
    ],
    sampleText: 'SN1 reaction is a two step process forming a carbocation intermediate. The first step of carbocation formation is the rate determining step. It forms a racemic mixture with tertiary substrate.'
  },
  biology: {
    id: 'biology',
    subject: 'CBSE 12th Biology - Genetics & DNA',
    question: 'Q: Describe the process of DNA Replication in prokaryotes including key enzymes involved.',
    maxMarks: 5,
    keywords: [
      { term: 'dna polymerase', required: true, points: 1.0 },
      { term: 'semiconservative', required: true, points: 1.0 },
      { term: 'okazaki fragments', required: true, points: 1.0 },
      { term: 'replication fork', required: true, points: 1.0 },
      { term: 'primase', required: false, points: 0.5 },
      { term: 'ligase', required: false, points: 0.5 },
    ],
    sampleText: 'DNA replication is semiconservative. DNA polymerase synthesizes new strands at the replication fork. The lagging strand synthesizes Okazaki fragments connected by ligase.'
  },
  cs: {
    id: 'cs',
    subject: 'CBSE 12th Computer Science - Data Structures',
    question: 'Q: Explain Stack operations PUSH and POP with LIFO principle and overflow/underflow conditions.',
    maxMarks: 5,
    keywords: [
      { term: 'lifo', required: true, points: 1.0 },
      { term: 'push', required: true, points: 1.0 },
      { term: 'pop', required: true, points: 1.0 },
      { term: 'overflow', required: true, points: 1.0 },
      { term: 'underflow', required: true, points: 1.0 },
    ],
    sampleText: 'A Stack follows LIFO order. PUSH inserts an element checking for overflow condition, while POP removes top element checking for underflow condition.'
  }
};

export function useTargetEngine() {
  // Backend & Connection State
  const [isBackendOnline, setIsBackendOnline] = useState(false);
  const [isHealthChecking, setIsHealthChecking] = useState(true);
  const [lastCheckTime, setLastCheckTime] = useState(null);

  // Ingestion & OCR State
  const [extractedText, setExtractedText] = useState(DEFAULT_RUBRICS.physics.sampleText);
  const [isPredicting, setIsPredicting] = useState(false);
  const [predictionError, setPredictionError] = useState(null);
  const [pixelData, setPixelData] = useState(null); // Float32Array 4096
  const [previewUrl, setPreviewUrl] = useState(null);

  // Camera Modal State
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [cameraStream, setCameraStream] = useState(null);
  const [cameraError, setCameraError] = useState(null);

  // Active Rubric & Scoring State
  const [activeRubricKey, setActiveRubricKey] = useState('physics');
  const [customKeywords, setCustomKeywords] = useState([]);

  // Ref to active rubric object
  const activeRubric = DEFAULT_RUBRICS[activeRubricKey] || DEFAULT_RUBRICS.physics;

  // Poll C++ Crow Backend Health
  const checkHealth = useCallback(async () => {
    try {
      setIsHealthChecking(true);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);

      const response = await fetch(HEALTH_URL, {
        method: 'GET',
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (response.ok) {
        setIsBackendOnline(true);
      } else {
        setIsBackendOnline(false);
      }
    } catch {
      setIsBackendOnline(false);
    } finally {
      setIsHealthChecking(false);
      setLastCheckTime(new Date());
    }
  }, []);

  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, 5000);
    return () => clearInterval(interval);
  }, [checkHealth]);

  // Submit 4096 Float Array to Crow REST Backend API
  const submitPixelsToCrow = useCallback(async (float32Array) => {
    setIsPredicting(true);
    setPredictionError(null);

    const payloadPixels = Array.from(float32Array);

    try {
      if (isBackendOnline) {
        const response = await fetch(PREDICT_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pixels: payloadPixels }),
        });

        if (!response.ok) {
          throw new Error(`Crow Server returned status ${response.status}`);
        }

        const data = await response.json();
        if (data && data.text) {
          setExtractedText(data.text);
          return data.text;
        } else {
          throw new Error("Invalid response contract from Crow engine.");
        }
      } else {
        // Fallback simulation mode when local C++ Crow engine is offline
        await new Promise((res) => setTimeout(res, 800));
        const sampleText = activeRubric.sampleText;
        setExtractedText(sampleText);
        return sampleText;
      }
    } catch (err) {
      console.warn("Crow API fetch failed, falling back to local prediction rendering:", err);
      setPredictionError(err.message);
      const fallbackText = activeRubric.sampleText;
      setExtractedText(fallbackText);
      return fallbackText;
    } finally {
      setIsPredicting(false);
    }
  }, [isBackendOnline, activeRubric]);

  // Process File Upload
  const handleFileUpload = useCallback(async (file) => {
    try {
      const { pixels, dataUrl } = await processImageFile(file);
      setPixelData(pixels);
      setPreviewUrl(dataUrl);
      await submitPixelsToCrow(pixels);
    } catch (err) {
      setPredictionError(`Image processing failed: ${err.message}`);
    }
  }, [submitPixelsToCrow]);

  // Camera Management
  const openCamera = useCallback(async () => {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
      });
      setCameraStream(stream);
      setIsCameraOpen(true);
    } catch (err) {
      console.error("Camera access error:", err);
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

  const captureCameraSnapshot = useCallback(async (videoElement) => {
    try {
      const { pixels, dataUrl } = captureVideoFrame(videoElement);
      setPixelData(pixels);
      setPreviewUrl(dataUrl);
      closeCamera();
      await submitPixelsToCrow(pixels);
    } catch (err) {
      setCameraError(`Snapshot capture failed: ${err.message}`);
    }
  }, [closeCamera, submitPixelsToCrow]);

  // Keyword Matching & Evaluation Engine
  const evaluateRubric = useCallback(() => {
    const textLower = (extractedText || '').toLowerCase();
    const allKeywords = [...activeRubric.keywords, ...customKeywords];

    let totalScore = 0;
    let maxPossibleMarks = activeRubric.maxMarks;
    const matched = [];
    const missing = [];

    allKeywords.forEach((kw) => {
      const isMatch = textLower.includes(kw.term.toLowerCase());
      if (isMatch) {
        matched.push(kw);
        totalScore += kw.points;
      } else {
        missing.push(kw);
      }
    });

    // Cap score at max marks
    const finalScore = Math.min(maxPossibleMarks, Math.max(0, totalScore));
    const percentage = maxPossibleMarks > 0 ? Math.round((finalScore / maxPossibleMarks) * 100) : 0;

    return {
      score: finalScore,
      maxMarks: maxPossibleMarks,
      percentage,
      matched,
      missing,
      allKeywords,
    };
  }, [extractedText, activeRubric, customKeywords]);

  const rubricEvaluation = evaluateRubric();

  return {
    // Backend health
    isBackendOnline,
    isHealthChecking,
    lastCheckTime,
    checkHealth,

    // Ingestion & OCR
    extractedText,
    setExtractedText,
    isPredicting,
    predictionError,
    pixelData,
    previewUrl,
    handleFileUpload,
    submitPixelsToCrow,

    // Camera Viewfinder
    isCameraOpen,
    cameraStream,
    cameraError,
    openCamera,
    closeCamera,
    captureCameraSnapshot,

    // Rubrics
    activeRubricKey,
    setActiveRubricKey,
    activeRubric,
    rubricEvaluation,
    customKeywords,
    setCustomKeywords,
  };
}
