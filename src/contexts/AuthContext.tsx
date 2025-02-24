import { createContext, useContext, useEffect, useState } from 'react';
import { User, AuthChangeEvent, Session, AuthResponse } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { useNavigate } from 'react-router-dom';
import type { UserRole } from '@/types/supabase';

interface AuthContextType {
  user: User | null;
  userRole: UserRole | null;
  signUp: (email: string, password: string, fullName: string, role: UserRole) => Promise<void>;
  signIn: (email: string, password: string) => Promise<{ data: AuthResponse['data']; error?: Error }>;
  signOut: () => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  userRole: null,
  signUp: async () => {},
  signIn: async () => ({ data: null }),
  signOut: async () => {},
  loading: true,
});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchUserRole = async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .maybeSingle();
    
    if (error) {
      console.error('Error fetching user role:', error);
      return null;
    }

    return data?.role as UserRole | null;
  };

  useEffect(() => {
    // Check active sessions and sets the user
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      console.log('Initial session check:', session);
      setUser(session?.user ?? null);
      if (session?.user) {
        const role = await fetchUserRole(session.user.id);
        setUserRole(role);
      }
      setLoading(false);
    });

    // Listen for changes on auth state
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: AuthChangeEvent, session: Session | null) => {
        console.log('Auth state change:', event, session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          const role = await fetchUserRole(session.user.id);
          setUserRole(role);
          console.log('User role fetched:', role);
        } else {
          setUserRole(null);
        }
        setLoading(false);

        if (event === 'SIGNED_IN') {
          if (session?.user?.email_confirmed_at) {
            const role = await fetchUserRole(session.user.id);
            if (role === 'owner') {
              navigate('/dashboard/owner');
            } else {
              navigate('/dashboard/user');
            }
          }
        } else if (event === 'SIGNED_OUT') {
          navigate('/');
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [navigate]);

  const signUp = async (email: string, password: string, fullName: string, role: UserRole) => {
    console.log('Attempting signup with:', { email, fullName, role });
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          role: role,
        },
      },
    });
    
    if (error) {
      console.error('Signup error:', error);
      throw error;
    }
  };

  const signIn = async (email: string, password: string) => {
    console.log('Attempting signin with:', email);
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (error) {
      console.error('Signin error:', error);
      throw error;
    }
    
    console.log('Signin successful:', data);
    return { data };
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  return (
    <AuthContext.Provider value={{ user, userRole, signUp, signIn, signOut, loading }}>
      {children}
    </AuthContext.Provider>
  );
};
