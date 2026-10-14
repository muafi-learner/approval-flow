/**
 * Helper to generate crisp transparent PNG signatures for demo profiles,
 * handle signature conversions, and ensure strict 4:3 aspect ratio cropping.
 */

// Exact 4:3 canvas dimensions for standard signature rendering
export const SIGNATURE_WIDTH = 400;
export const SIGNATURE_HEIGHT = 300; // 400 : 300 = 4 : 3
export const SIGNATURE_ASPECT_RATIO = 4 / 3;

/**
 * Generates a synthetic cursive signature strictly cropped to 4:3 aspect ratio
 */
export function generateSyntheticSignature(name: string, color = '#0f172a'): string {
  const canvas = document.createElement('canvas');
  canvas.width = SIGNATURE_WIDTH;
  canvas.height = SIGNATURE_HEIGHT;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Styling cursive calligraphic signature
  ctx.strokeStyle = color;
  ctx.lineWidth = 3.5;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  ctx.font = 'italic 58px "Playfair Display", "Brush Script MT", "Caveat", "Segoe Script", cursive';
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;

  // Draw stylish signature curve
  ctx.beginPath();
  const startX = centerX - 140;
  const startY = centerY + 30;
  ctx.moveTo(startX, startY);
  ctx.bezierCurveTo(centerX - 60, centerY + 80, centerX + 70, centerY - 20, centerX + 140, centerY + 25);
  ctx.stroke();

  // Draw name text nicely centered in the 4:3 frame
  ctx.fillText(name, centerX, centerY - 25);

  // Draw accent flourish dot
  ctx.beginPath();
  ctx.arc(centerX + 135, centerY + 22, 4.5, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();

  return canvas.toDataURL('image/png');
}

/**
 * Converts a typed text signature into a high-res transparent PNG with 4:3 ratio
 */
export function renderTextToSignature(text: string, fontStyle: string, color: string): string {
  const canvas = document.createElement('canvas');
  canvas.width = SIGNATURE_WIDTH;
  canvas.height = SIGNATURE_HEIGHT;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = fontStyle;

  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;

  ctx.fillText(text, centerX, centerY - 20);

  // Flourish underline
  ctx.beginPath();
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.moveTo(centerX - 130, centerY + 30);
  ctx.quadraticCurveTo(centerX, centerY + 55, centerX + 130, centerY + 25);
  ctx.stroke();

  return canvas.toDataURL('image/png');
}

/**
 * Trims transparent borders around drawing and crops/fits into exact 4:3 aspect ratio
 */
export function cropSignatureTo4by3(dataUrlOrCanvas: string | HTMLCanvasElement): Promise<string> {
  return new Promise((resolve) => {
    if (typeof dataUrlOrCanvas === 'string') {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = img.width;
        tempCanvas.height = img.height;
        const tempCtx = tempCanvas.getContext('2d');
        if (!tempCtx) {
          resolve(dataUrlOrCanvas);
          return;
        }
        tempCtx.drawImage(img, 0, 0);
        resolve(cropCanvasTo4by3(tempCanvas));
      };
      img.onerror = () => resolve(dataUrlOrCanvas);
      img.src = dataUrlOrCanvas;
    } else {
      resolve(cropCanvasTo4by3(dataUrlOrCanvas));
    }
  });
}

/**
 * Internal synchronous crop from an HTMLCanvasElement into strict 4:3
 */
export function cropCanvasTo4by3(sourceCanvas: HTMLCanvasElement): string {
  const srcCtx = sourceCanvas.getContext('2d');
  if (!srcCtx) return sourceCanvas.toDataURL('image/png');

  const { width, height } = sourceCanvas;
  const imgData = srcCtx.getImageData(0, 0, width, height);
  const data = imgData.data;

  // Find bounding box of non-transparent pixels
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const alpha = data[(y * width + x) * 4 + 3];
      if (alpha > 15) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  // If canvas is completely blank
  if (maxX === -1) {
    const blank = document.createElement('canvas');
    blank.width = SIGNATURE_WIDTH;
    blank.height = SIGNATURE_HEIGHT;
    return blank.toDataURL('image/png');
  }

  const contentW = maxX - minX + 1;
  const contentH = maxY - minY + 1;

  // Destination canvas with standard 4:3 aspect ratio
  const outCanvas = document.createElement('canvas');
  outCanvas.width = SIGNATURE_WIDTH;
  outCanvas.height = SIGNATURE_HEIGHT;
  const outCtx = outCanvas.getContext('2d');
  if (!outCtx) return sourceCanvas.toDataURL('image/png');

  outCtx.clearRect(0, 0, SIGNATURE_WIDTH, SIGNATURE_HEIGHT);

  // Add 12% padding inside the 4:3 frame
  const paddingX = SIGNATURE_WIDTH * 0.12;
  const paddingY = SIGNATURE_HEIGHT * 0.14;
  const availW = SIGNATURE_WIDTH - paddingX * 2;
  const availH = SIGNATURE_HEIGHT - paddingY * 2;

  // Scale content proportionally to fit inside available safe 4:3 bounds
  const scale = Math.min(availW / contentW, availH / contentH, 1.8);

  const drawW = contentW * scale;
  const drawH = contentH * scale;

  const destX = (SIGNATURE_WIDTH - drawW) / 2;
  const destY = (SIGNATURE_HEIGHT - drawH) / 2;

  outCtx.drawImage(
    sourceCanvas,
    minX,
    minY,
    contentW,
    contentH,
    destX,
    destY,
    drawW,
    drawH
  );

  return outCanvas.toDataURL('image/png');
}
