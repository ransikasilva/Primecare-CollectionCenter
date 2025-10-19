import apiClient from './apiClient';
import { ApiResponse } from '../types';
import * as Location from 'expo-location';

export interface LocationCoordinates {
  lat: number;
  lng: number;
}

export interface DistanceResult {
  distance: string;
  duration: string;
  distanceValue: number; // in meters
  durationValue: number; // in seconds
}

export interface PlaceSearchResult {
  place_id: string;
  name: string;
  address: string;
  location: LocationCoordinates;
  types: string[];
}

class LocationService {
  // Calculate distance between two points using Google Maps API
  async calculateDistance(
    origin: LocationCoordinates,
    destination: LocationCoordinates
  ): Promise<DistanceResult> {
    try {
      // Use the Haversine formula for a quick approximation
      // This is a fallback if Google Maps API is not available
      const distance = this.haversineDistance(origin, destination);

      return {
        distance: `${distance.toFixed(1)} km`,
        duration: `${Math.round(distance * 2)} min`, // Rough estimate: 2 min per km
        distanceValue: distance * 1000, // Convert to meters
        durationValue: Math.round(distance * 2 * 60), // Convert to seconds
      };
    } catch (error) {
      console.error('Distance calculation error:', error);
      throw error;
    }
  }

  // Calculate distance between collection center and multiple hospitals
  async calculateDistancesToHospitals(
    centerLocation: LocationCoordinates,
    hospitals: any[]
  ): Promise<any[]> {
    try {
      const hospitalsWithDistance = await Promise.all(
        hospitals.map(async (hospital) => {
          if (hospital.coordinates) {
            try {
              const distanceResult = await this.calculateDistance(
                centerLocation,
                hospital.coordinates
              );

              return {
                ...hospital,
                distance: distanceResult.distance,
                duration: distanceResult.duration,
                distanceValue: distanceResult.distanceValue,
              };
            } catch (error) {
              console.error(`Distance calculation failed for hospital ${hospital.name}:`, error);
              return {
                ...hospital,
                distance: 'Unknown',
                duration: 'Unknown',
                distanceValue: 999999, // Large number for sorting
              };
            }
          } else {
            return {
              ...hospital,
              distance: 'Unknown',
              duration: 'Unknown',
              distanceValue: 999999,
            };
          }
        })
      );

      // Sort by distance (closest first)
      return hospitalsWithDistance.sort((a, b) => a.distanceValue - b.distanceValue);
    } catch (error) {
      console.error('Calculate distances to hospitals error:', error);
      throw error;
    }
  }

  // Haversine formula to calculate distance between two coordinates
  private haversineDistance(coord1: LocationCoordinates, coord2: LocationCoordinates): number {
    const R = 6371; // Radius of the Earth in kilometers
    const dLat = this.degreesToRadians(coord2.lat - coord1.lat);
    const dLng = this.degreesToRadians(coord2.lng - coord1.lng);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.degreesToRadians(coord1.lat)) *
        Math.cos(this.degreesToRadians(coord2.lat)) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c; // Distance in kilometers

    return distance;
  }

  private degreesToRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  // Search for places using the backend location API
  async searchPlaces(query: string, location?: LocationCoordinates, radius?: number): Promise<ApiResponse<PlaceSearchResult[]>> {
    try {
      const params: any = { query };
      if (location) {
        params.lat = location.lat;
        params.lng = location.lng;
      }
      if (radius) {
        params.radius = radius;
      }

      const response = await apiClient.get('/locations/search', params);
      return response;
    } catch (error) {
      console.error('Search places error:', error);
      throw error;
    }
  }

  // Get place details by place ID
  async getPlaceDetails(placeId: string): Promise<ApiResponse<any>> {
    try {
      const response = await apiClient.get(`/locations/places/${placeId}`);
      return response;
    } catch (error) {
      console.error('Get place details error:', error);
      throw error;
    }
  }

  // Forward geocode (address to coordinates)
  async geocodeAddress(address: string): Promise<ApiResponse<any>> {
    try {
      const response = await apiClient.get('/locations/geocode', { address });
      return response;
    } catch (error) {
      console.error('Geocode address error:', error);
      throw error;
    }
  }

  // Get current location using device GPS
  async getCurrentLocation(): Promise<LocationCoordinates> {
    try {
      // Request location permissions
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== 'granted') {
        throw new Error('Location access denied. Please enable location permissions.');
      }

      // Get current position
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      return {
        lat: location.coords.latitude,
        lng: location.coords.longitude,
      };
    } catch (error: any) {
      console.error('Get current location error:', error);
      throw new Error(error.message || 'Unable to get your location');
    }
  }

  // Get current location with high accuracy (for registration)
  async getCurrentLocationHighAccuracy(): Promise<LocationCoordinates> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by this device'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        (error) => {
          let errorMessage = 'Unable to get your precise location';
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage = 'Location access denied. Please enable location permissions in settings.';
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage = 'Precise location unavailable. Please ensure GPS is enabled.';
              break;
            case error.TIMEOUT:
              errorMessage = 'Location request timed out. Please try again or enter address manually.';
              break;
          }
          reject(new Error(errorMessage));
        },
        {
          enableHighAccuracy: true,
          timeout: 30000,
          maximumAge: 60000, // 1 minute
        }
      );
    });
  }

  // Reverse geocode coordinates to get address
  async reverseGeocode(coordinates: LocationCoordinates): Promise<string> {
    try {
      const response = await apiClient.get('/locations/reverse-geocode', {
        lat: coordinates.lat,
        lng: coordinates.lng,
      });

      if (response.success && response.data) {
        return response.data.formatted_address || 'Unknown location';
      }
      return 'Unknown location';
    } catch (error) {
      console.error('Reverse geocode error:', error);
      return 'Unknown location';
    }
  }

  // Get autocomplete suggestions for addresses
  async getAutocompleteSuggestions(
    input: string,
    location?: LocationCoordinates
  ): Promise<ApiResponse<any[]>> {
    try {
      const params: any = { input };
      if (location) {
        params.lat = location.lat;
        params.lng = location.lng;
      }

      const response = await apiClient.get('/locations/autocomplete', params);
      return response;
    } catch (error) {
      console.error('Autocomplete error:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const locationService = new LocationService();
export default locationService;