import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
  ScrollView,
  Alert,
  Linking,
  Dimensions,
  Modal,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import orderService from '../services/orderService';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import {
  ArrowLeft,
  Share2,
  Package,
  MapPin,
  Building2,
  Phone,
  Clock,
  CheckCircle,
  AlertTriangle,
  User,
  Star,
  QrCode,
  X,
  Navigation,
} from 'lucide-react-native';
import { COLORS, TYPOGRAPHY, SPACING, SHADOWS, LAYOUT } from '../theme/design-system';
import MainLayout from '../components/MainLayout';

const { width: screenWidth } = Dimensions.get('window');

interface SampleInfo {
  type: string;
  count: number;
  details?: string;
  totalWeight?: string;
  collectionTime?: string;
}

interface HospitalInfo {
  name: string;
  department: string;
  address: string;
  distance: string;
  estimatedArrival: string;
}

interface RiderInfo {
  name: string;
  phone: string;
  vehicle: string;
  vehicleNumber: string;
  rating: number;
  totalDeliveries: number;
  lastSeen: string;
  currentLocation?: {
    latitude: number;
    longitude: number;
  };
  isLocationActive?: boolean;
}

interface LocationCoordinates {
  latitude: number;
  longitude: number;
}

interface LocationState {
  collectionCenter: LocationCoordinates;
  hospital: LocationCoordinates;
  riderLocation?: LocationCoordinates;
  isRiderLocationActive: boolean;
  routeCoordinates: LocationCoordinates[];
  estimatedTimeToPickup: string;
  estimatedTimeToDelivery: string;
}

interface TimelineItem {
  id: string;
  title: string;
  subtitle: string;
  time: string;
  status: 'completed' | 'current' | 'pending';
}

interface ActiveDeliveryDetailsScreenProps {
  onBack: () => void;
  deliveryId: string;
  activeCount?: number;
  onTabPress?: (tab: 'home' | 'deliveries' | 'history' | 'profile') => void;
}

