import { supabase } from '@/lib/supabase';

// ============================================================
// House image uploads (Supabase Storage bucket: house-images)
//
// Files are compressed client-side (resized to MAX_DIMENSION px,
// re-encoded as WebP/JPEG) before upload so the gallery stays fast.
// If the storage bucket has not been provisioned yet, uploads fall
// back to an embedded data URL so the admin is never blocked.
// ============================================================

export const HOUSE_IMAGE_BUCKET = 'house-images';

const MAX_DIMENSION = 1600;
const JPEG_QUALITY = 0.82;
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif', 'image/svg+xml'];
const MAX_INPUT_BYTES = 25 * 1024 * 1024; // hard cap before compression
const MAX_FALLBACK_BYTES = 1.5 * 1024 * 1024; // data-URL fallback ceiling

export interface UploadedImage {
  url: string;
  storagePath: string | null; // null when stored as a data URL fallback
  width?: number;
  height?: number;
}

/** Human-readable error for a rejected file, or null when acceptable. */
export function validateImageFile(file: File): string | null {
  if (!ACCEPTED_TYPES.includes(file.type)) {
    return `"${file.name}" is not a supported image type (${file.type || 'unknown'}). Use JPEG, PNG, WebP, AVIF, GIF, or SVG.`;
  }
  if (file.size > MAX_INPUT_BYTES) {
    return `"${file.name}" is larger than 25 MB. Please resize it first.`;
  }
  return null;
}

function loadHtmlImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error(`Could not read "${file.name}" as an image.`)); };
    img.src = url;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality?: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

interface CompressedResult {
  blob: Blob;
  width: number;
  height: number;
  ext: string;
}

async function compressFile(file: File): Promise<CompressedResult> {
  const passthrough = async (): Promise<CompressedResult> => ({
    blob: file, width: 0, height: 0, ext: extensionForType(file.type),
  });

  // GIF and SVG keep their original bytes (animation / vectors must not be rasterized).
  // Tiny files upload as-is too.
  if (file.size < 120 * 1024 || file.type === 'image/gif' || file.type === 'image/svg+xml') {
    return passthrough();
  }

  let canvas: HTMLCanvasElement | null = null;
  let width = 0;
  let height = 0;

  try {
    const bitmap = await createImageBitmap(file);
    width = bitmap.width;
    height = bitmap.height;
    const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
    if (scale < 1) {
      canvas = document.createElement('canvas');
      canvas.width = Math.round(bitmap.width * scale);
      canvas.height = Math.round(bitmap.height * scale);
      canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      width = canvas.width;
      height = canvas.height;
    }
    bitmap.close();
  } catch {
    try {
      const img = await loadHtmlImage(file);
      width = img.naturalWidth;
      height = img.naturalHeight;
      const scale = Math.min(1, MAX_DIMENSION / Math.max(img.naturalWidth || 1, img.naturalHeight || 1));
      canvas = document.createElement('canvas');
      canvas.width = Math.round((img.naturalWidth || 1) * scale);
      canvas.height = Math.round((img.naturalHeight || 1) * scale);
      canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
      width = canvas.width;
      height = canvas.height;
    } catch {
      // Unreadable pixels but a valid container — send the original bytes.
      return passthrough();
    }
  }

  // Already small enough and not downscaled: keep original bytes.
  if (!canvas) return passthrough();

  // Transparent images stay PNG (WebP/JPEG would lose alpha or quality).
  if (file.type === 'image/png' || file.type === 'image/avif') {
    const png = await canvasToBlob(canvas, 'image/png');
    if (png && png.size <= MAX_FALLBACK_BYTES) {
      return { blob: png, width, height, ext: 'png' };
    }
  }

  // Prefer WebP (much smaller); fall back to JPEG where WebP is unsupported.
  let outType = 'image/webp';
  let ext = 'webp';
  if (!canvas.toDataURL('image/webp').startsWith('data:image/webp')) {
    outType = 'image/jpeg';
    ext = 'jpg';
  }
  let blob = await canvasToBlob(canvas, outType, JPEG_QUALITY);
  if (!blob) {
    blob = await canvasToBlob(canvas, 'image/jpeg', JPEG_QUALITY);
    ext = 'jpg';
  }
  if (!blob) throw new Error(`Could not compress "${file.name}". Try a different file.`);
  return { blob, width, height, ext };
}

