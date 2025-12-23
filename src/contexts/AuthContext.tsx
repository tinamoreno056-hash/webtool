import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { getAuthState, loginAsync, logout as logoutLocal } from '@/lib/storage';

interface Profile {
  id: string;
  user_id: string;
  username: string;
  full_name: string | null;
  role: string;
  created_at: string;
  updated_at: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  signUp: (email: string, password: string, username: string, fullName?: string, role?: string) => Promise<{ error: { message: string } | null }>;
  signIn: (email: string, password: string) => Promise<{ error: { message: string } | null }>;
  signOut: () => Promise<{ error: { message: string } | null }>;
  updatePassword: (newPassword: string) => Promise<{ error: { message: string } | null }>;
  updateEmail: (newEmail: string) => Promise<{ error: { message: string } | null }>;
  updateProfile: (updates: Partial<Profile>) => Promise<{ error: { message: string } | null }>;
  resetPassword: (email: string) => Promise<{ error: { message: string } | null }>;
  refreshProfile: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLocalAuth, setIsLocalAuth] = useState(getAuthState().isAuthenticated);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        // Defer profile fetch with setTimeout to avoid deadlock
        if (session?.user) {
          setTimeout(() => {
            fetchProfile(session.user.id);
          }, 0);
        } else {
          setProfile(null);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else if (isLocalAuth) {
        // If local auth is active but no supabase session, load local profile
        const { currentUser } = getAuthState();
        if (currentUser) {
          // Map AppUser to Profile
          const localProfile: Profile = {
            id: currentUser.id,
            user_id: currentUser.id,
            username: currentUser.username,
            full_name: currentUser.name || null,
            role: currentUser.role,
            created_at: currentUser.createdAt,
            updated_at: currentUser.createdAt
          };
          setProfile(localProfile);
        }
      }
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  async function fetchProfile(userId: string) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (!error && data) {
      setProfile(data);
    }
  }

  async function signUp(email: string, password: string, username: string, fullName?: string, role: string = 'viewer') {
    const redirectUrl = `${window.location.origin}/`;

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          username,
          full_name: fullName || '',
          role,
        }
      }
    });

    return { error };
  }

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      // Try local login as fallback
      // Note: loginAsync expects username, but we might be passing email. 
      // For the default admin, username is 'admin'.
      // We will try to find a user by email in local storage or just try the input as username if it's not an email
      try {
        // distinct check: is it an email?
        const isEmail = email.includes('@');
        const usernameOrEmail = email; // loginAsync internal logic typically checks username, but we can expand or misuse it slightly if we are careful, 
        // OR we just rely on the username passed to Login.tsx? 
        // Login.tsx resolves username to email. 
        // Let's rely on the fact that if Supabase fails, we might just fail unless we have a clear local match.
        // Actually, let's try to match the email against local users.
        const { getUsers } = await import('@/lib/storage');
        const localUsers = getUsers();
        const localUser = localUsers.find(u => u.email === email || u.username === email);

        if (localUser) {
          const result = await loginAsync(localUser.username, password);
          if (result.success) {
            setIsLocalAuth(true);
            // Set profile immediately
            const localProfile: Profile = {
              id: localUser.id,
              user_id: localUser.id,
              username: localUser.username,
              full_name: localUser.name || null,
              role: localUser.role,
              created_at: localUser.createdAt,
              updated_at: localUser.createdAt
            };
            setProfile(localProfile);
            return { error: null };
          }
        }
      } catch (e) {
        console.warn("Local login attempt failed", e);
      }
    }

    return { error };
  }

  async function signOut() {
    const { error } = await supabase.auth.signOut();
    logoutLocal();
    setIsLocalAuth(false);
    setProfile(null);
    return { error };
  }

  async function updatePassword(newPassword: string) {
    if (isLocalAuth) {
      if (!profile?.id) return { error: { message: "No active profile" } };
      const { changePasswordAsync } = await import('@/lib/storage');
      const success = await changePasswordAsync(profile.id, newPassword);
      if (success) {
        return { error: null };
      }
      return { error: { message: "Failed to update password locally" } };
    }

    const { error } = await supabase.auth.updateUser({
      password: newPassword
    });
    return { error };
  }

  async function updateProfile(updates: Partial<Profile>) {
    if (isLocalAuth) {
      if (!profile?.id) return { error: { message: "No active profile" } };
      const { getUsers, saveUser } = await import('@/lib/storage');
      const users = getUsers();
      const user = users.find(u => u.id === profile.id);
      if (user) {
        if (updates.full_name) user.name = updates.full_name;
        // Add other fields here if needed
        saveUser(user);

        setProfile(prev => prev ? { ...prev, ...updates } : null);
        return { error: null };
      }
      return { error: { message: "User not found locally" } };
    }

    if (!user) return { error: { message: "No user logged in" } };

    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('user_id', user.id);

    if (!error) {
      setProfile(prev => prev ? { ...prev, ...updates } : null);
    }
    return { error };
  }

  async function updateEmail(newEmail: string) {
    if (isLocalAuth) {
      if (!profile?.id) return { error: { message: "No active profile" } };
      const { getUsers, saveUser } = await import('@/lib/storage');
      const users = getUsers();
      const user = users.find(u => u.id === profile.id);
      if (user) {
        user.email = newEmail;
        saveUser(user);
        // Update local profile state
        setProfile(prev => prev ? { ...prev, email: newEmail } : null);
        return { error: null };
      }
      return { error: { message: "User not found locally" } };
    }

    const { error } = await supabase.auth.updateUser({
      email: newEmail
    });
    return { error };
  }

  async function resetPassword(email: string) {
    const redirectUrl = `${window.location.origin}/`;
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectUrl,
    });
    return { error };
  }

  return (
    <AuthContext.Provider value={{
      user,
      session,
      profile,
      isAuthenticated: !!session || isLocalAuth,
      isLoading,
      signUp,
      signIn,
      signOut,
      updatePassword,
      updateEmail,
      updateProfile,
      resetPassword,
      refreshProfile: () => user && fetchProfile(user.id),
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
