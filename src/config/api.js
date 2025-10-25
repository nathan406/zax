// API Configuration for ZAX Frontend
const isDevelopment = import.meta.env.MODE === 'development';

// API Base URL - automatically switches between development and production
export const API_BASE_URL = isDevelopment 
  ? 'http://localhost:8000/api'  // Development
  : import.meta.env.VITE_API_URL || 'https://zaxbackend.onrender.com/api';  // Production

// API Endpoints
export const API_ENDPOINTS = {
  CHAT: `${API_BASE_URL}/chatbot/chat/`,
  CHAT_HISTORY: `${API_BASE_URL}/chatbot/chat/`,
  CHAT_LOGS: `${API_BASE_URL}/chatbot/logs/`,
  FILE_UPLOAD: `${API_BASE_URL}/chatbot/upload/`,
  ADMIN_CONNECT: `${API_BASE_URL}/chatbot/admin/connect/`,
  ADMIN_SEND_MESSAGE: `${API_BASE_URL}/chatbot/admin/send_message/`,
  ADMIN_SEND_USER_MESSAGE: `${API_BASE_URL}/chatbot/admin/send_user_message/`,
  ADMIN_ACTIVE_SESSIONS: `${API_BASE_URL}/chatbot/admin/active_sessions/`,
  ADMIN_CHAT_HISTORY: (sessionId) => `${API_BASE_URL}/chatbot/admin/chat_history/${sessionId}/`,
  ADMIN_END_SESSION: `${API_BASE_URL}/chatbot/admin/end_session/`,
  ADMIN_REQUEST_ASSISTANCE: `${API_BASE_URL}/chatbot/admin/request_assistance/`,
  ADMIN_SESSION_STATUS: (sessionId) => `${API_BASE_URL}/chatbot/admin/session_status/${sessionId}/`,
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