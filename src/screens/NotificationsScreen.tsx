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
  ArrowLeft,
  Bell,
  BellOff,
  Check,
  CheckCheck,
  X,
  Filter,
  Settings,
  Package,
  User,
  Building2,
  AlertTriangle,
  CheckCircle,
  Clock,
  MessageSquare,
  Shield,
  Star,
  Truck,
  Calendar,
  Eye,
  EyeOff,
} from 'lucide-react-native';
import { COLORS, TYPOGRAPHY, SPACING, SHADOWS, LAYOUT } from '../theme/design-system';
import MainLayout from '../components/MainLayout';

interface NotificationsScreenProps {
  onBack: () => void;
  onNotificationPress: (notificationId: string) => void;
  onSettingsPress: () => void;
  onTabPress?: (tab: 'home' | 'deliveries' | 'history' | 'profile') => void;
}

interface Notification {
  id: string;
  type: 'order' | 'rider' | 'hospital' | 'system' | 'approval' | 'feature';
  category: 'delivery' | 'registration' | 'system' | 'support';
  title: string;
  message: string;
  timestamp: string;
  isRead: boolean;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  actionRequired: boolean;
  relatedOrderId?: string;
  relatedRiderId?: string;
  data?: any;
}

type FilterType = 'all' | 'unread' | 'delivery' | 'registration' | 'system' | 'support';

