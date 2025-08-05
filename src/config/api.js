// API Configuration for ZAX Frontend
const isDevelopment = import.meta.env.MODE === 'development';

// API Base URL - automatically switches between development and production
export const API_BASE_URL = isDevelopment 
  ? 'http://localhost:8000/api'  // Development
  : import.meta.env.VITE_API_URL || 'https://zax-backend.onrender.com/api';  // Production

// API Endpoints
export const API_ENDPOINTS = {
  CHAT: `${API_BASE_URL}/chatbot/chat/`,
  CHAT_HISTORY: `${API_BASE_URL}/chatbot/chat/`,
  CHAT_LOGS: `${API_BASE_URL}/chatbot/logs/`,
};

// Default headers for API requests
export const DEFAULT_HEADERS = {
  'Content-Type': 'application/json',
};

// API request timeout (in milliseconds)
export const REQUEST_TIMEOUT = 10000; // 10 seconds

console.log('🔗 API Configuration:', {
  mode: import.meta.env.MODE,
  baseUrl: API_BASE_URL,
  isDevelopment
});