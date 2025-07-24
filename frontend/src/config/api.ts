// API Configuration based on environment
const getApiBaseUrl = () => {
  // Use Cloudflare tunnel API if on production domain
  if (window.location.hostname === 'tankmanage.teamskrn.xyz') {
    return 'https://api.teamskrn.xyz/api/v1';
  }
  if (import.meta.env.DEV) {
    return 'http://localhost:8000/api/v1';
  }
  if (import.meta.env.VITE_API_URL) {
    const baseUrl = import.meta.env.VITE_API_URL;
    const finalUrl = baseUrl.endsWith('/') ? `${baseUrl}api/v1` : `${baseUrl}/api/v1`;
    return finalUrl;
  }
  return 'https://api.tankmanage.teamskrn.xyz/api/v1'; // fallback for dev/other
};

export const API_BASE_URL = getApiBaseUrl();

console.log('API Base URL:', API_BASE_URL);
console.log('Current hostname:', window.location.hostname);
console.log('VITE_API_URL (env):', import.meta.env.VITE_API_URL);
console.log('DEV mode (env):', import.meta.env.DEV);
