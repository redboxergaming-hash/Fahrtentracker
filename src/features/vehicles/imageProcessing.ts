const MAX_DIMENSION = 1280;
const JPEG_QUALITY = 0.82;

/**
 * Browser-friendly MVP image handling:
 * - resizes large uploads to reduce IndexedDB size pressure
 * - stores result as data URL (simple local-first persistence tradeoff)
 *
 * Data URLs are easy to persist for MVP, but still increase DB size.
 * For larger-scale usage, move to Blob storage with references.
 */
export async function resizeImageFileToDataUrl(file: File): Promise<string> {
  const image = await loadImage(file);
  const { width, height } = fitWithin(image.width, image.height, MAX_DIMENSION);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas context unavailable');
  }

  ctx.drawImage(image, 0, 0, width, height);
  return canvas.toDataURL('image/jpeg', JPEG_QUALITY);
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };

    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image file'));
    };

    image.src = url;
  });
}

function fitWithin(width: number, height: number, maxDimension: number) {
  const largest = Math.max(width, height);
  if (largest <= maxDimension) return { width, height };

  const scale = maxDimension / largest;
  return {
    width: Math.round(width * scale),
    height: Math.round(height * scale)
  };
}
