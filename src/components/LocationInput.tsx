import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { MapPin, Navigation, Search, X } from 'lucide-react-native';
import { COLORS, SPACING } from '../theme/design-system';
import { locationService, LocationCoordinates } from '../services/locationService';

interface LocationSuggestion {
  place_id: string;
  description: string;
  main_text: string;
  secondary_text: string;
}

interface LocationInputProps {
  value: string;
  onLocationSelect: (address: string, coordinates?: LocationCoordinates) => void;
  placeholder?: string;
  error?: string;
}

const LocationInput: React.FC<LocationInputProps> = ({
  value,
  onLocationSelect,
  placeholder = "Enter your address",
  error
}) => {
  const [searchQuery, setSearchQuery] = useState(value);
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [isGettingLocation, setIsGettingLocation] = useState(false);

  useEffect(() => {
    setSearchQuery(value);
  }, [value]);

  // Get autocomplete suggestions from backend
  const getAutocompleteSuggestions = async (query: string) => {
    if (query.length < 3) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    try {
      setIsLoadingSuggestions(true);
      const response = await locationService.getAutocompleteSuggestions(query);

      if (response.success && response.data) {
        setSuggestions(response.data);
        setShowSuggestions(true);
      }
    } catch (error) {
      console.error('Autocomplete error:', error);
      setSuggestions([]);
    } finally {
      setIsLoadingSuggestions(false);
    }
  };

  // Handle text input change
  const handleTextChange = (text: string) => {
    setSearchQuery(text);

    // Debounce the API call
    const timeoutId = setTimeout(() => {
      getAutocompleteSuggestions(text);
    }, 500);

    return () => clearTimeout(timeoutId);
  };

  // Handle suggestion selection
  const handleSuggestionSelect = async (suggestion: LocationSuggestion) => {
    try {
      setSearchQuery(suggestion.description);
      setShowSuggestions(false);
      setSuggestions([]);

      // Get place details to get coordinates
      const detailsResponse = await locationService.getPlaceDetails(suggestion.place_id);

      if (detailsResponse.success && detailsResponse.data) {
        const placeData = detailsResponse.data;
        onLocationSelect(
          suggestion.description,
          placeData.location ? {
            lat: placeData.location.lat,
            lng: placeData.location.lng
          } : undefined
        );
      } else {
        // If we can't get coordinates, at least use the address
        onLocationSelect(suggestion.description);
      }
    } catch (error) {
      console.error('Place details error:', error);
      // Fallback to just the address
      onLocationSelect(suggestion.description);
    }
  };

  // Get current GPS location
  const handleUseCurrentLocation = async () => {
    try {
      setIsGettingLocation(true);

      const coordinates = await locationService.getCurrentLocationHighAccuracy();

      // Reverse geocode to get address
      const address = await locationService.reverseGeocode(coordinates);

      setSearchQuery(address);
      onLocationSelect(address, coordinates);

      Alert.alert('Success', 'Current location detected successfully!');

    } catch (error: any) {
      console.error('GPS location error:', error);
      Alert.alert(
        'Location Error',
        error.message || 'Unable to get your current location. Please enter your address manually.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsGettingLocation(false);
    }
  };

  // Clear input
  const handleClear = () => {
    setSearchQuery('');
    setSuggestions([]);
    setShowSuggestions(false);
    onLocationSelect('');
  };

  const renderSuggestion = ({ item }: { item: LocationSuggestion }) => (
    <TouchableOpacity
      style={styles.suggestionItem}
      onPress={() => handleSuggestionSelect(item)}
      activeOpacity={0.7}
    >
      <MapPin size={16} color={COLORS.textSecondary} style={styles.suggestionIcon} />
      <View style={styles.suggestionText}>
        <Text style={styles.suggestionMainText}>{item.main_text}</Text>
        <Text style={styles.suggestionSecondaryText}>{item.secondary_text}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Location Input */}
      <View style={[
        styles.inputWrapper,
        error && styles.inputWrapperError,
        showSuggestions && styles.inputWrapperActive
      ]}>
        <Search size={20} color={COLORS.textSecondary} style={styles.inputIcon} />
        <TextInput
          style={styles.textInput}
          placeholder={placeholder}
          placeholderTextColor={COLORS.textTertiary}
          value={searchQuery}
          onChangeText={handleTextChange}
          onFocus={() => {
            if (suggestions.length > 0) {
              setShowSuggestions(true);
            }
          }}
          multiline={true}
          numberOfLines={2}
        />

        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={handleClear} style={styles.clearButton}>
            <X size={16} color={COLORS.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Error Message */}
      {error && (
        <Text style={styles.errorText}>{error}</Text>
      )}

      {/* Suggestions List */}
      {showSuggestions && (
        <View style={styles.suggestionsContainer}>
          {isLoadingSuggestions ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={COLORS.primary} />
              <Text style={styles.loadingText}>Searching...</Text>
            </View>
          ) : (
            <ScrollView
              style={styles.suggestionsList}
              keyboardShouldPersistTaps="handled"
              nestedScrollEnabled={true}
              showsVerticalScrollIndicator={true}
            >
              {suggestions.map((item) => (
                <View key={item.place_id}>
                  {renderSuggestion({ item })}
                </View>
              ))}
            </ScrollView>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: COLORS.gray100,
    borderRadius: 12,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.gray200,
    minHeight: 56,
  },
  inputWrapperError: {
    borderColor: COLORS.error,
    backgroundColor: '#FFF5F5',
  },
  inputWrapperActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryUltraLight,
  },
  inputIcon: {
    marginRight: SPACING.md,
    marginTop: 2,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '400',
    color: COLORS.textPrimary,
    paddingVertical: 0,
    textAlignVertical: 'top',
  },
  clearButton: {
    padding: SPACING.xs,
    marginLeft: SPACING.sm,
  },
  gpsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primaryUltraLight,
    borderRadius: 8,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    marginTop: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.primary + '40',
  },
  gpsButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.primary,
    marginLeft: SPACING.xs,
  },
  errorText: {
    fontSize: 12,
    fontWeight: '400',
    color: COLORS.error,
    marginTop: SPACING.xs,
    marginLeft: SPACING.lg,
  },
  suggestionsContainer: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.gray200,
    marginTop: SPACING.xs,
    maxHeight: 200,
    zIndex: 1000,
    elevation: 5,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.lg,
  },
  loadingText: {
    fontSize: 14,
    fontWeight: '400',
    color: COLORS.textSecondary,
    marginLeft: SPACING.sm,
  },
  suggestionsList: {
    maxHeight: 200,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray100,
  },
  suggestionIcon: {
    marginRight: SPACING.md,
    marginTop: 2,
  },
  suggestionText: {
    flex: 1,
  },
  suggestionMainText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  suggestionSecondaryText: {
    fontSize: 12,
    fontWeight: '400',
    color: COLORS.textSecondary,
  },
});

export default LocationInput;