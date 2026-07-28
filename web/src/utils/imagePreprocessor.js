/**
 * Target AI - Image Ingestion & Raw Binary Buffer Preprocessor Utility
 * Prepares raw image files and camera frames for C++ HTR Vision REST API
 * endpoint POST http://localhost:8080/api/ocr/extract (OpenCV + Tesseract LSTM).
 */

export const TARGET_WIDTH = 128;
export const TARGET_HEIGHT = 32;

/**
 * Preprocesses an image File into raw binary Blob & data URL preview
 * @param {File|Blob} file 
 * @returns {Promise<{ blob: Blob, arrayBuffer: ArrayBuffer, dataUrl: string }>}
 */
export function processImageFile(file) {
  return new Promise((resolve, reject) => {
    if (!file) {
      reject(new Error("No image file provided."));
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const arrayBuffer = await file.arrayBuffer();
        resolve({
          blob: file,
          arrayBuffer,
          dataUrl: event.target.result,
        });
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error("Failed to read image file."));
    reader.readAsDataURL(file);
  });
}

/**
 * Captures live video frame from HTMLVideoElement and converts to PNG Blob, ArrayBuffer & data URL
 * @param {HTMLVideoElement} videoElement 
 * @returns {Promise<{ blob: Blob, arrayBuffer: ArrayBuffer, dataUrl: string }>}
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

    canvas.toBlob(async (blob) => {
      if (blob) {
        try {
          const arrayBuffer = await blob.arrayBuffer();
          resolve({ blob, arrayBuffer, dataUrl });
        } catch (err) {
          reject(err);
        }
      } else {
        reject(new Error("Failed to convert canvas to Blob."));
      }
    }, 'image/png');
  });
}
