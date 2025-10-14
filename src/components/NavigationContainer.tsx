import React, { useState, useEffect } from 'react';
import { Alert, View } from 'react-native';
import { authService, RegistrationData } from '../services/authService';
import { useAuthStore } from '../stores/useAuthStore';

// Import screens
import WelcomeScreen from '../screens/WelcomeScreen';
import PhoneEntryScreen from '../screens/PhoneEntryScreen';
import OTPVerificationScreen from '../screens/OTPVerificationScreen';
import RegistrationStep1Screen, { RegistrationStep1Data } from '../screens/RegistrationStep1Screen';
import RegistrationStep2Screen from '../screens/RegistrationStep2Screen';
import RegistrationStep3Screen from '../screens/RegistrationStep3Screen';
import RegistrationStep4Screen, { SelectedFeatures } from '../screens/RegistrationStep4Screen';
import ApplicationSubmittedScreen from '../screens/ApplicationSubmittedScreen';
import ApprovalInProgressScreen from '../screens/ApprovalInProgressScreen';

// Main App Screens
import DashboardScreen from '../screens/DashboardScreen';
import ActiveDeliveriesScreen from '../screens/ActiveDeliveriesScreen';
import DeliveryHistoryScreen from '../screens/DeliveryHistoryScreen';
import CenterProfileScreen from '../screens/CenterProfileScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import CreateDeliveryScreen from '../screens/CreateDeliveryScreen';
import DeliveryCreatedScreen from '../screens/DeliveryCreatedScreen';
import OrderDetailsScreen from '../screens/OrderDetailsScreen';
import ActiveDeliveryDetailsScreen from '../screens/ActiveDeliveryDetailsScreen';

type Screen =
  | 'Welcome'
  | 'PhoneEntry'
  | 'OTPVerification'
  | 'RegistrationStep1'
  | 'RegistrationStep2'
  | 'RegistrationStep3'
  | 'RegistrationStep4'
  | 'ApplicationSubmitted'
  | 'ApprovalInProgress'
  // Main App Screens
  | 'Dashboard'
  | 'ActiveDeliveries'
  | 'DeliveryHistory'
  | 'CenterProfile'
  | 'Notifications'
  | 'CreateDelivery'
  | 'DeliveryCreated'
  | 'OrderDetails'
  | 'ActiveDeliveryDetails';

interface NavigationData {
  phone?: string;
  otpId?: string;
  step1Data?: RegistrationStep1Data;
  centerType?: 'dependent' | 'independent';
  selectedHospitals?: string[];
  selectedFeatures?: SelectedFeatures;
  // Main app navigation data
  orderId?: string;
  deliveryId?: string;
  orderData?: any;
  isAuthenticated?: boolean;
}

