import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User, AuthState, CollectionCenter, CenterFeatures } from '../types';
import { authService } from '../services/authService';

interface AuthStore extends AuthState {
  // Additional state
  centerInfo: CollectionCenter | null;
  features: CenterFeatures | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  setAuth: (authData: {
    user: User;
    token: string;
    refreshToken: string;
    centerInfo?: CollectionCenter;
    features?: CenterFeatures;
  }) => void;
  setUser: (user: User) => void;
  setCenterInfo: (centerInfo: CollectionCenter) => void;
  setFeatures: (features: CenterFeatures) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  logout: () => Promise<void>;
  initialize: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      // Initial state
      isAuthenticated: false,
      user: null,
      token: null,
      refreshToken: null,
      centerInfo: null,
      features: null,
      isLoading: false,
      error: null,

      // Actions
      setAuth: (authData) => {
        set({
          isAuthenticated: true,
          user: authData.user,
          token: authData.token,
          refreshToken: authData.refreshToken,
          centerInfo: authData.centerInfo || null,
          features: authData.features || null,
          error: null,
        });
      },

      setUser: (user) => {
        set({ user });
      },

      setCenterInfo: (centerInfo) => {
        set({ centerInfo });
      },

      setFeatures: (features) => {
        set({ features });
      },

      setLoading: (isLoading) => {
        set({ isLoading });
      },

      setError: (error) => {
        set({ error });
      },

      clearError: () => {
        set({ error: null });
      },

      logout: async () => {
        try {
          set({ isLoading: true });
          await authService.logout();
          set({
            isAuthenticated: false,
            user: null,
            token: null,
            refreshToken: null,
            centerInfo: null,
            features: null,
            error: null,
            isLoading: false,
          });
        } catch (error) {
          console.error('Logout error:', error);
          set({ error: 'Failed to logout', isLoading: false });
        }
      },

      initialize: async () => {
        try {
          set({ isLoading: true });
          const authState = await authService.getAuthState();

          if (authState.isAuthenticated && authState.user) {
            // Fetch additional data
            const [profileResponse, featuresResponse] = await Promise.allSettled([
              authService.getUserProfile(),
              authService.getCenterFeatures()
            ]);

            let centerInfo = null;
            let features = null;

            if (profileResponse.status === 'fulfilled' && profileResponse.value.success) {
              centerInfo = profileResponse.value.data;
            }

            if (featuresResponse.status === 'fulfilled' && featuresResponse.value.success) {
              features = featuresResponse.value.data;
            }

            set({
              isAuthenticated: true,
              user: authState.user,
              token: authState.token,
              refreshToken: authState.refreshToken,
              centerInfo,
              features,
              isLoading: false,
              error: null,
            });
          } else {
            set({
              isAuthenticated: false,
              user: null,
              token: null,
              refreshToken: null,
              centerInfo: null,
              features: null,
              isLoading: false,
              error: null,
            });
          }
        } catch (error) {
          console.error('Auth initialization error:', error);
          set({
            isAuthenticated: false,
            user: null,
            token: null,
            refreshToken: null,
            centerInfo: null,
            features: null,
            isLoading: false,
            error: 'Failed to initialize authentication',
          });
        }
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        isAuthenticated: state.isAuthenticated,
        user: state.user,
        token: state.token,
        refreshToken: state.refreshToken,
        centerInfo: state.centerInfo,
        features: state.features,
      }),
    }
  )
);