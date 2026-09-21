import { useEffect, useState, type ImgHTMLAttributes } from 'react';
import { getToken } from '../../api/api';

/** Never put bearer tokens in URLs, browser history or image caches. */
export default function PrivateImage({ src, alt = '', ...props }: ImgHTMLAttributes<HTMLImageElement>) {
  const privatePhoto = Boolean(src?.startsWith('/uploads/inventory/'));
  const token = getToken();
  const [loaded, setLoaded] = useState<{ source: string; token: string | null; url: string }>();
  useEffect(() => {
    if (!privatePhoto || !src || !token) return;
    const controller = new AbortController();
    let objectUrl: string | undefined;
    void fetch(src, { headers: { Authorization: `Bearer ${token}` }, signal: controller.signal, cache: 'no-store' })
      .then(async response => {
        if (!response.ok) throw new Error('Foto indisponível');
        const blob = await response.blob();
        if (controller.signal.aborted) return;
        objectUrl = URL.createObjectURL(blob);
        setLoaded({ source: src, token, url: objectUrl });
      }).catch(() => { /* No public fallback for a private photo. */ });
    return () => { controller.abort(); if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [src, token, privatePhoto]);
  const resolved = privatePhoto ? (loaded && loaded.source === src && loaded.token === token ? loaded.url : undefined) : src;
  return <img {...props} src={resolved} alt={alt} />;
}
