
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { ArrowRight, Car, MapPin, User, Building2, CheckCircle2, Clock, Shield } from "lucide-react";

export default function Index() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-r from-primary to-primary/90">
        <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:60px_60px]" />
        <div className="relative">
          <header className="container mx-auto px-4 py-6 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Car className="h-8 w-8 text-secondary" />
              <h1 className="text-2xl font-bold text-white">SmartPark</h1>
            </div>
            <div className="space-x-4">
              {user ? (
                <Button asChild variant="secondary" className="hover-scale">
                  <Link to="/dashboard">Dashboard</Link>
                </Button>
              ) : (
                <>
                  <Button asChild variant="ghost" className="text-white hover:text-white hover-scale">
                    <Link to="/login">Sign In</Link>
                  </Button>
                  <Button asChild variant="secondary" className="hover-scale">
                    <Link to="/signup">Sign Up</Link>
                  </Button>
                </>
              )}
            </div>
          </header>

          <div className="container mx-auto px-4 py-24 flex flex-col items-center text-center">
            <h1 className="text-4xl md:text-6xl font-bold text-white mb-6 tracking-tight animate-fadeIn">
              Smart Parking Made Simple
            </h1>
            <p className="text-xl text-white/80 mb-8 max-w-2xl mx-auto animate-fadeIn delay-100">
              Find and book parking spaces instantly. Connect with parking lot owners 
              and optimize your parking experience.
            </p>
            <Button 
              asChild 
              size="lg" 
              variant="secondary" 
              className="text-lg hover-scale animate-fadeIn delay-200"
            >
              <Link to={user ? "/dashboard" : "/signup"}>
                Get Started
                <ArrowRight className="ml-2" />
              </Link>
            </Button>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-16 w-full max-w-4xl animate-fadeIn delay-300">
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 text-white">
                <CheckCircle2 className="h-8 w-8 mb-4 text-secondary" />
                <h3 className="text-lg font-semibold mb-2">Easy Booking</h3>
                <p className="text-white/70">Book parking spots with just a few clicks</p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 text-white">
                <Clock className="h-8 w-8 mb-4 text-secondary" />
                <h3 className="text-lg font-semibold mb-2">Real-time Updates</h3>
                <p className="text-white/70">Get instant availability notifications</p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 text-white">
                <Shield className="h-8 w-8 mb-4 text-secondary" />
                <h3 className="text-lg font-semibold mb-2">Secure Payments</h3>
                <p className="text-white/70">Safe and hassle-free transactions</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="container mx-auto px-4 py-24">
        <h2 className="text-3xl font-bold text-center mb-16">Why Choose SmartPark?</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          <div className="p-6 rounded-lg bg-white/50 hover:bg-white/80 transition-colors">
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <Car className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Vehicle Type Filtering</h3>
            <p className="text-muted-foreground">Find spots perfect for your vehicle</p>
          </div>
          <div className="p-6 rounded-lg bg-white/50 hover:bg-white/80 transition-colors">
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <MapPin className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Location Tracking</h3>
            <p className="text-muted-foreground">Real-time availability updates</p>
          </div>
          <div className="p-6 rounded-lg bg-white/50 hover:bg-white/80 transition-colors">
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <User className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">User Management</h3>
            <p className="text-muted-foreground">Manage your profile and bookings</p>
          </div>
          <div className="p-6 rounded-lg bg-white/50 hover:bg-white/80 transition-colors">
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <Building2 className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Owner Dashboard</h3>
            <p className="text-muted-foreground">Manage your parking spaces</p>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="container mx-auto px-4 py-24">
        <div className="bg-primary rounded-2xl p-12 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            Ready to Get Started?
          </h2>
          <p className="text-xl text-white/80 mb-8 max-w-2xl mx-auto">
            Join thousands of users who have simplified their parking experience with SmartPark.
          </p>
          <Button 
            asChild 
            size="lg" 
            variant="secondary" 
            className="text-lg hover-scale"
          >
            <Link to="/signup">
              Create Your Account
              <ArrowRight className="ml-2" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}