import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
  ScrollView,
  Alert,
  SafeAreaView,
  Linking,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import {
  X,
  CheckCircle,
  Copy,
  Package,
  MapPin,
  Clock,
  Shield,
  QrCode,
  Phone,
  Car,
  AlertTriangle,
} from 'lucide-react-native';
import { COLORS, TYPOGRAPHY, SPACING, SHADOWS, LAYOUT } from '../theme/design-system';
import orderService from '../services/orderService';
import profileService from '../services/profileService';
// import { Clipboard } from '@react-native-clipboard/clipboard'; // TODO: Install this package
import { Clipboard } from 'react-native';

interface DeliveryData {
  order: {
    id: string;
    order_number: string;
    sample_type: string;
    sample_quantity: number;
    urgency: string;
    status: string;
    created_at: string;
    estimated_pickup_time?: string;
    estimated_delivery_time?: string;
  };
  qr_code?: {
    qr_id: string;
    qr_data: string;
    qr_image?: string;
  };
  center_info?: {
    name: string;
    address: string;
    phone: string;
  };
  hospital_info?: {
    name: string;
    address: string;
    phone: string;
  };
}

interface RiderStatus {
  status: 'pending_rider_assignment' | 'assigned' | 'pickup_started' | 'picked_up' | 'delivery_started' | 'delivered' | 'cancelled';
  rider?: {
    id: string;
    rider_name: string;
    phone: string;
    vehicle_type: string;
    vehicle_registration: string;
    current_location_lat?: number;
    current_location_lng?: number;
    eta?: string;
  };
  last_updated?: string;
}

interface DeliveryCreatedScreenProps {
  onClose: () => void;
  onTrackDelivery: () => void;
  onCancelDelivery: () => void;
  deliveryData: DeliveryData;
}

