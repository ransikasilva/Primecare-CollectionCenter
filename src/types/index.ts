// Types for TransFleet Collection Center App

export interface User {
  id: string;
  phone: string;
  user_type: 'collection_center';
  status: 'pending_registration' | 'pending_hospital_approval' | 'pending_hq_approval' | 'active' | 'inactive' | 'suspended';
  profile_complete: boolean;
  created_at: string;
  updated_at: string;
}

export interface CollectionCenter {
  id: string;
  user_id: string;
  center_name: string;
  center_type: 'laboratory' | 'clinic' | 'diagnostic_center' | 'hospital_lab';
  contact_person: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  province: string;
  postal_code: string;
  license_number: string;
  coordinates_lat: number;
  coordinates_lng: number;
  business_hours: any;
  emergency_contact: string;
  status: string;
  qr_code: string;
  created_at: string;
  updated_at: string;
  landline?: string;
  contact_person_phone?: string;
}

export interface Hospital {
  id: string;
  network_id: string;
  hospital_type: 'main' | 'regional';
  name: string;
  address: string;
  city: string;
  province: string;
  contact_phone: string;
  email: string;
  coordinates_lat: number;
  coordinates_lng: number;
  hospital_code: string;
  main_hospital_id?: string;
  is_main_hospital: boolean;
  status: string;
  distance?: number;
  rating?: number;
  delivery_count?: number;
}

export interface Order {
  id: string;
  order_number: string;
  center_id: string;
  hospital_id: string;
  rider_id?: string;
  sample_type: string;
  sample_quantity: number;
  urgency: 'routine' | 'urgent' | 'emergency';
  special_instructions?: string;
  status: string;
  created_at: string;
  updated_at: string;

  // Backend returns nested structure
  rider_info?: {
    name: string;
    phone: string;
    vehicle: {
      type: string;
      registration: string;
    };
    rating: number;
  };

  distance: {
    estimated_km: number;
    actual_km: number;
  };

  payment: {
    estimated: number;
    actual: number;
  };

  locations: {
    pickup: {
      lat: number;
      lng: number;
    };
    delivery: {
      lat: number;
      lng: number;
    };
  };

  timing: {
    created_at: string;
    assigned_at?: string;
    pickup_started_at?: string;
    picked_up_at?: string;
    delivery_started_at?: string;
    delivered_at?: string;
    estimated_pickup_time?: string;
    estimated_delivery_time?: string;
  };

  qr_code?: {
    qr_id: string;
    qr_data: any;
  };

  route_info?: any;

  // Flattened fields for backward compatibility
  rider_name?: string;
  rider_phone?: string;
  hospital_name?: string;
  estimated_distance_km?: number;
  estimated_payment?: number;
  estimated_pickup_time?: string;
  estimated_delivery_time?: string;
}

export interface QRCode {
  id: string;
  qr_id: string;
  qr_type: 'pickup' | 'delivery' | 'handover' | 'combined';
  order_id?: string;
  center_id?: string;
  hospital_id?: string;
  sample_type?: string;
  urgency?: string;
  security_hash: string;
  qr_data_json: any;
  status: string;
  expires_at?: string;
  created_at: string;
}

export interface Feature {
  id: string;
  feature_id: string;
  feature_name: string;
  description: string;
  enabled: boolean;
  enabled_at?: string;
  enabled_by?: string;
}

export interface CenterFeatures {
  sample_type_quantity: boolean;
  urgent_non_urgent: boolean;
  multi_hospital_selection: boolean;
}

export interface RegistrationFormData {
  // Personal Details
  center_name: string;
  full_name: string;
  phone: string;
  email: string;
  address: string;
  
  // Center Type
  center_type: 'dependent' | 'independent';
  
  // Hospital Selection
  selected_hospitals: string[];
  main_hospital_id?: string; // For dependent centers
  
  // Additional Info
  license_number?: string;
  emergency_contact?: string;
  business_hours?: any;
}

export interface CenterType {
  type: 'dependent' | 'independent';
  title: string;
  description: string;
  example: string;
  badge?: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

export interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  token: string | null;
  refreshToken: string | null;
}

export interface NavigationState {
  currentScreen: string;
  registrationStep: number;
  isLoading: boolean;
}

export interface Location {
  latitude: number;
  longitude: number;
  accuracy?: number;
  timestamp?: string;
}

export interface Rider {
  id: string;
  rider_name: string;
  phone: string;
  vehicle_type: string;
  vehicle_registration: string;
  rating: number;
  total_deliveries: number;
  current_location_lat?: number;
  current_location_lng?: number;
  availability_status: 'available' | 'busy' | 'offline' | 'on_break';
}

// Sample types available in the system
export const SAMPLE_TYPES = [
  'blood',
  'urine', 
  'tissue',
  'saliva',
  'stool',
  'other'
] as const;

export type SampleType = typeof SAMPLE_TYPES[number];

// Order statuses
export const ORDER_STATUSES = [
  'pending_rider_assignment',
  'assigned',
  'pickup_started', 
  'picked_up',
  'delivery_started',
  'delivered',
  'cancelled',
  'handover_pending',
  'handover_accepted',
  'handover_confirmed'
] as const;

export type OrderStatus = typeof ORDER_STATUSES[number];