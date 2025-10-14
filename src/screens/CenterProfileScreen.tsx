import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
  Alert,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import {
  ChevronLeft,
  Edit2,
  Building2,
  MapPin,
  User,
  Phone,
  Mail,
  FileText,
  Package2,
  Zap,
  Building,
  Lock,
  Bell,
  Download,
  HelpCircle,
  Shield,
  LogOut
} from 'lucide-react-native';
import { COLORS, SPACING, SHADOWS } from '../theme/design-system';
import MainLayout from '../components/MainLayout';
import { profileService, UserProfile, Hospital as BackendHospital } from '../services/profileService';
import { featureService, CenterFeatures } from '../services/featureService';
import { orderService } from '../services/orderService';
import LocationInput from '../components/LocationInput';
import { LocationCoordinates } from '../services/locationService';

interface CenterProfileScreenProps {
  onBack: () => void;
  onEditProfile: () => void;
  onSignOut: () => void;
  onTabPress?: (tab: 'home' | 'deliveries' | 'history' | 'profile') => void;
}

interface PerformanceStats {
  total_deliveries: number;
  success_rate: number;
  avg_delivery_time: number; // in minutes
}

const CenterProfileScreen: React.FC<CenterProfileScreenProps> = ({
  onBack,
  onEditProfile,
  onSignOut,
  onTabPress
}) => {
  const [centerProfile, setCenterProfile] = useState<UserProfile | null>(null);
  const [partnerHospitals, setPartnerHospitals] = useState<BackendHospital[]>([]);
  const [features, setFeatures] = useState<CenterFeatures | null>(null);
  const [performanceStats, setPerformanceStats] = useState<PerformanceStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editedProfile, setEditedProfile] = useState<Partial<UserProfile>>({});

  // Load profile data from backend
  const loadProfileData = async () => {
    try {
      setIsLoading(true);

      // Load profile info
      const profileResponse = await profileService.getProfile();
      if (profileResponse.success && profileResponse.data) {
        setCenterProfile(profileResponse.data);
      }

      // Load partner hospitals
      const hospitalsResponse = await profileService.getMyHospitals();
      if (hospitalsResponse.success && hospitalsResponse.data?.hospitals) {
        setPartnerHospitals(hospitalsResponse.data.hospitals);
      }

      // Load features
      const featuresResponse = await featureService.getMyFeatures();
      if (featuresResponse.success && featuresResponse.data?.features) {
        // Convert features array to summary object
        const featuresSummary: CenterFeatures = {
          sample_type_quantity: featuresResponse.data.features.some(
            (f: any) => f.feature_id === 'sample_type_quantity' && f.enabled && f.status === 'approved'
          ),
          urgent_delivery: featuresResponse.data.features.some(
            (f: any) => f.feature_id === 'urgent_delivery' && f.enabled && f.status === 'approved'
          ),
          multi_parcel: false // Feature not yet implemented
        };
        setFeatures(featuresSummary);
      }

      // Load performance stats from orders
      await loadPerformanceStats();

    } catch (error) {
      console.error('Failed to load profile data:', error);
      Alert.alert('Error', 'Failed to load profile data');
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate performance stats from orders
  const loadPerformanceStats = async () => {
    try {
      const ordersResponse = await orderService.getMyOrders();
      if (ordersResponse.success && ordersResponse.data?.orders) {
        const orders = ordersResponse.data.orders;
        const deliveredOrders = orders.filter(order => order.status === 'delivered');

        // Calculate stats
        const totalDeliveries = deliveredOrders.length;
        const totalOrders = orders.length;
        const successRate = totalOrders > 0 ? (totalDeliveries / totalOrders) * 100 : 0;

        // Calculate average delivery time for delivered orders
        let totalTimeMs = 0;
        let validDeliveries = 0;

        deliveredOrders.forEach(order => {
          if (order.created_at && order.timing?.delivered_at) {
            const createdTime = new Date(order.created_at).getTime();
            const deliveredTime = new Date(order.timing.delivered_at).getTime();
            totalTimeMs += (deliveredTime - createdTime);
            validDeliveries++;
          }
        });

        const avgDeliveryTimeMinutes = validDeliveries > 0
          ? Math.round(totalTimeMs / (validDeliveries * 1000 * 60))
          : 0;

        setPerformanceStats({
          total_deliveries: totalDeliveries,
          success_rate: Math.round(successRate * 10) / 10, // Round to 1 decimal place
          avg_delivery_time: avgDeliveryTimeMinutes
        });
      }
    } catch (error) {
      console.error('Failed to calculate performance stats:', error);
    }
  };

  const handleFeatureToggle = async (featureKey: keyof CenterFeatures) => {
    if (!features) return;

    const isCurrentlyEnabled = features[featureKey];

    // If trying to disable, show message to contact admin
    if (isCurrentlyEnabled) {
      Alert.alert(
        'Disable Feature',
        'To disable this feature, please contact the admin team or hospital management.',
        [{ text: 'OK' }]
      );
      return;
    }

    // If trying to enable, request the feature
    Alert.alert(
      'Request Feature',
      `Do you want to request the "${featureKey.replace(/_/g, ' ')}" feature? Your hospital or TransFleet admin will review your request.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Request',
          onPress: async () => {
            try {
              const response = await featureService.requestFeature(featureKey);

              if (response.success) {
                Alert.alert(
                  'Request Submitted',
                  'Your feature request has been submitted successfully. You will be notified once it is approved.'
                );
                // Reload features to show updated status
                await loadProfileData();
              } else {
                Alert.alert('Error', response.message || 'Failed to submit feature request');
              }
            } catch (error) {
              console.error('Feature request error:', error);
              Alert.alert('Error', 'Failed to request feature. Please try again.');
            }
          }
        }
      ]
    );
  };

  const handleEditPress = () => {
    if (isEditing) {
      // Cancel editing
      setIsEditing(false);
      setEditedProfile({});
    } else {
      // Start editing - include all required fields for backend
      setIsEditing(true);
      setEditedProfile({
        center_name: centerProfile?.center_name,
        contact_person: centerProfile?.contact_person,
        email: centerProfile?.email,
        address: centerProfile?.center_address || centerProfile?.address,
        coordinates_lat: centerProfile?.coordinates_lat,
        coordinates_lng: centerProfile?.coordinates_lng,
        // Include required backend fields
        center_type: centerProfile?.center_type,
        license_number: centerProfile?.license_number,
        // phone is NOT included - requires separate OTP verification flow
      });
    }
  };

  const handleLocationSelect = (address: string, coordinates?: LocationCoordinates) => {
    setEditedProfile(prev => ({
      ...prev,
      address,
      coordinates_lat: coordinates?.lat?.toString(),
      coordinates_lng: coordinates?.lng?.toString(),
    }));
  };

  const handleChangePhoneNumber = () => {
    Alert.alert(
      'Change Phone Number',
      'For security reasons, phone number changes must be processed by our admin team. Please contact TransFleet support to update your registered phone number.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Contact Support',
          onPress: () => {
            // In future, this could open support contact options
            Alert.alert('Support', 'Please call: +94 11 XXX XXXX\nEmail: support@primecare.lk');
          }
        }
      ]
    );
  };

  const handleSaveProfile = async () => {
    try {
      const response = await profileService.updateProfile(editedProfile);
      if (response.success) {
        Alert.alert('Success', 'Profile updated successfully');
        setIsEditing(false);
        await loadProfileData(); // Reload profile data
      } else {
        Alert.alert('Error', response.message || 'Failed to update profile');
      }
    } catch (error) {
      console.error('Update profile error:', error);
      Alert.alert('Error', 'Failed to update profile. Please try again.');
    }
  };

  useEffect(() => {
    loadProfileData();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return COLORS.success;
      case 'pending': return COLORS.warning;
      case 'inactive': return COLORS.error;
      default: return COLORS.gray500;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active': return 'Active';
      case 'pending': return 'Pending';
      case 'inactive': return 'Inactive';
      default: return 'Unknown';
    }
  };

  const handleTabPress = (tab: 'home' | 'deliveries' | 'history' | 'profile') => {
    if (onTabPress) {
      onTabPress(tab);
    }
  };

  return (
    <MainLayout activeTab="profile" onTabPress={handleTabPress}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={onBack}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <ChevronLeft size={24} color={COLORS.textPrimary} />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>Center Profile</Text>

          {isEditing ? (
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleSaveProfile}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Text style={styles.saveButtonText}>Save</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={handleEditPress}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.editButton}
              onPress={handleEditPress}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Edit2 size={20} color={COLORS.textPrimary} />
            </TouchableOpacity>
          )}
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={COLORS.primary} />
              <Text style={styles.loadingText}>Loading profile...</Text>
            </View>
          ) : centerProfile ? (
            <>
              {/* Profile Header */}
              <View style={styles.profileHeader}>
                <View style={styles.centerImageContainer}>
                  <View style={styles.centerImage}>
                    <Building2 size={32} color={COLORS.primary} />
                  </View>
                </View>

                <Text style={styles.centerName}>{centerProfile.center_name}</Text>
                <Text style={styles.registrationId}>{centerProfile.center_id}</Text>

                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(centerProfile.status) + '20' }]}>
                  <Text style={[styles.statusText, { color: getStatusColor(centerProfile.status) }]}>
                    {getStatusText(centerProfile.status)}
                  </Text>
                </View>
              </View>

              {/* Center Details */}
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Center Details</Text>
                  <TouchableOpacity hitSlop={{ top: 5, bottom: 5, left: 5, right: 5 }}>
                    <Edit2 size={16} color={COLORS.textSecondary} />
                  </TouchableOpacity>
                </View>

                <View style={styles.detailsList}>
                  {/* Center Name - Editable */}
                  <View style={styles.detailItem}>
                    <Building2 size={16} color={COLORS.textSecondary} />
                    <View style={styles.detailContent}>
                      <Text style={styles.detailLabel}>Center Name</Text>
                      {isEditing ? (
                        <TextInput
                          style={styles.editInput}
                          value={editedProfile.center_name}
                          onChangeText={(text) => setEditedProfile(prev => ({ ...prev, center_name: text }))}
                          placeholder="Enter center name"
                        />
                      ) : (
                        <Text style={styles.detailValue}>{centerProfile.center_name}</Text>
                      )}
                    </View>
                  </View>

                  {/* Center Type - Not Editable */}
                  <View style={styles.detailItem}>
                    <Building size={16} color={COLORS.textSecondary} />
                    <View style={styles.detailContent}>
                      <Text style={styles.detailLabel}>Type</Text>
                      <Text style={styles.detailValue}>
                        {centerProfile.center_type === 'dependent' ? 'Dependent Center' : 'Independent Center'}
                      </Text>
                    </View>
                  </View>

                  {/* Address - Editable with LocationInput */}
                  {isEditing ? (
                    <View style={styles.addressEditContainer}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.xs }}>
                        <MapPin size={16} color={COLORS.textSecondary} />
                        <Text style={[styles.detailLabel, { marginLeft: SPACING.md, marginBottom: 0 }]}>Address</Text>
                      </View>
                      <LocationInput
                        value={editedProfile.address || ''}
                        onLocationSelect={handleLocationSelect}
                        placeholder="Search for your address"
                      />
                    </View>
                  ) : (
                    <View style={styles.detailItem}>
                      <MapPin size={16} color={COLORS.textSecondary} />
                      <View style={styles.detailContent}>
                        <Text style={styles.detailLabel}>Address</Text>
                        <Text style={styles.detailValue}>
                          {centerProfile.center_address || centerProfile.address || centerProfile.location?.formatted_address || 'No address provided'}
                        </Text>
                      </View>
                    </View>
                  )}

                  {/* Contact Person - Editable */}
                  <View style={styles.detailItem}>
                    <User size={16} color={COLORS.textSecondary} />
                    <View style={styles.detailContent}>
                      <Text style={styles.detailLabel}>Contact Person</Text>
                      {isEditing ? (
                        <TextInput
                          style={styles.editInput}
                          value={editedProfile.contact_person}
                          onChangeText={(text) => setEditedProfile(prev => ({ ...prev, contact_person: text }))}
                          placeholder="Enter contact person name"
                        />
                      ) : (
                        <Text style={styles.detailValue}>{centerProfile.contact_person}</Text>
                      )}
                    </View>
                  </View>

                  <View style={styles.detailItem}>
                    <Phone size={16} color={COLORS.textSecondary} />
                    <View style={styles.detailContent}>
                      <Text style={styles.detailLabel}>Phone</Text>
                      <Text style={styles.detailValue}>{centerProfile.phone}</Text>
                    </View>
                    <TouchableOpacity onPress={handleChangePhoneNumber}>
                      <Text style={styles.changePhoneText}>Change</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Email - Editable */}
                  {(centerProfile.email || isEditing) && (
                    <View style={styles.detailItem}>
                      <Mail size={16} color={COLORS.textSecondary} />
                      <View style={styles.detailContent}>
                        <Text style={styles.detailLabel}>Email</Text>
                        {isEditing ? (
                          <TextInput
                            style={styles.editInput}
                            value={editedProfile.email}
                            onChangeText={(text) => setEditedProfile(prev => ({ ...prev, email: text }))}
                            placeholder="Enter email address"
                            keyboardType="email-address"
                            autoCapitalize="none"
                          />
                        ) : (
                          <Text style={styles.detailValue}>{centerProfile.email}</Text>
                        )}
                      </View>
                    </View>
                  )}

                  {centerProfile.license_number && (
                    <View style={styles.detailItem}>
                      <FileText size={16} color={COLORS.textSecondary} />
                      <View style={styles.detailContent}>
                        <Text style={styles.detailLabel}>License No</Text>
                        <Text style={styles.detailValue}>{centerProfile.license_number}</Text>
                      </View>
                    </View>
                  )}
                </View>
              </View>

              {/* Partner Hospitals */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Partner Hospitals</Text>

                <View style={styles.hospitalsContainer}>
                  {partnerHospitals.length > 0 ? (
                    partnerHospitals.map((hospital) => (
                      <View key={hospital.id} style={styles.hospitalCard}>
                        <View style={styles.hospitalIcon}>
                          <Building size={20} color={COLORS.primary} />
                        </View>
                        <View style={styles.hospitalInfo}>
                          <Text style={styles.hospitalName}>{hospital.name}</Text>
                          <Text style={styles.hospitalLocation}>{hospital.city}, {hospital.province}</Text>
                        </View>
                        <View style={styles.hospitalStatus}>
                          <View style={[styles.statusDot, { backgroundColor: getStatusColor(hospital.status) }]} />
                          <Text style={[styles.statusLabel, { color: getStatusColor(hospital.status) }]}>
                            {getStatusText(hospital.status)}
                          </Text>
                        </View>
                      </View>
                    ))
                  ) : (
                    <Text style={styles.noDataText}>No partner hospitals assigned</Text>
                  )}
                </View>
              </View>

              {/* Available Features */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Available Features</Text>

                {features ? (
                  <View style={styles.featuresList}>
                    <View style={styles.featureItem}>
                      <View style={styles.featureIcon}>
                        <Package2 size={20} color={COLORS.primary} />
                      </View>
                      <View style={styles.featureContent}>
                        <Text style={styles.featureTitle}>Sample Type & Quantity</Text>
                        <Text style={styles.featureSubtitle}>Specify blood, urine samples with quantities</Text>
                      </View>
                      <Switch
                        value={features.sample_type_quantity}
                        onValueChange={() => handleFeatureToggle('sample_type_quantity')}
                        trackColor={{ false: COLORS.gray300, true: COLORS.primary + '40' }}
                        thumbColor={features.sample_type_quantity ? COLORS.primary : COLORS.white}
                        ios_backgroundColor={COLORS.gray300}
                      />
                    </View>

                    <View style={styles.featureItem}>
                      <View style={styles.featureIcon}>
                        <Zap size={20} color={COLORS.warning} />
                      </View>
                      <View style={styles.featureContent}>
                        <Text style={styles.featureTitle}>Urgent Delivery</Text>
                        <Text style={styles.featureSubtitle}>Mark samples as urgent for priority handling</Text>
                      </View>
                      <Switch
                        value={features.urgent_delivery}
                        onValueChange={() => handleFeatureToggle('urgent_delivery')}
                        trackColor={{ false: COLORS.gray300, true: COLORS.primary + '40' }}
                        thumbColor={features.urgent_delivery ? COLORS.primary : COLORS.white}
                        ios_backgroundColor={COLORS.gray300}
                      />
                    </View>
                  </View>
                ) : (
                  <Text style={styles.noDataText}>Loading features...</Text>
                )}
              </View>

              {/* Performance Stats */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Performance Stats</Text>

                {performanceStats ? (
                  <View style={styles.statsContainer}>
                    <View style={styles.statItem}>
                      <Text style={styles.statValue}>{performanceStats.total_deliveries.toLocaleString()}</Text>
                      <Text style={styles.statLabel}>Total Deliveries</Text>
                    </View>

                    <View style={styles.statItem}>
                      <Text style={styles.statValue}>{performanceStats.success_rate}%</Text>
                      <Text style={styles.statLabel}>Success Rate</Text>
                    </View>

                    <View style={styles.statItem}>
                      <Text style={styles.statValue}>{performanceStats.avg_delivery_time} min</Text>
                      <Text style={styles.statLabel}>Avg Delivery Time</Text>
                    </View>
                  </View>
                ) : (
                  <Text style={styles.noDataText}>Loading stats...</Text>
                )}
              </View>

              {/* Language */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Language</Text>

                <View style={styles.languageContainer}>
                  <TouchableOpacity style={[styles.languageOption, styles.languageOptionSelected]}>
                    <Text style={[styles.languageText, styles.languageTextSelected]}>English</Text>
                    <View style={styles.languageRadio}>
                      <View style={styles.languageRadioSelected} />
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.languageOption}>
                    <Text style={styles.languageText}>සිංහල</Text>
                    <View style={styles.languageRadio} />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Sign Out */}
              <TouchableOpacity style={styles.signOutButton} onPress={onSignOut}>
                <LogOut size={20} color={COLORS.error} />
                <Text style={styles.signOutText}>Sign Out</Text>
              </TouchableOpacity>

              <View style={styles.bottomSpacer} />
            </>
          ) : (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>Failed to load profile data</Text>
            </View>
          )}
        </ScrollView>
    </MainLayout>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray200,
  },
  backButton: {
    padding: SPACING.xs,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  editButton: {
    padding: SPACING.xs,
  },
  saveButton: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    backgroundColor: COLORS.primary,
    borderRadius: 6,
  },
  saveButtonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '600',
  },
  cancelButton: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    backgroundColor: COLORS.gray200,
    borderRadius: 6,
  },
  cancelButtonText: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  profileHeader: {
    backgroundColor: COLORS.white,
    alignItems: 'center',
    paddingVertical: SPACING.xl,
    marginBottom: SPACING.sm,
  },
  centerImageContainer: {
    marginBottom: SPACING.lg,
  },
  centerImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.primaryUltraLight,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.sm,
  },
  centerName: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: SPACING.xs,
  },
  registrationId: {
    fontSize: 14,
    fontWeight: '400',
    color: COLORS.textSecondary,
    marginBottom: SPACING.md,
  },
  statusBadge: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: 16,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  section: {
    backgroundColor: COLORS.white,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
    marginBottom: SPACING.sm,
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
    marginBottom: SPACING.lg,
  },
  detailsList: {
    gap: SPACING.lg,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  detailContent: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: '400',
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.textPrimary,
    lineHeight: 20,
  },
  changePhoneText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.primary,
    marginLeft: SPACING.sm,
  },
  hospitalsContainer: {
    gap: SPACING.md,
  },
  hospitalCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    backgroundColor: COLORS.gray50,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.gray200,
  },
  hospitalIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primaryUltraLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  hospitalInfo: {
    flex: 1,
  },
  hospitalName: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  hospitalLocation: {
    fontSize: 12,
    fontWeight: '400',
    color: COLORS.textSecondary,
  },
  hospitalStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: SPACING.xs,
  },
  statusLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  featuresList: {
    gap: SPACING.lg,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  featureIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primaryUltraLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  featureSubtitle: {
    fontSize: 12,
    fontWeight: '400',
    color: COLORS.textSecondary,
    lineHeight: 16,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '400',
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  settingsList: {
    gap: SPACING.md,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.md,
  },
  settingTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '400',
    color: COLORS.textPrimary,
    marginLeft: SPACING.md,
  },
  languageContainer: {
    gap: SPACING.md,
  },
  languageOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.md,
  },
  languageOptionSelected: {
    // Additional styling for selected language
  },
  languageText: {
    fontSize: 14,
    fontWeight: '400',
    color: COLORS.textSecondary,
  },
  languageTextSelected: {
    color: COLORS.primary,
    fontWeight: '500',
  },
  languageRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: COLORS.gray400,
    alignItems: 'center',
    justifyContent: 'center',
  },
  languageRadioSelected: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.primary,
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.white,
    paddingVertical: SPACING.lg,
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.lg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.error,
  },
  signOutText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.error,
    marginLeft: SPACING.sm,
  },
  bottomSpacer: {
    height: SPACING.massive,
  },
  loadingContainer: {
    padding: SPACING.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: SPACING.md,
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  errorContainer: {
    padding: SPACING.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    fontSize: 16,
    color: COLORS.error,
    textAlign: 'center',
  },
  noDataText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  editInput: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.textPrimary,
    borderWidth: 1,
    borderColor: COLORS.gray300,
    borderRadius: 8,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.white,
  },
  detailItemColumn: {
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  addressEditContainer: {
    marginBottom: SPACING.lg,
    width: '100%',
  },
});

export default CenterProfileScreen;