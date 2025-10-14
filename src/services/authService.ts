import AsyncStorage from '@react-native-async-storage/async-storage';
import apiClient from './apiClient';
import { ApiResponse, User, AuthState } from '../types';

export interface LoginResponse {
  user: User;
  access_token: string;
  refresh_token: string;
  center_info?: any;
  features?: any;
}

export interface OTPResponse {
  otp_id: string;
  phone: string;
  expires_at: string;
  message: string;
}

export interface RegistrationData {
  center_name: string;
  center_type: 'laboratory' | 'clinic' | 'diagnostic_center' | 'hospital_lab';
  contact_person: string;
  email: string;
  phone: string;
  address: string;
  city?: string;
  province?: string;
  postal_code?: string;
  license_number?: string;
  emergency_contact?: string;
  coordinates_lat?: number;
  coordinates_lng?: number;
  landline?: string;
  contact_person_phone?: string;
  business_hours?: any;
  dependency_type: 'dependent' | 'independent';
  selected_hospitals: string[];
}

class AuthService {

  // Send OTP for phone verification
  async sendOTP(phone: string): Promise<ApiResponse<OTPResponse>> {
    try {
      // Format phone number for Sri Lankan format
      const formattedPhone = this.formatPhoneNumber(phone);

      const response = await apiClient.post('/auth/send-otp', {
        phone: formattedPhone,
        user_type: 'collection_center'
      });

      return response;
    } catch (error) {
      console.error('Send OTP error:', error);
      throw error;
    }
  }

  // Verify OTP and login/register
  async verifyOTP(phone: string, otpCode: string, otpId: string): Promise<ApiResponse<LoginResponse>> {
    try {
      const formattedPhone = this.formatPhoneNumber(phone);

      const response = await apiClient.post('/auth/verify-otp', {
        phone: formattedPhone,
        otp_code: otpCode,
        otp_id: otpId,
        user_type: 'collection_center'
      });

      // If successful and user exists, store tokens and user data
      if (response.success && response.data) {
        await this.storeAuthData(response.data);
      }

      return response;
    } catch (error) {
      console.error('Verify OTP error:', error);
      throw error;
    }
  }