const NavigationContainer: React.FC = () => {
  // Check authentication state on app start
  const { isAuthenticated, isLoading, initialize } = useAuthStore();
  const [currentScreen, setCurrentScreen] = useState<Screen>(
    isAuthenticated ? 'Dashboard' : 'Welcome'
  );
  const [navigationData, setNavigationData] = useState<NavigationData>({});

  // Initialize auth state when app starts
  useEffect(() => {
    initialize();
  }, [initialize]);

  // Update screen based on auth state changes
  useEffect(() => {
    const checkAuthAndNavigate = async () => {
      console.log('🔍 [NavigationContainer] Checking auth state:', { isLoading, isAuthenticated });

      if (!isLoading && isAuthenticated) {
        try {
          // Check user's center status
          console.log('📡 [NavigationContainer] Fetching user profile...');
          const profileResponse = await authService.getUserProfile();
          console.log('📦 [NavigationContainer] Profile response:', JSON.stringify(profileResponse, null, 2));

          if (profileResponse.success && profileResponse.data) {
            const centerStatus = profileResponse.data.center_status || profileResponse.data.status;
            console.log('✅ [NavigationContainer] Center status detected:', centerStatus);

            // Determine which screen to show based on center status
            if (!centerStatus) {
              // No center created yet - shouldn't happen if isAuthenticated, but fallback
              console.log('⚠️  [NavigationContainer] No center status - navigating to Welcome');
              setCurrentScreen('Welcome');
            } else if (centerStatus === 'approved' || centerStatus === 'active') {
              // Approved - go to dashboard
              console.log('✨ [NavigationContainer] Center approved - navigating to Dashboard');
              setCurrentScreen('Dashboard');
            } else if (centerStatus === 'pending_hospital_approval' || centerStatus === 'pending_hq_approval') {
              // Pending approval - show approval in progress
              console.log('⏳ [NavigationContainer] Center pending approval - navigating to ApprovalInProgress');
              setCurrentScreen('ApprovalInProgress');
            } else {
              // Other statuses (rejected, etc.) - go to welcome
              console.log('❌ [NavigationContainer] Other status:', centerStatus, '- navigating to Welcome');
              setCurrentScreen('Welcome');
            }
          } else {
            console.log('⚠️  [NavigationContainer] Profile fetch failed - navigating to Welcome');
            setCurrentScreen('Welcome');
          }
        } catch (error) {
          console.error('💥 [NavigationContainer] Error checking auth status:', error);
          setCurrentScreen('Welcome');
        }
      } else if (!isLoading) {
        console.log('🚫 [NavigationContainer] Not authenticated - navigating to Welcome');
        setCurrentScreen('Welcome');
      }
    };

    checkAuthAndNavigate();
  }, [isAuthenticated, isLoading]);

  const navigate = (screen: Screen, data?: any) => {
    setCurrentScreen(screen);
    if (data) {
      setNavigationData(prev => ({ ...prev, ...data }));
    }
  };

  // Tab navigation handler
  const handleTabPress = (tab: 'home' | 'deliveries' | 'history' | 'profile') => {
    switch (tab) {
      case 'home':
        navigate('Dashboard');
        break;
      case 'deliveries':
        navigate('ActiveDeliveries');
        break;
      case 'history':
        navigate('DeliveryHistory');
        break;
      case 'profile':
        navigate('CenterProfile');
        break;
    }
  };

  const handleBack = () => {
    switch (currentScreen) {
      case 'PhoneEntry':
        navigate('Welcome');
        break;
      case 'OTPVerification':
        navigate('PhoneEntry');
        break;
      case 'RegistrationStep1':
        navigate('OTPVerification');
        break;
      case 'RegistrationStep2':
        navigate('RegistrationStep1');
        break;
      case 'RegistrationStep3':
        navigate('RegistrationStep2');
        break;
      case 'RegistrationStep4':
        navigate('RegistrationStep3');
        break;
      default:
        break;
    }
  };

  const renderScreen = () => {
    switch (currentScreen) {
      case 'Welcome':
        return (
          <WelcomeScreen
            onGetStarted={() => navigate('PhoneEntry')}
          />
        );

      case 'PhoneEntry':
        return (
          <PhoneEntryScreen
            onNext={(phone, otpId) => {
              navigate('OTPVerification', { phone, otpId });
            }}
            onBack={handleBack}
            onLoginSuccess={async () => {
              // Re-initialize auth to trigger the useEffect check
              await initialize();
            }}
          />
        );

      case 'OTPVerification':
        return (
          <OTPVerificationScreen
            phoneNumber={navigationData.phone || ''}
            otpId={navigationData.otpId || ''}
            onNext={() => navigate('RegistrationStep1')}
            onBack={handleBack}
            onResend={() => Alert.alert('OTP', 'OTP resent')}
            onLoginSuccess={async () => {
              // Re-initialize auth to trigger the useEffect check
              await initialize();
            }}
          />
        );

      case 'RegistrationStep1':
        return (
          <RegistrationStep1Screen
            onNext={(step1Data) => {
              navigate('RegistrationStep2', { step1Data });
            }}
            onBack={handleBack}
          />
        );

      case 'RegistrationStep2':
        return (
          <RegistrationStep2Screen
            onNext={(centerType) => {
              navigate('RegistrationStep3', { centerType });
            }}
            onBack={handleBack}
          />
        );

      case 'RegistrationStep3':
        return (
          <RegistrationStep3Screen
            centerType={navigationData.centerType || 'dependent'}
            onNext={(selectedHospitals) => {
              navigate('RegistrationStep4', { selectedHospitals });
            }}
            onBack={handleBack}
          />
        );

      case 'RegistrationStep4':
        return (
          <RegistrationStep4Screen
            onNext={async (selectedFeatures) => {
              try {
                // Complete registration with all collected data
                const registrationData: RegistrationData = {
                  center_name: navigationData.step1Data?.center_name || '',
                  center_type: navigationData.step1Data?.center_type || 'laboratory',
                  contact_person: navigationData.step1Data?.contact_person || '',
                  email: navigationData.step1Data?.email || '',
                  phone: navigationData.phone || '',
                  address: navigationData.step1Data?.address || '',
                  city: navigationData.step1Data?.city,
                  province: navigationData.step1Data?.province,
                  postal_code: navigationData.step1Data?.postal_code,
                  license_number: navigationData.step1Data?.license_number,
                  emergency_contact: navigationData.step1Data?.emergency_contact,
                  coordinates_lat: navigationData.step1Data?.coordinates_lat,
                  coordinates_lng: navigationData.step1Data?.coordinates_lng,
                  landline: navigationData.step1Data?.landline,
                  contact_person_phone: navigationData.step1Data?.contact_person_phone,
                  dependency_type: navigationData.centerType || 'dependent',
                  selected_hospitals: navigationData.selectedHospitals || []
                };

                // Submit registration to backend
                const registrationResponse = await authService.completeRegistration(registrationData);

                if (registrationResponse.success) {
                  // Request selected features if any
                  const selectedFeatureIds = Object.entries(selectedFeatures)
                    .filter(([_, isSelected]) => isSelected)
                    .map(([featureId, _]) => ({ featureId }));

                  if (selectedFeatureIds.length > 0) {
                    await authService.requestMultipleFeatures(selectedFeatureIds);
                  }

                  navigate('ApplicationSubmitted');
                } else {
                  Alert.alert(
                    'Registration Failed',
                    registrationResponse.message || 'Failed to complete registration. Please try again.'
                  );
                }
              } catch (error: any) {
                console.error('Registration error:', error);
                Alert.alert(
                  'Registration Error',
                  error.message || 'An error occurred during registration. Please try again.'
                );
              }
            }}
            onBack={handleBack}
          />
        );

      case 'ApplicationSubmitted':
        return (
          <ApplicationSubmittedScreen
            onTrackStatus={() => navigate('ApprovalInProgress')}
            onDownloadReceipt={() => Alert.alert('Download', 'Receipt download will be available soon')}
          />
        );

      case 'ApprovalInProgress':
        return (
          <ApprovalInProgressScreen
            onCheckStatus={async () => {
              try {
                const profileResponse = await authService.getUserProfile();
                if (profileResponse.success && profileResponse.data) {
                  const centerInfo = profileResponse.data.center_info;
                  if (centerInfo && centerInfo.status === 'approved') {
                    Alert.alert('Approved!', 'Your collection center has been approved. Welcome!', [
                      { text: 'Go to Dashboard', onPress: () => navigate('Dashboard') }
                    ]);
                  } else {
                    Alert.alert('Still Pending', 'Your application is still under review. We will notify you once approved.');
                  }
                } else {
                  Alert.alert('Error', 'Unable to check status. Please try again later.');
                }
              } catch (error) {
                Alert.alert('Error', 'Failed to check status. Please try again.');
              }
            }}
            onNeedHelp={() => Alert.alert('Help', 'Help requested - please contact support')}
          />
        );

      // Main App Screens
      case 'Dashboard':
        return (
          <DashboardScreen
            onCreateDelivery={() => navigate('CreateDelivery')}
            onViewActive={() => navigate('ActiveDeliveries')}
            onViewHistory={() => navigate('DeliveryHistory')}
            onViewProfile={() => navigate('CenterProfile')}
            onNavigateToDeliveries={() => navigate('ActiveDeliveries')}
            onNavigateToHistory={() => navigate('DeliveryHistory')}
            onNotificationPress={() => navigate('Notifications')}
            onTabPress={(tab) => {
              switch (tab) {
                case 'home':
                  // Already on Dashboard
                  break;
                case 'deliveries':
                  navigate('ActiveDeliveries');
                  break;
                case 'history':
                  navigate('DeliveryHistory');
                  break;
                case 'profile':
                  navigate('CenterProfile');
                  break;
              }
            }}
          />
        );

      case 'ActiveDeliveries':
        return (
          <ActiveDeliveriesScreen
            onBack={() => navigate('Dashboard')}
            onDeliveryPress={(deliveryId) => navigate('ActiveDeliveryDetails', { deliveryId })}
            onTabPress={handleTabPress}
          />
        );

      case 'DeliveryHistory':
        return (
          <DeliveryHistoryScreen
            onBack={() => navigate('Dashboard')}
            onDeliveryPress={(orderId) => navigate('OrderDetails', { orderId })}
            onTabPress={handleTabPress}
          />
        );

      case 'CenterProfile':
        return (
          <CenterProfileScreen
            onTabPress={handleTabPress}
            onBack={() => navigate('Dashboard')}
            onEditProfile={() => Alert.alert('Edit Profile')}
            onSignOut={() => navigate('Welcome')}
          />
        );

      case 'Notifications':
        return (
          <NotificationsScreen
            onBack={() => navigate('Dashboard')}
            onNotificationPress={() => Alert.alert('Notification')}
            onSettingsPress={() => Alert.alert('Settings')}
          />
        );

      case 'CreateDelivery':
        return (
          <CreateDeliveryScreen
            onClose={() => navigate('Dashboard')}
            onCreateDelivery={(orderData) => {
              navigate('DeliveryCreated', { orderData });
            }}
          />
        );

      case 'DeliveryCreated':
        return (
          <DeliveryCreatedScreen
            deliveryData={navigationData.orderData}
            onClose={() => navigate('Dashboard')}
            onTrackDelivery={() => {
              // Navigate directly to the specific order's tracking screen
              const orderId = navigationData.orderData?.order?.id || navigationData.orderData?.id;
              navigate('ActiveDeliveryDetails', { deliveryId: orderId });
            }}
            onCancelDelivery={() => {
              Alert.alert('Cancel Delivery', 'Cancel delivery functionality will be implemented');
              navigate('Dashboard');
            }}
          />
        );

      case 'OrderDetails':
        return (
          <OrderDetailsScreen
            orderId={navigationData.orderId || 'ORD-001'}
            onBack={() => navigate('DeliveryHistory')}
            onTabPress={(tab) => {
              switch (tab) {
                case 'home':
                  navigate('Dashboard');
                  break;
                case 'deliveries':
                  navigate('ActiveDeliveries');
                  break;
                case 'history':
                  navigate('DeliveryHistory');
                  break;
                case 'profile':
                  navigate('CenterProfile');
                  break;
              }
            }}
          />
        );

      case 'ActiveDeliveryDetails':
        return (
          <ActiveDeliveryDetailsScreen
            deliveryId={navigationData.deliveryId || 'DEL-001'}
            onBack={() => navigate('ActiveDeliveries')}
            onTabPress={(tab) => {
              switch (tab) {
                case 'home':
                  navigate('Dashboard');
                  break;
                case 'deliveries':
                  navigate('ActiveDeliveries');
                  break;
                case 'history':
                  navigate('DeliveryHistory');
                  break;
                case 'profile':
                  navigate('CenterProfile');
                  break;
              }
            }}
          />
        );

      default:
        return (
          <WelcomeScreen
            onGetStarted={() => navigate('PhoneEntry')}
          />
        );
    }
  };

  return (
    <View style={{
      flex: 1,
      backgroundColor: '#F5F7FA',
      // Prevent any white flashes during transitions
      opacity: 1,
    }}>
      {renderScreen()}
    </View>
  );
};

export default NavigationContainer;