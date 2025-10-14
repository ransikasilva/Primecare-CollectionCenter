import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  Alert,
  Linking,
} from 'react-native';
import {
  ArrowLeft,
  Copy,
  Phone,
  MapPin,
  Clock,
  Package2,
  Building2,
  User,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Eye,
  Download,
  Navigation,
  Star,
  Truck,
  QrCode,
  Shield,
  Calendar,
  Timer,
} from 'lucide-react-native';
import { COLORS, TYPOGRAPHY, SPACING, SHADOWS, LAYOUT } from '../theme/design-system';
import MainLayout from '../components/MainLayout';
import { orderService } from '../services/orderService';

interface OrderDetailsScreenProps {
  orderId: string;
  onBack: () => void;
  onTabPress?: (tab: 'home' | 'deliveries' | 'history' | 'profile') => void;
}

interface OrderDetails {
  id: string;
  order_number: string;
  center_name: string;
  hospital_name: string;
  network_name: string;
  sample_type: string;
  sample_quantity: number;
  urgency: 'routine' | 'urgent' | 'emergency';
  status: string;
  special_instructions?: string;
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
  locations: {
    pickup: { lat: number; lng: number };
    delivery: { lat: number; lng: number };
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
}

interface ChainOfCustodyItem {
  scan_id: string;
  scan_type: 'pickup' | 'handover' | 'delivery';
  scanner_name: string;
  scanner_phone: string;
  scanner_type: string;
  scan_location?: string;
  coordinates?: { lat: number; lng: number };
  scan_successful: boolean;
  scan_notes?: string;
  scanned_at: string;
}

interface StatusHistoryItem {
  status: string;
  previous_status: string | null;
  changed_by_name: string;
  changed_at: string;
  notes?: string;
}

const OrderDetailsScreen: React.FC<OrderDetailsScreenProps> = ({
  orderId,
  onBack,
  onTabPress,
}) => {
  const [orderDetails, setOrderDetails] = useState<OrderDetails | null>(null);
  const [chainOfCustody, setChainOfCustody] = useState<ChainOfCustodyItem[]>([]);
  const [statusHistory, setStatusHistory] = useState<StatusHistoryItem[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'details' | 'custody' | 'history'>('details');

  useEffect(() => {
    loadOrderDetails();
  }, [orderId]);

  const loadOrderDetails = async () => {
    try {
      setLoading(true);

      // Get order details from backend
      const orderResponse = await orderService.getOrderById(orderId);
      if (orderResponse.success && orderResponse.data) {
        const order = orderResponse.data.order;
        const statusHistory = orderResponse.data.status_history || [];

        // Transform backend order to OrderDetails format
        const orderDetails: OrderDetails = {
          id: order.id,
          order_number: order.order_number,
          center_name: (order as any).center_name || 'Collection Center',
          hospital_name: order.hospital_name || 'Hospital',
          network_name: (order as any).network_name || 'Hospital Network',
          sample_type: order.sample_type,
          sample_quantity: order.sample_quantity || 1,
          urgency: order.urgency || 'routine',
          status: order.status,
          special_instructions: order.special_instructions,
          rider_info: order.rider_info ? {
            name: order.rider_info.name || order.rider_name || 'No rider assigned',
            phone: order.rider_info.phone || order.rider_phone || '',
            vehicle: {
              type: order.rider_info.vehicle?.type || 'Vehicle',
              registration: order.rider_info.vehicle?.registration || 'N/A'
            },
            rating: 0 // Rating not available in current backend
          } : undefined,
          distance: {
            estimated_km: order.estimated_distance_km || 0,
            actual_km: (order as any).actual_distance_km || 0
          },
          locations: {
            pickup: {
              lat: (order as any).pickup_location_lat || 0,
              lng: (order as any).pickup_location_lng || 0
            },
            delivery: {
              lat: (order as any).delivery_location_lat || 0,
              lng: (order as any).delivery_location_lng || 0
            }
          },
          timing: {
            created_at: order.created_at,
            assigned_at: (order as any).assigned_at,
            pickup_started_at: (order as any).pickup_started_at,
            picked_up_at: (order as any).picked_up_at,
            delivery_started_at: (order as any).delivery_started_at,
            delivered_at: (order as any).delivered_at,
            estimated_pickup_time: (order as any).estimated_pickup_time,
            estimated_delivery_time: (order as any).estimated_delivery_time
          },
          qr_code: order.qr_code ? {
            qr_id: order.qr_code.qr_id,
            qr_data: order.qr_code.qr_data
          } : undefined
        };

        // Transform status history
        const transformedStatusHistory: StatusHistoryItem[] = statusHistory.map((item: any) => ({
          status: item.status,
          previous_status: item.previous_status,
          changed_by_name: item.changed_by_name || 'System',
          changed_at: item.changed_at,
          notes: item.notes
        }));

        setOrderDetails(orderDetails);
        setStatusHistory(transformedStatusHistory);

        // Get QR chain of custody if available
        if (order.qr_code?.qr_id) {
          try {
            // TODO: Implement QR chain of custody endpoint when available
            // const custodyResponse = await orderService.getQRChainOfCustody(order.qr_code.qr_id);
            // For now, we'll leave chain of custody empty or create from available data
            setChainOfCustody([]);
          } catch (error) {
            console.log('QR chain of custody not available:', error);
            setChainOfCustody([]);
          }
        }
      }

    } catch (error) {
      console.error('Failed to load order details:', error);
      Alert.alert('Error', 'Failed to load order details');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadOrderDetails();
    setRefreshing(false);
  };

  const copyOrderNumber = () => {
    // In real app, copy to clipboard
    Alert.alert('Copied', 'Order number copied to clipboard');
  };

  const openMaps = () => {
    if (orderDetails?.locations.delivery) {
      const { lat, lng } = orderDetails.locations.delivery;
      const url = `https://maps.google.com/?q=${lat},${lng}`;
      Linking.openURL(url);
    }
  };

  const callRider = () => {
    if (orderDetails?.rider_info?.phone) {
      Linking.openURL(`tel:${orderDetails.rider_info.phone}`);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'delivered': return COLORS.success;
      case 'cancelled': return COLORS.error;
      case 'picked_up':
      case 'delivery_started': return COLORS.primary;
      case 'assigned':
      case 'pickup_started': return COLORS.warning;
      default: return COLORS.textSecondary;
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'emergency': return COLORS.error;
      case 'urgent': return COLORS.warning;
      case 'routine': return COLORS.success;
      default: return COLORS.textSecondary;
    }
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString(),
      time: date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      })
    };
  };

