import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

// Import screens
import SplashScreen from './src/screens/SplashScreen';
import NavigationContainer from './src/components/NavigationContainer';

export default function App() {
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    // Hide splash screen after 3 seconds
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <SafeAreaProvider style={{ backgroundColor: '#F5F7FA' }}>
      {showSplash ? (
        <View style={styles.container}>
          <StatusBar style="light" />
          <SplashScreen onFinish={() => setShowSplash(false)} />
        </View>
      ) : (
        <View style={styles.container}>
          <StatusBar style="auto" />
          <NavigationContainer />
        </View>
      )}
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});