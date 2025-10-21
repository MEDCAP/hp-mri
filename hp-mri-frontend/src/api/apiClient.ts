import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { CognitoUserPool, CognitoUser } from 'amazon-cognito-identity-js';

const poolData = {
  UserPoolId: 'us-east-1_vUo50ofKI',
  ClientId: '4nvgf7et9f4ui0glr4ddf152r8',
};

const userPool = new CognitoUserPool(poolData);

// Create axios instance with base configuration
const apiClient: AxiosInstance = axios.create({
  baseURL: '/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add JWT token
apiClient.interceptors.request.use(
  async (config: AxiosRequestConfig) => {
    try {
      const user = userPool.getCurrentUser();
      if (user) {
        const session = await new Promise((resolve, reject) => {
          user.getSession((err: any, session: any) => {
            if (err) {
              reject(err);
            } else {
              resolve(session);
            }
          });
        });
        
        const idToken = (session as any).getIdToken().getJwtToken();
        if (config.headers) {
          config.headers.Authorization = `Bearer ${idToken}`;
        }
      }
    } catch (error) {
      console.error('Error getting session:', error);
      // Don't block the request, let the backend handle auth errors
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle auth errors
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid, redirect to login
      console.error('Authentication failed:', error.response.data);
      // You might want to redirect to login page here
      // window.location.href = '/account';
    }
    return Promise.reject(error);
  }
);

export default apiClient;

