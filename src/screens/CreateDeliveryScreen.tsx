import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,

  Modal,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  X,
  Copy,
  ChevronDown,
  Plus,
  Minus,
  Clock,
  MapPin,
  Package2,
  Building2,
  CheckCircle,
  Info,
} from 'lucide-react-native';
import { COLORS, TYPOGRAPHY, SPACING, SHADOWS, LAYOUT } from '../theme/design-system';
import featureService from '../services/featureService';
import profileService, { Hospital } from '../services/profileService';
import orderService from '../services/orderService';

interface SampleType {
  id: string;
  name: string;
  icon: string;
  count: number;
  color: string;
}

interface CenterFeatures {
  sample_type_quantity: boolean;
  urgent_delivery: boolean;
}

interface CreateDeliveryScreenProps {
  onClose: () => void;
  onCreateDelivery: (orderData: any) => void;
}

const CreateDeliveryScreen: React.FC<CreateDeliveryScreenProps> = ({
  onClose,
  onCreateDelivery,
}) => {
  // Delivery ID generation
  const [deliveryId] = useState(() => {
    const today = new Date();
    const dateStr = today.toISOString().slice(2, 10).replace(/-/g, '');
    const timeStr = String(today.getHours()).padStart(2, '0') + String(today.getMinutes()).padStart(2, '0');
    return `PCD-CLB-${dateStr}-${timeStr}`;
  });

  // Features state - will be loaded from API
  const [features, setFeatures] = useState<CenterFeatures>({
    sample_type_quantity: false,
    urgent_delivery: false,
  });
  const [featuresLoaded, setFeaturesLoaded] = useState(false);
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [centerType, setCenterType] = useState<'dependent' | 'independent' | null>(null);
  const [loading, setLoading] = useState(true);

  // Sample types state - dynamic based on backend supported types
  const [sampleTypes, setSampleTypes] = useState<SampleType[]>([
    { id: 'blood', name: 'Blood Samples', icon: '🩸', count: 0, color: COLORS.error },
    { id: 'urine', name: 'Urine Samples', icon: '⚗️', count: 0, color: COLORS.warning },
    { id: 'tissue', name: 'Tissue Samples', icon: '🧬', count: 0, color: COLORS.info },
    { id: 'saliva', name: 'Saliva Samples', icon: '💧', count: 0, color: COLORS.primary },
    { id: 'stool', name: 'Stool Samples', icon: '🧪', count: 0, color: '#8B4513' },
    { id: 'other', name: 'Other Samples', icon: '📋', count: 0, color: COLORS.textSecondary },
  ]);

  // Delivery priority state
  const [deliveryPriority, setDeliveryPriority] = useState<'standard' | 'priority'>('standard');

  // Hospital selection state
  const [selectedHospital, setSelectedHospital] = useState<Hospital | null>(null);
  const [showHospitalModal, setShowHospitalModal] = useState(false);

  // Form state - dynamic from user profile
  const [pickupAddress, setPickupAddress] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [pickupTime] = useState('ASAP'); // Default pickup timing

  useEffect(() => {
    loadCenterFeatures();
  }, []);

  const loadCenterFeatures = async () => {
    try {
      setLoading(true);

      // Load features and hospitals in parallel
      const [featuresResponse, hospitalsResponse] = await Promise.all([
        featureService.getMyFeatures(),
        profileService.getMyHospitals(),
      ]);

      if (featuresResponse.success && featuresResponse.data) {
        const enabledFeatures = featuresResponse.data.features.filter(f => f.enabled && f.status === 'approved');

        setFeatures({
          sample_type_quantity: enabledFeatures.some(f => f.feature_id === 'sample_type_quantity'),
          urgent_delivery: enabledFeatures.some(f => f.feature_id === 'urgent_delivery'),
        });
        setFeaturesLoaded(true);
      }

      if (hospitalsResponse.success && hospitalsResponse.data) {
        const hospitalList = hospitalsResponse.data.hospitals || [];
        const relationshipType = hospitalsResponse.data.relationship_type;

        setHospitals(hospitalList);

        // Determine center type from API response
        if (relationshipType) {
          setCenterType(relationshipType);

          // Auto-select hospital based on center type
          if (relationshipType === 'dependent') {
            // Dependent centers should only have one hospital - auto-select it
            if (hospitalList.length === 1) {
              setSelectedHospital(hospitalList[0]);
            } else if (hospitalList.length > 1) {
              // This should not happen for dependent centers
              console.warn('Dependent center has multiple hospitals - selecting first one');
              setSelectedHospital(hospitalList[0]);
            } else {
              console.error('Dependent center has no hospitals');
              Alert.alert('Configuration Error', 'No hospitals found for this dependent center. Please contact support.');
            }
          } else if (relationshipType === 'independent') {
            // Independent centers can have multiple hospitals - let user choose
            if (hospitalList.length === 1) {
              // Only one option - auto-select
              setSelectedHospital(hospitalList[0]);
            } else if (hospitalList.length > 1) {
              // Multiple options - user must select
              setSelectedHospital(null);
            } else {
              console.error('Independent center has no hospitals');
              Alert.alert('Configuration Error', 'No hospitals found for this center. Please contact support.');
            }
          }
        } else {
          console.warn('No relationship type found in API response');
          // Fallback logic: determine from hospital count
          if (hospitalList.length === 1) {
            setCenterType('dependent');
            setSelectedHospital(hospitalList[0]);
          } else if (hospitalList.length > 1) {
            setCenterType('independent');
            setSelectedHospital(null);
          } else {
            Alert.alert('Configuration Error', 'No hospitals found for this center. Please contact support.');
          }
        }
      }

      // Load user profile for pickup details
      const profileResponse = await profileService.getProfile();
      if (profileResponse.success && profileResponse.data) {
        const profile = profileResponse.data;
        setPickupAddress(profile.address || '');
        setContactPerson(profile.contact_person || '');
        setPhoneNumber(profile.phone || '');
      }

    } catch (error) {
      console.error('Failed to load center features:', error);
      Alert.alert('Error', 'Failed to load configuration. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const copyDeliveryId = () => {
    // In real app, copy to clipboard
    Alert.alert('Copied', 'Delivery ID copied to clipboard');
  };

  const updateSampleCount = (sampleId: string, change: number) => {
    setSampleTypes(prev =>
      prev.map(sample =>
        sample.id === sampleId
          ? { ...sample, count: Math.max(0, sample.count + change) }
          : sample
      )
    );
  };

  const getTotalSamples = () => {
    return sampleTypes.reduce((total, sample) => total + sample.count, 0);
  };

  const getEstimatedTime = () => {
    return deliveryPriority === 'priority' ? '1-2 hours' : '2-4 hours';
  };

  const handleCreateDelivery = async () => {
    try {
      if (!selectedHospital) {
        Alert.alert('Error', 'Please select a hospital');
        return;
      }

      setLoading(true);

      // Create orders based on enabled features
      const ordersToCreate = [];

      if (features.sample_type_quantity) {
        // Feature enabled: Create orders for each sample type with count > 0
        const samplesWithCount = sampleTypes.filter(s => s.count > 0);
        if (samplesWithCount.length === 0) {
          Alert.alert('Error', 'Please add at least one sample');
          setLoading(false);
          return;
        }

        samplesWithCount.forEach(sample => {
          ordersToCreate.push({
            hospital_id: selectedHospital.id,
            sample_type: sample.id as 'blood' | 'urine' | 'tissue' | 'saliva' | 'stool' | 'other',
            sample_quantity: sample.count,
            urgency: features.urgent_delivery ?
              (deliveryPriority === 'priority' ? 'urgent' as const : 'routine' as const) : 'routine' as const,
            special_instructions: specialInstructions || undefined,
          });
        });
      } else {
        // Feature disabled: Create single default blood sample order
        ordersToCreate.push({
          hospital_id: selectedHospital.id,
          sample_type: 'blood' as const,
          sample_quantity: 1,
          urgency: features.urgent_delivery ?
            (deliveryPriority === 'priority' ? 'urgent' as const : 'routine' as const) : 'routine' as const,
          special_instructions: specialInstructions || undefined,
        });
      }

      // Create all orders
      const responses = await Promise.all(
        ordersToCreate.map(order => orderService.createOrder(order))
      );

      const successfulOrders = responses.filter(r => r.success);
      const failedOrders = responses.filter(r => !r.success);

      if (successfulOrders.length > 0) {
        const orderNumbers = successfulOrders.map(r => (r.data as any)?.order?.order_number).join(', ');
        Alert.alert(
          'Success!',
          `${successfulOrders.length} order(s) created successfully: ${orderNumbers}`,
          [
            { text: 'OK', onPress: () => onCreateDelivery(successfulOrders[0].data) }
          ]
        );

        if (failedOrders.length > 0) {
          console.warn(`${failedOrders.length} orders failed to create`);
        }
      } else {
        Alert.alert('Error', 'Failed to create orders. Please try again.');
      }

    } catch (error) {
      console.error('Create delivery error:', error);
      Alert.alert('Error', 'Failed to create delivery. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderSampleTypeSection = () => {
    if (!features.sample_type_quantity) {
      return null;
    }

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Sample Types</Text>

        {sampleTypes.map((sample) => (
          <View key={sample.id} style={styles.sampleRow}>
            <View style={styles.sampleInfo}>
              <Text style={styles.sampleIcon}>{sample.icon}</Text>
              <Text style={styles.sampleName}>{sample.name}</Text>
            </View>

            <View style={styles.sampleControls}>
              <TouchableOpacity
                style={styles.countButton}
                onPress={() => updateSampleCount(sample.id, -1)}
                disabled={sample.count === 0}
              >
                <Minus size={16} color={sample.count === 0 ? COLORS.gray400 : COLORS.textPrimary} />
              </TouchableOpacity>

              <Text style={styles.sampleCount}>{sample.count}</Text>

              <TouchableOpacity
                style={styles.countButton}
                onPress={() => updateSampleCount(sample.id, 1)}
              >
                <Plus size={16} color={COLORS.textPrimary} />
              </TouchableOpacity>
            </View>
          </View>
        ))}

        <TouchableOpacity style={styles.otherSampleButton}>
          <Text style={styles.otherSampleText}>Other sample type</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderHospitalSection = () => {
    // For dependent centers, show detailed hospital info (no selection UI)
    if (centerType === 'dependent') {
      return (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Affiliated Hospital</Text>
          <View style={styles.hospitalInfoCard}>
            <View style={styles.hospitalHeader}>
              <Building2 size={24} color={COLORS.primary} />
              <View style={styles.hospitalMainInfo}>
                <Text style={styles.hospitalName}>{selectedHospital?.name || 'Loading...'}</Text>
                <Text style={styles.hospitalNetwork}>{selectedHospital?.network_name || ''}</Text>
              </View>
            </View>

            {selectedHospital && (
              <View style={styles.hospitalDetails}>
                <View style={styles.hospitalDetailRow}>
                  <MapPin size={16} color={COLORS.textSecondary} />
                  <Text style={styles.hospitalDetailText}>
                    {selectedHospital.address}, {selectedHospital.city}, {selectedHospital.province}
                  </Text>
                </View>

                <View style={styles.hospitalDetailRow}>
                  <Info size={16} color={COLORS.textSecondary} />
                  <Text style={styles.hospitalDetailText}>
                    Hospital Type: {selectedHospital.hospital_type === 'main' ? 'Main Hospital' : 'Regional Hospital'}
                  </Text>
                </View>

                {selectedHospital.hospital_code && (
                  <View style={styles.hospitalDetailRow}>
                    <Text style={styles.hospitalCodeLabel}>Hospital Code:</Text>
                    <Text style={styles.hospitalCode}>{selectedHospital.hospital_code}</Text>
                  </View>
                )}
              </View>
            )}

            <View style={styles.dependentNotice}>
              <Info size={16} color={COLORS.info} />
              <Text style={styles.dependentNoticeText}>
                As a dependent collection center, all deliveries automatically go to your affiliated hospital.
              </Text>
            </View>
          </View>
        </View>
      );
    }

    // For independent centers, show hospital selection UI
    if (centerType === 'independent') {
      return (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Select Hospital</Text>
          <TouchableOpacity
            style={styles.hospitalSelector}
            onPress={() => setShowHospitalModal(true)}
            disabled={hospitals.length <= 1}
          >
            <View style={styles.hospitalInfo}>
              <Building2 size={20} color={COLORS.primary} />
              <View style={styles.hospitalText}>
                <Text style={styles.hospitalName}>{selectedHospital?.name || 'Choose hospital'}</Text>
                <Text style={styles.hospitalDistance}>
                  {selectedHospital?.network_name || 'Select from your affiliated hospitals'}
                </Text>
              </View>
            </View>
            {hospitals.length > 1 && <ChevronDown size={20} color={COLORS.textSecondary} />}
          </TouchableOpacity>
          {hospitals.length > 1 && (
            <Text style={styles.hospitalNote}>You can deliver to any of your {hospitals.length} affiliated hospitals.</Text>
          )}
        </View>
      );
    }

    return null;
  };

  const renderPrioritySection = () => {
    if (!features.urgent_delivery) {
      return null;
    }

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Delivery Priority</Text>

        <TouchableOpacity
          style={[
            styles.priorityOption,
            deliveryPriority === 'standard' && styles.priorityOptionSelected
          ]}
          onPress={() => setDeliveryPriority('standard')}
        >
          <View style={styles.priorityContent}>
            <View style={[
              styles.radioButton,
              deliveryPriority === 'standard' && styles.radioButtonSelected
            ]}>
              {deliveryPriority === 'standard' && <View style={styles.radioButtonInner} />}
            </View>
            <View style={styles.priorityText}>
              <Text style={styles.priorityTitle}>Standard Delivery</Text>
              <Text style={styles.priorityTime}>2-4 hours</Text>
            </View>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.priorityOption,
            deliveryPriority === 'priority' && styles.priorityOptionSelected
          ]}
          onPress={() => setDeliveryPriority('priority')}
        >
          <View style={styles.priorityContent}>
            <View style={[
              styles.radioButton,
              deliveryPriority === 'priority' && styles.radioButtonSelected
            ]}>
              {deliveryPriority === 'priority' && <View style={styles.radioButtonInner} />}
            </View>
            <View style={styles.priorityText}>
              <Text style={styles.priorityTitle}>Priority Delivery</Text>
              <Text style={styles.priorityTime}>1-2 hours</Text>
            </View>
          </View>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>New Delivery</Text>
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <X size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Delivery ID */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Delivery ID</Text>
          <View style={styles.deliveryIdContainer}>
            <Text style={styles.deliveryId}>{deliveryId}</Text>
            <TouchableOpacity style={styles.copyButton} onPress={copyDeliveryId}>
              <Copy size={16} color={COLORS.primary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Sample Types - Conditional */}
        {renderSampleTypeSection()}

        {/* Delivery Priority - Conditional */}
        {renderPrioritySection()}

        {/* Hospital Section - Responsive to center type */}
        {renderHospitalSection()}

        {/* Pickup Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Pickup Details</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Pickup Address</Text>
            <Text style={styles.addressText}>{pickupAddress}</Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Contact Person</Text>
            <TouchableOpacity style={styles.dropdownInput}>
              <Text style={styles.inputText}>{contactPerson}</Text>
              <ChevronDown size={20} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Phone Number</Text>
            <Text style={styles.phoneText}>{phoneNumber}</Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Special Instructions</Text>
            <TextInput
              style={styles.textArea}
              placeholder="Add any special instructions..."
              placeholderTextColor={COLORS.textTertiary}
              value={specialInstructions}
              onChangeText={setSpecialInstructions}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Pickup Time</Text>
            <View style={styles.pickupTimeContainer}>
              <Text style={styles.pickupTimeText}>{pickupTime}</Text>
              <Info size={16} color={COLORS.textSecondary} />
            </View>
          </View>
        </View>

        {/* Delivery Summary */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Delivery Summary</Text>

          <View style={styles.summaryRow}>
            <Package2 size={16} color={COLORS.info} />
            <Text style={styles.summaryText}>
              {features.sample_type_quantity ? (
                getTotalSamples() > 0 ?
                  `${getTotalSamples()} Samples (${sampleTypes.filter(s => s.count > 0).map(s => s.count + ' ' + s.name.toLowerCase()).join(', ')})` :
                  'No samples selected'
              ) : (
                '1 Blood Sample (default)'
              )}
            </Text>
          </View>

          <View style={styles.summaryRow}>
            <Building2 size={16} color={COLORS.primary} />
            <Text style={styles.summaryText}>{selectedHospital?.name || 'No hospital selected'}</Text>
          </View>

          {features.urgent_delivery ? (
            <View style={styles.summaryRow}>
              <Clock size={16} color={deliveryPriority === 'priority' ? COLORS.warning : COLORS.success} />
              <Text style={styles.summaryText}>
                {deliveryPriority === 'priority' ? 'Priority Delivery' : 'Standard Delivery'}
              </Text>
            </View>
          ) : (
            <View style={styles.summaryRow}>
              <Clock size={16} color={COLORS.success} />
              <Text style={styles.summaryText}>Standard Delivery (default)</Text>
            </View>
          )}

          <View style={styles.summaryRow}>
            <CheckCircle size={16} color={COLORS.success} />
            <Text style={styles.summaryText}>{getEstimatedTime()} estimated time</Text>
          </View>

          <View style={styles.summaryNote}>
            <Info size={14} color={COLORS.info} />
            <Text style={styles.summaryNoteText}>Hospital handles all delivery costs</Text>
          </View>
        </View>

        {/* Create Delivery Button */}
        <TouchableOpacity
          style={styles.createButton}
          onPress={handleCreateDelivery}
          activeOpacity={0.8}
        >
          <Text style={styles.createButtonText}>Create Delivery</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Hospital Selection Modal for Independent Centers */}
      <Modal
        visible={showHospitalModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowHospitalModal(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Hospital</Text>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowHospitalModal(false)}
            >
              <X size={24} color={COLORS.textPrimary} />
            </TouchableOpacity>
          </View>

          <FlatList
            data={hospitals}
            keyExtractor={(item) => item.id}
            style={styles.hospitalList}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.hospitalItem,
                  selectedHospital?.id === item.id && styles.hospitalItemSelected
                ]}
                onPress={() => {
                  setSelectedHospital(item);
                  setShowHospitalModal(false);
                }}
              >
                <View style={styles.hospitalItemContent}>
                  <View style={styles.hospitalItemInfo}>
                    <Text style={styles.hospitalItemName}>{item.name}</Text>
                    <Text style={styles.hospitalItemNetwork}>{item.network_name}</Text>
                    <Text style={styles.hospitalItemAddress}>
                      {item.city}, {item.province}
                    </Text>
                  </View>
                  <View style={styles.hospitalItemRight}>
                    {item.hospital_type === 'main' && (
                      <View style={styles.mainHospitalBadge}>
                        <Text style={styles.mainHospitalBadgeText}>Main</Text>
                      </View>
                    )}
                    {selectedHospital?.id === item.id && (
                      <View style={styles.selectedIndicator}>
                        <Text style={styles.selectedIndicatorText}>✓</Text>
                      </View>
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <View style={styles.emptyHospitalList}>
                <Text style={styles.emptyHospitalText}>No hospitals available</Text>
              </View>
            }
          />
        </SafeAreaView>
      </Modal>
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
    justifyContent: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
    backgroundColor: COLORS.white,
    position: 'relative',
  },
  headerTitle: {
    ...TYPOGRAPHY.styles.h3,
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.textPrimary,
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
  section: {
    backgroundColor: COLORS.white,
    borderRadius: LAYOUT.radius.lg,
    padding: SPACING.lg,
    marginTop: SPACING.lg,
    ...SHADOWS.card,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: SPACING.lg,
  },
  deliveryIdContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  deliveryId: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.textPrimary,
  },
  copyButton: {
    padding: SPACING.sm,
    borderRadius: LAYOUT.radius.sm,
    backgroundColor: COLORS.primaryUltraLight,
  },
  sampleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray200,
  },
  sampleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  sampleIcon: {
    fontSize: 20,
    marginRight: SPACING.md,
  },
  sampleName: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.textPrimary,
  },
  sampleControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.lg,
  },
  countButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.gray100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sampleCount: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
    minWidth: 20,
    textAlign: 'center',
  },
  otherSampleButton: {
    marginTop: SPACING.md,
    paddingVertical: SPACING.md,
  },
  otherSampleText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  priorityOption: {
    borderRadius: LAYOUT.radius.lg,
    borderWidth: 1,
    borderColor: COLORS.gray300,
    marginBottom: SPACING.md,
    padding: SPACING.lg,
  },
  priorityOptionSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryUltraLight,
  },
  priorityContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: COLORS.gray400,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  radioButtonSelected: {
    borderColor: COLORS.primary,
  },
  radioButtonInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.primary,
  },
  priorityText: {
    flex: 1,
  },
  priorityTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  priorityTime: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  hospitalSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.lg,
    borderRadius: LAYOUT.radius.lg,
    borderWidth: 1,
    borderColor: COLORS.gray300,
    backgroundColor: COLORS.gray50,
  },
  hospitalInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  hospitalText: {
    marginLeft: SPACING.md,
    flex: 1,
  },
  hospitalName: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  hospitalDistance: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  inputGroup: {
    marginBottom: SPACING.lg,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
  },
  addressText: {
    fontSize: 14,
    color: COLORS.textPrimary,
    lineHeight: 20,
  },
  dropdownInput: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderRadius: LAYOUT.radius.lg,
    borderWidth: 1,
    borderColor: COLORS.gray300,
    backgroundColor: COLORS.white,
  },
  inputText: {
    fontSize: 14,
    color: COLORS.textPrimary,
  },
  phoneText: {
    fontSize: 14,
    color: COLORS.textPrimary,
  },
  textArea: {
    borderWidth: 1,
    borderColor: COLORS.gray300,
    borderRadius: LAYOUT.radius.lg,
    padding: SPACING.lg,
    fontSize: 14,
    color: COLORS.textPrimary,
    minHeight: 80,
    backgroundColor: COLORS.white,
  },
  pickupTimeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  pickupTimeText: {
    fontSize: 14,
    color: COLORS.textPrimary,
  },
  summaryCard: {
    backgroundColor: COLORS.white,
    borderRadius: LAYOUT.radius.lg,
    padding: SPACING.lg,
    marginTop: SPACING.lg,
    borderWidth: 2,
    borderColor: COLORS.primary,
    ...SHADOWS.card,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: SPACING.lg,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
    gap: SPACING.sm,
  },
  summaryText: {
    fontSize: 14,
    color: COLORS.textPrimary,
    flex: 1,
  },
  summaryNote: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.sm,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray200,
    gap: SPACING.sm,
  },
  summaryNoteText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
  },
  createButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.lg,
    borderRadius: LAYOUT.radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SPACING.xl,
    marginBottom: SPACING.massive,
    ...SHADOWS.sm,
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.white,
    letterSpacing: 0.5,
  },
  // New styles for dependent center hospital display
  hospitalInfoCard: {
    backgroundColor: COLORS.white,
    borderRadius: LAYOUT.radius.lg,
    borderWidth: 1,
    borderColor: COLORS.gray200,
    padding: SPACING.lg,
  },
  hospitalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  hospitalMainInfo: {
    marginLeft: SPACING.md,
    flex: 1,
  },
  hospitalNetwork: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  hospitalDetails: {
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray100,
    marginBottom: SPACING.md,
  },
  hospitalDetailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: SPACING.sm,
    gap: SPACING.sm,
  },
  hospitalDetailText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    flex: 1,
    lineHeight: 20,
  },
  hospitalCodeLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginRight: SPACING.xs,
  },
  hospitalCode: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  dependentNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: COLORS.info + '10',
    padding: SPACING.md,
    borderRadius: LAYOUT.radius.md,
    gap: SPACING.sm,
  },
  dependentNoticeText: {
    fontSize: 13,
    color: COLORS.info,
    flex: 1,
    lineHeight: 18,
  },
  hospitalNote: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: SPACING.sm,
    fontStyle: 'italic',
  },

  // Hospital Selection Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray200,
    backgroundColor: COLORS.white,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  modalCloseButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.gray100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hospitalList: {
    flex: 1,
    paddingHorizontal: SPACING.lg,
  },
  hospitalItem: {
    backgroundColor: COLORS.white,
    borderRadius: LAYOUT.radius.lg,
    padding: SPACING.lg,
    marginVertical: SPACING.sm,
    borderWidth: 2,
    borderColor: COLORS.gray200,
  },
  hospitalItemSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryLight,
  },
  hospitalItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  hospitalItemInfo: {
    flex: 1,
    marginRight: SPACING.md,
  },
  hospitalItemName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  hospitalItemNetwork: {
    fontSize: 14,
    color: COLORS.primary,
    marginBottom: 2,
  },
  hospitalItemAddress: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  hospitalItemRight: {
    alignItems: 'flex-end',
    gap: SPACING.sm,
  },
  mainHospitalBadge: {
    backgroundColor: COLORS.success,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  mainHospitalBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.white,
  },
  selectedIndicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedIndicatorText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.white,
  },
  emptyHospitalList: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.xl * 2,
  },
  emptyHospitalText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
});

export default CreateDeliveryScreen;