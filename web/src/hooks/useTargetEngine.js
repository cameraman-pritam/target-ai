import { useState, useEffect, useCallback } from 'react';
import { processImageFile, captureVideoFrame } from '../utils/imagePreprocessor';

const DIRECT_OCR_URL = 'http://localhost:8080/api/ocr/extract';
const PROXY_OCR_URL = '/api/ocr/extract';
const DIRECT_ANALYZE_URL = 'http://localhost:8080/api/text/analyze';
const PROXY_ANALYZE_URL = '/api/text/analyze';
const HEALTH_URL = '/health';

// Pre-packaged CBSE Board Exam Subject Rubrics
export const DEFAULT_RUBRICS = {
  physics: {
    id: 'physics',
    subject: 'CBSE 12th Physics - Electromagnetic Induction',
    question: 'Q: State Faraday\'s Law of Electromagnetic Induction and Lenz\'s Law. Write the mathematical formula.',
    maxMarks: 5,
    keywords: ['magnetic flux', 'induced emf', 'rate of change', 'lenz law', 'conservation of energy'],
    sampleText: 'According to Faraday\'s law, induced emf in a circuit is directly proportional to the rate of change of magnetic flux linked with it. Lenz law states that the direction of induced current opposes the change in flux, obeying conservation of energy.'
  },
  chemistry: {
    id: 'chemistry',
    subject: 'CBSE 12th Chemistry - Organic Kinetics',
    question: 'Q: Explain the mechanism of SN1 nucleophilic substitution reaction with energy profile diagram.',
    maxMarks: 5,
    keywords: ['carbocation', 'two step', 'rate determining step', 'racemic mixture', 'tertiary substrate'],
    sampleText: 'SN1 reaction is a two step process forming a carbocation intermediate. The first step of carbocation formation is the rate determining step. It forms a racemic mixture with tertiary substrate.'
  },
  biology: {
    id: 'biology',
    subject: 'CBSE 12th Biology - Genetics & DNA',
    question: 'Q: Describe the process of DNA Replication in prokaryotes including key enzymes involved.',
    maxMarks: 5,
    keywords: ['dna polymerase', 'semiconservative', 'okazaki fragments', 'replication fork', 'primase', 'ligase'],
    sampleText: 'DNA replication is semiconservative. DNA polymerase synthesizes new strands at the replication fork. The lagging strand synthesizes Okazaki fragments connected by ligase.'
  },
  cs: {
    id: 'cs',
    subject: 'CBSE 12th Computer Science - Data Structures',
    question: 'Q: Explain Stack operations PUSH and POP with LIFO principle and overflow/underflow conditions.',
    maxMarks: 5,
    keywords: ['lifo', 'push', 'pop', 'overflow', 'underflow'],
    sampleText: 'A Stack follows LIFO order. PUSH inserts an element checking for overflow condition, while POP removes top element checking for underflow condition.'
  }
};

