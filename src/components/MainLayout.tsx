import React from 'react';
import { View, StyleSheet, Platform, StatusBar, Dimensions } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import BottomNavigation from './BottomNavigation';
import { COLORS } from '../theme/design-system';

interface MainLayoutProps {
  children: React.ReactNode;
  activeTab: 'home' | 'deliveries' | 'history' | 'profile';
  onTabPress: (tab: 'home' | 'deliveries' | 'history' | 'profile') => void;
  hideBottomNav?: boolean;
  activeDeliveriesCount?: number;
}

const MainLayout: React.FC<MainLayoutProps> = ({
  children,
  activeTab,
  onTabPress,
  hideBottomNav = false,
  activeDeliveriesCount = 0
}) => {
  const insets = useSafeAreaInsets();
  const { width, height } = Dimensions.get('window');

  // Device detection
  const isAndroid = Platform.OS === 'android';
  const isIOS = Platform.OS === 'ios';

  // Dynamic styles based on device
  const dynamicStyles = {
    safeAreaContainer: {
      ...styles.safeAreaContainer,
      // Ensure proper background for all device types
      paddingTop: isAndroid ? StatusBar.currentHeight || 0 : 0,
    },
    content: {
      ...styles.content,
      // Adjust for different screen sizes
      minHeight: height - insets.top - insets.bottom - (hideBottomNav ? 0 : 80),
    }
  };

  return (
    <View style={styles.fullContainer}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor={COLORS.background}
        translucent={false}
      />
      <SafeAreaView style={dynamicStyles.safeAreaContainer} edges={['top']}>
        <View style={styles.container}>
          {children}
        </View>
      </SafeAreaView>
      {!hideBottomNav && (
        <SafeAreaView style={styles.bottomNavContainer} edges={['bottom']}>
          <BottomNavigation
            activeTab={activeTab}
            onTabPress={onTabPress}
            activeDeliveriesCount={activeDeliveriesCount}
          />
        </SafeAreaView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  fullContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  safeAreaContainer: {
    flex: 1,
    backgroundColor: COLORS.background, // Safe area background
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    flex: 1,
  },
  bottomNavContainer: {
    backgroundColor: COLORS.white,
    // Will automatically respect safe area insets
  },
});

export default MainLayout;