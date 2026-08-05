import { useState, useCallback } from 'react';
import { evaluateTextClientWasm } from '../utils/wasmNLPEngine';

const API_ENDPOINT = 'http://localhost:8080/api/nlp/evaluate';
const PROXY_ENDPOINT = '/api/nlp/evaluate';

export function useSniperEngine() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [evaluationResult, setEvaluationResult] = useState(null);

  const evaluateAnswer = useCallback(async (studentText, expectedKeywords) => {
    if (!studentText || !studentText.trim()) {
      setError('Please provide an answer to evaluate.');
      return null;
    }

    if (!expectedKeywords || expectedKeywords.length === 0) {
      setError('Please enter at least one keyword.');
      return null;
    }

    setIsLoading(true);
    setError(null);

    // Instant local evaluation pass
    const localRes = evaluateTextClientWasm(studentText, expectedKeywords);
    
    setEvaluationResult({
      status: localRes.status,
      score_percentage: localRes.score_percentage,
      raw_score: localRes.raw_logit_score,
      matched_keywords: localRes.matched_keywords,
      missing_keywords: localRes.missing_keywords,
      synonym_matches: localRes.synonym_matches,
      isWasmClient: true,
    });

    const payload = {
      student_answer: studentText.trim(),
      expected_keywords: expectedKeywords,
    };

    let serverData = null;
    let errMessage = null;

    try {
      const res = await fetch(API_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        serverData = await res.json();
      } else {
        errMessage = `Server error (HTTP ${res.status})`;
      }
    } catch (err) {
      try {
        const proxyRes = await fetch(PROXY_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (proxyRes.ok) {
          serverData = await proxyRes.json();
        } else {
          errMessage = `Proxy error (HTTP ${proxyRes.status})`;
        }
      } catch {
        errMessage = `Backend server unavailable at http://localhost:8080 (${err.message})`;
      }
    }

    if (serverData) {
      setEvaluationResult({
        status: serverData.status || 'success',
        score_percentage: typeof serverData.score_percentage === 'number' 
          ? serverData.score_percentage 
          : localRes.score_percentage,
        raw_score: typeof serverData.raw_score === 'number'
          ? serverData.raw_score
          : localRes.raw_logit_score,
        matched_keywords: Array.isArray(serverData.matched_keywords) 
          ? serverData.matched_keywords 
          : localRes.matched_keywords,
        missing_keywords: Array.isArray(serverData.missing_keywords) 
          ? serverData.missing_keywords 
          : localRes.missing_keywords,
        isWasmClient: false,
      });
      setIsLoading(false);
      return serverData;
    } else {
      setIsLoading(false);
      return localRes;
    }
  }, []);

  const clearResult = useCallback(() => {
    setEvaluationResult(null);
    setError(null);
  }, []);

  return {
    isLoading,
    error,
    evaluationResult,
    evaluateAnswer,
    clearResult,
  };
}
