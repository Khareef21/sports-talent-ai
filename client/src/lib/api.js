export const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000/api';

export function parseApiError(errData, fallback = 'Request failed.') {
  const detail = errData?.detail;
  if (typeof detail === 'string') {
    return { message: detail, qualityChecks: null };
  }
  if (detail && typeof detail === 'object') {
    return {
      message: detail.message || fallback,
      qualityChecks: detail.quality_checks || null,
    };
  }
  return { message: fallback, qualityChecks: null };
}