  const calculateDuration = (startTime?: string, endTime?: string) => {
    if (!startTime || !endTime) return 'N/A';
    const start = new Date(startTime).getTime();
    const end = new Date(endTime).getTime();
    const diffMinutes = Math.floor((end - start) / (1000 * 60));

    if (diffMinutes < 60) {
      return `${diffMinutes} min`;
    } else {
      const hours = Math.floor(diffMinutes / 60);
      const minutes = diffMinutes % 60;
      return `${hours}h ${minutes}m`;
    }
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity style={styles.backButton} onPress={onBack}>
        <ArrowLeft size={24} color={COLORS.textPrimary} />
      </TouchableOpacity>

      <View style={styles.headerCenter}>
        <Text style={styles.headerTitle}>Order Details</Text>
        <Text style={styles.headerSubtitle}>{orderDetails?.order_number}</Text>
      </View>

      <View style={styles.headerActions}>
        <TouchableOpacity style={styles.headerAction} onPress={copyOrderNumber}>
          <Copy size={20} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.headerAction}>
          <Download size={20} color={COLORS.textPrimary} />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderStatusCard = () => {
    if (!orderDetails) return null;

    const isDelivered = orderDetails.status === 'delivered';
    const isCancelled = orderDetails.status === 'cancelled';

    return (
      <View style={[
        styles.statusCard,
        { borderLeftColor: getStatusColor(orderDetails.status) }
      ]}>
        <View style={styles.statusHeader}>
          <View style={styles.statusIconContainer}>
            {isDelivered ? (
              <CheckCircle size={24} color={COLORS.success} />
            ) : isCancelled ? (
              <XCircle size={24} color={COLORS.error} />
            ) : (
              <Clock size={24} color={COLORS.warning} />
            )}
          </View>

          <View style={styles.statusInfo}>
            <Text style={[styles.statusText, { color: getStatusColor(orderDetails.status) }]}>
              {orderDetails.status === 'delivered' ? 'Delivered Successfully' :
               orderDetails.status === 'cancelled' ? 'Order Cancelled' :
               'In Progress'}
            </Text>
            {orderDetails.timing.delivered_at && (
              <Text style={styles.statusTime}>
                {formatDateTime(orderDetails.timing.delivered_at).date} at{' '}
                {formatDateTime(orderDetails.timing.delivered_at).time}
              </Text>
            )}
          </View>

          <View style={[
            styles.urgencyBadge,
            { backgroundColor: getUrgencyColor(orderDetails.urgency) + '20' }
          ]}>
            <Text style={[
              styles.urgencyText,
              { color: getUrgencyColor(orderDetails.urgency) }
            ]}>
              {orderDetails.urgency.toUpperCase()}
            </Text>
          </View>
        </View>

        {isDelivered && (
          <View style={styles.deliveryMetrics}>
            <View style={styles.metricItem}>
              <Timer size={16} color={COLORS.textSecondary} />
              <Text style={styles.metricText}>
                {calculateDuration(orderDetails.timing.pickup_started_at, orderDetails.timing.delivered_at)} total time
              </Text>
            </View>
            <View style={styles.metricItem}>
              <Navigation size={16} color={COLORS.textSecondary} />
              <Text style={styles.metricText}>
                {orderDetails.distance.actual_km} km traveled
              </Text>
            </View>
          </View>
        )}
      </View>
    );
  };

