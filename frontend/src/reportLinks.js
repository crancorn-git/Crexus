export const cleanMetric = (value, fallback = 'Unknown') => {
  if (value == null) return fallback;
  if (typeof value === 'object') return value.label || value.role || fallback;
  return String(value);
};

export const encodeReportPayload = (payload) => {
  try {
    const json = JSON.stringify(payload);
    return btoa(unescape(encodeURIComponent(json)));
  } catch {
    return '';
  }
};

export const decodeReportPayload = (encoded) => {
  try {
    if (!encoded) return null;
    const json = decodeURIComponent(escape(atob(encoded)));
    return JSON.parse(json);
  } catch {
    return null;
  }
};

export const buildPublicReportUrl = (payload) => {
  const encoded = encodeReportPayload(payload);
  if (!encoded || typeof window === 'undefined') return '';
  return `${window.location.origin}${window.location.pathname}?report=${encodeURIComponent(encoded)}`;
};

export const buildStreamerUrl = (payload) => {
  const encoded = encodeReportPayload(payload);
  if (!encoded || typeof window === 'undefined') return '';
  return `${window.location.origin}${window.location.pathname}?streamer=${encodeURIComponent(encoded)}`;
};
