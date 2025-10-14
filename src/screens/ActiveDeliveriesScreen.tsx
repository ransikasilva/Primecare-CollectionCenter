import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  Linking,
  Alert,
} from 'react-native';
import { orderService } from '../services/orderService';
import {
  ArrowLeft,
  RefreshCw,
  Phone,
  Clock,
  MapPin,
  Zap,
} from 'lucide-react-native';
import { COLORS, SPACING, SHADOWS, LAYOUT } from '../theme/design-system';
import MainLayout from '../components/MainLayout';

interface ActiveDeliveriesScreenProps {
  onBack: () => void;
  onDeliveryPress: (deliveryId: string) => void;
  onTabPress?: (tab: 'home' | 'deliveries' | 'history' | 'profile') => void;
}

interface Delivery {
  id: string;
  orderId: string;
  hospitalName: string;
  sampleInfo: string;
  riderName: string;
  riderPhone: string;
  timeAway: string;
  distanceRemaining: string;
  priority: 'urgent' | 'routine';
  status: 'awaiting_riders' | 'being_delivered' | 'priority_delivery';
  statusColor: string;
  hasSampleTypeFeature: boolean;
}

interface StatusCount {
  awaiting: number;
  beingDelivered: number;
  priority: number;
}


const ActiveDeliveriesScreen: React.FC<ActiveDeliveriesScreenProps> = ({
  onBack,
  onDeliveryPress,
  onTabPress,
}) => {
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load active deliveries from backend
  const loadActiveDeliveries = async () => {
    try {
      setIsLoading(true);
      const response = await orderService.getMyOrders();

      if (response.success && response.data?.orders) {
        // Filter only active orders (not delivered/cancelled)
        const activeOrders = response.data.orders.filter(order =>
          ['pending_rider_assignment', 'assigned', 'pickup_started', 'picked_up', 'delivery_started'].includes(order.status)
        );

        // Transform backend orders to delivery format
        const transformedDeliveries: Delivery[] = activeOrders.map(order => ({
          id: order.id,
          orderId: order.order_number,
          hospitalName: order.hospital_name || 'Hospital',
          sampleInfo: `${order.sample_quantity || 1} ${order.sample_type} samples`,
          riderName: order.rider_info?.name || order.rider_name || 'No rider assigned',
          riderPhone: order.rider_info?.phone || order.rider_phone || '',
          timeAway: 'En route',
          distanceRemaining: `${order.distance?.estimated_km || order.estimated_distance_km || 0} km remaining`,
          priority: (order.urgency === 'urgent' || order.urgency === 'emergency') ? 'urgent' : 'routine',
          status: getDeliveryStatus(order.status),
          statusColor: getStatusColor(order.status),
          hasSampleTypeFeature: true, // Check if center has sample type feature enabled
        }));

        setDeliveries(transformedDeliveries);
        setLastUpdated(new Date());
      }
    } catch (error) {
      console.error('Failed to load active deliveries:', error);
      Alert.alert('Error', 'Failed to load deliveries');
    } finally {
      setIsLoading(false);
    }
  };

  // Helper function to map backend status to delivery status
  const getDeliveryStatus = (backendStatus: string): 'awaiting_riders' | 'being_delivered' | 'priority_delivery' => {
    switch (backendStatus) {
      case 'pending_rider_assignment':
      case 'assigned':
      case 'pickup_started':
        return 'awaiting_riders';
      case 'picked_up':
      case 'delivery_started':
        return 'being_delivered';
      default:
        return 'being_delivered';
    }
  };

  // Helper function to get status color
  const getStatusColor = (backendStatus: string): string => {
    switch (backendStatus) {
      case 'pending_rider_assignment':
        return COLORS.error; // Red for orders waiting for rider
      case 'assigned':
      case 'pickup_started':
        return COLORS.warning; // Orange for orders with rider assigned
      case 'picked_up':
      case 'delivery_started':
        return COLORS.primary; // Blue for orders being delivered
      default:
        return COLORS.textSecondary;
    }
  };

  // Calculate counts from real data
  const getStatusCounts = (): StatusCount => {
    const awaiting = deliveries.filter(d => d.status === 'awaiting_riders').length;
    const beingDelivered = deliveries.filter(d => d.status === 'being_delivered').length;
    const priority = deliveries.filter(d => d.priority === 'urgent').length;

    return { awaiting, beingDelivered, priority };
  };


  // Load data on component mount
  useEffect(() => {
    loadActiveDeliveries();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadActiveDeliveries();
    setRefreshing(false);
  };

  const handleCall = (phoneNumber: string) => {
    const url = `tel:${phoneNumber}`;
    Linking.openURL(url).catch(() => {
      Alert.alert('Error', 'Unable to make phone call');
    });
  };

  // Show all active deliveries without filtering
  const filteredDeliveries = deliveries;

  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity style={styles.backButton} onPress={onBack}>
        <ArrowLeft size={24} color={COLORS.textPrimary} />
      </TouchableOpacity>

      <View style={styles.headerCenter}>
        <Text style={styles.headerTitle}>Active Deliveries</Text>
        <Text style={styles.headerSubtitle}>{deliveries.length} deliveries in progress</Text>
      </View>

      <View style={styles.headerActions}>
        <TouchableOpacity style={styles.headerAction} onPress={onRefresh}>
          <RefreshCw size={20} color={COLORS.textPrimary} />
        </TouchableOpacity>
      </View>
    </View>
  );


  const renderStatusCards = () => {
    const statusCounts = getStatusCounts();

    return (
      <View style={styles.statusCardsContainer}>
        <View style={styles.statusCard}>
          <Text style={[styles.statusNumber, { color: COLORS.warning }]}>{statusCounts.awaiting}</Text>
          <Clock size={16} color={COLORS.warning} />
          <Text style={styles.statusLabel}>Awaiting{'\n'}Riders</Text>
        </View>

        <View style={styles.statusCard}>
          <Text style={[styles.statusNumber, { color: COLORS.primary }]}>{statusCounts.beingDelivered}</Text>
          <MapPin size={16} color={COLORS.primary} />
          <Text style={styles.statusLabel}>Being{'\n'}Delivered</Text>
        </View>

        <View style={styles.statusCard}>
          <Text style={[styles.statusNumber, { color: COLORS.error }]}>{statusCounts.priority}</Text>
          <Zap size={16} color={COLORS.error} />
          <Text style={styles.statusLabel}>Priority{'\n'}Delivery</Text>
        </View>
      </View>
    );
  };

  const renderDeliveryCard = (delivery: Delivery, index: number) => (
    <TouchableOpacity
      key={`${delivery.id}-${index}`}
      style={[styles.deliveryCard, { borderLeftColor: delivery.statusColor }]}
      onPress={() => onDeliveryPress(delivery.id)}
    >
      <View style={styles.deliveryHeader}>
        <View style={styles.deliveryIdContainer}>
          <Text style={styles.deliveryId}>{delivery.orderId}</Text>
          {delivery.priority === 'urgent' && (
            <View style={styles.urgentBadge}>
              <Text style={styles.urgentBadgeText}>URGENT</Text>
            </View>
          )}
          {delivery.priority === 'routine' && (
            <View style={styles.standardBadge}>
              <Text style={styles.standardBadgeText}>STANDARD</Text>
            </View>
          )}
        </View>
      </View>

      <Text style={styles.hospitalName}>{delivery.hospitalName}</Text>

      {delivery.hasSampleTypeFeature && (
        <Text style={styles.sampleInfo}>{delivery.sampleInfo}</Text>
      )}

      <View style={styles.riderInfo}>
        <View style={styles.riderDetails}>
          <Text style={styles.riderName}>{delivery.riderName}</Text>
          <TouchableOpacity
            style={styles.phoneContainer}
            onPress={() => handleCall(delivery.riderPhone)}
          >
            <Phone size={14} color={COLORS.textSecondary} />
            <Text style={styles.riderPhone}>{delivery.riderPhone}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.distanceInfo}>
          <Text style={styles.timeAway}>{delivery.timeAway}</Text>
          <Text style={styles.distanceRemaining}>{delivery.distanceRemaining}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderLastUpdated = () => (
    <View style={styles.lastUpdatedContainer}>
      <Text style={styles.lastUpdatedText}>
        Last updated {Math.floor((Date.now() - lastUpdated.getTime()) / (1000 * 60))} min ago
      </Text>
    </View>
  );

  const handleTabPress = (tab: 'home' | 'deliveries' | 'history' | 'profile') => {
    if (onTabPress) {
      onTabPress(tab);
    }
  };

  return (
    <MainLayout
      activeTab="deliveries"
      onTabPress={handleTabPress}
      activeDeliveriesCount={deliveries.length}
    >
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />

        {renderHeader()}

        <ScrollView
          style={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {renderStatusCards()}

          <View style={styles.deliveriesContainer}>
            {filteredDeliveries.map((delivery, index) => renderDeliveryCard(delivery, index))}
          </View>

          {renderLastUpdated()}
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
  filterContainer: {
    backgroundColor: COLORS.white,
    paddingBottom: SPACING.md,
  },
  filterTabs: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.lg,
    gap: SPACING.sm,
  },
  filterTab: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: LAYOUT.radius.round,
    backgroundColor: COLORS.gray100,
  },
  activeFilterTab: {
    backgroundColor: COLORS.primary,
  },
  filterTabText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
  activeFilterTabText: {
    color: COLORS.white,
  },
  statusCardsContainer: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
    gap: SPACING.md,
  },
  statusCard: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: LAYOUT.radius.lg,
    padding: SPACING.md,
    alignItems: 'center',
    ...SHADOWS.sm,
  },
  statusNumber: {
    fontSize: 32,
    fontWeight: '700',
    marginBottom: SPACING.xs,
  },
  statusLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: SPACING.xs,
    lineHeight: 16,
  },
  deliveriesContainer: {
    paddingHorizontal: SPACING.lg,
    gap: SPACING.md,
  },
  deliveryCard: {
    backgroundColor: COLORS.white,
    borderRadius: LAYOUT.radius.lg,
    padding: SPACING.lg,
    borderLeftWidth: 4,
    ...SHADOWS.card,
  },
  deliveryHeader: {
    marginBottom: SPACING.sm,
  },
  deliveryIdContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  deliveryId: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  urgentBadge: {
    backgroundColor: COLORS.error + '15',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: LAYOUT.radius.sm,
  },
  urgentBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.error,
  },
  standardBadge: {
    backgroundColor: COLORS.textSecondary + '15',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: LAYOUT.radius.sm,
  },
  standardBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  hospitalName: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  sampleInfo: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: SPACING.md,
  },
  riderInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  riderDetails: {
    flex: 1,
  },
  riderName: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  phoneContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  riderPhone: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  distanceInfo: {
    alignItems: 'flex-end',
  },
  timeAway: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  distanceRemaining: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  lastUpdatedContainer: {
    alignItems: 'center',
    paddingVertical: SPACING.xl,
  },
  lastUpdatedText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
});

export default ActiveDeliveriesScreen;