const NotificationsScreen: React.FC<NotificationsScreenProps> = ({
  onBack,
  onNotificationPress,
  onSettingsPress,
  onTabPress,
}) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    try {
      setLoading(true);

      // In real app, this would be an API call:
      // const response = await apiClient.get('/notifications/my');

      // Mock notifications data
      const mockNotifications: Notification[] = [
        {
          id: '1',
          type: 'order',
          category: 'delivery',
          title: 'Order Delivered Successfully',
          message: 'Your order #PCD-CLB-240115-001 has been delivered to National Hospital Colombo',
          timestamp: '2024-01-15T09:38:00Z',
          isRead: false,
          priority: 'medium',
          actionRequired: false,
          relatedOrderId: 'PCD-CLB-240115-001'
        },
        {
          id: '2',
          type: 'rider',
          category: 'delivery',
          title: 'Rider Assignment Updated',
          message: 'Kasun Perera has been assigned to your pickup request. Estimated arrival: 15 minutes',
          timestamp: '2024-01-15T08:35:00Z',
          isRead: false,
          priority: 'high',
          actionRequired: true,
          relatedOrderId: 'PCD-CLB-240115-001',
          relatedRiderId: 'rider_001'
        },
        {
          id: '3',
          type: 'approval',
          category: 'registration',
          title: 'Registration Approved',
          message: 'Congratulations! Your collection center registration has been approved by National Hospital Colombo',
          timestamp: '2024-01-14T16:30:00Z',
          isRead: true,
          priority: 'high',
          actionRequired: false
        },
        {
          id: '4',
          type: 'feature',
          category: 'system',
          title: 'New Feature Enabled',
          message: 'Sample Type & Quantity tracking has been enabled for your center by TransFleet Operations',
          timestamp: '2024-01-14T14:20:00Z',
          isRead: true,
          priority: 'medium',
          actionRequired: false
        },
        {
          id: '5',
          type: 'order',
          category: 'delivery',
          title: 'Pickup Delayed',
          message: 'Your order #PCD-KDY-240114-027 pickup has been delayed due to traffic. New ETA: 20 minutes',
          timestamp: '2024-01-14T11:15:00Z',
          isRead: false,
          priority: 'urgent',
          actionRequired: true,
          relatedOrderId: 'PCD-KDY-240114-027'
        },
        {
          id: '6',
          type: 'hospital',
          category: 'registration',
          title: 'Hospital Partnership Update',
          message: 'Apollo Hospital Colombo has updated their pickup requirements. Please review the new guidelines',
          timestamp: '2024-01-14T10:00:00Z',
          isRead: true,
          priority: 'medium',
          actionRequired: true
        },
        {
          id: '7',
          type: 'system',
          category: 'system',
          title: 'App Update Available',
          message: 'A new version of TransFleet Collection Center app is available with improved QR scanning',
          timestamp: '2024-01-13T18:00:00Z',
          isRead: false,
          priority: 'low',
          actionRequired: false
        },
        {
          id: '8',
          type: 'order',
          category: 'delivery',
          title: 'Urgent Sample Request',
          message: 'Emergency sample collection requested from Teaching Hospital Kandy. Immediate attention required',
          timestamp: '2024-01-13T15:30:00Z',
          isRead: true,
          priority: 'urgent',
          actionRequired: true,
          relatedOrderId: 'PCD-KDY-240113-089'
        },
        {
          id: '9',
          type: 'rider',
          category: 'support',
          title: 'Rider Feedback Request',
          message: 'Please rate your experience with rider Sunil Silva for order #PCD-GLE-240113-045',
          timestamp: '2024-01-13T12:00:00Z',
          isRead: true,
          priority: 'low',
          actionRequired: true,
          relatedOrderId: 'PCD-GLE-240113-045',
          relatedRiderId: 'rider_002'
        },
        {
          id: '10',
          type: 'system',
          category: 'system',
          title: 'Maintenance Notice',
          message: 'Scheduled system maintenance on Jan 20, 2024 from 2:00 AM - 4:00 AM. Plan your deliveries accordingly',
          timestamp: '2024-01-12T20:00:00Z',
          isRead: false,
          priority: 'medium',
          actionRequired: false
        }
      ];

      setNotifications(mockNotifications);

    } catch (error) {
      console.error('Failed to load notifications:', error);
      Alert.alert('Error', 'Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadNotifications();
    setRefreshing(false);
  };

  const markAsRead = (notificationId: string) => {
    setNotifications(prev =>
      prev.map(notif =>
        notif.id === notificationId
          ? { ...notif, isRead: true }
          : notif
      )
    );
  };

  const markAllAsRead = () => {
    Alert.alert(
      'Mark All as Read',
      'Are you sure you want to mark all notifications as read?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Mark All',
          onPress: () => {
            setNotifications(prev =>
              prev.map(notif => ({ ...notif, isRead: true }))
            );
          }
        }
      ]
    );
  };

  const deleteNotification = (notificationId: string) => {
    Alert.alert(
      'Delete Notification',
      'Are you sure you want to delete this notification?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            setNotifications(prev =>
              prev.filter(notif => notif.id !== notificationId)
            );
          }
        }
      ]
    );
  };

  const getFilteredNotifications = () => {
    return notifications.filter(notification => {
      switch (activeFilter) {
        case 'unread': return !notification.isRead;
        case 'delivery': return notification.category === 'delivery';
        case 'registration': return notification.category === 'registration';
        case 'system': return notification.category === 'system';
        case 'support': return notification.category === 'support';
        default: return true;
      }
    });
  };

  const getNotificationIcon = (notification: Notification) => {
    const iconColor = notification.isRead ? COLORS.textSecondary : COLORS.primary;
    const iconSize = 20;

    switch (notification.type) {
      case 'order':
        return <Package size={iconSize} color={iconColor} />;
      case 'rider':
        return <User size={iconSize} color={iconColor} />;
      case 'hospital':
        return <Building2 size={iconSize} color={iconColor} />;
      case 'approval':
        return <CheckCircle size={iconSize} color={iconColor} />;
      case 'feature':
        return <Star size={iconSize} color={iconColor} />;
      case 'system':
      default:
        return <Bell size={iconSize} color={iconColor} />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return COLORS.error;
      case 'high': return COLORS.warning;
      case 'medium': return COLORS.info;
      case 'low': return COLORS.textSecondary;
      default: return COLORS.textSecondary;
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
  };

  const getUnreadCount = () => {
    return notifications.filter(n => !n.isRead).length;
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity style={styles.backButton} onPress={onBack}>
        <ArrowLeft size={24} color={COLORS.textPrimary} />
      </TouchableOpacity>

      <View style={styles.headerCenter}>
        <Text style={styles.headerTitle}>Notifications</Text>
        <Text style={styles.headerSubtitle}>
          {getUnreadCount()} unread • {notifications.length} total
        </Text>
      </View>

      <View style={styles.headerActions}>
        <TouchableOpacity
          style={styles.headerAction}
          onPress={() => setShowFilters(!showFilters)}
        >
          <Filter size={20} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.headerAction} onPress={onSettingsPress}>
          <Settings size={20} color={COLORS.textPrimary} />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderFilterTabs = () => {
    if (!showFilters) return null;

    const filters: { key: FilterType; label: string; count?: number }[] = [
      { key: 'all', label: 'All', count: notifications.length },
      { key: 'unread', label: 'Unread', count: getUnreadCount() },
      { key: 'delivery', label: 'Delivery', count: notifications.filter(n => n.category === 'delivery').length },
      { key: 'registration', label: 'Registration', count: notifications.filter(n => n.category === 'registration').length },
      { key: 'system', label: 'System', count: notifications.filter(n => n.category === 'system').length },
      { key: 'support', label: 'Support', count: notifications.filter(n => n.category === 'support').length },
    ];

    return (
      <View style={styles.filtersContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtersScroll}>
          {filters.map((filter) => (
            <TouchableOpacity
              key={filter.key}
              style={[
                styles.filterTab,
                activeFilter === filter.key && styles.activeFilterTab
              ]}
              onPress={() => setActiveFilter(filter.key)}
            >
              <Text style={[
                styles.filterTabText,
                activeFilter === filter.key && styles.activeFilterTabText
              ]}>
                {filter.label}
              </Text>
              {filter.count !== undefined && filter.count > 0 && (
                <View style={[
                  styles.filterBadge,
                  activeFilter === filter.key && styles.activeFilterBadge
                ]}>
                  <Text style={[
                    styles.filterBadgeText,
                    activeFilter === filter.key && styles.activeFilterBadgeText
                  ]}>
                    {filter.count}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  };

  const renderQuickActions = () => {
    const unreadCount = getUnreadCount();

    if (unreadCount === 0) return null;

    return (
      <View style={styles.quickActions}>
        <TouchableOpacity style={styles.quickAction} onPress={markAllAsRead}>
          <CheckCheck size={16} color={COLORS.primary} />
          <Text style={styles.quickActionText}>Mark all as read</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderNotification = (notification: Notification) => (
    <TouchableOpacity
      key={notification.id}
      style={[
        styles.notificationCard,
        !notification.isRead && styles.unreadNotification,
        { borderLeftColor: getPriorityColor(notification.priority) }
      ]}
      onPress={() => {
        if (!notification.isRead) {
          markAsRead(notification.id);
        }
        onNotificationPress(notification.id);
      }}
      activeOpacity={0.8}
    >
      <View style={styles.notificationHeader}>
        <View style={styles.notificationIcon}>
          {getNotificationIcon(notification)}
        </View>

        <View style={styles.notificationContent}>
          <View style={styles.notificationTitleRow}>
            <Text style={[
              styles.notificationTitle,
              !notification.isRead && styles.unreadTitle
            ]}>
              {notification.title}
            </Text>
            <Text style={styles.notificationTime}>
              {formatTimestamp(notification.timestamp)}
            </Text>
          </View>

          <Text style={styles.notificationMessage}>
            {notification.message}
          </Text>

          <View style={styles.notificationFooter}>
            <View style={styles.notificationBadges}>
              <View style={[
                styles.priorityBadge,
                { backgroundColor: getPriorityColor(notification.priority) + '20' }
              ]}>
                <Text style={[
                  styles.priorityText,
                  { color: getPriorityColor(notification.priority) }
                ]}>
                  {notification.priority.toUpperCase()}
                </Text>
              </View>

              <View style={styles.categoryBadge}>
                <Text style={styles.categoryText}>
                  {notification.category.toUpperCase()}
                </Text>
              </View>

              {notification.actionRequired && (
                <View style={styles.actionBadge}>
                  <AlertTriangle size={10} color={COLORS.warning} />
                  <Text style={[styles.actionText, { color: COLORS.warning }]}>
                    ACTION REQUIRED
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.notificationActions}>
              <TouchableOpacity
                style={styles.notificationActionButton}
                onPress={() => markAsRead(notification.id)}
              >
                {notification.isRead ? (
                  <EyeOff size={14} color={COLORS.textSecondary} />
                ) : (
                  <Eye size={14} color={COLORS.primary} />
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.notificationActionButton}
                onPress={() => deleteNotification(notification.id)}
              >
                <X size={14} color={COLORS.error} />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>

      {!notification.isRead && <View style={styles.unreadIndicator} />}
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <BellOff size={48} color={COLORS.textTertiary} />
      <Text style={styles.emptyTitle}>No Notifications</Text>
      <Text style={styles.emptyMessage}>
        {activeFilter === 'unread'
          ? "All caught up! No unread notifications"
          : "You'll receive notifications about your orders and account updates here"
        }
      </Text>
    </View>
  );

  const filteredNotifications = getFilteredNotifications();

  const handleTabPress = (tab: 'home' | 'deliveries' | 'history' | 'profile') => {
    if (onTabPress) {
      onTabPress(tab);
    }
  };

  return (
    <MainLayout activeTab="home" onTabPress={handleTabPress}>
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />

        {renderHeader()}
        {renderFilterTabs()}

        <ScrollView
          style={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {renderQuickActions()}

          {filteredNotifications.length === 0 ? (
            renderEmptyState()
          ) : (
            <View style={styles.notificationsList}>
              {filteredNotifications.map(renderNotification)}
            </View>
          )}
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
  filtersContainer: {
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray100,
  },
  filtersScroll: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  filterTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    marginRight: SPACING.sm,
    borderRadius: LAYOUT.radius.round,
    backgroundColor: COLORS.gray100,
    gap: SPACING.xs,
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
  filterBadge: {
    backgroundColor: COLORS.gray300,
    borderRadius: LAYOUT.radius.sm,
    paddingHorizontal: SPACING.xs,
    paddingVertical: 2,
  },
  activeFilterBadge: {
    backgroundColor: COLORS.white + '30',
  },
  filterBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  activeFilterBadgeText: {
    color: COLORS.white,
  },
  content: {
    flex: 1,
  },
  quickActions: {
    backgroundColor: COLORS.white,
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.lg,
    borderRadius: LAYOUT.radius.lg,
    padding: SPACING.lg,
    ...SHADOWS.sm,
  },
  quickAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  quickActionText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.primary,
  },
  notificationsList: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.massive,
    gap: SPACING.sm,
  },
  notificationCard: {
    backgroundColor: COLORS.white,
    borderRadius: LAYOUT.radius.lg,
    borderLeftWidth: 4,
    position: 'relative',
    overflow: 'hidden',
    ...SHADOWS.card,
  },
  unreadNotification: {
    backgroundColor: COLORS.primaryUltraLight,
  },
  notificationHeader: {
    padding: SPACING.lg,
  },
  notificationIcon: {
    position: 'absolute',
    top: SPACING.lg,
    left: SPACING.lg,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.gray50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationContent: {
    marginLeft: 48,
  },
  notificationTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.sm,
  },
  notificationTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginRight: SPACING.sm,
  },
  unreadTitle: {
    fontWeight: '700',
  },
  notificationTime: {
    fontSize: 12,
    color: COLORS.textTertiary,
  },
  notificationMessage: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
    marginBottom: SPACING.md,
  },
  notificationFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  notificationBadges: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    flex: 1,
    flexWrap: 'wrap',
  },
  priorityBadge: {
    paddingHorizontal: SPACING.xs,
    paddingVertical: 2,
    borderRadius: LAYOUT.radius.sm,
  },
  priorityText: {
    fontSize: 9,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  categoryBadge: {
    backgroundColor: COLORS.gray200,
    paddingHorizontal: SPACING.xs,
    paddingVertical: 2,
    borderRadius: LAYOUT.radius.sm,
  },
  categoryText: {
    fontSize: 9,
    fontWeight: '500',
    color: COLORS.textSecondary,
    letterSpacing: 0.5,
  },
  actionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.warning + '20',
    paddingHorizontal: SPACING.xs,
    paddingVertical: 2,
    borderRadius: LAYOUT.radius.sm,
    gap: 2,
  },
  actionText: {
    fontSize: 8,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  notificationActions: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  notificationActionButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.gray100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unreadIndicator: {
    position: 'absolute',
    top: SPACING.lg,
    right: SPACING.lg,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.primary,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: SPACING.xxxl,
    paddingHorizontal: SPACING.xl,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginTop: SPACING.lg,
    marginBottom: SPACING.sm,
  },
  emptyMessage: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default NotificationsScreen;