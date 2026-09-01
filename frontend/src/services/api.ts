/**
 * ============================================================================
 * HTTP CLIENT & AXIOS INTERCEPTOR CONFIGURATION
 * ============================================================================
 * Handles all client-side network communication with the NestJS backend API.
 * 
 * CORE RESPONSIBILITIES:
 * 1. Base URL Management: Points to `/api` prefix on the backend server.
 * 2. Token Injection: Automatically embeds the current JWT bearer token in the
 *    `Authorization` header for all authenticated requests.
 * 3. Session Expiration & Guarding: Intercepts 401 Unauthorized responses to
 *    flush stale credentials and gracefully redirect unauthenticated users to `/login`.
 * ============================================================================
 */
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:3000/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add JWT Token automatically
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Intercept 401 Unauthorized
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      if (!window.location.pathname.includes('/login')) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
