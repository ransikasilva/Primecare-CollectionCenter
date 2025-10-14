import axios, { AxiosInstance, AxiosResponse, AxiosError } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ApiResponse } from '../types';

class ApiClient {
  private client: AxiosInstance;
  private baseURL: string;

  constructor() {
    // Use environment-specific URLs
    // For Expo development, use your computer's local IP instead of localhost
    this.baseURL = __DEV__
      ? 'http://192.168.1.4:8000/api'  // Development - use your local network IP (backend runs on port 8000)
      : 'https://api.primecare.lk/api'; // Production

    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request interceptor - Add auth token
    this.client.interceptors.request.use(
      async (config) => {
        try {
          const token = await AsyncStorage.getItem('access_token');
          if (token) {
            config.headers.Authorization = `Bearer ${token}`;
          }
        } catch (error) {
          console.error('Error getting access token:', error);
        }

        // Log requests in development
        if (__DEV__) {
          console.log(`📤 ${config.method?.toUpperCase()} ${config.url}`, {
            headers: config.headers,
            data: config.data,
          });
        }

        return config;
      },
      (error) => {
        console.error('Request interceptor error:', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor - Handle auth and errors
    this.client.interceptors.response.use(
      (response: AxiosResponse) => {
        if (__DEV__) {
          console.log(`📥 ${response.config.method?.toUpperCase()} ${response.config.url}`, {
            status: response.status,
            data: response.data,
          });
        }
        return response;
      },
      async (error: AxiosError) => {
        const originalRequest = error.config;

        // Handle 401 errors - token expired
        if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
          originalRequest._retry = true;

          try {
            const refreshToken = await AsyncStorage.getItem('refresh_token');
            if (refreshToken) {
              const refreshResponse = await this.refreshAccessToken(refreshToken);

              if (refreshResponse.success) {
                await AsyncStorage.setItem('access_token', refreshResponse.data.access_token);
                originalRequest.headers.Authorization = `Bearer ${refreshResponse.data.access_token}`;
                return this.client(originalRequest);
              }
            }
          } catch (refreshError) {
            // Refresh failed, redirect to login
            await this.clearTokens();
            // TODO: Navigate to login screen
            console.error('Token refresh failed:', refreshError);
          }
        }

        console.error('API Error:', {
          status: error.response?.status,
          message: error.message,
          data: error.response?.data,
        });

        return Promise.reject(error);
      }
    );
  }

  private async refreshAccessToken(refreshToken: string): Promise<ApiResponse> {
    try {
      const response = await axios.post(`${this.baseURL}/auth/refresh`, {
        refresh_token: refreshToken,
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  private async clearTokens() {
    await AsyncStorage.multiRemove(['access_token', 'refresh_token', 'user_data']);
  }

  // Generic API methods
  async get<T = any>(url: string, params?: any): Promise<ApiResponse<T>> {
    try {
      const response = await this.client.get(url, { params });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async post<T = any>(url: string, data?: any): Promise<ApiResponse<T>> {
    try {
      const response = await this.client.post(url, data);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async put<T = any>(url: string, data?: any): Promise<ApiResponse<T>> {
    try {
      const response = await this.client.put(url, data);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async delete<T = any>(url: string): Promise<ApiResponse<T>> {
    try {
      const response = await this.client.delete(url);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  private handleError(error: any): ApiResponse {
    if (error.response?.data) {
      return error.response.data;
    }

    return {
      success: false,
      message: error.message || 'Network error occurred',
      error: {
        code: 'NETWORK_ERROR',
        message: error.message || 'Network error occurred',
        details: error,
      },
    };
  }

  // File upload method
  async uploadFile<T = any>(url: string, file: any, fieldName: string = 'file'): Promise<ApiResponse<T>> {
    try {
      const formData = new FormData();
      formData.append(fieldName, {
        uri: file.uri,
        type: file.type || 'image/jpeg',
        name: file.fileName || 'upload.jpg',
      } as any);

      const response = await this.client.post(url, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Development bypass methods
  async bypassLogin(): Promise<ApiResponse> {
    if (!__DEV__) {
      throw new Error('Bypass login is only available in development');
    }

    try {
      const response = await this.client.post('/auth/dev-bypass', {
        phone: '+94771234567',
        user_type: 'collection_center',
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }
}

// Export singleton instance
export const apiClient = new ApiClient();
export default apiClient;