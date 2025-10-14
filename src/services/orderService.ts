import apiClient from './apiClient';
import { ApiResponse, Order, Hospital, SampleType } from '../types';

export interface CreateOrderRequest {
  hospital_id: string;
  sample_type: SampleType;
  sample_quantity?: number;
  urgency?: 'routine' | 'urgent' | 'emergency';
  special_instructions?: string;
}

export interface OrderFilters {
  status?: string;
  urgency?: string;
  date_from?: string;
  date_to?: string;
  limit?: number;
}

export interface DashboardMetrics {
  total_orders_today: number;
  in_transit_now: number;
  completed_deliveries: number;
  partner_hospitals: number;
  today_increase: number;
  in_transit_details: { with_riders: number; pending: number };
  completion_rate: number;
  hospitals_active: string;
}

class OrderService {

  // Create new order
  async createOrder(orderData: CreateOrderRequest): Promise<ApiResponse<Order>> {
    try {
      const response = await apiClient.post('/orders/create', orderData);
      return response;
    } catch (error) {
      console.error('Create order error:', error);
      throw error;
    }
  }

  // Get my orders with optional filters
  async getMyOrders(filters?: OrderFilters): Promise<ApiResponse<{
    orders: Order[];
    statistics: any;
    total: number;
  }>> {
    try {
      const response = await apiClient.get('/orders/my', filters);
      return response;
    } catch (error) {
      console.error('Get orders error:', error);
      throw error;
    }
  }

  // Get single order details
  async getOrderById(orderId: string): Promise<ApiResponse<{
    order: Order;
    status_history: any[];
    location_tracking: any[];
  }>> {
    try {
      const response = await apiClient.get(`/orders/${orderId}`);
      return response;
    } catch (error) {
      console.error('Get order details error:', error);
      throw error;
    }
  }

  // Cancel order
  async cancelOrder(orderId: string, reason: string, notes?: string): Promise<ApiResponse> {
    try {
      const response = await apiClient.post(`/orders/${orderId}/cancel`, {
        reason,
        notes
      });
      return response;
    } catch (error) {
      console.error('Cancel order error:', error);
      throw error;
    }
  }

  // Get available hospitals
  async getAvailableHospitals(): Promise<ApiResponse<Hospital[]>> {
    try {
      const response = await apiClient.get('/hospitals/available');
      return response;
    } catch (error) {
      console.error('Get hospitals error:', error);
      throw error;
    }
  }

  // Get dashboard metrics
  async getDashboardMetrics(): Promise<ApiResponse<DashboardMetrics>> {
    try {
      // Calculate metrics from existing orders
      const ordersResponse = await this.getMyOrders();

      if (ordersResponse.success && ordersResponse.data?.orders) {
        const orders = ordersResponse.data.orders;
        const today = new Date().toDateString();

        const todayOrders = orders.filter(order =>
          new Date(order.created_at).toDateString() === today
        );

        const inTransitOrders = orders.filter(order =>
          ['assigned', 'pickup_started', 'picked_up', 'delivery_started'].includes(order.status)
        );

        const completedOrders = orders.filter(order =>
          order.status === 'delivered' &&
          new Date(order.timing?.delivered_at || '').toDateString() === today
        );

        // Get unique hospitals
        const uniqueHospitals = new Set(orders.map(order => order.hospital_id));

        return {
          success: true,
          message: 'Dashboard metrics calculated successfully',
          data: {
            total_orders_today: todayOrders.length,
            in_transit_now: inTransitOrders.length,
            completed_deliveries: completedOrders.length,
            partner_hospitals: uniqueHospitals.size,
            today_increase: todayOrders.length > 0 ? 1 : 0, // Simple increase indicator
            in_transit_details: {
              with_riders: inTransitOrders.filter(o => o.rider_id).length,
              pending: inTransitOrders.filter(o => !o.rider_id).length
            },
            completion_rate: todayOrders.length > 0 ?
              Math.round((completedOrders.length / todayOrders.length) * 100) : 100,
            hospitals_active: `${uniqueHospitals.size} active`
          }
        };
      }

      throw new Error('Failed to calculate dashboard metrics');
    } catch (error) {
      console.error('Get dashboard metrics error:', error);
      throw error;
    }
  }

  // Get recent activity
  async getRecentActivity(): Promise<ApiResponse<any[]>> {
    try {
      // Get recent orders as activity
      const ordersResponse = await this.getMyOrders({ limit: 10 });

      if (ordersResponse.success && ordersResponse.data?.orders) {
        const recentActivity = ordersResponse.data.orders.map(order => ({
          id: order.id,
          type: 'order',
          title: `${order.sample_type} sample ${order.status.replace('_', ' ')}`,
          description: `Order ${order.order_number} - ${order.hospital_name}`,
          timestamp: order.updated_at || order.created_at,
          status: order.status,
          icon: order.urgency === 'urgent' ? 'urgent' : 'normal'
        }));

        return {
          success: true,
          message: 'Recent activity retrieved successfully',
          data: recentActivity
        };
      }

      throw new Error('Failed to get recent activity');
    } catch (error) {
      console.error('Get recent activity error:', error);
      throw error;
    }
  }

