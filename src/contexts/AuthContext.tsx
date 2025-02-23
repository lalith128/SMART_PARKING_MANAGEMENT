
import { createContext, useContext, useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";
import type { UserRole } from "@/types/supabase";

type AuthContextType = {
  user: User | null;
  loading: boolean;
  userRole: UserRole | null;
  signIn: (email: string, password: string) => Promise<{ data: { user: User }, error: null } | { data: null, error: Error }>;
  signUp: (email: string, password: string, fullName: string, role: UserRole) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  userRole: null,
  signIn: async (email: string, password: string) => ({ data: null, error: new Error('Not implemented') }),
  signUp: async () => {},
  signOut: async () => {},
});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  const getUserRole = async (userId: string) => {
    console.log("Fetching role for user:", userId);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single();

      if (error) {
        console.error("Error fetching user role:", error);
        throw error;
      }
      console.log("Retrieved role:", data?.role);
      return data?.role as UserRole;
    } catch (error) {
      console.error('Error in getUserRole:', error);
      return null;
    }
  };

  useEffect(() => {
    // Check active sessions and sets the user
    const getSession = async () => {
      console.log("Checking active session...");
      const { data: { session } } = await supabase.auth.getSession();
      console.log("Current session:", session);
      
      setUser(session?.user ?? null);
      if (session?.user) {
        console.log("Found active user, fetching role...");
        const role = await getUserRole(session.user.id);
        console.log("Setting user role to:", role);
        setUserRole(role);
        handleRoleBasedNavigation(role);
      }
      setLoading(false);
    };

    getSession();

    // Listen for changes on auth state (signed in, signed out, etc.)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      console.log("Auth state changed. Event:", _event);
      console.log("New session:", session);
      
      setUser(session?.user ?? null);
      if (session?.user) {
        const role = await getUserRole(session.user.id);
        setUserRole(role);
        handleRoleBasedNavigation(role);
      } else {
        setUserRole(null);
        if (!['/signin', '/signup'].includes(location.pathname)) {
          navigate('/');
        }
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [navigate, location.pathname]);

  const handleRoleBasedNavigation = (role: UserRole | null) => {
    if (!role) return;
    
    switch (role) {
      case 'user':
        navigate('/dashboard/user');
        break;
      case 'owner':
        navigate('/dashboard/owner');
        break;
      default:
        navigate('/');
    }
  };

  const value = {
    user,
    loading,
    userRole,
    signIn: async (email: string, password: string) => {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        return { data, error: null };
      } catch (error) {
        console.error('Error signing in:', error);
        return { data: null, error: error as Error };
      }
    },
    signUp: async (email: string, password: string, fullName: string, role: UserRole) => {
      console.log("Starting sign up process in AuthContext...", { email, fullName, role });
      try {
        const { error: signUpError, data } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
              role: role,
            },
            emailRedirectTo: `${window.location.origin}/auth/callback`
          },
        });
        
        console.log("Supabase auth response:", { signUpError, data });
        
        if (signUpError) {
          console.error("Supabase auth error:", signUpError);
          throw signUpError;
        }

        if (!data.user) {
          console.error("No user data in response");
          throw new Error('User data not available after signup');
        }

        try {
          // The profile will be created automatically by the database trigger
          console.log("Profile will be created by database trigger");
          
        } catch (profileError) {
          console.error("Failed to create profile:", profileError);
          // Don't throw here, we still want to show the verification page
        }
        
        // After successful sign-up, show verification message
        navigate('/verify-email');
      } catch (error) {
        console.error('Error in signUp:', error);
        throw error;
      }
    },
    signOut: async () => {
      try {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
        setUserRole(null);
        navigate('/');
      } catch (error) {
        console.error('Error in signOut:', error);
        throw error;
      }
    },
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading ? children : <div>Loading...</div>}
    </AuthContext.Provider>
  );
};