const DeliveryCreatedScreen: React.FC<DeliveryCreatedScreenProps> = ({
  onClose,
  onTrackDelivery,
  onCancelDelivery,
  deliveryData,
}) => {
  const [riderStatus, setRiderStatus] = useState<RiderStatus>({
    status: 'pending_rider_assignment',
  });

  const [supportContacts, setSupportContacts] = useState<{support: string; hospital: string}>({support: '', hospital: ''});
  const [isLoadingRider, setIsLoadingRider] = useState(true);
  const [qrData, setQrData] = useState<string | null>(null);

  useEffect(() => {
    // Load real data when component mounts
    loadOrderDetails();
    loadSupportContacts();
    pollRiderStatus();

    // Set up polling interval for rider status
    const pollInterval = setInterval(pollRiderStatus, 5000); // Poll every 5 seconds

    return () => clearInterval(pollInterval);
  }, [deliveryData.order.id]);

  const loadOrderDetails = async () => {
    try {
      // Get QR code for the order
      const qrResponse = await orderService.getOrderQR(deliveryData.order.id);
      if (qrResponse.success && qrResponse.data) {
        setQrData(qrResponse.data.qr_data);
        console.log('QR code loaded:', qrResponse.data.qr_id);
      }
    } catch (error) {
      console.error('Failed to load order details:', error);
    }
  };

  const loadSupportContacts = async () => {
    try {
      // Get user profile for support contact
      const profileResponse = await profileService.getProfile();
      if (profileResponse.success && profileResponse.data) {
        setSupportContacts({
          support: profileResponse.data.phone || '',
          hospital: deliveryData.hospital_info?.phone || ''
        });
      }
    } catch (error) {
      console.error('Failed to load support contacts:', error);
      // Set empty fallback values
      setSupportContacts({
        support: '',
        hospital: ''
      });
    }
  };

  const pollRiderStatus = async () => {
    try {
      const response = await orderService.getOrderById(deliveryData.order.id);
      if (response.success && response.data) {
        const order = response.data.order;
        setIsLoadingRider(false);

        // Map order status to rider status
        setRiderStatus({
          status: order.status as any,
          rider: order.rider_id ? {
            id: order.rider_id,
            rider_name: order.rider_info?.name || order.rider_name || 'Rider',
            phone: order.rider_info?.phone || order.rider_phone || '',
            vehicle_type: order.rider_info?.vehicle?.type || 'Vehicle',
            vehicle_registration: order.rider_info?.vehicle?.registration || 'N/A',
          } : undefined,
          last_updated: order.updated_at
        });
      }
    } catch (error) {
      console.error('Failed to poll rider status:', error);
      setIsLoadingRider(false);
    }
  };

  const handleCancelDelivery = async () => {
    try {
      Alert.alert(
        'Cancel Delivery',
        'Are you sure you want to cancel this delivery? This action cannot be undone.',
        [
          { text: 'Keep Delivery', style: 'cancel' },
          {
            text: 'Cancel Delivery',
            style: 'destructive',
            onPress: async () => {
              const response = await orderService.cancelOrder(deliveryData.order.id, 'User cancelled', 'Cancelled from delivery created screen');
              if (response.success) {
                Alert.alert('Success', 'Delivery cancelled successfully');
                onCancelDelivery();
              } else {
                Alert.alert('Error', response.message || 'Failed to cancel delivery');
              }
            }
          }
        ]
      );
    } catch (error) {
      console.error('Cancel delivery error:', error);
      Alert.alert('Error', 'Failed to cancel delivery. Please try again.');
    }
  };

  const copyDeliveryId = () => {
    Clipboard.setString(deliveryData.order.order_number);
    Alert.alert('Copied', 'Delivery ID copied to clipboard');
  };

  const handleCall = (phoneNumber: string) => {
    const url = `tel:${phoneNumber}`;
    Linking.openURL(url).catch(() => {
      Alert.alert('Error', 'Unable to make phone call');
    });
  };

  const getSampleDescription = () => {
    const sampleType = deliveryData.order.sample_type;
    const quantity = deliveryData.order.sample_quantity;
    const urgency = deliveryData.order.urgency;

    const typeLabel = sampleType.charAt(0).toUpperCase() + sampleType.slice(1);
    const urgencyLabel = urgency === 'urgent' ? ' (Urgent)' : '';

    return `${quantity} ${typeLabel} Sample${quantity > 1 ? 's' : ''}${urgencyLabel}`;
  };

  const formatDateTime = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    } catch {
      return dateString;
    }
  };

  const renderQRCode = () => {
    return (
      <View style={styles.qrCodeContainer}>
        <View style={styles.qrCodePlaceholder}>
          {qrData ? (
            <QRCode
              value={qrData}
              size={180}
              color={COLORS.black}
              backgroundColor={COLORS.white}
              logo={{
                uri: undefined // We can add a logo later if needed
              }}
              logoSize={30}
              logoBackgroundColor={COLORS.white}
              logoMargin={5}
              logoBorderRadius={15}
              quietZone={10}
            />
          ) : (
            <View style={styles.loadingQR}>
              <Text style={styles.loadingQRText}>Loading QR Code...</Text>
            </View>
          )}
        </View>

        <View style={styles.secureQRContainer}>
          <CheckCircle size={14} color={COLORS.success} />
          <Text style={styles.secureQRText}>Secure QR Code</Text>
        </View>
      </View>
    );
  };

  const renderInstructionStep = (
    number: number,
    icon: React.ReactNode,
    title: string,
    completed: boolean = false
  ) => (
    <View style={[styles.instructionStep, completed && styles.instructionStepCompleted]}>
      <View style={[styles.stepIcon, completed && styles.stepIconCompleted]}>
        {icon}
      </View>
      <Text style={[styles.instructionText, completed && styles.instructionTextCompleted]}>
        {title}
      </Text>
    </View>
  );

  const renderRiderStatus = () => {
    const getStatusColor = () => {
      switch (riderStatus.status) {
        case 'pending_rider_assignment':
          return COLORS.warning;
        case 'assigned':
          return COLORS.info;
        case 'pickup_started':
          return COLORS.primary;
        case 'picked_up':
          return COLORS.success;
        case 'delivery_started':
          return COLORS.success;
        case 'delivered':
          return COLORS.success;
        case 'cancelled':
          return COLORS.error;
        default:
          return COLORS.textSecondary;
      }
    };

    const getStatusIcon = () => {
      switch (riderStatus.status) {
        case 'pending_rider_assignment':
          return (
            <View style={styles.loadingIndicator}>
              <View style={styles.loadingDot} />
              <View style={[styles.loadingDot, styles.loadingDotDelay1]} />
              <View style={[styles.loadingDot, styles.loadingDotDelay2]} />
            </View>
          );
        case 'assigned':
        case 'pickup_started':
          return <CheckCircle size={20} color={COLORS.success} />;
        case 'picked_up':
          return <Phone size={20} color={COLORS.primary} />;
        case 'delivery_started':
          return <Car size={20} color={COLORS.success} />;
        case 'delivered':
          return <CheckCircle size={20} color={COLORS.success} />;
        case 'cancelled':
          return <X size={20} color={COLORS.error} />;
        default:
          return null;
      }
    };

    const getStatusMessage = () => {
      switch (riderStatus.status) {
        case 'pending_rider_assignment':
          return 'Finding nearby rider...';
        case 'assigned':
          return 'Rider assigned! Preparing for pickup';
        case 'pickup_started':
          return 'Rider is on the way to collect samples';
        case 'picked_up':
          return 'Samples collected! En route to hospital';
        case 'delivery_started':
          return 'Rider is delivering to hospital';
        case 'delivered':
          return 'Delivery completed successfully!';
        case 'cancelled':
          return 'Delivery has been cancelled';
        default:
          return 'Status unknown';
      }
    };

    return (
      <View style={styles.riderStatusContainer}>
        {/* Status Header */}
        <View style={styles.statusHeader}>
          {getStatusIcon()}
          <Text style={[styles.statusMessage, { color: getStatusColor() }]}>
            {getStatusMessage()}
          </Text>
        </View>

        {/* Rider Details (shown when rider is assigned) */}
        {riderStatus.rider && riderStatus.status !== 'pending_rider_assignment' && (
          <View style={styles.riderDetailsContainer}>
            <View style={styles.riderHeader}>
              <View style={styles.riderAvatar}>
                <Text style={styles.riderAvatarText}>
                  {riderStatus.rider.rider_name.charAt(0)}
                </Text>
              </View>
              <View style={styles.riderNameContainer}>
                <Text style={styles.riderName}>{riderStatus.rider.rider_name}</Text>
              </View>
            </View>

            <View style={styles.riderContactInfo}>
              <TouchableOpacity
                style={styles.riderContactItem}
                onPress={() => handleCall(riderStatus.rider!.phone)}
              >
                <Phone size={16} color={COLORS.primary} />
                <Text style={styles.riderPhone}>{riderStatus.rider.phone}</Text>
              </TouchableOpacity>

              <View style={styles.riderContactItem}>
                <Car size={16} color={COLORS.textSecondary} />
                <Text style={styles.riderVehicle}>
                  {riderStatus.rider.vehicle_registration} ({riderStatus.rider.vehicle_type})
                </Text>
              </View>

              {riderStatus.rider.eta && (
                <View style={styles.etaContainer}>
                  <Clock size={16} color={COLORS.success} />
                  <Text style={styles.riderETA}>ETA: {riderStatus.rider.eta}</Text>
                </View>
              )}
            </View>

            {/* Call Rider Button (shown when pickup started/picked up) */}
            {(riderStatus.status === 'pickup_started' || riderStatus.status === 'picked_up' || riderStatus.status === 'delivery_started') && (
              <TouchableOpacity
                style={styles.callRiderButton}
                onPress={() => handleCall(riderStatus.rider!.phone)}
              >
                <Phone size={16} color={COLORS.white} />
                <Text style={styles.callRiderText}>Call Rider</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Delivery Created</Text>
          <Text style={styles.headerSubtitle}>Show this QR code to the rider</Text>
        </View>
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <X size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Success Icon */}
        <View style={styles.successContainer}>
          <View style={styles.successIcon}>
            <CheckCircle size={32} color={COLORS.success} />
          </View>
        </View>

        {/* QR Code */}
        {renderQRCode()}

        {/* Delivery Details */}
        <View style={styles.detailsContainer}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Delivery ID</Text>
            <View style={styles.detailValueContainer}>
              <Text style={styles.detailValue}>{deliveryData.order.order_number}</Text>
              <TouchableOpacity style={styles.copyButton} onPress={copyDeliveryId}>
                <Copy size={16} color={COLORS.primary} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Samples</Text>
            <Text style={styles.detailValue}>{getSampleDescription()}</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Destination</Text>
            <Text style={styles.detailValue}>{deliveryData.hospital_info?.name || 'Hospital'}</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Created</Text>
            <Text style={styles.detailValue}>{formatDateTime(deliveryData.order.created_at)}</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Expected Pickup</Text>
            <Text style={[styles.detailValue, styles.expectedPickupText]}>
              {deliveryData.order.estimated_pickup_time ? formatDateTime(deliveryData.order.estimated_pickup_time) : 'ASAP'}
            </Text>
          </View>

        </View>

        {/* Instructions for Pickup */}
        <View style={styles.instructionsContainer}>
          <Text style={styles.sectionTitle}>Instructions for Pickup</Text>

          {renderInstructionStep(
            1,
            <Package size={16} color={COLORS.primary} />,
            'Prepare samples for collection',
            true
          )}

          {renderInstructionStep(
            2,
            <QrCode size={16} color={COLORS.primary} />,
            'Show this QR code to the rider',
            false
          )}

          {renderInstructionStep(
            3,
            <Shield size={16} color={COLORS.primary} />,
            'Rider will scan to confirm pickup',
            false
          )}

          {renderInstructionStep(
            4,
            <MapPin size={16} color={COLORS.primary} />,
            'Track delivery in real-time',
            false
          )}
        </View>

        {/* Rider Status */}
        {renderRiderStatus()}

        {/* Action Buttons */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.trackButton}
            onPress={onTrackDelivery}
            activeOpacity={0.8}
          >
            <Text style={styles.trackButtonText}>Track This Delivery</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.cancelButton}
            onPress={handleCancelDelivery}
            activeOpacity={0.8}
          >
            <Text style={styles.cancelButtonText}>Cancel Delivery</Text>
          </TouchableOpacity>
        </View>

        {/* Emergency Contacts */}
        <View style={styles.emergencyContainer}>
          <View style={styles.emergencyHeader}>
            <AlertTriangle size={16} color={COLORS.error} />
            <Text style={styles.emergencyTitle}>Emergency Contacts</Text>
          </View>

          <TouchableOpacity
            style={styles.emergencyContact}
            onPress={() => handleCall(supportContacts.support)}
          >
            <Text style={styles.emergencyContactLabel}>TransFleet Support:</Text>
            <Text style={styles.emergencyContactNumber}>{supportContacts.support}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.emergencyContact}
            onPress={() => handleCall(supportContacts.hospital)}
          >
            <Text style={styles.emergencyContactLabel}>Hospital Emergency:</Text>
            <Text style={styles.emergencyContactNumber}>{supportContacts.hospital}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
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
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
    backgroundColor: COLORS.white,
  },
  headerContent: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  headerSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  closeButton: {
    position: 'absolute',
    right: SPACING.lg,
    padding: SPACING.xs,
  },
  content: {
    flex: 1,
    paddingHorizontal: SPACING.lg,
  },
  successContainer: {
    alignItems: 'center',
    marginVertical: SPACING.lg,
  },
  successIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.success + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrCodeContainer: {
    alignItems: 'center',
    marginBottom: SPACING.xl,
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
    left: 'auto',
  },
  qrCornerBottomLeft: {
    bottom: 10,
    left: 10,
    top: 'auto',
  },
  qrCornerBottomRight: {
    bottom: 10,
    right: 10,
    top: 'auto',
    left: 'auto',
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
  detailsContainer: {
    backgroundColor: COLORS.white,
    borderRadius: LAYOUT.radius.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    ...SHADOWS.card,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray200,
  },
  detailLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 14,
    color: COLORS.textPrimary,
    fontWeight: '500',
    flex: 1,
    textAlign: 'right',
  },
  detailValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  copyButton: {
    padding: SPACING.xs,
    borderRadius: LAYOUT.radius.sm,
    backgroundColor: COLORS.primaryUltraLight,
  },
  expectedPickupText: {
    color: COLORS.primary,
  },
  instructionsContainer: {
    backgroundColor: COLORS.white,
    borderRadius: LAYOUT.radius.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    ...SHADOWS.card,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: SPACING.lg,
  },
  instructionStep: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    gap: SPACING.md,
  },
  instructionStepCompleted: {
    opacity: 0.6,
  },
  stepIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.primaryUltraLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepIconCompleted: {
    backgroundColor: COLORS.success + '20',
  },
  instructionText: {
    fontSize: 14,
    color: COLORS.textPrimary,
    fontWeight: '500',
    flex: 1,
  },
  instructionTextCompleted: {
    color: COLORS.textSecondary,
  },
  riderStatusContainer: {
    backgroundColor: COLORS.white,
    borderRadius: LAYOUT.radius.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    ...SHADOWS.card,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
    gap: SPACING.sm,
  },
  statusMessage: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  loadingIndicator: {
    flexDirection: 'row',
    gap: SPACING.xs,
  },
  loadingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.primary,
    // Animation would be added here
  },
  loadingDotDelay1: {
    opacity: 0.7,
  },
  loadingDotDelay2: {
    opacity: 0.4,
  },
  riderDetailsContainer: {
    borderTopWidth: 1,
    borderTopColor: COLORS.gray200,
    paddingTop: SPACING.md,
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
  riderAvatarText: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.white,
  },
  riderNameContainer: {
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
  },
  ratingText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  riderContactInfo: {
    gap: SPACING.sm,
    marginBottom: SPACING.md,
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
  riderVehicle: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  etaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.success + '15',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: LAYOUT.radius.md,
    gap: SPACING.xs,
  },
  riderETA: {
    fontSize: 14,
    color: COLORS.success,
    fontWeight: '600',
  },
  callRiderButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.md,
    borderRadius: LAYOUT.radius.lg,
    gap: SPACING.sm,
  },
  callRiderText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.white,
  },
  buttonContainer: {
    gap: SPACING.md,
    marginBottom: SPACING.lg,
  },
  trackButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.lg,
    borderRadius: LAYOUT.radius.lg,
    alignItems: 'center',
    ...SHADOWS.sm,
  },
  trackButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.white,
  },
  cancelButton: {
    borderWidth: 1,
    borderColor: COLORS.error,
    paddingVertical: SPACING.lg,
    borderRadius: LAYOUT.radius.lg,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.error,
  },
  emergencyContainer: {
    backgroundColor: COLORS.gray50,
    borderRadius: LAYOUT.radius.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.massive,
  },
  emergencyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
    gap: SPACING.sm,
  },
  emergencyTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.error,
  },
  emergencyContact: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: SPACING.sm,
  },
  emergencyContactLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  emergencyContactNumber: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '500',
  },
});

export default DeliveryCreatedScreen;