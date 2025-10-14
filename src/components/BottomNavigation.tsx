import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import {
  Home,
  Package,
  Clock,
  User,
} from 'lucide-react-native';
import { COLORS, TYPOGRAPHY, SPACING, SHADOWS, LAYOUT } from '../theme/design-system';

interface BottomNavigationProps {
  activeTab: 'home' | 'deliveries' | 'history' | 'profile';
  onTabPress: (tab: 'home' | 'deliveries' | 'history' | 'profile') => void;
  activeDeliveriesCount?: number;
}

const { width: screenWidth } = Dimensions.get('window');

const BottomNavigation: React.FC<BottomNavigationProps> = ({
  activeTab,
  onTabPress,
  activeDeliveriesCount = 0,
}) => {
  const tabs = [
    {
      key: 'home' as const,
      label: 'Home',
      icon: Home,
    },
    {
      key: 'deliveries' as const,
      label: 'Deliveries',
      icon: Package,
      badge: activeDeliveriesCount > 0 ? activeDeliveriesCount : undefined,
    },
    {
      key: 'history' as const,
      label: 'History',
      icon: Clock,
    },
    {
      key: 'profile' as const,
      label: 'Profile',
      icon: User,
    },
  ];

  const renderTab = (tab: typeof tabs[0]) => {
    const isActive = activeTab === tab.key;
    const Icon = tab.icon;

    return (
      <TouchableOpacity
        key={tab.key}
        style={styles.tab}
        onPress={() => onTabPress(tab.key)}
        activeOpacity={0.7}
      >
        <View style={styles.tabIconContainer}>
          <Icon
            size={20}
            color={isActive ? COLORS.primary : COLORS.gray500}
            strokeWidth={isActive ? 2.5 : 2}
          />
          {tab.badge && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{tab.badge}</Text>
            </View>
          )}
        </View>
        <Text
          style={[
            styles.tabLabel,
            isActive && styles.tabLabelActive,
          ]}
        >
          {tab.label}
        </Text>
        {isActive && <View style={styles.activeIndicator} />}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.navigation}>
        {tabs.map(renderTab)}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.white,
    paddingBottom: 0, // Remove extra padding - MainLayout handles safe area
  },
  navigation: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.sm,
    backgroundColor: COLORS.white,
    shadowColor: COLORS.black,
    shadowOffset: {
      width: 0,
      height: -2, // Negative height for top shadow
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5, // Android shadow
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    position: 'relative',
  },
  tabIconContainer: {
    position: 'relative',
    marginBottom: SPACING.xs,
  },
  badge: {
    position: 'absolute',
    top: -6,
    right: -8,
    backgroundColor: COLORS.error,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.xs,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.white,
    lineHeight: 12,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: COLORS.gray500,
    textAlign: 'center',
  },
  tabLabelActive: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  activeIndicator: {
    position: 'absolute',
    top: -2,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.primary,
  },
});

export default BottomNavigation;