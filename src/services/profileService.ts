import apiClient from './apiClient';
import { ApiResponse } from '../types';

export interface Hospital {
  id: string;
  name: string;
  address: string;
  city: string;
  province: string;
  hospital_code?: string;
  network_name?: string;
  hospital_type: 'main' | 'regional';
  relationship_type: 'dependent' | 'independent';
  status: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
  distance?: string;
  location?: {
    lat: number;
    lng: number;
  };
}

export interface UserProfile {
  user_id: string;
  user_type: string;
  center_id: string;
  center_name: string;
  center_type: string;
  contact_person: string;
  email?: string;
  phone: string;
  center_phone?: string;
  address?: string; // Keep for backwards compatibility
  center_address?: string; // Backend returns this field
  city?: string;
  province?: string;
  postal_code?: string;
  license_number?: string;
  status: string;
  center_status?: string;
  profile_complete: boolean;
  business_hours?: any;
  coordinates_lat?: string;
  coordinates_lng?: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
  location?: {
    lat: number;
    lng: number;
    formatted_address?: string;
  };
}

class ProfileService {
  // Get current user profile
  async getProfile(): Promise<ApiResponse<UserProfile>> {
    try {
      const response = await apiClient.get('/profile');
      return response;
    } catch (error) {
      console.error('Get profile error:', error);
      throw error;
    }
  }

  // Update collection center profile
  async updateProfile(profileData: Partial<UserProfile>): Promise<ApiResponse> {
    try {
      const response = await apiClient.put('/profile/collection-center', profileData);
      return response;
    } catch (error) {
      console.error('Update profile error:', error);
      throw error;
    }
  }

  // Get available hospitals for selection
  async getAvailableHospitals(): Promise<ApiResponse<{
    main_hospitals: Hospital[];
    regional_hospitals: Hospital[];
  }>> {
    try {
      const response = await apiClient.get('/profile/hospitals/available');
      return response;
    } catch (error) {
      console.error('Get available hospitals error:', error);
      throw error;
    }
  }

  // Get my affiliated hospitals
  async getMyHospitals(): Promise<ApiResponse<{
    hospitals: Hospital[];
    relationship_type: 'dependent' | 'independent' | null;
    total: number;
  }>> {
    try {
      const response = await apiClient.get('/profile/hospitals/my');
      return response;
    } catch (error) {
      console.error('Get my hospitals error:', error);
      throw error;
    }
  }

  // Get hospitals by code (for registration)
  async getHospitalsByCode(code: string): Promise<ApiResponse<Hospital[]>> {
    try {
      const response = await apiClient.get(`/profile/hospitals/by-code/${code}`);
      return response;
    } catch (error) {
      console.error('Get hospitals by code error:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const profileService = new ProfileService();
export default profileService;