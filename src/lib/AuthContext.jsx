import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  const loadProfile = useCallback(async (userId) => {
    if (!userId) return null;
    try {
      const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
      if (error) { console.error('Error loading profile:', error); return null; }
      return data;
    } catch (e) {
      console.error('loadProfile exception:', e);
      return null;
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    const init = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!mounted) return;
        setUser(session?.user ?? null);
        if (session?.user) {
          const p = await loadProfile(session.user.id);
          if (mounted) setProfile(p);
        }
      } catch (e) {
        if (mounted) setAuthError({ type: 'init_error', message: e.message });
      } finally {
        if (mounted) setLoading(false);
      }
    };
    init();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!mounted) return;
      setUser(session?.user ?? null);
      if (session?.user) {
        const p = await loadProfile(session.user.id);
        if (mounted) setProfile(p);
      } else {
        setProfile(null);
      }
    });
    return () => { mounted = false; subscription.unsubscribe(); };
  }, [loadProfile]);

  const signIn = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  };
  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };
  const refreshProfile = async () => {
    if (user) { const p = await loadProfile(user.id); setProfile(p); }
  };

  const value = {
    user,
    profile,
    loading,
    isLoadingAuth: loading,
    isLoadingPublicSettings: false,
    isAuthenticated: !!user,
    authError,
    signIn,
    login: signIn,
    signOut,
    logout: signOut,
    refreshProfile,
    isAdmin: profile?.role === 'admin',
  };
  return (<AuthContext.Provider value={value}>{children}</AuthContext.Provider>);
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
