import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
  Image,
  Dimensions,
} from 'react-native';
import { Shield, Zap, CheckCircle } from 'lucide-react-native';
import { COLORS, TYPOGRAPHY, SPACING, SHADOWS } from '../theme/design-system';

interface WelcomeScreenProps {
  onGetStarted: () => void;
}

const { width: screenWidth } = Dimensions.get('window');

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onGetStarted }) => {
  return (
    <View style={styles.container}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor={COLORS.white}
        translucent={false}
      />
      
      {/* Main Content */}
      <View style={styles.content}>
        {/* Medical Illustration Container */}
        <View style={styles.illustrationContainer}>
          {/* Background circle */}
          <View style={styles.illustrationBackground} />
          
          {/* Stethoscope placeholder - would be actual image in production */}
          <View style={styles.stethoscopeContainer}>
            <Text style={styles.stethoscopeText}>🩺</Text>
          </View>
          
          {/* Floating elements */}
          <View style={[styles.floatingElement, styles.element1]}>
            <Shield size={20} color={COLORS.primary} />
          </View>
          <View style={[styles.floatingElement, styles.element2]}>
            <CheckCircle size={16} color={COLORS.success} />
          </View>
          <View style={[styles.floatingElement, styles.element3]}>
            <Zap size={18} color={COLORS.warning} />
          </View>
        </View>

        {/* Welcome Text */}
        <View style={styles.textContainer}>
          <Text style={styles.welcomeTitle}>Welcome to TransFleet</Text>
          <Text style={styles.welcomeSubtitle}>
            Your trusted partner for safe medical{'\n'}sample delivery
          </Text>
        </View>

        {/* Feature Icons */}
        <View style={styles.featuresContainer}>
          <View style={styles.featureItem}>
            <View style={styles.featureIcon}>
              <Shield size={24} color={COLORS.primary} />
            </View>
            <Text style={styles.featureLabel}>Secure{'\n'}Transport</Text>
          </View>
          
          <View style={styles.featureItem}>
            <View style={styles.featureIcon}>
              <Zap size={24} color={COLORS.primary} />
            </View>
            <Text style={styles.featureLabel}>Fast{'\n'}Delivery</Text>
          </View>
          
          <View style={styles.featureItem}>
            <View style={styles.featureIcon}>
              <CheckCircle size={24} color={COLORS.primary} />
            </View>
            <Text style={styles.featureLabel}>Reliable{'\n'}Service</Text>
          </View>
        </View>
      </View>

      {/* Get Started Button */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity 
          style={styles.getStartedButton}
          onPress={onGetStarted}
          activeOpacity={0.8}
        >
          <Text style={styles.getStartedText}>Get Started</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  content: {
    flex: 1,
    paddingHorizontal: SPACING.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  illustrationContainer: {
    width: 200,
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.massive,
    position: 'relative',
  },
  illustrationBackground: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: COLORS.gray100,
    position: 'absolute',
  },
  stethoscopeContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.md,
  },
  stethoscopeText: {
    fontSize: 60,
  },
  floatingElement: {
    position: 'absolute',
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.sm,
  },
  element1: {
    top: 20,
    right: 30,
  },
  element2: {
    bottom: 40,
    left: 20,
  },
  element3: {
    top: 60,
    left: 10,
  },
  textContainer: {
    alignItems: 'center',
    marginBottom: SPACING.massive,
  },
  welcomeTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: SPACING.md,
  },
  welcomeSubtitle: {
    fontSize: 16,
    fontWeight: '400',
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  featuresContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: SPACING.lg,
  },
  featureItem: {
    alignItems: 'center',
    flex: 1,
  },
  featureIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: COLORS.primaryUltraLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.sm,
  },
  featureLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 16,
  },
  buttonContainer: {
    paddingHorizontal: SPACING.xl,
    paddingBottom: SPACING.massive,
  },
  getStartedButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.lg,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.sm,
  },
  getStartedText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.white,
    letterSpacing: 0.5,
  },
});

export default WelcomeScreen;