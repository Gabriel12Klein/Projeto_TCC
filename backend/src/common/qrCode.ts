import QRCode from 'qrcode';

const qrOptions = {
  type: 'png' as const,
  width: 640,
  margin: 2,
  errorCorrectionLevel: 'M' as const,
  color: { dark: '#4c151c', light: '#ffffff' },
};

export function resolvePublicAppUrl(requestOrigin?: string) {
  const configured = process.env.PUBLIC_APP_URL?.trim();
  if (configured) return configured.replace(/\/$/, '');
  if (requestOrigin) {
    try {
      const origin = new URL(requestOrigin);
      if (origin.protocol === 'http:' || origin.protocol === 'https:') return origin.origin;
    } catch {
      // Usa o endereço local quando a origem recebida não é uma URL válida.
    }
  }
  return 'http://localhost:5173';
}

export function batchPublicUrl(appUrl: string, code: string) {
  return `${appUrl.replace(/\/$/, '')}/consulta/lotes/${encodeURIComponent(code)}`;
}

export function batchQrImagePath(code: string) {
  return `/api/catalog/batches/${encodeURIComponent(code)}/qr-code`;
}

export function renderQrCode(payload: string) {
  return QRCode.toBuffer(payload, qrOptions);
}

export type QrRenderer = typeof renderQrCode;