  // Complete registration (updates profile after OTP verification)
  async completeRegistration(registrationData: RegistrationData): Promise<ApiResponse> {
    try {
      const response = await apiClient.put('/profile/collection-center', {
        center_name: registrationData.center_name,
        center_type: registrationData.dependency_type, // Backend expects 'dependent' or 'independent' as center_type
        contact_person: registrationData.contact_person,
        email: registrationData.email,
        phone: registrationData.phone,
        address: registrationData.address,
        city: registrationData.city,
        province: registrationData.province,
        postal_code: registrationData.postal_code,
        license_number: registrationData.license_number,
        emergency_contact: registrationData.emergency_contact,
        coordinates_lat: registrationData.coordinates_lat,
        coordinates_lng: registrationData.coordinates_lng,
        landline: registrationData.landline,
        contact_person_phone: registrationData.contact_person_phone,
        business_hours: registrationData.business_hours,
        hospital_selections: registrationData.selected_hospitals
      });

      return response;
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  }

  // Get all available features
  async getAllFeatures(): Promise<ApiResponse> {
    try {
      const response = await apiClient.get('/features');
      return response;
    } catch (error) {
      console.error('Get features error:', error);
      throw error;
    }
  }

  // Request feature for collection center during registration
  async requestFeature(featureId: string, justification?: string): Promise<ApiResponse> {
    try {
      const response = await apiClient.post('/features/request', {
        feature_id: featureId,
        justification: justification || ''
      });
      return response;
    } catch (error) {
      console.error('Request feature error:', error);
      throw error;
    }
  }

  // Request multiple features during registration
  async requestMultipleFeatures(features: Array<{featureId: string, justification?: string}>): Promise<ApiResponse[]> {
    try {
      const requests = features.map(feature =>
        this.requestFeature(feature.featureId, feature.justification)
      );

      const responses = await Promise.allSettled(requests);

      return responses.map((result, index) => {
        if (result.status === 'fulfilled') {
          return result.value;
        } else {
          console.error(`Feature request failed for ${features[index].featureId}:`, result.reason);
          return {
            success: false,
            message: `Feature request failed for ${features[index].featureId}`,
            error: result.reason,
            data: { feature_id: features[index].featureId }
          };
        }
      });
    } catch (error) {
      console.error('Request multiple features error:', error);
      throw error;
    }
  }

  // Get available hospitals for registration
  async getAvailableHospitals(): Promise<ApiResponse> {
    try {
      const response = await apiClient.get('/profile/hospitals/available');
      return response;
    } catch (error) {
      console.error('Get available hospitals error:', error);
      throw error;
    }
  }

  // Store authentication data
  private async storeAuthData(authData: LoginResponse): Promise<void> {
    try {
      await AsyncStorage.multiSet([
        ['access_token', authData.access_token],
        ['refresh_token', authData.refresh_token],
        ['user_data', JSON.stringify(authData.user)],
        ['center_info', JSON.stringify(authData.center_info || {})],
        ['features', JSON.stringify(authData.features || {})],
      ]);
    } catch (error) {
      console.error('Error storing auth data:', error);
      throw error;
    }
  }

  // Get stored authentication state
  async getAuthState(): Promise<AuthState> {
    try {
      const [accessToken, refreshToken, userData] = await AsyncStorage.multiGet([
        'access_token',
        'refresh_token',
        'user_data'
      ]);

      const token = accessToken[1];
      const user = userData[1] ? JSON.parse(userData[1]) : null;

      return {
        isAuthenticated: !!(token && user),
        user,
        token,
        refreshToken: refreshToken[1],
      };
    } catch (error) {
      console.error('Error getting auth state:', error);
      return {
        isAuthenticated: false,
        user: null,
        token: null,
        refreshToken: null,
      };
    }
  }

  // Get user profile
  async getUserProfile(): Promise<ApiResponse> {
    try {
      const response = await apiClient.get('/profile');
      return response;
    } catch (error) {
      console.error('Get profile error:', error);
      throw error;
    }
  }

  // Update user profile
  async updateProfile(profileData: any): Promise<ApiResponse> {
    try {
      const response = await apiClient.put('/profile/my', profileData);
      return response;
    } catch (error) {
      console.error('Update profile error:', error);
      throw error;
    }
  }

  // Get center features
  async getCenterFeatures(): Promise<ApiResponse> {
    try {
      const response = await apiClient.get('/features/my-features');
      return response;
    } catch (error) {
      console.error('Get features error:', error);
      throw error;
    }
  }

  // Logout
  async logout(): Promise<void> {
    try {
      // Call logout endpoint
      await apiClient.post('/auth/logout');
    } catch (error) {
      console.error('Logout API error:', error);
    } finally {
      // Clear local storage
      await AsyncStorage.multiRemove([
        'access_token',
        'refresh_token',
        'user_data',
        'center_info',
        'features'
      ]);
    }
  }

  // Development bypass login
  async bypassLogin(): Promise<ApiResponse<LoginResponse>> {
    try {
      const response = await apiClient.bypassLogin();

      if (response.success && response.data) {
        await this.storeAuthData(response.data);
      }

      return response;
    } catch (error) {
      console.error('Bypass login error:', error);
      throw error;
    }
  }

  // Utility: Format phone number
  private formatPhoneNumber(phone: string): string {
    // Remove any spaces or special characters
    const cleaned = phone.replace(/\D/g, '');

    // Add +94 if not present and starts with 7
    if (cleaned.startsWith('7') && cleaned.length === 9) {
      return '+94' + cleaned;
    }

    // If already has country code
    if (cleaned.startsWith('94') && cleaned.length === 11) {
      return '+' + cleaned;
    }

    return phone; // Return as-is if format is unclear
  }

  // Get user profile with registration status
  async getProfileWithStatus(): Promise<ApiResponse> {
    try {
      const response = await apiClient.get('/profile');
      return response;
    } catch (error) {
      console.error('Get profile with status error:', error);
      throw error;
    }
  }

  // Generate application reference ID
  generateApplicationReference(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');

    return `PC-CC-${year}${month}${day}-${random}`;
  }

  // Check registration status
  async checkRegistrationStatus(): Promise<ApiResponse> {
    try {
      // Use profile endpoint to get user data with center status
      const response = await this.getProfileWithStatus();

      if (response.success && response.data) {
        const profile = response.data;

        // Determine status based on profile data
        let status = 'not_started';
        let stage = 'registration';
        let message = 'Registration not started';

        if (profile.center_status) {
          switch (profile.center_status) {
            case 'pending_hospital_approval':
              status = 'pending';
              stage = 'hospital_approval';
              message = 'Waiting for hospital approval';
              break;
            case 'pending_final_approval':
              status = 'pending';
              stage = 'final_approval';
              message = 'Waiting for TransFleet final approval';
              break;
            case 'approved':
              status = 'approved';
              stage = 'completed';
              message = 'Registration completed and approved';
              break;
            case 'rejected':
              status = 'rejected';
              stage = 'rejected';
              message = 'Registration rejected';
              break;
            default:
              status = 'submitted';
              stage = 'hospital_approval';
              message = 'Application submitted, waiting for review';
          }
        } else if (profile.profile_complete) {
          status = 'submitted';
          stage = 'hospital_approval';
          message = 'Application submitted, waiting for review';
        }

        return {
          success: true,
          message: message,
          data: {
            status,
            stage,
            center_status: profile.center_status,
            profile_complete: profile.profile_complete,
            center_name: profile.center_name,
            application_ref: this.generateApplicationReference(),
            created_at: profile.created_at,
            updated_at: profile.updated_at
          }
        };
      }

      return response;
    } catch (error) {
      console.error('Check registration status error:', error);
      throw error;
    }
  }

}

// Export singleton instance
export const authService = new AuthService();
export default authService;