  const renderTabNavigation = () => (
    <View style={styles.tabContainer}>
      <TouchableOpacity
        style={[styles.tab, activeTab === 'details' && styles.activeTab]}
        onPress={() => setActiveTab('details')}
      >
        <Eye size={16} color={activeTab === 'details' ? COLORS.white : COLORS.textSecondary} />
        <Text style={[
          styles.tabText,
          activeTab === 'details' && styles.activeTabText
        ]} numberOfLines={1}>Details</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.tab, activeTab === 'custody' && styles.activeTab]}
        onPress={() => setActiveTab('custody')}
      >
        <Shield size={16} color={activeTab === 'custody' ? COLORS.white : COLORS.textSecondary} />
        <Text style={[
          styles.tabText,
          activeTab === 'custody' && styles.activeTabText
        ]} numberOfLines={1} adjustsFontSizeToFit>Chain of Custody</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.tab, activeTab === 'history' && styles.activeTab]}
        onPress={() => setActiveTab('history')}
      >
        <Calendar size={16} color={activeTab === 'history' ? COLORS.white : COLORS.textSecondary} />
        <Text style={[
          styles.tabText,
          activeTab === 'history' && styles.activeTabText
        ]} numberOfLines={1}>History</Text>
      </TouchableOpacity>
    </View>
  );

  const renderDetailsTab = () => {
    if (!orderDetails) return null;

    return (
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Order Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Order Information</Text>

          <View style={styles.infoRow}>
            <Package2 size={20} color={COLORS.primary} />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Sample Type & Quantity</Text>
              <Text style={styles.infoValue}>
                {orderDetails.sample_quantity} {orderDetails.sample_type} samples
              </Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <Building2 size={20} color={COLORS.info} />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Destination Hospital</Text>
              <Text style={styles.infoValue}>{orderDetails.hospital_name}</Text>
              <Text style={styles.infoSubValue}>{orderDetails.network_name}</Text>
            </View>
          </View>

          {orderDetails.special_instructions && (
            <View style={styles.infoRow}>
              <AlertTriangle size={20} color={COLORS.warning} />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Special Instructions</Text>
                <Text style={styles.infoValue}>{orderDetails.special_instructions}</Text>
              </View>
            </View>
          )}
        </View>

        {/* Rider Information */}
        {orderDetails.rider_info && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Rider Information</Text>

            <View style={styles.riderCard}>
              <View style={styles.riderHeader}>
                <View style={styles.riderAvatar}>
                  <Text style={styles.riderInitials}>
                    {orderDetails.rider_info.name.split(' ').map(n => n[0]).join('')}
                  </Text>
                </View>

                <View style={styles.riderInfo}>
                  <Text style={styles.riderName}>{orderDetails.rider_info.name}</Text>
                  <View style={styles.riderRating}>
                    <Star size={14} color={COLORS.warning} fill={COLORS.warning} />
                    <Text style={styles.ratingText}>{orderDetails.rider_info.rating}</Text>
                  </View>
                </View>

                <TouchableOpacity style={styles.callButton} onPress={callRider}>
                  <Phone size={18} color={COLORS.white} />
                </TouchableOpacity>
              </View>

              <View style={styles.vehicleInfo}>
                <Truck size={16} color={COLORS.textSecondary} />
                <Text style={styles.vehicleText}>
                  {orderDetails.rider_info.vehicle.type} • {orderDetails.rider_info.vehicle.registration}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Distance Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Distance Information</Text>

          <View style={styles.metricsGrid}>
            <View style={styles.metricCard}>
              <Text style={styles.metricValue}>{orderDetails.distance.actual_km} km</Text>
              <Text style={styles.metricLabel}>Distance Traveled</Text>
              <Text style={styles.metricSubtext}>
                Est: {orderDetails.distance.estimated_km} km
              </Text>
            </View>
          </View>
        </View>

        {/* QR Code Information */}
        {orderDetails.qr_code && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>QR Code Information</Text>

            <View style={styles.qrInfo}>
              <QrCode size={24} color={COLORS.primary} />
              <View style={styles.qrDetails}>
                <Text style={styles.qrId}>QR ID: {orderDetails.qr_code.qr_id}</Text>
                <Text style={styles.qrStatus}>Status: Active</Text>
              </View>
            </View>
          </View>
        )}

        {/* Location Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Locations</Text>

          <TouchableOpacity style={styles.locationCard} onPress={openMaps}>
            <MapPin size={20} color={COLORS.success} />
            <View style={styles.locationInfo}>
              <Text style={styles.locationLabel}>Pickup Location</Text>
              <Text style={styles.locationValue}>{orderDetails.center_name}</Text>
            </View>
            <Navigation size={16} color={COLORS.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.locationCard} onPress={openMaps}>
            <MapPin size={20} color={COLORS.error} />
            <View style={styles.locationInfo}>
              <Text style={styles.locationLabel}>Delivery Location</Text>
              <Text style={styles.locationValue}>{orderDetails.hospital_name}</Text>
            </View>
            <Navigation size={16} color={COLORS.textSecondary} />
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  };

  const renderChainOfCustodyTab = () => (
    <ScrollView showsVerticalScrollIndicator={false}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Chain of Custody</Text>
        <Text style={styles.sectionSubtitle}>
          Complete tracking record of QR code scans
        </Text>

        {chainOfCustody.map((item, index) => (
          <View key={item.scan_id} style={styles.custodyItem}>
            <View style={styles.custodyTimeline}>
              <View style={[
                styles.custodyDot,
                { backgroundColor: item.scan_successful ? COLORS.success : COLORS.error }
              ]} />
              {index < chainOfCustody.length - 1 && <View style={styles.custodyLine} />}
            </View>

            <View style={styles.custodyContent}>
              <View style={styles.custodyHeader}>
                <Text style={styles.custodyType}>
                  {item.scan_type === 'pickup' ? 'Package Collected' :
                   item.scan_type === 'handover' ? 'Rider Handover' :
                   'Package Delivered'}
                </Text>
                <Text style={styles.custodyTime}>
                  {formatDateTime(item.scanned_at).time}
                </Text>
              </View>

              <View style={styles.custodyDetails}>
                <Text style={styles.custodyScanner}>
                  {item.scanner_name} • {item.scanner_type}
                </Text>
                {item.scan_location && (
                  <Text style={styles.custodyLocation}>
                    📍 {item.scan_location}
                  </Text>
                )}
                {item.scan_notes && (
                  <Text style={styles.custodyNotes}>{item.scan_notes}</Text>
                )}
              </View>

              <View style={styles.custodyFooter}>
                <Text style={styles.custodyDate}>
                  {formatDateTime(item.scanned_at).date}
                </Text>
                <View style={[
                  styles.custodyStatus,
                  { backgroundColor: item.scan_successful ? COLORS.success + '20' : COLORS.error + '20' }
                ]}>
                  <Text style={[
                    styles.custodyStatusText,
                    { color: item.scan_successful ? COLORS.success : COLORS.error }
                  ]}>
                    {item.scan_successful ? 'Verified' : 'Failed'}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );

  const renderHistoryTab = () => (
    <ScrollView showsVerticalScrollIndicator={false}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Order Status History</Text>
        <Text style={styles.sectionSubtitle}>
          Complete timeline of status changes
        </Text>

        {statusHistory.map((item, index) => (
          <View key={`${item.status}_${index}`} style={styles.historyItem}>
            <View style={styles.historyTimeline}>
              <View style={[
                styles.historyDot,
                { backgroundColor: getStatusColor(item.status) }
              ]} />
              {index < statusHistory.length - 1 && <View style={styles.historyLine} />}
            </View>

            <View style={styles.historyContent}>
              <View style={styles.historyHeader}>
                <Text style={[styles.historyStatus, { color: getStatusColor(item.status) }]}>
                  {item.status.replace(/_/g, ' ').toUpperCase()}
                </Text>
                <Text style={styles.historyTime}>
                  {formatDateTime(item.changed_at).time}
                </Text>
              </View>

              <Text style={styles.historyChanger}>
                Changed by: {item.changed_by_name}
              </Text>

              {item.notes && (
                <Text style={styles.historyNotes}>{item.notes}</Text>
              )}

              <Text style={styles.historyDate}>
                {formatDateTime(item.changed_at).date}
              </Text>
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'details': return renderDetailsTab();
      case 'custody': return renderChainOfCustodyTab();
      case 'history': return renderHistoryTab();
      default: return renderDetailsTab();
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />
        {renderHeader()}
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading order details...</Text>
        </View>
      </View>
    );
  }

  const handleTabPress = (tab: 'home' | 'deliveries' | 'history' | 'profile') => {
    if (onTabPress) {
      onTabPress(tab);
    }
  };

  return (
    <MainLayout
      activeTab={orderId?.includes('delivery') ? 'deliveries' : 'history'}
      onTabPress={handleTabPress}
    >
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />

        {renderHeader()}

        <ScrollView
          style={styles.content}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          showsVerticalScrollIndicator={false}
        >
          {renderStatusCard()}
          {renderTabNavigation()}
          <View style={styles.tabContent}>
            {renderContent()}
          </View>
        </ScrollView>
      </View>
    </MainLayout>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray100,
  },
  backButton: {
    padding: SPACING.xs,
  },
  headerCenter: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  headerSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  headerAction: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.gray50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
  },
  statusCard: {
    backgroundColor: COLORS.white,
    marginHorizontal: SPACING.lg,
    marginVertical: SPACING.md,
    borderRadius: LAYOUT.radius.lg,
    padding: SPACING.lg,
    borderLeftWidth: 4,
    ...SHADOWS.card,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  statusIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.gray50,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  statusInfo: {
    flex: 1,
  },
  statusText: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: SPACING.xs,
  },
  statusTime: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  urgencyBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: LAYOUT.radius.sm,
  },
  urgencyText: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  deliveryMetrics: {
    flexDirection: 'row',
    gap: SPACING.lg,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray200,
  },
  metricItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  metricText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    marginHorizontal: SPACING.lg,
    borderRadius: LAYOUT.radius.lg,
    padding: SPACING.xs,
    marginBottom: SPACING.md,
    ...SHADOWS.sm,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xs,
    borderRadius: LAYOUT.radius.md,
    gap: SPACING.xs,
    minHeight: 40,
  },
  activeTab: {
    backgroundColor: COLORS.primary,
  },
  tabText: {
    fontSize: 11,
    fontWeight: '500',
    color: COLORS.textSecondary,
    textAlign: 'center',
    flexShrink: 1,
  },
  activeTabText: {
    color: COLORS.white,
  },
  tabContent: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.massive,
  },
  section: {
    backgroundColor: COLORS.white,
    borderRadius: LAYOUT.radius.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    ...SHADOWS.card,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: SPACING.lg,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: SPACING.lg,
  },
  infoContent: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  infoLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.textPrimary,
  },
  infoSubValue: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
  riderCard: {
    borderRadius: LAYOUT.radius.md,
    borderWidth: 1,
    borderColor: COLORS.gray200,
    padding: SPACING.md,
  },
  riderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  riderAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  riderInitials: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.white,
  },
  riderInfo: {
    flex: 1,
  },
  riderName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  riderRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  ratingText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  callButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vehicleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray200,
  },
  vehicleText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  metricsGrid: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  metricCard: {
    flex: 1,
    backgroundColor: COLORS.gray50,
    borderRadius: LAYOUT.radius.md,
    padding: SPACING.md,
    alignItems: 'center',
  },
  metricValue: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  metricLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SPACING.xs,
  },
  metricSubtext: {
    fontSize: 10,
    color: COLORS.textTertiary,
    textAlign: 'center',
  },
  qrInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    backgroundColor: COLORS.gray50,
    borderRadius: LAYOUT.radius.md,
  },
  qrDetails: {
    marginLeft: SPACING.md,
  },
  qrId: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.textPrimary,
  },
  qrStatus: {
    fontSize: 12,
    color: COLORS.success,
    marginTop: SPACING.xs,
  },
  locationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    borderRadius: LAYOUT.radius.md,
    borderWidth: 1,
    borderColor: COLORS.gray200,
    marginBottom: SPACING.sm,
  },
  locationInfo: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  locationLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  locationValue: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.textPrimary,
  },
  custodyItem: {
    flexDirection: 'row',
    marginBottom: SPACING.lg,
  },
  custodyTimeline: {
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  custodyDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginBottom: SPACING.xs,
  },
  custodyLine: {
    width: 2,
    flex: 1,
    backgroundColor: COLORS.gray300,
    minHeight: 40,
  },
  custodyContent: {
    flex: 1,
    backgroundColor: COLORS.gray50,
    borderRadius: LAYOUT.radius.md,
    padding: SPACING.md,
  },
  custodyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  custodyType: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  custodyTime: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  custodyDetails: {
    marginBottom: SPACING.sm,
  },
  custodyScanner: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  custodyLocation: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  custodyNotes: {
    fontSize: 12,
    color: COLORS.textPrimary,
    fontStyle: 'italic',
  },
  custodyFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  custodyDate: {
    fontSize: 10,
    color: COLORS.textTertiary,
  },
  custodyStatus: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: LAYOUT.radius.sm,
  },
  custodyStatusText: {
    fontSize: 10,
    fontWeight: '600',
  },
  historyItem: {
    flexDirection: 'row',
    marginBottom: SPACING.lg,
  },
  historyTimeline: {
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  historyDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginBottom: SPACING.xs,
  },
  historyLine: {
    width: 2,
    flex: 1,
    backgroundColor: COLORS.gray300,
    minHeight: 30,
  },
  historyContent: {
    flex: 1,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  historyStatus: {
    fontSize: 14,
    fontWeight: '600',
  },
  historyTime: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  historyChanger: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  historyNotes: {
    fontSize: 12,
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
    fontStyle: 'italic',
  },
  historyDate: {
    fontSize: 10,
    color: COLORS.textTertiary,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: COLORS.textSecondary,
  },
});

export default OrderDetailsScreen;