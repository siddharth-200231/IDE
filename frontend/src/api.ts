export const BASE_URL = 'http://localhost:3000';

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