import apiClient from './apiClient';
import { ApiResponse } from '../types';

export interface Feature {
  feature_id: string;
  feature_name: string;
  description: string;
  enabled: boolean;
  enabled_at?: string;
  enabled_by?: string;
  status: 'approved' | 'requested' | 'rejected' | 'disabled';
}

export interface CenterFeatures {
  sample_type_quantity: boolean;
  urgent_delivery: boolean;
  multi_parcel: boolean;
}

class FeatureService {
  // Get my enabled features
  async getMyFeatures(): Promise<ApiResponse<{
    features: Feature[];
    summary: CenterFeatures;
  }>> {
    try {
      const response = await apiClient.get('/features/my-features');
      return response;
    } catch (error) {
      console.error('Get my features error:', error);
      throw error;
    }
  }

  // Request a feature for my center
  async requestFeature(featureId: string, justification?: string): Promise<ApiResponse> {
    try {
      const response = await apiClient.post('/features/request', {
        feature_id: featureId,
        justification
      });
      return response;
    } catch (error) {
      console.error('Request feature error:', error);
      throw error;
    }
  }

  // Get all available features
  async getAllFeatures(): Promise<ApiResponse<{
    features: Feature[];
    total: number;
  }>> {
    try {
      const response = await apiClient.get('/features');
      return response;
    } catch (error) {
      console.error('Get all features error:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const featureService = new FeatureService();
export default featureService;