const ActiveDeliveryDetailsScreen: React.FC<ActiveDeliveryDetailsScreenProps> = ({
  onBack,
  deliveryId,
  activeCount = 5,
  onTabPress,
}) => {
  const [showQRModal, setShowQRModal] = useState(false);
  const [orderData, setOrderData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [qrData, setQrData] = useState<string | null>(null);
  const [timeline, setTimeline] = useState<TimelineItem[]>([]);
  const mapRef = useRef<MapView>(null);

  // Location state management
  const [locationState, setLocationState] = useState<LocationState>({
    collectionCenter: {
      latitude: 6.9147,
      longitude: 79.8731,
    },
    hospital: {
      latitude: 6.9236,
      longitude: 79.8581,
    },
    riderLocation: undefined,
    isRiderLocationActive: false,
    routeCoordinates: [],
    estimatedTimeToPickup: 'N/A',
    estimatedTimeToDelivery: 'N/A',
  });

  // Load order data from backend
  const loadOrderData = async () => {
    try {
      setIsLoading(true);

      // Get order details
      const orderResponse = await orderService.getOrderById(deliveryId);
      if (orderResponse.success && orderResponse.data) {
        const order = orderResponse.data.order;
        const statusHistory = orderResponse.data.status_history || [];

        setOrderData(order);

        // Update location state with real coordinates
        const pickupLat = order.locations?.pickup?.lat || (order as any).pickup_location_lat;
        const pickupLng = order.locations?.pickup?.lng || (order as any).pickup_location_lng;
        const deliveryLat = order.locations?.delivery?.lat || (order as any).delivery_location_lat;
        const deliveryLng = order.locations?.delivery?.lng || (order as any).delivery_location_lng;

        setLocationState(prev => ({
          ...prev,
          collectionCenter: {
            latitude: pickupLat || prev.collectionCenter.latitude,
            longitude: pickupLng || prev.collectionCenter.longitude,
          },
          hospital: {
            latitude: deliveryLat || prev.hospital.latitude,
            longitude: deliveryLng || prev.hospital.longitude,
          },
          isRiderLocationActive: !!order.rider_id,
          estimatedTimeToDelivery: order.timing?.estimated_delivery_time || (order as any).estimated_delivery_time || 'N/A',
        }));

        // Fit map to show both locations when data loads
        if (mapRef.current && pickupLat && pickupLng && deliveryLat && deliveryLng) {
          setTimeout(() => {
            mapRef.current?.fitToCoordinates(
              [
                { latitude: pickupLat, longitude: pickupLng },
                { latitude: deliveryLat, longitude: deliveryLng }
              ],
              {
                edgePadding: { top: 100, right: 50, bottom: 100, left: 50 },
                animated: true,
              }
            );
          }, 500); // Small delay to ensure map is rendered
        }

        // Build timeline from status history and order timestamps
        const timelineItems = buildTimelineFromOrder(order, statusHistory);
        setTimeline(timelineItems);

        // Get QR code if order is active
        if (order.rider_id) {
          const qrResponse = await orderService.getOrderQR(deliveryId);
          if (qrResponse.success && qrResponse.data) {
            setQrData(qrResponse.data.qr_data);
          }
        }
      }
    } catch (error) {
      console.error('Failed to load order data:', error);
      Alert.alert('Error', 'Failed to load delivery details');
    } finally {
      setIsLoading(false);
    }
  };

  // Load data on component mount
  useEffect(() => {
    loadOrderData();
  }, [deliveryId]);

  // Real-time location updates from backend
  useEffect(() => {
    if (!orderData?.rider_id) return;

    const pollRiderLocation = async () => {
      try {
        console.log('📍 Polling rider location for order:', deliveryId);
        const trackingResponse = await orderService.getOrderTracking(deliveryId);
        console.log('📍 Tracking response:', trackingResponse);

        if (trackingResponse.success && trackingResponse.data) {
          const trackingData = trackingResponse.data;
          const riderLat = trackingData.rider_location?.lat || trackingData.rider_current_location?.lat;
          const riderLng = trackingData.rider_location?.lng || trackingData.rider_current_location?.lng;

          console.log('📍 Rider location:', { lat: riderLat, lng: riderLng });

          if (riderLat && riderLng && riderLat !== 0 && riderLng !== 0) {
            setLocationState(prev => {
              const newState = {
                ...prev,
                riderLocation: {
                  latitude: riderLat,
                  longitude: riderLng,
                },
                isRiderLocationActive: true,
                estimatedTimeToDelivery: trackingData.estimated_arrival || prev.estimatedTimeToDelivery,
              };

              console.log('📍 Updated location state with rider:', newState.riderLocation);

              // Update map to show rider location
              if (mapRef.current) {
                setTimeout(() => {
                  mapRef.current?.fitToCoordinates(
                    [
                      prev.collectionCenter,
                      prev.hospital,
                      { latitude: riderLat, longitude: riderLng }
                    ],
                    {
                      edgePadding: { top: 100, right: 50, bottom: 100, left: 50 },
                      animated: true,
                    }
                  );
                }, 100);
              }

              return newState;
            });
          } else {
            console.log('📍 No valid rider location available');
          }
        }
      } catch (error) {
        console.error('📍 Failed to get rider location:', error);
      }
    };

    // Poll rider location every 30 seconds
    const interval = setInterval(pollRiderLocation, 30000);

    // Get initial location immediately
    pollRiderLocation();

    return () => clearInterval(interval);
  }, [orderData?.rider_id, deliveryId]);
  // Generate sample info from order data
  const getSampleInfo = (): SampleInfo[] => {
    if (!orderData) return [];

    return [{
      type: `${orderData.sample_type} samples`,
      count: orderData.sample_quantity || 1,
      details: orderData.urgency === 'urgent' ? '(Urgent priority)' : '(Routine)',
    }];
  };

  // Generate hospital info from order data
  const getHospitalInfo = (): HospitalInfo => {
    if (!orderData) {
      return {
        name: 'Loading...',
        department: '',
        address: '',
        distance: '',
        estimatedArrival: '',
      };
    }

    return {
      name: orderData.hospital_name || 'Hospital',
      department: 'Laboratory',
      address: 'Address loading...',
      distance: `${orderData.distance?.estimated_km || 0} km from collection center`,
      estimatedArrival: orderData.timing?.estimated_delivery_time || 'N/A',
    };
  };

  // Generate rider info from order data
  const getRiderInfo = (): RiderInfo => {
    if (!orderData?.rider_info && !orderData?.rider_name) {
      return {
        name: 'No rider assigned',
        phone: '',
        vehicle: '',
        vehicleNumber: '',
        rating: 0,
        totalDeliveries: 0,
        lastSeen: '',
      };
    }

    return {
      name: orderData.rider_info?.name || orderData.rider_name || 'Rider',
      phone: orderData.rider_info?.phone || orderData.rider_phone || '',
      vehicle: orderData.rider_info?.vehicle?.type || 'Vehicle',
      vehicleNumber: orderData.rider_info?.vehicle?.registration || 'N/A',
      rating: 0, // Removed ratings as requested
      totalDeliveries: 0, // Not available in backend
      lastSeen: locationState.isRiderLocationActive ? 'Live tracking' : 'Unknown',
    };
  };

  const [timeRemaining, setTimeRemaining] = useState(locationState.estimatedTimeToDelivery + ' remaining');

  // Update time remaining when location state changes
  useEffect(() => {
    setTimeRemaining(locationState.estimatedTimeToDelivery + ' remaining');
  }, [locationState.estimatedTimeToDelivery]);
  // Get current status from order data
  const getCurrentStatus = () => {
    if (!orderData) return 'Loading...';

    const statusMessages = {
      'pending_rider_assignment': 'Waiting for rider assignment',
      'assigned': 'Rider assigned • En route to pickup',
      'pickup_started': 'Rider arrived at collection center',
      'picked_up': 'Samples collected • En route to hospital',
      'delivery_started': 'Rider arrived at hospital',
      'delivered': 'Delivered successfully',
      'cancelled': 'Delivery cancelled',
    };

    return statusMessages[orderData.status as keyof typeof statusMessages] || `Status: ${orderData.status}`;
  };

  // Build timeline from order data and status history
  const buildTimelineFromOrder = (order: any, statusHistory: any[]): TimelineItem[] => {
    const formatTime = (timestamp: string | null) => {
      if (!timestamp) return 'Pending';
      try {
        return new Date(timestamp).toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        });
      } catch {
        return 'Pending';
      }
    };

    const timelineSteps = [
      {
        id: '1',
        title: 'Order Created',
        subtitle: `Delivery created with ${order.sample_quantity || 1} ${order.sample_type} sample(s)`,
        time: formatTime(order.created_at),
        status: 'completed' as const,
        orderStatus: 'created'
      },
      {
        id: '2',
        title: 'Rider Assignment',
        subtitle: order.rider_id ? 'Rider assigned successfully' : 'Waiting for rider assignment',
        time: formatTime(order.assigned_at),
        status: order.assigned_at ? 'completed' as const : (order.status === 'pending_rider_assignment' ? 'current' as const : 'pending' as const),
        orderStatus: 'assigned'
      },
      {
        id: '3',
        title: 'En Route to Pickup',
        subtitle: 'Rider traveling to collection center',
        time: formatTime(order.pickup_started_at),
        status: order.pickup_started_at ? 'completed' as const : (order.status === 'pickup_started' ? 'current' as const : 'pending' as const),
        orderStatus: 'pickup_started'
      },
      {
        id: '4',
        title: 'Samples Collected',
        subtitle: 'QR code scanned and samples picked up',
        time: formatTime(order.picked_up_at),
        status: order.picked_up_at ? 'completed' as const : (order.status === 'picked_up' ? 'current' as const : 'pending' as const),
        orderStatus: 'picked_up'
      },
      {
        id: '5',
        title: 'Delivered to Hospital',
        subtitle: order.delivered_at ? 'Successfully delivered to hospital lab' : 'En route to hospital',
        time: formatTime(order.delivered_at),
        status: order.delivered_at ? 'completed' as const : (order.status === 'delivery_started' || order.status === 'delivered' ? 'current' as const : 'pending' as const),
        orderStatus: 'delivered'
      }
    ];

    // Set current status based on order status
    const currentOrderStatuses = ['pending_rider_assignment', 'assigned', 'pickup_started', 'picked_up', 'delivery_started'];
    if (currentOrderStatuses.includes(order.status)) {
      const currentStep = timelineSteps.find(step => {
        switch (order.status) {
          case 'pending_rider_assignment': return step.orderStatus === 'assigned';
          case 'assigned': return step.orderStatus === 'pickup_started';
          case 'pickup_started': return step.orderStatus === 'pickup_started';
          case 'picked_up': return step.orderStatus === 'picked_up';
          case 'delivery_started': return step.orderStatus === 'delivered';
          default: return false;
        }
      });
      if (currentStep) {
        currentStep.status = 'current';
      }
    }

    return timelineSteps;
  };

  // Timeline will be loaded from backend status_history

  const handleCall = (phoneNumber: string) => {
    const url = `tel:${phoneNumber}`;
    Linking.openURL(url).catch(() => {
      Alert.alert('Error', 'Unable to make phone call');
    });
  };

  const handleShare = () => {
    Alert.alert('Share', 'Share delivery details');
  };

  const handleReportEmergency = () => {
    Alert.alert(
      'Report Emergency',
      'Are you sure you want to report an emergency?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Report', style: 'destructive', onPress: () => {
          handleCall('+94 11 PRIMECARE');
        }},
      ]
    );
  };

  const renderMap = () => {
    // Calculate map region to fit all markers
    const allCoordinates = [
      locationState.collectionCenter,
      locationState.hospital,
      ...(locationState.riderLocation ? [locationState.riderLocation] : [])
    ];

    const minLat = Math.min(...allCoordinates.map(coord => coord.latitude));
    const maxLat = Math.max(...allCoordinates.map(coord => coord.latitude));
    const minLng = Math.min(...allCoordinates.map(coord => coord.longitude));
    const maxLng = Math.max(...allCoordinates.map(coord => coord.longitude));

    const region = {
      latitude: (minLat + maxLat) / 2,
      longitude: (minLng + maxLng) / 2,
      latitudeDelta: Math.max(0.01, (maxLat - minLat) * 1.5),
      longitudeDelta: Math.max(0.01, (maxLng - minLng) * 1.5),
    };

    return (
      <View style={styles.mapContainer}>
        <MapView
          ref={mapRef}
          provider={PROVIDER_GOOGLE}
          style={styles.map}
          initialRegion={region}
          showsUserLocation={false}
          showsMyLocationButton={false}
          showsTraffic={false}
          zoomEnabled={true}
          scrollEnabled={true}
        >
          {/* Collection Center Marker */}
          <Marker
            coordinate={locationState.collectionCenter}
            title="Collection Center"
            description="Sample pickup location"
            anchor={{ x: 0.5, y: 1 }}
          >
            <View style={styles.pickupMarker}>
              <Package size={14} color={COLORS.white} />
            </View>
          </Marker>

          {/* Hospital Marker */}
          <Marker
            coordinate={locationState.hospital}
            title="Hospital"
            description="Sample delivery destination"
            anchor={{ x: 0.5, y: 1 }}
          >
            <View style={styles.hospitalMarker}>
              <Building2 size={14} color={COLORS.white} />
            </View>
          </Marker>

          {/* Rider Location Marker (if active) */}
          {locationState.riderLocation && locationState.isRiderLocationActive && (
            <Marker
              coordinate={locationState.riderLocation}
              title="Rider Location"
              description={`${getRiderInfo().name} - Live tracking`}
              anchor={{ x: 0.5, y: 0.5 }}
            >
              <View style={styles.riderMarker}>
                <Navigation size={12} color={COLORS.white} />
              </View>
            </Marker>
          )}
        </MapView>

        {/* Time remaining overlay */}
        <View style={styles.timeRemainingBadge}>
          <Text style={styles.timeRemainingText}>{timeRemaining}</Text>
        </View>

        {/* Live tracking indicator */}
        {locationState.isRiderLocationActive && (
          <View style={styles.liveTrackingBadge}>
            <View style={styles.liveIndicator} />
            <Text style={styles.liveTrackingText}>Live tracking</Text>
          </View>
        )}
      </View>
    );
  };

  const renderSampleInformation = () => {
    const sampleInfo = getSampleInfo();

    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Sample Information</Text>
          <TouchableOpacity
            style={styles.qrButton}
            onPress={() => setShowQRModal(true)}
          >
            <QrCode size={16} color={COLORS.primary} />
          </TouchableOpacity>
        </View>

        {sampleInfo.map((sample: any, index: number) => (
          <View key={index} style={styles.sampleItem}>
            <View style={styles.sampleIcon}>
              <Package size={16} color={COLORS.primary} />
            </View>
            <View style={styles.sampleContent}>
              <Text style={styles.sampleText}>
                <Text style={styles.sampleType}>{sample.type}:</Text>
                <Text style={styles.sampleCount}> {sample.count} </Text>
                <Text style={styles.sampleDetails}>{sample.details}</Text>
              </Text>
            </View>
          </View>
        ))}

        <View style={styles.sampleSummary}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Total samples:</Text>
            <Text style={styles.summaryValue}>{orderData?.sample_quantity || 0}</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Priority:</Text>
            <Text style={styles.summaryValue}>{orderData?.urgency || 'N/A'}</Text>
          </View>
        </View>
      </View>
    );
  };

  const renderHospitalInformation = () => {
    const hospitalInfo = getHospitalInfo();

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Hospital Information</Text>

        <View style={styles.hospitalHeader}>
          <Building2 size={20} color={COLORS.primary} />
          <View style={styles.hospitalDetails}>
            <Text style={styles.hospitalName}>{hospitalInfo.name}</Text>
            <Text style={styles.hospitalDepartment}>{hospitalInfo.department}</Text>
            <Text style={styles.hospitalAddress}>{hospitalInfo.address}</Text>
          </View>
        </View>

        <View style={styles.hospitalInfo}>
          <View style={styles.infoRow}>
            <MapPin size={16} color={COLORS.textSecondary} />
            <Text style={styles.infoText}>{hospitalInfo.distance}</Text>
          </View>
          <View style={styles.infoRow}>
            <Clock size={16} color={COLORS.textSecondary} />
            <Text style={styles.infoText}>Estimated arrival: {hospitalInfo.estimatedArrival}</Text>
          </View>
        </View>
      </View>
    );
  };

  const renderRiderInformation = () => {
    const riderInfo = getRiderInfo();

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Rider Information</Text>

        <View style={styles.riderHeader}>
          <View style={styles.riderAvatar}>
            <User size={20} color={COLORS.white} />
          </View>
          <View style={styles.riderDetails}>
            <View style={styles.riderNameRow}>
              <Text style={styles.riderName}>{riderInfo.name}</Text>
            </View>
            <Text style={styles.riderVehicle}>{riderInfo.vehicle} - {riderInfo.vehicleNumber}</Text>
          </View>
        </View>

        <View style={styles.riderContactInfo}>
          {riderInfo.phone ? (
            <TouchableOpacity
              style={styles.riderContactItem}
              onPress={() => handleCall(riderInfo.phone)}
            >
              <Phone size={16} color={COLORS.primary} />
              <Text style={styles.riderPhone}>{riderInfo.phone}</Text>
            </TouchableOpacity>
          ) : null}
          <View style={styles.riderContactItem}>
            <Clock size={16} color={COLORS.textSecondary} />
            <Text style={styles.lastSeenText}>
              {locationState.isRiderLocationActive ? 'Live tracking active' : riderInfo.lastSeen}
            </Text>
            {locationState.isRiderLocationActive && (
              <View style={styles.liveStatusDot} />
            )}
          </View>
        </View>
      </View>
    );
  };

  const renderTimeline = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Delivery Timeline</Text>

      {timeline.map((item, index) => (
        <View key={item.id} style={styles.timelineItem}>
          <View style={styles.timelineLeft}>
            <View style={[
              styles.timelineIndicator,
              item.status === 'completed' && styles.timelineIndicatorCompleted,
              item.status === 'current' && styles.timelineIndicatorCurrent,
            ]}>
              {item.status === 'completed' && (
                <CheckCircle size={12} color={COLORS.white} />
              )}
              {item.status === 'current' && (
                <View style={styles.currentIndicatorDot} />
              )}
            </View>
            {index < timeline.length - 1 && (
              <View style={[
                styles.timelineLine,
                item.status === 'completed' && styles.timelineLineCompleted,
              ]} />
            )}
          </View>

          <View style={styles.timelineContent}>
            <View style={styles.timelineHeader}>
              <Text style={[
                styles.timelineTitle,
                item.status === 'current' && styles.timelineTitleCurrent,
              ]}>
                {item.title}
              </Text>
              <Text style={[
                styles.timelineTime,
                item.status === 'current' && styles.timelineTimeCurrent,
              ]}>
                {item.time}
              </Text>
            </View>
            <Text style={styles.timelineSubtitle}>{item.subtitle}</Text>
          </View>
        </View>
      ))}
    </View>
  );

  const renderActionButtons = () => {
    const riderInfo = getRiderInfo();

    return (
      <View style={styles.actionButtonsContainer}>
        {riderInfo.phone ? (
          <TouchableOpacity
            style={styles.primaryActionButton}
            onPress={() => handleCall(riderInfo.phone)}
          >
            <Phone size={16} color={COLORS.white} />
            <Text style={styles.primaryActionText}>Call Rider</Text>
          </TouchableOpacity>
        ) : null}

        <TouchableOpacity
          style={styles.secondaryActionButton}
          onPress={() => handleCall('+94 11 245 6789')}
        >
          <Building2 size={16} color={COLORS.primary} />
          <Text style={styles.secondaryActionText}>Call Hospital Lab</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.emergencyButton}
          onPress={handleReportEmergency}
        >
          <AlertTriangle size={16} color={COLORS.error} />
          <Text style={styles.emergencyButtonText}>Report Emergency</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderEmergencyContact = () => (
    <View style={styles.emergencyContact}>
      <View style={styles.emergencyHeader}>
        <AlertTriangle size={16} color={COLORS.error} />
        <Text style={styles.emergencyTitle}>Emergency Contact</Text>
      </View>
      <TouchableOpacity
        style={styles.emergencyContactItem}
        onPress={() => handleCall('+94 11 PRIMECARE')}
      >
        <Text style={styles.emergencyContactText}>+94 11 PRIMECARE</Text>
      </TouchableOpacity>
    </View>
  );

  const renderQRModal = () => (
    <Modal
      visible={showQRModal}
      transparent={true}
      animationType="fade"
      onRequestClose={() => setShowQRModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.qrModalContainer}>
          {/* Modal Header */}
          <View style={styles.qrModalHeader}>
            <Text style={styles.qrModalTitle}>Delivery QR Code</Text>
            <TouchableOpacity
              style={styles.qrModalCloseButton}
              onPress={() => setShowQRModal(false)}
            >
              <X size={24} color={COLORS.textPrimary} />
            </TouchableOpacity>
          </View>

          {/* QR Code */}
          <View style={styles.qrCodeContainer}>
            <View style={styles.qrCodePlaceholder}>
              {qrData ? (
                <QRCode
                  value={qrData}
                  size={180}
                  color={COLORS.black}
                  backgroundColor={COLORS.white}
                  quietZone={10}
                />
              ) : (
                <View style={styles.loadingQR}>
                  <Text style={styles.loadingQRText}>
                    {orderData?.rider_id ? 'Loading QR Code...' : 'No rider assigned'}
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.secureQRContainer}>
              <CheckCircle size={14} color={COLORS.success} />
              <Text style={styles.secureQRText}>Secure QR Code</Text>
            </View>
          </View>

          {/* Delivery Info */}
          <View style={styles.qrModalInfo}>
            <Text style={styles.qrModalInfoTitle}>Delivery ID</Text>
            <Text style={styles.qrModalInfoValue}>{deliveryId}</Text>

            <Text style={styles.qrModalInfoTitle}>Status</Text>
            <Text style={styles.qrModalInfoValue}>{getCurrentStatus()}</Text>
          </View>

          {/* Instructions */}
          <View style={styles.qrInstructions}>
            <Text style={styles.qrInstructionsText}>
              Show this QR code to the rider for pickup verification
            </Text>
          </View>
        </View>
      </View>
    </Modal>
  );

  const handleTabPress = (tab: 'home' | 'deliveries' | 'history' | 'profile') => {
    if (onTabPress) {
      onTabPress(tab);
    }
  };

  return (
    <MainLayout activeTab="deliveries" onTabPress={handleTabPress}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <ArrowLeft size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Active ({activeCount})</Text>
        </View>

        <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
          <Share2 size={20} color={COLORS.textPrimary} />
        </TouchableOpacity>
      </View>

      {/* Delivery Details Header */}
      <View style={styles.deliveryHeader}>
        <Text style={styles.deliveryTitle}>Delivery Details</Text>
        <Text style={styles.deliveryId}>{deliveryId}</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Status Banner */}
        <View style={styles.statusBanner}>
          <Package size={16} color={COLORS.white} />
          <Text style={styles.statusText}>{getCurrentStatus()}</Text>
        </View>

        {/* Map */}
        {renderMap()}

        {/* Sample Information */}
        {renderSampleInformation()}

        {/* Hospital Information */}
        {renderHospitalInformation()}

        {/* Rider Information */}
        {renderRiderInformation()}

        {/* Timeline */}
        {renderTimeline()}

        {/* Action Buttons */}
        {renderActionButtons()}

        {/* Emergency Contact */}
        {renderEmergencyContact()}
      </ScrollView>

      {/* QR Code Modal */}
      {renderQRModal()}
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
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray200,
  },
  backButton: {
    padding: SPACING.xs,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  shareButton: {
    padding: SPACING.xs,
  },
  deliveryHeader: {
    backgroundColor: COLORS.white,
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.md,
    alignItems: 'center',
  },
  deliveryTitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  deliveryId: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  content: {
    flex: 1,
  },
  statusBanner: {
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
    gap: SPACING.sm,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.white,
  },
  mapContainer: {
    height: 250,
    backgroundColor: COLORS.gray100,
    position: 'relative',
    borderRadius: LAYOUT.radius.lg,
    overflow: 'hidden',
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.lg,
    ...SHADOWS.card,
  },
  map: {
    flex: 1,
  },
  pickupMarker: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.warning,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.white,
    ...SHADOWS.sm,
  },
  hospitalMarker: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.white,
    ...SHADOWS.sm,
  },
  riderMarker: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.success,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.white,
    ...SHADOWS.md,
  },
  timeRemainingBadge: {
    position: 'absolute',
    bottom: SPACING.lg,
    right: SPACING.lg,
    backgroundColor: COLORS.success,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: LAYOUT.radius.md,
    ...SHADOWS.sm,
  },
  timeRemainingText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.white,
  },
  liveTrackingBadge: {
    position: 'absolute',
    top: SPACING.lg,
    left: SPACING.lg,
    backgroundColor: COLORS.success,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: LAYOUT.radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    ...SHADOWS.sm,
  },
  liveTrackingText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.white,
  },
  liveIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.white,
  },
  liveStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.success,
    marginLeft: SPACING.xs,
  },
  section: {
    backgroundColor: COLORS.white,
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.lg,
    borderRadius: LAYOUT.radius.lg,
    padding: SPACING.lg,
    ...SHADOWS.card,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.lg,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  qrButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.primaryUltraLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sampleItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: SPACING.md,
    gap: SPACING.sm,
  },
  sampleIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.primaryUltraLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  sampleContent: {
    flex: 1,
  },
  sampleText: {
    fontSize: 14,
    lineHeight: 20,
  },
  sampleType: {
    fontWeight: '500',
    color: COLORS.textPrimary,
  },
  sampleCount: {
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  sampleDetails: {
    color: COLORS.textSecondary,
  },
  sampleSummary: {
    borderTopWidth: 1,
    borderTopColor: COLORS.gray200,
    paddingTop: SPACING.md,
    marginTop: SPACING.md,
  },
  summaryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.sm,
  },
  summaryLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.textPrimary,
  },
  hospitalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: SPACING.md,
    gap: SPACING.md,
  },
  hospitalDetails: {
    flex: 1,
  },
  hospitalName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  hospitalDepartment: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  hospitalAddress: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  hospitalInfo: {
    gap: SPACING.sm,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  infoText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  riderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
    gap: SPACING.md,
  },
  riderAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  riderDetails: {
    flex: 1,
  },
  riderNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.xs,
  },
  riderName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  riderRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.textPrimary,
  },
  deliveriesText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  riderVehicle: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  riderContactInfo: {
    gap: SPACING.sm,
  },
  riderContactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  riderPhone: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '500',
  },
  lastSeenText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: SPACING.lg,
  },
  timelineLeft: {
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  timelineIndicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.gray300,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.white,
  },
  timelineIndicatorCompleted: {
    backgroundColor: COLORS.success,
  },
  timelineIndicatorCurrent: {
    backgroundColor: COLORS.primary,
  },
  currentIndicatorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.white,
  },
  timelineLine: {
    flex: 1,
    width: 2,
    backgroundColor: COLORS.gray300,
    marginTop: SPACING.xs,
    minHeight: 40,
  },
  timelineLineCompleted: {
    backgroundColor: COLORS.success,
  },
  timelineContent: {
    flex: 1,
    paddingTop: 2,
  },
  timelineHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  timelineTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  timelineTitleCurrent: {
    color: COLORS.primary,
  },
  timelineTime: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  timelineTimeCurrent: {
    color: COLORS.primary,
    fontWeight: '500',
  },
  timelineSubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    lineHeight: 16,
  },
  actionButtonsContainer: {
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.lg,
    gap: SPACING.md,
  },
  primaryActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.lg,
    borderRadius: LAYOUT.radius.lg,
    gap: SPACING.sm,
    ...SHADOWS.sm,
  },
  primaryActionText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.white,
  },
  secondaryActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.primary,
    paddingVertical: SPACING.lg,
    borderRadius: LAYOUT.radius.lg,
    gap: SPACING.sm,
  },
  secondaryActionText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.primary,
  },
  emergencyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.error,
    paddingVertical: SPACING.lg,
    borderRadius: LAYOUT.radius.lg,
    gap: SPACING.sm,
  },
  emergencyButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.error,
  },
  emergencyContact: {
    backgroundColor: COLORS.error + '10',
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.lg,
    marginBottom: SPACING.massive,
    borderRadius: LAYOUT.radius.lg,
    padding: SPACING.lg,
  },
  emergencyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
    gap: SPACING.sm,
  },
  emergencyTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.error,
  },
  emergencyContactItem: {
    alignItems: 'center',
  },
  emergencyContactText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.error,
  },
  // QR Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
  },
  qrModalContainer: {
    backgroundColor: COLORS.white,
    borderRadius: LAYOUT.radius.xl,
    padding: SPACING.xl,
    width: '100%',
    maxWidth: 350,
    ...SHADOWS.lg,
  },
  qrModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.lg,
  },
  qrModalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  qrModalCloseButton: {
    padding: SPACING.xs,
  },
  qrCodeContainer: {
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  qrCodePlaceholder: {
    width: 200,
    height: 200,
    borderRadius: LAYOUT.radius.lg,
    borderWidth: 3,
    borderColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.white,
    ...SHADOWS.lg,
  },
  qrPattern: {
    width: 180,
    height: 180,
    backgroundColor: COLORS.black,
    position: 'relative',
    borderRadius: LAYOUT.radius.sm,
  },
  qrCorner: {
    position: 'absolute',
    width: 30,
    height: 30,
    backgroundColor: COLORS.white,
    top: 10,
    left: 10,
  },
  qrCornerTopRight: {
    top: 10,
    right: 10,
    left: undefined,
  },
  qrCornerBottomLeft: {
    bottom: 10,
    left: 10,
    top: undefined,
  },
  qrCornerBottomRight: {
    bottom: 10,
    right: 10,
    top: undefined,
    left: undefined,
  },
  qrBranding: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -30 }, { translateY: -10 }],
    backgroundColor: COLORS.white,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: LAYOUT.radius.sm,
  },
  qrBrandText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
  },
  secureQRContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.md,
    gap: SPACING.xs,
  },
  secureQRText: {
    fontSize: 12,
    color: COLORS.success,
    fontWeight: '500',
  },
  qrModalInfo: {
    backgroundColor: COLORS.gray50,
    borderRadius: LAYOUT.radius.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  qrModalInfoTitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '500',
    marginBottom: SPACING.xs,
    marginTop: SPACING.md,
  },
  qrModalInfoValue: {
    fontSize: 14,
    color: COLORS.textPrimary,
    fontWeight: '600',
  },
  qrInstructions: {
    alignItems: 'center',
  },
  qrInstructionsText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  loadingQR: {
    width: 180,
    height: 180,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.gray50,
    borderRadius: LAYOUT.radius.md,
  },
  loadingQRText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: '500',
    textAlign: 'center',
  },
});

export default ActiveDeliveryDetailsScreen;