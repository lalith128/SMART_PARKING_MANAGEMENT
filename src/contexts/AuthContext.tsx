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
        // Only navigate if not in auth flow
        if (!['/signin', '/signup', '/check-email', '/verify-email', '/auth/callback'].includes(location.pathname)) {
          handleRoleBasedNavigation(role);
        }
      }
      setLoading(false);
    };

    getSession();

    // Listen for changes on auth state (signed in, signed out, etc.)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("Auth state changed. Event:", event, "Session:", session);
      
      try {
        if (event === 'SIGNED_UP') {
          // Don't do anything on signup, let the component handle it
          setUser(session?.user ?? null);
          setLoading(false);
          return;
        }
        
        setUser(session?.user ?? null);
        
        if (event === 'SIGNED_IN' && session?.user) {
          console.log("Signed in, fetching user role...");
          
          // Fetch user profile
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', session.user.id)
            .single();

          if (profileError && profileError.code !== 'PGRST116') {
            console.error("Error fetching profile:", profileError);
            throw profileError;
          }

          // Set user role from profile or metadata
          const userRole = profile?.role || session.user.user_metadata?.role;
          console.log("Setting user role:", userRole);
          setUserRole(userRole);
          
          // Only navigate if not in auth flow
          if (!['/signin', '/signup', '/check-email', '/verify-email', '/auth/callback'].includes(location.pathname)) {
            handleRoleBasedNavigation(userRole);
          }
        } else if (!session?.user) {
          setUserRole(null);
          // Don't navigate away during auth flow
          if (!['/signin', '/signup', '/check-email', '/verify-email', '/auth/callback'].includes(location.pathname)) {
            navigate('/');
          }
        }
      } catch (error) {
        console.error("Error in auth state change:", error);
      } finally {
        setLoading(false);
      }
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
        console.log("Starting signIn in AuthContext...");
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          console.error("Supabase auth error:", error);
          throw error;
        }

        if (!data?.user) {
          console.error("No user data in sign in response");
          throw new Error('Sign in failed - no user data');
        }

        // Fetch user profile
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', data.user.id)
          .single();

        if (profileError) {
          console.error("Error fetching profile:", profileError);
          throw profileError;
        }

        console.log("Profile fetched successfully:", profile);
        setUserRole(profile?.role as UserRole);

        return { data, error: null };
      } catch (error) {
        console.error('Error in signIn:', error);
        return { data: null, error: error as Error };
      }
    },
    signUp: async (email: string, password: string, fullName: string, role: UserRole) => {
      console.log("Starting sign up process in AuthContext...", { email, fullName, role });
      try {
        // First, sign up the user
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
          // Create the user profile
          const { error: profileError } = await supabase
            .from('profiles')
            .insert([
              {
                id: data.user.id,
                full_name: fullName,
                role: role,
                email: email,
              }
            ])
            .select()
            .single();

          if (profileError) {
            console.error("Error creating profile:", profileError);
            throw profileError;
          }
        } catch (profileError) {
          console.error("Profile creation failed:", profileError);
          // Continue even if profile creation fails - it will be created on first login
        }

        return;
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
