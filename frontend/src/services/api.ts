import axios from 'axios';

const api = axios.create({
  // @ts-ignore
  baseURL: process.env.EXPO_PUBLIC_API_URL || 'https://buildpointid.onrender.com',
  timeout: 30000, // 30 segundos para suportar o cold start da Render
  headers: {
    'Content-Type': 'application/json',
  },
});

export default api;