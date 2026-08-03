import React, { createContext, useContext, useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase, checkSupabaseProjectStatus, isProjectPausedError } from '../lib/supabase';

interface AuthContextType {
  user: User | null;
  isAdmin: boolean;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check active sessions and sets the user
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        // console.error removed
      }
      setUser(session?.user ?? null);
      checkUserRole(session?.user ?? null);
      setLoading(false);
    });

    // Listen for changes on auth state
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      checkUserRole(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkUserRole = async (user: User | null) => {
    if (!user) {
      setIsAdmin(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('admin_users')
        .select('is_admin')
        .eq('user_id', user.id)
        .single();

      if (error) {
        // console.error removed
        setIsAdmin(false);
        return;
      }

      setIsAdmin(data?.is_admin ?? false);
    } catch (err) {
      // console.error removed
      setIsAdmin(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    if (!email || !password) {
      throw new Error('Email and password are required');
    }

    try {
      // First check if the Supabase project is active
      const projectStatus = await checkSupabaseProjectStatus();
      if (!projectStatus?.active) {
        throw new Error(projectStatus?.error || 'Supabase project is not accessible');
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        // Check if this is a project paused error
        if (error.message && isProjectPausedError({ message: error.message })) {
          throw new Error('Your Supabase project appears to be paused or experiencing database issues. Please:\n\n1. Visit your Supabase dashboard (https://supabase.com/dashboard)\n2. Check if your project is paused due to inactivity\n3. If paused, click "Resume" to reactivate your project\n4. Verify your project is on an active billing plan\n5. Check the project logs for any specific error details\n\nOnce your project is active, try logging in again.');
        }

        // Provide more specific error messages based on error types
        const errorMessage = error.message || '';
        if (errorMessage.toLowerCase().includes('database error querying schema')) {
          throw new Error('Database connection error. Your Supabase project may be paused or experiencing issues. Please:\n\n1. Check your Supabase dashboard to ensure the project is active\n2. Verify your environment variables match your project settings\n3. Check Supabase project logs for more details\n4. Try refreshing the page and attempting login again');
        } else if (errorMessage.toLowerCase().includes('invalid login credentials')) {
          throw new Error('Invalid email or password. Please check your credentials and try again.');
        } else if (errorMessage.toLowerCase().includes('email not confirmed')) {
          throw new Error('Please confirm your email address before signing in.');
        } else if (errorMessage.toLowerCase().includes('unexpected_failure')) {
          throw new Error('Supabase service error. This usually indicates:\n\n1. Your project may be paused (check Supabase dashboard)\n2. Database connectivity issues\n3. Service maintenance\n\nPlease try again in a few minutes or check your Supabase project status.');
        } else if (error.status === 500) {
          throw new Error('Server error occurred. Please check:\n\n1. Supabase project status in your dashboard\n2. Project logs for specific error details\n3. Try again in a few minutes');
        }

        throw error;
      }

      // Sign in successful
    } catch (err) {
      throw err;
    }
  };

  const signUp = async (email: string, password: string) => {
    if (!email || !password) {
      throw new Error('Email and password are required');
    }

    try {
      // Check project status before attempting signup
      const projectStatus = await checkSupabaseProjectStatus();
      if (!projectStatus?.active) {
        if (projectStatus?.error && isProjectPausedError({ message: projectStatus.error })) {
          throw new Error('Your Supabase project appears to be paused. Please visit your Supabase dashboard and resume your project before creating an account.');
        }
        throw new Error(projectStatus?.error || 'Supabase project is not accessible');
      }

      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/gallery`
        }
      });

      if (error) {
        if (error.message && isProjectPausedError(error)) {
          throw new Error('Your Supabase project appears to be paused. Please visit your Supabase dashboard and resume your project before creating an account.');
        }
        throw error;
      }
    } catch (err) {
      throw err;
    }
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ user, isAdmin, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};