// API Configuration based on environment
const getApiBaseUrl = () => {
  // Use new VPS production domains
  if (window.location.hostname === 'dashboard.bluedrop.shop') {
    return 'https://api.bluedrop.shop/api/v1';
  }
  if (import.meta.env.DEV) {
    return 'http://localhost:8000/api/v1';
  }
  if (import.meta.env.VITE_API_URL) {
    const baseUrl = import.meta.env.VITE_API_URL;
    const finalUrl = baseUrl.endsWith('/') ? `${baseUrl}api/v1` : `${baseUrl}/api/v1`;
    return finalUrl;
  }
  return 'https://api.bluedrop.shop/api/v1'; // fallback for prod/other
};

export const API_BASE_URL = getApiBaseUrl();

console.log('API Base URL:', API_BASE_URL);
console.log('Current hostname:', window.location.hostname);
console.log('VITE_API_URL (env):', import.meta.env.VITE_API_URL);
console.log('DEV mode (env):', import.meta.env.DEV);
