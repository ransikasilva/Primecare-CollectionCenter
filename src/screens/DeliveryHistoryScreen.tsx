import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  TextInput,
  Alert,
} from 'react-native';
import {
  ArrowLeft,
  Search,
  Download,
  Filter,
  CheckCircle,
  XCircle,
  Clock,
  MapPin,
} from 'lucide-react-native';
import { COLORS, SPACING, SHADOWS, LAYOUT } from '../theme/design-system';
import MainLayout from '../components/MainLayout';
import { orderService } from '../services/orderService';

interface DeliveryHistoryScreenProps {
  onBack: () => void;
  onDeliveryPress: (deliveryId: string) => void;
  onTabPress?: (tab: 'home' | 'deliveries' | 'history' | 'profile') => void;
}

interface HistoryItem {
  id: string;
  orderId: string;
  hospitalName: string;
  sampleInfo: string;
  riderName: string;
  duration: string;
  distance: string;
  status: 'delivered' | 'cancelled';
  statusColor: string;
  hasSampleTypeFeature: boolean;
  deliveredAt: string;
}

interface PeriodStats {
  successRate: number;
  avgDeliveryTime: number;
  successRateChange: number;
  timeChange: number;
  totalDeliveries: number;
}

type Period = 'today' | 'week' | 'month';

