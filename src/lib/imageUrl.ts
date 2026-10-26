// Accepts every common kind of image link the admin might paste and normalizes
// it into something an <img src> can render (or, for blob:/data:, something that
// must be converted into a hosted file before saving).

export type ImageLinkKind = 'http' | 'data' | 'blob' | 'path' | 'drive' | 'dropbox';

export interface ParsedImageLink {
  ok: true;
  /** Normalized link, ready to store or render. blob:/data: links are returned as-is. */
  url: string;
  kind: ImageLinkKind;
  /** Human label for the form hint, e.g. "Google Drive link (converted to direct image)". */
  label: string;
}

export interface ParsedImageLinkError {
  ok: false;
  reason: string;
}

export type ParsedImageLinkResult = ParsedImageLink | ParsedImageLinkError;

const DRIVE_FILE_RE = /drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/;
const DRIVE_OPEN_RE = /[?&]id=([a-zA-Z0-9_-]+)/;
const DROPBOX_RE = /(?:www\.)?dropbox\.com\/s(?:cl\/f)?\/([^\s?]+)\/?/;

function stripWrappers(raw: string): string {
  return raw.trim().replace(/^["'<]+/, '').replace(/[">']+$/, '').trim();
}

/**
 * Parse + normalize any image link. Returns a discriminated result instead of
 * throwing so forms can show the reason inline.
 */
export function parseImageLink(raw: string): ParsedImageLinkResult {
  const value = stripWrappers(raw);
  if (!value) return { ok: false, reason: 'Enter an image link.' };

  // data: URLs render directly in <img>.
  if (/^data:image\//i.test(value)) {
    return { ok: true, url: value, kind: 'data', label: 'Embedded image (data URL)' };
  }
  if (/^data:/i.test(value)) {
    return { ok: false, reason: 'That data URL is not an image (must start with data:image/…).' };
  }

  // blob: URLs only live in this browser session — caller must re-host them.
  if (/^blob:/i.test(value)) {
    return { ok: true, url: value, kind: 'blob', label: 'Temporary browser image (will be re-hosted)' };
  }

  // Protocol-relative.
  if (value.startsWith('//')) {
    return { ok: true, url: 'https:' + value, kind: 'http', label: 'Image link' };
  }

  // Site-relative path (served from /public).
  if (value.startsWith('/') || value.startsWith('./') || value.startsWith('../')) {
    return { ok: true, url: value, kind: 'path', label: 'Site-relative image' };
  }

  // Google Drive share links → direct renderable image.
  const driveId = value.match(DRIVE_FILE_RE)?.[1] ?? (value.includes('drive.google.com') ? value.match(DRIVE_OPEN_RE)?.[1] : undefined);
  if (driveId) {
    return {
      ok: true,
      url: `https://drive.google.com/thumbnail?id=${driveId}&sz=w2000`,
      kind: 'drive',
      label: 'Google Drive link (converted to a direct image)',
    };
  }

  // Dropbox share links → direct renderable image.
  const dropbox = value.match(DROPBOX_RE);
  if (dropbox) {
    const url = value
      .replace(/^http:\/\//, 'https://')
      .replace(/^(https:\/\/)?(www\.)?dropbox\.com\//, 'https://dl.dropboxusercontent.com/')
      .replace(/[?&](raw|dl)=1\b/, '')
      .replace(/[?&]dl=0\b/, '');
    return { ok: true, url, kind: 'dropbox', label: 'Dropbox link (converted to a direct image)' };
  }

  // Absolute http(s).
  if (/^https?:\/\//i.test(value)) {
    return { ok: true, url: value, kind: 'http', label: 'Image link' };
  }

  // Bare domain like www.example.com/photo.jpg — assume https.
  if (/^[a-z0-9-]+(\.[a-z0-9-]+)+(\/|$)/i.test(value)) {
    return { ok: true, url: 'https://' + value, kind: 'http', label: 'Image link (https:// added)' };
  }

  return {
    ok: false,
    reason: 'Not a usable image link. Paste an https:// link, a Google Drive or Dropbox share link, an /images/… path, or upload the file instead.',
  };
}

/**
 * Probe whether a remote URL actually loads as an image. Uses a plain Image()
 * load (no canvas → no CORS requirement), so it works cross-origin.
 * Resolves true/false; never throws.
 */
export function verifyRemoteImageLoads(url: string, timeoutMs = 8000): Promise<boolean> {
  // data: and relative paths are trusted without probing.
  if (!/^https?:\/\//i.test(url)) return Promise.resolve(true);
  return new Promise((resolve) => {
    const img = new Image();
    const timer = setTimeout(() => { img.src = ''; resolve(false); }, timeoutMs);
    img.onload = () => { clearTimeout(timer); resolve(img.naturalWidth > 0 || img.naturalHeight > 0); };
    img.onerror = () => { clearTimeout(timer); resolve(false); };
    img.src = url;
  });
}
