export const BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'https://your-production-url.com' 
  : 'http://localhost:3000'; // Always connect to port 3000, not the frontend port

export const API_ENDPOINTS = {
  AUTH: {
    PROFILE: '/user/profile',
    LOGOUT: '/user/logout',
    LOGIN: '/user/login',
    REGISTER: '/user/register'
  },
  FILES: {
    SAVE: '/files/save',
    LIST: '/files/list',
    GET: (fileId: string) => `/files/${fileId}`
  }
};