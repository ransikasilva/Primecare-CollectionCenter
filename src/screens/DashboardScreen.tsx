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
} from 'react-native';
import {
  Bell,
  Plus,
  Eye,
  Clock,
  User,
  MapPin,
  CheckCircle,
  Building2,
  Truck,
  Package
} from 'lucide-react-native';
import { COLORS, TYPOGRAPHY, SPACING, SHADOWS, LAYOUT } from '../theme/design-system';
import MainLayout from '../components/MainLayout';
import orderService from '../services/orderService';
import profileService from '../services/profileService';

interface DashboardMetrics {
  total_orders_today: number;
  in_transit_now: number;
  completed_deliveries: number;
  partner_hospitals: number;
  // Additional data for cards
  today_increase: number;
  in_transit_details: { with_riders: number; pending: number };
  completion_rate: number;
  hospitals_active: string;
}

interface RecentActivity {
  id: string;
  title: string;
  time: string;
  icon: 'package' | 'user' | 'truck';
}

interface DashboardScreenProps {
  onCreateDelivery: () => void;
  onViewActive: () => void;
  onViewHistory: () => void;
  onViewProfile: () => void;
  onNavigateToDeliveries: () => void;
  onNavigateToHistory: () => void;
  onNotificationPress?: () => void;
  onTabPress?: (tab: 'home' | 'deliveries' | 'history' | 'profile') => void;
}

