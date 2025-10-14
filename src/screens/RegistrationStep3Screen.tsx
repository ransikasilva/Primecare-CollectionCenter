import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
  ScrollView,
  TextInput,
  FlatList,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Search, MapPin, Filter } from 'lucide-react-native';
import { COLORS, TYPOGRAPHY, SPACING, SHADOWS } from '../theme/design-system';
import { authService } from '../services/authService';
import { locationService, LocationCoordinates } from '../services/locationService';

interface Hospital {
  id: string;
  name: string;
  network_name: string;
  address: string;
  city: string;
  province: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
  regional_hospitals?: Hospital[];
  // Distance information (added by location service)
  distance?: string;
  duration?: string;
  distanceValue?: number;
}

interface RegistrationStep3ScreenProps {
  centerType: 'dependent' | 'independent';
  onNext: (selectedHospitals: string[]) => void;
  onBack: () => void;
}

const RegistrationStep3Screen: React.FC<RegistrationStep3ScreenProps> = ({
  centerType,
  onNext,
  onBack
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedHospitals, setSelectedHospitals] = useState<string[]>([]);
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load hospitals from backend
  useEffect(() => {
    loadHospitals();
  }, []);

  const loadHospitals = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get available hospitals from backend
      const response = await authService.getAvailableHospitals();

      if (response.success && response.data) {
        // Get all hospitals (both main and regional)
        const allHospitals = response.data.all_hospitals || [];

        // Try to get location and calculate distances, but don't fail if location is unavailable
        try {
          const currentLocation = await locationService.getCurrentLocation();
          const hospitalsWithDistance = await locationService.calculateDistancesToHospitals(
            currentLocation,
            allHospitals
          );
          setHospitals(hospitalsWithDistance);
        } catch (locationError) {
          // If location fails, just show hospitals without distance info
          console.log('Location not available, showing hospitals without distance');
          setHospitals(allHospitals);
        }
      } else {
        setError(response.message || 'Failed to load hospitals');
      }
    } catch (error: any) {
      setError(error.message || 'Failed to load hospitals');
      console.error('Load hospitals error:', error);
    } finally {
      setLoading(false);
    }
  };


  const filteredHospitals = hospitals.filter(hospital =>
    hospital.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    hospital.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
    hospital.city.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleHospitalSelection = (hospitalId: string) => {
    if (centerType === 'dependent') {
      // For dependent centers, only allow one selection
      setSelectedHospitals([hospitalId]);
    } else {
      // For independent centers, allow multiple selections
      setSelectedHospitals(prev => 
        prev.includes(hospitalId)
          ? prev.filter(id => id !== hospitalId)
          : [...prev, hospitalId]
      );
    }
  };

  const handleComplete = () => {
    if (selectedHospitals.length > 0) {
      onNext(selectedHospitals);
    }
  };

  const isFormValid = () => {
    return selectedHospitals.length > 0;
  };


  const renderHospitalCard = ({ item }: { item: Hospital }) => {
    const isSelected = selectedHospitals.includes(item.id);
    
    return (
      <TouchableOpacity
        style={[
          styles.hospitalCard,
          isSelected && styles.hospitalCardSelected
        ]}
        onPress={() => toggleHospitalSelection(item.id)}
        activeOpacity={0.8}
      >
        <View style={styles.hospitalHeader}>
          <View style={styles.hospitalInfo}>
            <Text style={styles.hospitalName}>{item.name}</Text>
            <Text style={styles.hospitalDistance}>{item.distance}</Text>
          </View>
          
          <View style={styles.radioContainer}>
            <View style={[
              styles.radioButton,
              isSelected && styles.radioButtonSelected
            ]}>
              {isSelected && <View style={styles.radioButtonInner} />}
            </View>
          </View>
        </View>

        <View style={styles.hospitalDetails}>
          <View style={styles.locationContainer}>
            <MapPin size={14} color={COLORS.textSecondary} />
            <Text style={styles.hospitalLocation}>{item.address}</Text>
          </View>

          <View style={styles.tagsContainer}>
            <View style={styles.provinceTag}>
              <Text style={styles.provinceTagText}>{item.province}</Text>
            </View>

            {item.network_name && (
              <View style={styles.networkTag}>
                <Text style={styles.networkTagText}>{item.network_name}</Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <>
      <SafeAreaView style={styles.topSafeArea} />
      <View style={styles.container}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor={COLORS.white}
        translucent={false}
      />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={onBack}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <ChevronLeft size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        
        <Text style={styles.headerTitle}>Registration</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Progress Indicator */}
      <View style={styles.progressContainer}>
        <View style={styles.progressStep}>
          <View style={styles.progressCircleComplete}>
            <Text style={styles.progressNumberComplete}>✓</Text>
          </View>
          <Text style={[styles.progressLabel, styles.progressLabelComplete]}>Details</Text>
        </View>

        <View style={styles.progressLineComplete} />

        <View style={styles.progressStep}>
          <View style={styles.progressCircleComplete}>
            <Text style={styles.progressNumberComplete}>✓</Text>
          </View>
          <Text style={[styles.progressLabel, styles.progressLabelComplete]}>Type</Text>
        </View>

        <View style={styles.progressLineComplete} />

        <View style={styles.progressStep}>
          <View style={[styles.progressCircle, styles.progressCircleActive]}>
            <Text style={styles.progressNumberActive}>3</Text>
          </View>
          <Text style={[styles.progressLabel, styles.progressLabelActive]}>Hospitals</Text>
        </View>

        <View style={styles.progressLine} />

        <View style={styles.progressStep}>
          <View style={styles.progressCircle}>
            <Text style={styles.progressNumber}>4</Text>
          </View>
          <Text style={styles.progressLabel}>Features</Text>
        </View>
      </View>

      {/* Content */}
      <View style={styles.content}>
        <Text style={styles.title}>Select Your Hospital</Text>
        <Text style={styles.subtitle}>
          Choose from approved Sri Lankan hospitals
        </Text>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <View style={styles.searchWrapper}>
            <Search size={20} color={COLORS.textSecondary} style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search hospitals..."
              placeholderTextColor={COLORS.textTertiary}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
          <TouchableOpacity style={styles.filterButton}>
            <Filter size={20} color={COLORS.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Loading State */}
        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>Loading hospitals...</Text>
          </View>
        )}

        {/* Error State */}
        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>Error: {error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={loadHospitals}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Hospital List */}
        {!loading && !error && (
          <FlatList
            data={filteredHospitals}
            renderItem={renderHospitalCard}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            style={styles.hospitalList}
            contentContainerStyle={styles.hospitalListContent}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No hospitals found</Text>
                <Text style={styles.emptySubtext}>Try adjusting your search criteria</Text>
              </View>
            }
          />
        )}

        {/* Selected Counter */}
        {selectedHospitals.length > 0 && (
          <View style={styles.selectionCounter}>
            <Text style={styles.selectionText}>
              {selectedHospitals.length} hospital{selectedHospitals.length > 1 ? 's' : ''} selected
            </Text>
          </View>
        )}
      </View>

      {/* Complete Button */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[
            styles.completeButton,
            !isFormValid() && styles.completeButtonDisabled
          ]}
          onPress={handleComplete}
          disabled={!isFormValid()}
          activeOpacity={0.8}
        >
          <Text style={[
            styles.completeButtonText,
            !isFormValid() && styles.completeButtonTextDisabled
          ]}>
            Continue to Features →
          </Text>
        </TouchableOpacity>
      </View>
    </View>
    </>
  );
};

