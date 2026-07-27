/**
 * Target AI - Image Ingestion & Preprocessing Utility
 * Performs 32x128 downsampling, RGB to 8-bit Grayscale conversion,
 * background inversion (white paper -> 0.0, dark ink -> 1.0), and 
 * generates a 4,096 float array for C++ Crow REST API payload submission.
 */

export const TARGET_WIDTH = 128;
export const TARGET_HEIGHT = 32;
export const TOTAL_PIXELS = TARGET_WIDTH * TARGET_HEIGHT; // 4096 floats

/**
 * Preprocesses an image File or Blob into 4096 floats & a data URL preview
 * @param {File|Blob} file 
 * @returns {Promise<{ pixels: Float32Array, dataUrl: string, width: number, height: number }>}
 */
export function processImageFile(file) {
  return new Promise((resolve, reject) => {
    if (!file) {
      reject(new Error("No image file provided."));
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        try {
          const result = processImageElement(img);
          resolve(result);
        } catch (err) {
          reject(err);
        }
      };
      img.onerror = () => reject(new Error("Failed to load image file into Image element."));
      img.src = event.target.result;
    };
    reader.onerror = () => reject(new Error("Failed to read image file."));
    reader.readAsDataURL(file);
  });
}

/**
 * Processes an HTMLImageElement or HTMLVideoElement frame onto offscreen 32x128 canvas
 * @param {HTMLImageElement|HTMLVideoElement|HTMLCanvasElement} sourceElement 
 * @returns {{ pixels: Float32Array, dataUrl: string, width: number, height: number }}
 */
export function processImageElement(sourceElement) {
  const canvas = document.createElement('canvas');
  canvas.width = TARGET_WIDTH;   // 128 px
  canvas.height = TARGET_HEIGHT; // 32 px
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error("Could not get 2D context from canvas.");
  }

  // Draw & downsample source image/video frame to 128x32
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, TARGET_WIDTH, TARGET_HEIGHT);
  ctx.drawImage(sourceElement, 0, 0, TARGET_WIDTH, TARGET_HEIGHT);

  // Extract RGBA raw image data
  const imageData = ctx.getImageData(0, 0, TARGET_WIDTH, TARGET_HEIGHT);
  const data = imageData.data;
  const pixels = new Float32Array(TOTAL_PIXELS);

  // Convert 24-bit RGB to 8-bit Grayscale & Invert White Paper (0.0) -> Ink Stroke (1.0)
  for (let i = 0; i < TOTAL_PIXELS; i++) {
    const rIdx = i * 4;
    const r = data[rIdx];
    const g = data[rIdx + 1];
    const b = data[rIdx + 2];

    // Standard ITU-R BT.601 luminance formula
    const gray = 0.299 * r + 0.587 * g + 0.114 * b;

    // Invert: 255 (white paper) -> 0.0, 0 (black ink) -> 1.0
    const normalizedInk = (255.0 - gray) / 255.0;

    // Clamp value between 0.0 and 1.0
    pixels[i] = Math.max(0.0, Math.min(1.0, normalizedInk));
  }

  // Generate data URL for high-contrast live canvas preview in UI
  const previewCanvas = document.createElement('canvas');
  previewCanvas.width = TARGET_WIDTH;
  previewCanvas.height = TARGET_HEIGHT;
  const pCtx = previewCanvas.getContext('2d');
  const pImgData = pCtx.createImageData(TARGET_WIDTH, TARGET_HEIGHT);

  for (let i = 0; i < TOTAL_PIXELS; i++) {
    const val = Math.floor(pixels[i] * 255);
    const pIdx = i * 4;
    // Display ink as dark on light background in preview
    const disp = 255 - val;
    pImgData.data[pIdx] = disp;     // R
    pImgData.data[pIdx + 1] = disp; // G
    pImgData.data[pIdx + 2] = disp; // B
    pImgData.data[pIdx + 3] = 255;  // Alpha
  }
  pCtx.putImageData(pImgData, 0, 0);
  const dataUrl = previewCanvas.toDataURL('image/png');

  return {
    pixels,
    dataUrl,
    width: TARGET_WIDTH,
    height: TARGET_HEIGHT,
  };
}

/**
 * Captures a live frame from HTMLVideoElement and converts to 4096 floats
 * @param {HTMLVideoElement} videoElement 
 * @returns {{ pixels: Float32Array, dataUrl: string, width: number, height: number }}
 */
export function captureVideoFrame(videoElement) {
  if (!videoElement || videoElement.readyState < 2) {
    throw new Error("Camera stream is not ready or active.");
  }
  return processImageElement(videoElement);
}