const DeliveryHistoryScreen: React.FC<DeliveryHistoryScreenProps> = ({
  onBack,
  onDeliveryPress,
  onTabPress,
}) => {
  const [activePeriod, setActivePeriod] = useState<Period>('today');
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Real data from backend
  const [totalDeliveries, setTotalDeliveries] = useState(0);
  const [periodStats, setPeriodStats] = useState<Record<Period, PeriodStats>>({
    today: {
      successRate: 0,
      avgDeliveryTime: 0,
      successRateChange: 0,
      timeChange: 0,
      totalDeliveries: 0,
    },
    week: {
      successRate: 0,
      avgDeliveryTime: 0,
      successRateChange: 0,
      timeChange: 0,
      totalDeliveries: 0,
    },
    month: {
      successRate: 0,
      avgDeliveryTime: 0,
      successRateChange: 0,
      timeChange: 0,
      totalDeliveries: 0,
    },
  });

  const [deliveryHistory, setDeliveryHistory] = useState<HistoryItem[]>([]);

  // Load delivery history from backend
  const loadDeliveryHistory = async () => {
    try {
      setIsLoading(true);
      const response = await orderService.getMyOrders();

      if (response.success && response.data?.orders) {
        // Filter only delivered and cancelled orders
        const historyOrders = response.data.orders.filter(order =>
          ['delivered', 'cancelled'].includes(order.status)
        );

        // Transform backend orders to history format
        const transformedHistory: HistoryItem[] = historyOrders.map(order => ({
          id: order.id,
          orderId: order.order_number,
          hospitalName: order.hospital_name || 'Hospital',
          sampleInfo: `${order.sample_quantity || 1} ${order.sample_type} samples`,
          riderName: order.rider_info?.name || order.rider_name || 'No rider assigned',
          duration: formatDuration(order.timing?.delivered_at, order.timing?.created_at),
          distance: `${order.distance?.actual_km || order.estimated_distance_km || 0} km`,
          status: order.status as 'delivered' | 'cancelled',
          statusColor: order.status === 'delivered' ? COLORS.success : COLORS.error,
          hasSampleTypeFeature: true, // Assuming feature is enabled
          deliveredAt: order.timing?.delivered_at || order.updated_at || order.created_at,
        }));

        setDeliveryHistory(transformedHistory);
        setTotalDeliveries(historyOrders.length);

        // Calculate period stats
        calculatePeriodStats(transformedHistory);
      }
    } catch (error) {
      console.error('Failed to load delivery history:', error);
      Alert.alert('Error', 'Failed to load delivery history');
    } finally {
      setIsLoading(false);
    }
  };

  // Helper function to format duration
  const formatDuration = (deliveredAt: string | undefined, createdAt: string | undefined): string => {
    if (!deliveredAt || !createdAt) return 'N/A';

    try {
      const delivered = new Date(deliveredAt);
      const created = new Date(createdAt);
      const diffMs = delivered.getTime() - created.getTime();
      const diffMinutes = Math.floor(diffMs / (1000 * 60));

      if (diffMinutes < 60) {
        return `${diffMinutes} min`;
      } else {
        const hours = Math.floor(diffMinutes / 60);
        const mins = diffMinutes % 60;
        return `${hours}h ${mins}m`;
      }
    } catch {
      return 'N/A';
    }
  };

  // Calculate period-based statistics
  const calculatePeriodStats = (history: HistoryItem[]) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthStart = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

    const calculateStats = (orders: HistoryItem[]): PeriodStats => {
      const delivered = orders.filter(o => o.status === 'delivered');
      const successRate = orders.length > 0 ? (delivered.length / orders.length) * 100 : 0;

      const avgDeliveryTime = delivered.length > 0
        ? delivered.reduce((sum, order) => {
            const duration = parseInt(order.duration.replace(/[^0-9]/g, '')) || 0;
            return sum + duration;
          }, 0) / delivered.length
        : 0;

      return {
        successRate: Math.round(successRate * 10) / 10,
        avgDeliveryTime: Math.round(avgDeliveryTime),
        successRateChange: 0, // Would need historical data to calculate
        timeChange: 0, // Would need historical data to calculate
        totalDeliveries: orders.length,
      };
    };

    const todayOrders = history.filter(o => new Date(o.deliveredAt) >= today);
    const weekOrders = history.filter(o => new Date(o.deliveredAt) >= weekStart);
    const monthOrders = history.filter(o => new Date(o.deliveredAt) >= monthStart);

    setPeriodStats({
      today: calculateStats(todayOrders),
      week: calculateStats(weekOrders),
      month: calculateStats(monthOrders),
    });
  };

  // Load data on component mount
  useEffect(() => {
    loadDeliveryHistory();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadDeliveryHistory().finally(() => {
      setRefreshing(false);
    });
  };

  const currentStats = periodStats[activePeriod];

  // Filter history by period and search query
  const filteredHistory = deliveryHistory.filter(item => {
    // Search filter
    const matchesSearch = item.orderId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.hospitalName.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    // Period filter
    const itemDate = new Date(item.deliveredAt);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    switch (activePeriod) {
      case 'today':
        return itemDate >= today;
      case 'week':
        const weekStart = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
        return itemDate >= weekStart;
      case 'month':
        const monthStart = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
        return itemDate >= monthStart;
      default:
        return true;
    }
  });

  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity style={styles.backButton} onPress={onBack}>
        <ArrowLeft size={24} color={COLORS.textPrimary} />
      </TouchableOpacity>

      <View style={styles.headerCenter}>
        <Text style={styles.headerTitle}>Delivery History</Text>
        <Text style={styles.headerSubtitle}>{totalDeliveries.toLocaleString()} total deliveries</Text>
      </View>

      <View style={styles.headerActions}>
        <TouchableOpacity style={styles.headerAction}>
          <Search size={20} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.headerAction}>
          <Download size={20} color={COLORS.textPrimary} />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderPeriodTabs = () => (
    <View style={styles.periodTabsContainer}>
      <TouchableOpacity
        style={[styles.periodTab, activePeriod === 'today' && styles.activePeriodTab]}
        onPress={() => setActivePeriod('today')}
      >
        <Text style={[styles.periodTabText, activePeriod === 'today' && styles.activePeriodTabText]}>
          Today ({currentStats.totalDeliveries})
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.periodTab, activePeriod === 'week' && styles.activePeriodTab]}
        onPress={() => setActivePeriod('week')}
      >
        <Text style={[styles.periodTabText, activePeriod === 'week' && styles.activePeriodTabText]}>
          This Week ({periodStats.week.totalDeliveries})
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.periodTab, activePeriod === 'month' && styles.activePeriodTab]}
        onPress={() => setActivePeriod('month')}
      >
        <Text style={[styles.periodTabText, activePeriod === 'month' && styles.activePeriodTabText]}>
          This Month ({periodStats.month.totalDeliveries})
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderStatsCards = () => (
    <View style={styles.statsContainer}>
      <View style={styles.statCard}>
        <Text style={[styles.statNumber, { color: COLORS.success }]}>
          {currentStats.successRate}%
        </Text>
        <Text style={styles.statLabel}>Delivered successfully</Text>
        <Text style={[
          styles.statChange,
          { color: currentStats.successRateChange >= 0 ? COLORS.success : COLORS.error }
        ]}>
          {currentStats.successRateChange >= 0 ? '+' : ''}{currentStats.successRateChange}% from last {activePeriod === 'today' ? 'day' : activePeriod === 'week' ? 'week' : 'month'}
        </Text>
      </View>

      <View style={styles.statCard}>
        <Text style={[styles.statNumber, { color: COLORS.primary }]}>
          {currentStats.avgDeliveryTime} min
        </Text>
        <Text style={styles.statLabel}>Avg delivery time</Text>
        <Text style={[
          styles.statChange,
          { color: currentStats.timeChange <= 0 ? COLORS.success : COLORS.error }
        ]}>
          {currentStats.timeChange >= 0 ? '+' : ''}{currentStats.timeChange} min improvement
        </Text>
      </View>
    </View>
  );

  const renderFilterSearch = () => (
    <View style={styles.filterSearchContainer}>
      <TouchableOpacity
        style={styles.filterButton}
        onPress={() => setShowFilters(!showFilters)}
      >
        <Filter size={16} color={COLORS.textPrimary} />
        <Text style={styles.filterButtonText}>Filter & Search</Text>
      </TouchableOpacity>

      {showFilters && (
        <View style={styles.searchContainer}>
          <Search size={16} color={COLORS.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by order ID or hospital..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      )}
    </View>
  );

  const renderHistoryItem = (item: HistoryItem) => (
    <TouchableOpacity
      key={item.id}
      style={[styles.historyCard, { borderLeftColor: item.statusColor }]}
      onPress={() => onDeliveryPress(item.id)}
    >
      <View style={styles.historyHeader}>
        <Text style={styles.orderId} numberOfLines={1}>{item.orderId}</Text>
        <View style={styles.statusContainer}>
          {item.status === 'delivered' ? (
            <>
              <CheckCircle size={14} color={COLORS.success} />
              <Text style={[styles.statusText, { color: COLORS.success }]} numberOfLines={1}>
                Delivered successfully
              </Text>
            </>
          ) : (
            <>
              <XCircle size={14} color={COLORS.error} />
              <Text style={[styles.statusText, { color: COLORS.error }]} numberOfLines={1}>
                Cancelled
              </Text>
            </>
          )}
        </View>
      </View>

      <Text style={styles.hospitalName}>{item.hospitalName}</Text>

      {item.hasSampleTypeFeature && (
        <Text style={styles.sampleInfo}>{item.sampleInfo}</Text>
      )}

      <View style={styles.historyDetails}>
        <Text style={styles.riderName}>{item.riderName}</Text>

        {item.status === 'delivered' && (
          <View style={styles.deliveryMetrics}>
            <View style={styles.metricItem}>
              <Clock size={12} color={COLORS.textSecondary} />
              <Text style={styles.metricText}>{item.duration}</Text>
            </View>

            <View style={styles.metricItem}>
              <MapPin size={12} color={COLORS.textSecondary} />
              <Text style={styles.metricText}>{item.distance}</Text>
            </View>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  const handleTabPress = (tab: 'home' | 'deliveries' | 'history' | 'profile') => {
    if (onTabPress) {
      onTabPress(tab);
    }
  };

  return (
    <MainLayout activeTab="history" onTabPress={handleTabPress}>
      {renderHeader()}

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {renderPeriodTabs()}
        {renderStatsCards()}
        {renderFilterSearch()}

        <View style={styles.historyContainer}>
          {filteredHistory.map(renderHistoryItem)}
        </View>
      </ScrollView>
    </MainLayout>
  );
};

const styles = StyleSheet.create({
  container: {
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
  periodTabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
    backgroundColor: COLORS.white,
    gap: SPACING.sm,
  },
  periodTab: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: LAYOUT.radius.pill,
    backgroundColor: COLORS.gray100,
  },
  activePeriodTab: {
    backgroundColor: COLORS.primary,
  },
  periodTabText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
  activePeriodTabText: {
    color: COLORS.white,
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.lg,
    gap: SPACING.md,
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: LAYOUT.radius.lg,
    padding: SPACING.lg,
    ...SHADOWS.sm,
  },
  statNumber: {
    fontSize: 32,
    fontWeight: '700',
    marginBottom: SPACING.xs,
  },
  statLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  statChange: {
    fontSize: 12,
    fontWeight: '500',
  },
  filterSearchContainer: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.md,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    gap: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray200,
  },
  filterButtonText: {
    fontSize: 16,
    color: COLORS.textPrimary,
    fontWeight: '500',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.gray50,
    borderRadius: LAYOUT.radius.lg,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    marginTop: SPACING.md,
    gap: SPACING.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: COLORS.textPrimary,
  },
  historyContainer: {
    paddingHorizontal: SPACING.lg,
    gap: SPACING.md,
  },
  historyCard: {
    backgroundColor: COLORS.white,
    borderRadius: LAYOUT.radius.lg,
    padding: SPACING.lg,
    borderLeftWidth: 4,
    ...SHADOWS.card,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  orderId: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textSecondary,
    flex: 1,
    marginRight: SPACING.sm,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    maxWidth: '50%',
    flexShrink: 1,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
    flexShrink: 1,
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
  historyDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  riderName: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.textPrimary,
  },
  deliveryMetrics: {
    flexDirection: 'row',
    gap: SPACING.md,
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
});

export default DeliveryHistoryScreen;