  // Get active orders (in transit)
  async getActiveOrders(): Promise<ApiResponse<Order[]>> {
    try {
      const response = await apiClient.get('/orders/my', {
        status: 'assigned,pickup_started,picked_up,delivery_started'
      });
      return response;
    } catch (error) {
      console.error('Get active orders error:', error);
      throw error;
    }
  }

  // Get completed orders (history)
  async getCompletedOrders(limit?: number): Promise<ApiResponse<Order[]>> {
    try {
      const response = await apiClient.get('/orders/my', {
        status: 'delivered,cancelled',
        limit
      });
      return response;
    } catch (error) {
      console.error('Get completed orders error:', error);
      throw error;
    }
  }

  // Track order real-time (for rider location updates)
  async getOrderTracking(orderId: string): Promise<ApiResponse<{
    rider_location: { lat: number; lng: number; timestamp: string };
    estimated_arrival: string;
    status: string;
  }>> {
    try {
      // Use operations endpoint to get tracking info with location data
      const response = await apiClient.get(`/operations/orders/${orderId}/details`);

      if (response.success && response.data?.order) {
        const order = response.data.order;
        const locationTracking = response.data.location_tracking || [];

        // Get latest location from tracking data
        const latestLocation = locationTracking.length > 0
          ? locationTracking[locationTracking.length - 1]
          : null;

        // Also check rider's current location from order data
        const riderCurrentLat = order.rider_current_location?.lat;
        const riderCurrentLng = order.rider_current_location?.lng;

        return {
          success: true,
          message: 'Order tracking retrieved successfully',
          data: {
            rider_location: latestLocation ? {
              lat: parseFloat(latestLocation.location_lat),
              lng: parseFloat(latestLocation.location_lng),
              timestamp: latestLocation.recorded_at
            } : (riderCurrentLat && riderCurrentLng) ? {
              lat: parseFloat(riderCurrentLat),
              lng: parseFloat(riderCurrentLng),
              timestamp: order.rider_current_location?.updated_at || new Date().toISOString()
            } : {
              lat: 0,
              lng: 0,
              timestamp: new Date().toISOString()
            },
            estimated_arrival: order.timing?.estimated_delivery_time || order.estimated_delivery_time || 'N/A',
            status: order.status
          }
        };
      }

      throw new Error('Order not found');
    } catch (error) {
      console.error('Get order tracking error:', error);
      throw error;
    }
  }

  // Get available routes for optimization
  async getAvailableRoutes(orderId: string): Promise<ApiResponse<any[]>> {
    try {
      const response = await apiClient.get(`/orders/${orderId}/available-routes`);
      return response;
    } catch (error) {
      console.error('Get available routes error:', error);
      throw error;
    }
  }

  // Join existing route
  async joinExistingRoute(orderId: string, routeId: string): Promise<ApiResponse> {
    try {
      const response = await apiClient.post('/orders/join-route', {
        order_id: orderId,
        route_id: routeId
      });
      return response;
    } catch (error) {
      console.error('Join route error:', error);
      throw error;
    }
  }

  // Get QR code for order
  async getOrderQR(orderId: string): Promise<ApiResponse<{
    qr_id: string;
    qr_data: string;
    qr_image?: string;
  }>> {
    try {
      // Use existing QR endpoint: GET /api/qr/order/:order_id
      const response = await apiClient.get(`/qr/order/${orderId}`);

      // Transform response to match expected format
      if (response.success && response.data.qr_codes?.length > 0) {
        const pickupQR = response.data.qr_codes.find((qr: any) => qr.qr_type === 'pickup');
        if (pickupQR) {
          return {
            success: true,
            message: 'QR code retrieved successfully',
            data: {
              qr_id: pickupQR.qr_id,
              qr_data: JSON.stringify({
                qr_id: pickupQR.qr_id,
                type: 'pickup',
                order_id: response.data.order_id,
                created_at: pickupQR.created_at
              }), // Generate QR data string for React Native QR library
              qr_image: undefined // Will be generated on frontend
            }
          };
        }
      }

      throw new Error('No pickup QR code found for order');
    } catch (error) {
      console.error('Get order QR error:', error);
      throw error;
    }
  }

  // Contact rider
  async contactRider(orderId: string): Promise<ApiResponse<{
    rider_name: string;
    rider_phone: string;
  }>> {
    try {
      // Use existing order endpoint to get rider info
      const response = await this.getOrderById(orderId);

      if (response.success && response.data?.order?.rider_id) {
        const order = response.data.order;
        return {
          success: true,
          message: 'Rider contact retrieved successfully',
          data: {
            rider_name: order.rider_info?.name || order.rider_name || 'Rider',
            rider_phone: order.rider_info?.phone || order.rider_phone || 'N/A'
          }
        };
      }

      throw new Error('No rider assigned to this order');
    } catch (error) {
      console.error('Get rider contact error:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const orderService = new OrderService();
export default orderService;