import { useEffect } from 'react';

interface PageMeta {
  title: string;
  description?: string;
  image?: string;
}

function upsertMeta(key: string, content: string, useProperty = false): void {
  const attr = useProperty ? 'property' : 'name';
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

/**
 * Sets the document title and description / Open Graph tags for a page.
 * Plain DOM work — no extra dependency — so shared links look right and
 * search engines get per-page metadata.
 */
export function usePageMeta({ title, description, image }: PageMeta): void {
  useEffect(() => {
    const previousTitle = document.title;
    document.title = title;
    upsertMeta('og:title', title, true);
    upsertMeta('og:type', 'website', true);

    if (description) {
      upsertMeta('description', description);
      upsertMeta('og:description', description, true);
    }
    if (image) upsertMeta('og:image', image, true);

    return () => {
      document.title = previousTitle;
    };
  }, [title, description, image]);
}