const DashboardScreen: React.FC<DashboardScreenProps> = ({
  onCreateDelivery,
  onViewActive,
  onViewHistory,
  onViewProfile,
  onNavigateToDeliveries,
  onNavigateToHistory,
  onNotificationPress,
  onTabPress,
}) => {
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    total_orders_today: 0,
    in_transit_now: 0,
    completed_deliveries: 0,
    partner_hospitals: 0,
    today_increase: 0,
    in_transit_details: { with_riders: 0, pending: 0 },
    completion_rate: 0,
    hospitals_active: 'Loading...',
  });

  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);

  const [refreshing, setRefreshing] = useState(false);
  const [centerName, setCenterName] = useState('Loading...');
  const [weatherInfo] = useState('Colombo • 28°C • Partly cloudy');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      // Load dashboard data in parallel
      const [ordersResponse, profileResponse, hospitalsResponse] = await Promise.all([
        orderService.getMyOrders({ limit: 100 }),
        profileService.getProfile(),
        profileService.getMyHospitals(),
      ]);

      if (ordersResponse.success && ordersResponse.data) {
        // Calculate dashboard metrics from orders data
        const orders = ordersResponse.data.orders || [];
        const statistics = ordersResponse.data.statistics || {};

        // Get today's date for filtering
        const today = new Date().toISOString().split('T')[0];
        const todayOrders = orders.filter(order =>
          (order as any).timing?.created_at?.startsWith(today)
        );

        // Calculate in-transit orders
        const inTransitOrders = orders.filter(order =>
          ['assigned', 'pickup_started', 'picked_up', 'delivery_started'].includes(order.status)
        );

        // Calculate completed deliveries (all time)
        const completedOrders = orders.filter(order =>
          order.status === 'delivered'
        );

        // Update metrics
        setMetrics({
          total_orders_today: todayOrders.length,
          in_transit_now: inTransitOrders.length,
          completed_deliveries: completedOrders.length,
          partner_hospitals: hospitalsResponse.success ? (hospitalsResponse.data?.hospitals?.length || 0) : 0,
          today_increase: Math.max(0, todayOrders.length - 1), // Simple calculation
          in_transit_details: {
            with_riders: inTransitOrders.filter(order =>
              ['picked_up', 'delivery_started'].includes(order.status)
            ).length,
            pending: inTransitOrders.filter(order =>
              ['assigned', 'pickup_started'].includes(order.status)
            ).length,
          },
          completion_rate: completedOrders.length > 0 ?
            Math.round((completedOrders.length / orders.length) * 100) : 100,
          hospitals_active: hospitalsResponse.success ? 'All active' : 'Loading...',
        });

        // Generate recent activity from recent orders
        const recentOrders = orders
          .filter(order => order.status !== 'pending_rider_assignment')
          .sort((a, b) => new Date((b as any).timing?.created_at || 0).getTime() -
                          new Date((a as any).timing?.created_at || 0).getTime())
          .slice(0, 3);

        const activity: RecentActivity[] = recentOrders.map(order => ({
          id: order.id,
          title: getActivityTitle(order),
          time: getRelativeTime((order as any).timing?.created_at || new Date().toISOString()),
          icon: getActivityIcon(order.status),
        }));

        setRecentActivity(activity);
      }

      if (profileResponse.success && profileResponse.data) {
        setCenterName(profileResponse.data.center_name || 'Collection Center');
      }

    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      Alert.alert('Error', 'Failed to load dashboard data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const getActivityTitle = (order: any) => {
    switch (order.status) {
      case 'picked_up':
        return `Delivery #${(order as any).order_number} picked up`;
      case 'delivery_started':
        return `Delivery #${(order as any).order_number} en route`;
      case 'delivered':
        return `${(order as any).sample_quantity || 1} samples delivered to ${(order as any).hospital_name}`;
      case 'assigned':
        return `Rider assigned for delivery #${(order as any).order_number}`;
      default:
        return `Order #${(order as any).order_number} updated`;
    }
  };

  const getRelativeTime = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  const getActivityIcon = (status: string): 'package' | 'user' | 'truck' => {
    switch (status) {
      case 'picked_up':
      case 'assigned':
        return 'package';
      case 'delivery_started':
        return 'truck';
      case 'delivered':
        return 'truck';
      default:
        return 'package';
    }
  };

  const renderMetricCard = (
    value: string | number,
    label: string,
    subtext: string,
    color: string,
    icon: React.ReactNode
  ) => (
    <View style={[styles.metricCard, { borderTopColor: color }]}>
      <View style={styles.metricHeader}>
        <View style={[styles.metricIcon, { backgroundColor: color + '15' }]}>
          {icon}
        </View>
        <Text style={[styles.metricValue, { color }]}>{value}</Text>
      </View>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricSubtext}>{subtext}</Text>
    </View>
  );

  const renderActivityItem = (activity: RecentActivity) => {
    const getIcon = () => {
      switch (activity.icon) {
        case 'package':
          return <Package size={20} color={COLORS.primary} />;
        case 'user':
          return <User size={20} color={COLORS.success} />;
        case 'truck':
          return <Truck size={20} color={COLORS.info} />;
        default:
          return <Package size={20} color={COLORS.primary} />;
      }
    };

    return (
      <View key={activity.id} style={styles.activityItem}>
        <View style={styles.activityIcon}>
          {getIcon()}
        </View>
        <View style={styles.activityContent}>
          <Text style={styles.activityTitle}>{activity.title}</Text>
          <Text style={styles.activityTime}>{activity.time}</Text>
        </View>
      </View>
    );
  };

  const handleTabPress = (tab: 'home' | 'deliveries' | 'history' | 'profile') => {
    if (onTabPress) {
      onTabPress(tab);
    }
  };

  return (
    <MainLayout
      activeTab="home"
      onTabPress={handleTabPress}
      activeDeliveriesCount={metrics.in_transit_now}
    >
      <StatusBar
        barStyle="dark-content"
        backgroundColor={COLORS.white}
        translucent={false}
      />

      {/* Header Background Extension */}
      <View style={styles.headerBackground} />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.greeting}>
            {getGreeting()}, {centerName}
          </Text>
          <View style={styles.weatherContainer}>
            <MapPin size={12} color={COLORS.textSecondary} />
            <Text style={styles.weatherText}>{weatherInfo}</Text>
          </View>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.notificationButton} onPress={onNotificationPress}>
            <Bell size={22} color={COLORS.textPrimary} />
            <View style={styles.notificationBadge} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.avatarButton}>
            <Text style={styles.avatarText}>AL</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Metrics Grid */}
        <View style={styles.metricsContainer}>
          <View style={styles.metricsRow}>
            {renderMetricCard(
              metrics.total_orders_today,
              'Total today',
              `+${metrics.today_increase} from yesterday`,
              COLORS.info,
              <Package size={18} color={COLORS.info} />
            )}
            {renderMetricCard(
              metrics.in_transit_now,
              'In transit now',
              `${metrics.in_transit_details.with_riders} with riders, ${metrics.in_transit_details.pending} pending`,
              COLORS.warning,
              <MapPin size={18} color={COLORS.warning} />
            )}
          </View>

          <View style={styles.metricsRow}>
            {renderMetricCard(
              metrics.completed_deliveries,
              'Completed deliveries',
              `${metrics.completion_rate}% on-time`,
              COLORS.success,
              <CheckCircle size={18} color={COLORS.success} />
            )}
            {renderMetricCard(
              metrics.partner_hospitals,
              'Partner hospitals',
              metrics.hospitals_active,
              COLORS.primary,
              <Building2 size={18} color={COLORS.primary} />
            )}
          </View>
        </View>

        {/* Create New Delivery Button */}
        <TouchableOpacity
          style={styles.createButton}
          onPress={onCreateDelivery}
          activeOpacity={0.8}
        >
          <Plus size={20} color={COLORS.white} />
          <Text style={styles.createButtonText}>Create New Delivery</Text>
        </TouchableOpacity>

        {/* Tab Navigation */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={styles.tab}
            onPress={onViewActive}
          >
            <Eye size={16} color={COLORS.textSecondary} />
            <Text style={styles.tabText}>View Active</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.tab}
            onPress={onViewHistory}
          >
            <Clock size={16} color={COLORS.textSecondary} />
            <Text style={styles.tabText}>History</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.tab}
            onPress={onViewProfile}
          >
            <User size={16} color={COLORS.textSecondary} />
            <Text style={styles.tabText}>Profile</Text>
          </TouchableOpacity>
        </View>

        {/* Recent Activity */}
        <View style={styles.activityContainer}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>
          {recentActivity.map(renderActivityItem)}
        </View>
      </ScrollView>
    </MainLayout>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.background,
  },
  headerBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 120, // Tall background that extends into safe area
    backgroundColor: COLORS.white,
    zIndex: -1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.md,
    backgroundColor: COLORS.white,
    ...SHADOWS.sm,
  },
  headerLeft: {
    flex: 1,
  },
  greeting: {
    ...TYPOGRAPHY.styles.h3,
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  weatherContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  weatherText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginLeft: SPACING.xs,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  notificationButton: {
    position: 'relative',
    padding: SPACING.xs,
  },
  notificationBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.error,
  },
  avatarButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.white,
  },
  content: {
    flex: 1,
    paddingHorizontal: SPACING.lg,
  },
  metricsContainer: {
    marginVertical: SPACING.lg,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginBottom: SPACING.md,
  },
  metricCard: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: LAYOUT.radius.lg,
    padding: SPACING.lg,
    borderTopWidth: 3,
    ...SHADOWS.card,
  },
  metricHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.sm,
  },
  metricIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricValue: {
    fontSize: 24,
    fontWeight: '700',
  },
  metricLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  metricSubtext: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  createButton: {
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.lg,
    borderRadius: LAYOUT.radius.lg,
    marginBottom: SPACING.xl,
    gap: SPACING.sm,
    ...SHADOWS.sm,
  },
  createButtonText: {
    ...TYPOGRAPHY.styles.button,
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    borderRadius: LAYOUT.radius.lg,
    padding: SPACING.xs,
    marginBottom: SPACING.xl,
    ...SHADOWS.sm,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
    gap: SPACING.xs,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
  activityContainer: {
    backgroundColor: COLORS.white,
    borderRadius: LAYOUT.radius.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.massive,
    ...SHADOWS.card,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: SPACING.lg,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: SPACING.md,
    gap: SPACING.md,
  },
  activityIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.gray100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.textPrimary,
    lineHeight: 18,
    marginBottom: SPACING.xs,
  },
  activityTime: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
});

export default DashboardScreen;