function extensionForType(type: string): string {
  const map: Record<string, string> = {
    'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp',
    'image/avif': 'avif', 'image/gif': 'gif', 'image/svg+xml': 'svg',
  };
  return map[type] || 'jpg';
}

function fileToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Could not encode the image.'));
    reader.readAsDataURL(blob);
  });
}

/**
 * Upload a gallery image. Returns a URL safe to store in house_images.url —
 * either a public Storage URL or, when the bucket is not provisioned, a
 * compressed data URL fallback.
 */
export async function uploadHouseImage(houseId: string, file: File): Promise<UploadedImage> {
  const validation = validateImageFile(file);
  if (validation) throw new Error(validation);

  const { blob, width, height, ext } = await compressFile(file);
  const safeName = file.name.toLowerCase().replace(/[^a-z0-9.]+/g, '-').replace(/^-+|-+$/g, '') || 'image';
  const baseName = safeName.includes('.') ? safeName.slice(0, safeName.lastIndexOf('.')) : safeName;
  const path = `houses/${houseId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${baseName}.${ext}`;
  const contentType = blob.type || file.type || 'image/jpeg';

  const { error } = await supabase.storage
    .from(HOUSE_IMAGE_BUCKET)
    .upload(path, blob, { contentType, cacheControl: '3600', upsert: false });

  if (!error) {
    const { data } = supabase.storage.from(HOUSE_IMAGE_BUCKET).getPublicUrl(path);
    return { url: data.publicUrl, storagePath: path, width, height };
  }

  // Bucket not provisioned (or storage blocked): fall back to a data URL so
  // the admin can still add photos. Anything else is a real error.
  const notProvisioned = /bucket not found|not.*exist|404|403/i.test(error.message || '');
  if (!notProvisioned) throw new Error(`Upload failed: ${error.message}`);

  const dataUrl = await fileToDataUrl(blob);
  if (dataUrl.length > MAX_FALLBACK_BYTES * 1.4) {
    throw new Error(
      'The image storage bucket is not set up yet, and this image is too large to embed. ' +
      'Run supabase/migrations/20261009130000_house_images_storage_bucket.sql in Supabase, then retry.'
    );
  }
  return { url: dataUrl, storagePath: null, width, height };
}

/** Best-effort removal of a previously uploaded object (no-op for data URLs). */
export async function removeHouseImageUpload(url: string): Promise<void> {
  if (!url || url.startsWith('data:')) return;
  const marker = `/${HOUSE_IMAGE_BUCKET}/`;
  const idx = url.indexOf(marker);
  if (idx === -1) return;
  const path = decodeURIComponent(url.slice(idx + marker.length).split('?')[0]);
  if (!path) return;
  try {
    await supabase.storage.from(HOUSE_IMAGE_BUCKET).remove([path]);
  } catch {
    // Non-fatal: orphaned objects can be cleaned up later.
  }
}

/** Re-host a pasted blob:/data: link as a real uploaded file. */
export async function rehostImageLink(url: string, houseId: string, fileName = 'pasted-image.png'): Promise<UploadedImage> {
  const response = await fetch(url);
  if (!response.ok) throw new Error('Could not read that image. It may have expired — upload the file instead.');
  const blob = await response.blob();
  if (!blob.type.startsWith('image/')) throw new Error('That link is not an image.');
  const file = new File([blob as BlobPart], fileName, { type: blob.type });
  return uploadHouseImage(houseId, file);
}

/** Convert a File into a data URL without uploading (used for instant previews). */
export function readFileAsDataUrl(file: File): Promise<string> {
  return fileToDataUrl(file);
}
