import { useEffect, useState, type ImgHTMLAttributes } from 'react';
import { getToken } from '../../api/api';

/** Never put bearer tokens in URLs, browser history or image caches. */
export default function PrivateImage({ src, alt = '', ...props }: ImgHTMLAttributes<HTMLImageElement>) {
  const privatePhoto = Boolean(src?.startsWith('/uploads/inventory/'));
  const token = getToken();
  const [loaded, setLoaded] = useState<{ source: string; token: string | null; url: string }>();
  const [failed, setFailed] = useState<{ source?: string; token: string | null }>();
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
      }).catch(() => { if (!controller.signal.aborted) setFailed({ source: src, token }); });
    return () => { controller.abort(); if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [src, token, privatePhoto]);
  const resolved = privatePhoto ? (loaded && loaded.source === src && loaded.token === token ? loaded.url : undefined) : src;
  if ((failed?.source === src && failed?.token === token) || (privatePhoto && !token)) return <span className={props.className} role="img" aria-label={alt ? `${alt}: foto indisponível` : 'Foto indisponível'} title="Foto indisponível" style={{ display: 'grid', placeItems: 'center', fontSize: '0.7rem', ...props.style }}>Sem foto</span>;
  if (privatePhoto && !resolved) return <span className={props.className} role="status">Carregando foto…</span>;
  return <img {...props} src={resolved} alt={alt} onError={event => { setFailed({ source: src, token }); props.onError?.(event); }} />;
}
