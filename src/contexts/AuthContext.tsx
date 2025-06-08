import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { UserProfile } from '../types/Tool';

interface AuthContextType {
  currentUser: User | null;
  userProfile: UserProfile | null;
  session: Session | null;
  signup: (
    email: string,
    password: string,
    profile: Omit<UserProfile, 'favorites' | 'isPaid'>
  ) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  toggleFavorite: (toolId: string) => Promise<void>;
  updateSubscription: (isPaid: boolean) => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      console.log('[Auth] Initializing...');
      const { data: { session }, error } = await supabase.auth.getSession();

      if (error) {
        console.error('[Auth] Error getting session:', error);
        if (mounted) setLoading(false);
        return;
      }

      console.log('[Auth] Initial session:', session);

      if (mounted) {
        setSession(session);
        setCurrentUser(session?.user ?? null);

        if (session?.user) {
          console.log('[Auth] Fetching profile...');
          await fetchUserProfile(session.user.id);
        } else {
          console.log('[Auth] No user in session');
          setLoading(false);
        }
      }
    };

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log(`[Auth] Auth state changed: ${event}`);
        if (!mounted) return;

        setSession(session);
        setCurrentUser(session?.user ?? null);

        if (session?.user) {
          console.log('[Auth] User signed in, fetching profile...');
          await fetchUserProfile(session.user.id);
        } else {
          console.log('[Auth] User signed out');
          setUserProfile(null);
          setLoading(false);
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const fetchUserProfile = async (userId: string) => {
    console.log('[Profile] Fetching user profile for:', userId);
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          console.log('[Profile] No user profile found – likely a new user');
        } else {
          console.error('[Profile] Error fetching profile:', error);
        }
        setUserProfile(null);
        return;
      }

      console.log('[Profile] Profile data:', data);

      if (data) {
        setUserProfile({
          username: data.username,
          email: data.email,
          phone: data.phone || '',
          job: data.job,
          interests: data.interests || [],
          favorites: data.favorites || [],
          isPaid: data.is_paid || false,
        });
      } else {
        setUserProfile(null);
      }
    } catch (error) {
      console.error('[Profile] Unexpected error:', error);
      setUserProfile(null);
    } finally {
      setLoading(false);
      console.log('[Auth] Loading set to false');
    }
  };

  const signup = async (
    email: string,
    password: string,
    profile: Omit<UserProfile, 'favorites' | 'isPaid'>
  ) => {
    console.log('[Auth] Signing up...');
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      console.error('[Auth] Signup error:', error);
      throw error;
    }

    if (data.user) {
      const { error: profileError } = await supabase
        .from('user_profiles')
        .insert({
          user_id: data.user.id,
          username: profile.username,
          email: profile.email,
          phone: profile.phone,
          job: profile.job,
          interests: profile.interests,
          favorites: [],
          is_paid: false,
        });

      if (profileError) {
        console.error('[Auth] Error creating profile:', profileError);
        throw profileError;
      }

      console.log('[Auth] User profile created');
    }
  };

  const login = async (email: string, password: string) => {
    console.log('[Auth] Logging in...');
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error('[Auth] Login error:', error);
      throw error;
    }

    console.log('[Auth] Login successful');
  };

  const logout = async () => {
    console.log('[Auth] Logging out...');
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error('[Auth] Logout error:', error);
      throw error;
    }

    console.log('[Auth] Logged out');
  };

  const toggleFavorite = async (toolId: string) => {
    if (!currentUser || !userProfile) return;

    const favorites = userProfile.favorites || [];
    const newFavorites = favorites.includes(toolId)
      ? favorites.filter((id) => id !== toolId)
      : [...favorites, toolId];

    const { error } = await supabase
      .from('user_profiles')
      .update({ favorites: newFavorites })
      .eq('user_id', currentUser.id);

    if (error) {
      console.error('[Profile] Error updating favorites:', error);
      throw error;
    }

    setUserProfile({ ...userProfile, favorites: newFavorites });
    console.log('[Profile] Favorites updated');
  };

  const updateSubscription = async (isPaid: boolean) => {
    if (!currentUser || !userProfile) return;

    const { error } = await supabase
      .from('user_profiles')
      .update({ is_paid: isPaid })
      .eq('user_id', currentUser.id);

    if (error) {
      console.error('[Profile] Error updating subscription:', error);
      throw error;
    }

    setUserProfile({ ...userProfile, isPaid });
    console.log('[Profile] Subscription updated');
  };

  const value: AuthContextType = {
    currentUser,
    userProfile,
    session,
    signup,
    login,
    logout,
    toggleFavorite,
    updateSubscription,
    loading,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
