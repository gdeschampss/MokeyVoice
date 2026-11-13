/**
 * Redimensiona imagens no cliente antes do upload (avatar/banner).
 * GIFs NÃO passam por aqui — o canvas mataria a animação.
 */
export async function resizeImage(file: File, maxW: number, maxH: number, quality = 0.88): Promise<Blob> {
  if (file.type === 'image/gif') return file;
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxW / bitmap.width, maxH / bitmap.height);
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return file;
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b ?? file), 'image/webp', quality));
}

export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

export const IMAGE_LIMITS = {
  avatar: { w: 256, h: 256 },
  banner: { w: 1200, h: 480 },
  /** Tamanho máximo de GIF aceito (bytes). */
  gifMaxBytes: 8 * 1024 * 1024,
} as const;
