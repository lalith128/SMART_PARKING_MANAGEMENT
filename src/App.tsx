
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import Index from "./pages/Index";
import SignIn from "./pages/SignIn";
import SignUp from "./pages/SignUp";
import VerifyEmail from "./pages/VerifyEmail";
import CheckEmail from "./pages/CheckEmail";
import NotFound from "./pages/NotFound";
import UserDashboard from "./pages/dashboard/UserDashboard";
import OwnerDashboard from "./pages/dashboard/OwnerDashboard";
import ParkingSearch from "./pages/ParkingSearch";

const queryClient = new QueryClient();

// Protected route wrapper
const ProtectedRoute = ({ 
  children, 
  requiredRole 
}: { 
  children: React.ReactNode;
  requiredRole?: "user" | "owner";
}) => {
  const { user, userRole, loading } = useAuth();
  const location = useLocation();

  console.log('ProtectedRoute:', { user, userRole, loading, requiredRole });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user && location.pathname !== '/signin' && location.pathname !== '/signup' && 
      location.pathname !== '/verify-email' && location.pathname !== '/check-email') {
    return <Navigate to="/signin" state={{ from: location }} replace />;
  }

  if (requiredRole && userRole !== requiredRole) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

const AppRoutes = () => {
  const { user, loading } = useAuth();
  const location = useLocation();

  console.log('AppRoutes:', { user, loading, pathname: location.pathname });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <Routes>
      {/* Public routes */}
      <Route path="/" element={<Index />} />
      <Route path="/search" element={<ParkingSearch />} />
      <Route 
        path="/signin" 
        element={
          user ? (
            <Navigate to={location.state?.from?.pathname || "/dashboard/user"} replace />
          ) : (
            <SignIn />
          )
        } 
      />
      <Route 
        path="/signup" 
        element={
          user ? (
            <Navigate to={location.state?.from?.pathname || "/dashboard/user"} replace />
          ) : (
            <SignUp />
          )
        } 
      />
      <Route path="/verify-email" element={<VerifyEmail />} />
      <Route path="/check-email" element={<CheckEmail />} />
      <Route path="/auth/callback" element={<VerifyEmail />} />

      {/* Protected user routes */}
      <Route
        path="/dashboard/user/*"
        element={
          <ProtectedRoute requiredRole="user">
            <UserDashboard />
          </ProtectedRoute>
        }
      />

      {/* Protected owner routes */}
      <Route
        path="/dashboard/owner/*"
        element={
          <ProtectedRoute requiredRole="owner">
            <OwnerDashboard />
          </ProtectedRoute>
        }
      />

      {/* Catch all */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const App = () => (
  <BrowserRouter>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Sonner position="top-right" />
          <AppRoutes />
          <Toaster />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  </BrowserRouter>
);

export default App;
