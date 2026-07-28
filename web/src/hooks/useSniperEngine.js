import { useState, useCallback } from 'react';

const DIRECT_API_URL = 'http://localhost:8080/api/nlp/evaluate';
const PROXY_API_URL = '/api/nlp/evaluate';

export function useSniperEngine() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [evaluationResult, setEvaluationResult] = useState(null);

  /**
   * Executes POST request to C++ Crow REST Backend API
   * @param {string} studentText 
   * @param {string[]} expectedKeywordsArray 
   */
  const evaluateAnswer = useCallback(async (studentText, expectedKeywordsArray) => {
    if (!studentText || !studentText.trim()) {
      setError('Please provide a student answer to evaluate.');
      return null;
    }

    if (!expectedKeywordsArray || expectedKeywordsArray.length === 0) {
      setError('Please specify at least one marking scheme keyword.');
      return null;
    }

    setIsLoading(true);
    setError(null);

    const payload = {
      student_answer: studentText.trim(),
      expected_keywords: expectedKeywordsArray,
    };

    let responseData = null;
    let fetchError = null;

    // Try direct connection to Crow backend on port 8080 first
    try {
      const response = await fetch(DIRECT_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        responseData = await response.json();
      } else {
        fetchError = `C++ Server returned HTTP ${response.status}`;
      }
    } catch (err) {
      // Fall back to Vite dev server proxy route if direct fetch fails (e.g. CORS or relative path)
      try {
        const proxyResponse = await fetch(PROXY_API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        if (proxyResponse.ok) {
          responseData = await proxyResponse.json();
          fetchError = null;
        } else {
          fetchError = `C++ Proxy Server returned HTTP ${proxyResponse.status}`;
        }
      } catch {
        fetchError = `Unable to connect to C++ Crow Backend at http://localhost:8080 (${err.message})`;
      }
    }

    if (responseData) {
      // Update state strictly from C++ backend response payload
      setEvaluationResult({
        status: responseData.status || 'success',
        score_percentage: typeof responseData.score_percentage === 'number' 
          ? responseData.score_percentage 
          : 0,
        matched_keywords: Array.isArray(responseData.matched_keywords) 
          ? responseData.matched_keywords 
          : [],
        missing_keywords: Array.isArray(responseData.missing_keywords) 
          ? responseData.missing_keywords 
          : [],
      });
      setIsLoading(false);
      return responseData;
    } else {
      setError(fetchError || 'Network request failed. Is the C++ Crow server running on localhost:8080?');
      setIsLoading(false);
      return null;
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