const styles = StyleSheet.create({
  topSafeArea: {
    flex: 0,
    backgroundColor: COLORS.white,
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray200,
  },
  backButton: {
    padding: SPACING.xs,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 32,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.lg,
    backgroundColor: COLORS.white,
  },
  progressStep: {
    alignItems: 'center',
  },
  progressCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.gray300,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.xs,
  },
  progressCircleActive: {
    backgroundColor: COLORS.primary,
  },
  progressCircleComplete: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.success,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.xs,
  },
  progressNumberActive: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.white,
  },
  progressNumberComplete: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.white,
  },
  progressLabel: {
    fontSize: 12,
    fontWeight: '400',
    color: COLORS.textSecondary,
  },
  progressLabelActive: {
    color: COLORS.primary,
    fontWeight: '500',
  },
  progressLabelComplete: {
    color: COLORS.success,
    fontWeight: '500',
  },
  progressLineComplete: {
    width: 40,
    height: 2,
    backgroundColor: COLORS.success,
    marginHorizontal: SPACING.sm,
  },
  progressLine: {
    width: 40,
    height: 2,
    backgroundColor: COLORS.gray300,
    marginHorizontal: SPACING.sm,
  },
  progressNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.white,
  },
  content: {
    flex: 1,
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.lg,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '400',
    color: COLORS.textSecondary,
    marginBottom: SPACING.xl,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  searchWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.gray100,
    borderRadius: 12,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.gray200,
  },
  searchIcon: {
    marginRight: SPACING.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '400',
    color: COLORS.textPrimary,
    paddingVertical: 0,
  },
  filterButton: {
    width: 44,
    height: 44,
    backgroundColor: COLORS.gray100,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.gray200,
  },
  hospitalList: {
    flex: 1,
  },
  hospitalListContent: {
    paddingBottom: SPACING.lg,
  },
  hospitalCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    borderWidth: 2,
    borderColor: COLORS.gray200,
    ...SHADOWS.sm,
  },
  hospitalCardSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryUltraLight,
  },
  hospitalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.sm,
  },
  hospitalInfo: {
    flex: 1,
  },
  hospitalName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  hospitalDistance: {
    fontSize: 14,
    fontWeight: '400',
    color: COLORS.textSecondary,
  },
  radioContainer: {
    marginLeft: SPACING.md,
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: COLORS.gray400,
    alignItems: 'center',
    justifyContent: 'center',
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
  hospitalDetails: {
    marginTop: SPACING.sm,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  hospitalLocation: {
    fontSize: 14,
    fontWeight: '400',
    color: COLORS.textSecondary,
    marginLeft: SPACING.xs,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs,
  },
  provinceTag: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: 8,
    backgroundColor: COLORS.gray200,
  },
  provinceTagText: {
    fontSize: 12,
    fontWeight: '400',
    color: COLORS.textSecondary,
  },
  networkTag: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: 8,
    backgroundColor: COLORS.primary + '20',
  },
  networkTagText: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.primary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: SPACING.massive,
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '400',
    color: COLORS.textSecondary,
    marginTop: SPACING.md,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: SPACING.massive,
  },
  errorText: {
    fontSize: 16,
    fontWeight: '400',
    color: COLORS.error,
    textAlign: 'center',
    marginBottom: SPACING.md,
  },
  retryButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderRadius: 8,
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.white,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: SPACING.massive,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  emptySubtext: {
    fontSize: 14,
    fontWeight: '400',
    color: COLORS.textTertiary,
  },
  selectionCounter: {
    paddingVertical: SPACING.md,
    alignItems: 'center',
  },
  selectionText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.primary,
  },
  buttonContainer: {
    paddingHorizontal: SPACING.xl,
    paddingBottom: SPACING.massive,
    paddingTop: SPACING.lg,
  },
  completeButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.lg,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.sm,
  },
  completeButtonDisabled: {
    backgroundColor: COLORS.gray300,
  },
  completeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.white,
    letterSpacing: 0.5,
  },
  completeButtonTextDisabled: {
    color: COLORS.gray500,
  },
});

export default RegistrationStep3Screen;