export function useTargetEngine() {
  // Backend Connection Health State
  const [isBackendOnline, setIsBackendOnline] = useState(false);
  const [isHealthChecking, setIsHealthChecking] = useState(true);

  // Ingestion & OCR State
  const [extractedText, setExtractedText] = useState(DEFAULT_RUBRICS.physics.sampleText);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evaluationError, setEvaluationError] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);

  // Camera Viewfinder Modal State
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [cameraStream, setCameraStream] = useState(null);
  const [cameraError, setCameraError] = useState(null);

  // Active Rubric & NLP Evaluation State
  const [activeRubricKey, setActiveRubricKey] = useState('physics');
  const [customKeywords, setCustomKeywords] = useState([]);
  const [apiResult, setApiResult] = useState(null);

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
    }
  }, []);

  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, 5000);
    return () => clearInterval(interval);
  }, [checkHealth]);

  /**
   * Step 2: Evaluates Student Answer Text against Required Keywords via C++ Crow REST API
   * Endpoint: POST http://localhost:8080/api/text/analyze
   * Payload: { "text": "...", "required_terms": ["..."] }
   * Response: { "found": [...], "missing": [...], "status": "PASSED"|"FAILED", "message": "..." }
   */
  const evaluateAnswer = useCallback(async (textToEvaluate, keywordsList) => {
    const text = textToEvaluate !== undefined ? textToEvaluate : extractedText;
    const keywords = keywordsList !== undefined 
      ? keywordsList 
      : [...activeRubric.keywords, ...customKeywords];

    if (!text || !text.trim()) {
      setEvaluationError('Please provide text to evaluate.');
      return;
    }

    setIsEvaluating(true);
    setEvaluationError(null);

    const payload = {
      text: text.trim(),
      required_terms: keywords,
    };

    let responseData = null;

    // Try direct call to C++ Crow API at http://localhost:8080/api/text/analyze
    try {
      const response = await fetch(DIRECT_ANALYZE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        responseData = await response.json();
      }
    } catch {
      // Fall back to Vite dev server proxy
      try {
        const proxyResponse = await fetch(PROXY_ANALYZE_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (proxyResponse.ok) {
          responseData = await proxyResponse.json();
        }
      } catch {
        // Fallback simulation handled below when server is offline
      }
    }

    if (responseData && (Array.isArray(responseData.found) || Array.isArray(responseData.missing))) {
      const found = responseData.found || [];
      const missing = responseData.missing || [];
      const totalCount = found.length + missing.length;
      const score = totalCount > 0 ? (found.length / totalCount) * 100 : 100;

      setApiResult({
        status: responseData.status || (missing.length === 0 ? 'PASSED' : 'FAILED'),
        message: responseData.message || (missing.length === 0 ? 'All terms matched.' : 'Missing required terms.'),
        score_percentage: Math.round(score * 10) / 10,
        matched_keywords: found,
        missing_keywords: missing,
      });
      setEvaluationError(null);
    } else {
      // Fallback local NLP evaluation matching engine if C++ server is offline or unreachable
      const textLower = text.toLowerCase();
      const matched = keywords.filter((k) => textLower.includes(k.toLowerCase()));
      const missing = keywords.filter((k) => !textLower.includes(k.toLowerCase()));
      const score = keywords.length > 0 ? (matched.length / keywords.length) * 100 : 100;

      setApiResult({
        status: missing.length === 0 ? 'PASSED (SIMULATED)' : 'FAILED (SIMULATED)',
        message: 'C++ Crow REST Server offline. Running in local simulation mode.',
        score_percentage: Math.round(score * 10) / 10,
        matched_keywords: matched,
        missing_keywords: missing,
      });
      setEvaluationError('C++ Crow REST Server at http://localhost:8080 is offline. Results are running in local fallback mode.');
    }

    setIsEvaluating(false);
  }, [extractedText, activeRubric, customKeywords]);

  /**
   * Step 1: Sends raw binary image ArrayBuffer to C++ Crow HTR Vision OCR Server
   * Endpoint: POST http://localhost:8080/api/ocr/extract
   * Content-Type: image/png or image/jpeg
   * Response: { "status": "success", "text": "Extracted text string" }
   */
  const sendImageToCrowOCR = useCallback(async (imageInput) => {
    setIsEvaluating(true);
    setEvaluationError(null);

    let rawBuffer = null;
    let contentType = 'image/png';

    if (imageInput instanceof ArrayBuffer) {
      rawBuffer = imageInput;
    } else if (imageInput && typeof imageInput.arrayBuffer === 'function') {
      contentType = imageInput.type || 'image/png';
      rawBuffer = await imageInput.arrayBuffer();
    } else {
      rawBuffer = imageInput;
    }

    let ocrData = null;

    try {
      // Direct call to C++ Crow Vision server at http://localhost:8080/api/ocr/extract
      const response = await fetch(DIRECT_OCR_URL, {
        method: 'POST',
        headers: {
          'Content-Type': contentType,
        },
        body: rawBuffer,
      });

      if (response.ok) {
        ocrData = await response.json();
      }
    } catch {
      // Fallback to Vite proxy route
      try {
        const proxyResponse = await fetch(PROXY_OCR_URL, {
          method: 'POST',
          headers: {
            'Content-Type': contentType,
          },
          body: rawBuffer,
        });

        if (proxyResponse.ok) {
          ocrData = await proxyResponse.json();
        }
      } catch {
        // Fallback simulation handled below
      }
    }

    if (ocrData && ocrData.text) {
      setExtractedText(ocrData.text);
      // Immediately pipeline extracted text into Step 2 (/api/text/analyze)
      await evaluateAnswer(ocrData.text);
    } else {
      // Use current or sample text on local offline fallback
      const fallbackText = activeRubric.sampleText;
      setExtractedText(fallbackText);
      await evaluateAnswer(fallbackText);
      setEvaluationError('C++ Crow Vision Server offline. Showing fallback prediction.');
    }

    setIsEvaluating(false);
  }, [activeRubric, evaluateAnswer]);

  // Image Upload Ingestion
  const handleFileUpload = useCallback(async (file) => {
    try {
      const { arrayBuffer, dataUrl } = await processImageFile(file);
      setPreviewUrl(dataUrl);
      await sendImageToCrowOCR(arrayBuffer);
    } catch (err) {
      setEvaluationError(`Image processing failed: ${err.message}`);
    }
  }, [sendImageToCrowOCR]);

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
      const { arrayBuffer, dataUrl } = await captureVideoFrame(videoElement);
      setPreviewUrl(dataUrl);
      closeCamera();
      await sendImageToCrowOCR(arrayBuffer);
    } catch (err) {
      setCameraError(`Snapshot capture failed: ${err.message}`);
    }
  }, [closeCamera, sendImageToCrowOCR]);

  return {
    // Backend health
    isBackendOnline,
    isHealthChecking,
    checkHealth,

    // Ingestion & OCR
    extractedText,
    setExtractedText,
    isEvaluating,
    evaluationError,
    previewUrl,
    handleFileUpload,
    evaluateAnswer,
    sendImageToCrowOCR,

    // Camera Viewfinder
    isCameraOpen,
    cameraStream,
    cameraError,
    openCamera,
    closeCamera,
    captureCameraSnapshot,

    // Rubrics & NLP Result
    activeRubricKey,
    setActiveRubricKey,
    activeRubric,
    apiResult,
    customKeywords,
    setCustomKeywords,
  };
}
