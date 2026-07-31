/**
 * Target AI - Base64 & Canvas Image Converter Utility
 * Utility functions for converting image files, video camera frames,
 * and typed text into Base64 encoded images for C++ Vision Engine (POST /api/ocr/grade-dual).
 */

/**
 * Converts a File or Blob object into a clean Base64 data string (without prefix)
 * @param {File|Blob} file 
 * @returns {Promise<{ base64: string, dataUrl: string }>}
 */
export function processImageFile(file) {
  return new Promise((resolve, reject) => {
    if (!file) {
      reject(new Error("No image file provided."));
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target.result;
      // Strip "data:image/png;base64," prefix for raw Base64 string
      const base64 = dataUrl.split(',')[1] || dataUrl;
      resolve({ base64, dataUrl });
    };
    reader.onerror = () => reject(new Error("Failed to read image file."));
    reader.readAsDataURL(file);
  });
}

/**
 * Renders typed text onto an offscreen canvas image and returns Base64 & data URL
 * @param {string} text 
 * @returns {{ base64: string, dataUrl: string }}
 */
export function textToBase64Image(text) {
  const canvas = document.createElement('canvas');
  canvas.width = 1000;
  canvas.height = 300;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error("Could not create canvas 2D context.");
  }

  // Draw high-contrast black ink text on white paper background for Tesseract OCR
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = '#000000';
  ctx.font = '24px "JetBrains Mono", monospace';
  
  // Wrap text into multiple lines
  const words = (text || '').split(' ');
  let line = '';
  let y = 50;

  for (let n = 0; n < words.length; n++) {
    const testLine = line + words[n] + ' ';
    const metrics = ctx.measureText(testLine);
    if (metrics.width > 920 && n > 0) {
      ctx.fillText(line, 40, y);
      line = words[n] + ' ';
      y += 36;
    } else {
      line = testLine;
    }
  }
  ctx.fillText(line, 40, y);

  const dataUrl = canvas.toDataURL('image/png');
  const base64 = dataUrl.split(',')[1];
  return { base64, dataUrl };
}

/**
 * Captures live video frame from HTMLVideoElement as Base64 string & data URL
 * @param {HTMLVideoElement} videoElement 
 * @returns {Promise<{ base64: string, dataUrl: string }>}
 */
export function captureVideoFrame(videoElement) {
  return new Promise((resolve, reject) => {
    if (!videoElement || videoElement.readyState < 2) {
      reject(new Error("Camera stream is not ready or active."));
      return;
    }

    const canvas = document.createElement('canvas');
    canvas.width = videoElement.videoWidth || 1280;
    canvas.height = videoElement.videoHeight || 720;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      reject(new Error("Could not get 2D context from canvas."));
      return;
    }

    ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/png');
    const base64 = dataUrl.split(',')[1];

    resolve({ base64, dataUrl });
  });
}
