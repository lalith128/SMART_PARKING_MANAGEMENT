import { Button } from "@/components/ui/button";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { 
  ArrowRight, 
  Car, 
  MapPin, 
  User, 
  CheckCircle2, 
  Clock, 
  Shield, 
  Star, 
  CreditCard, 
  Smartphone, 
  Menu,
  Facebook,
  Twitter,
  Instagram
} from "lucide-react";

export default function Index() {
  const navigate = useNavigate();
  const handleNavigation = (path: string) => {
    window.scrollTo(0, 0);
    navigate(path);
  };
  const features = [
    {
      icon: <MapPin className="w-12 h-12 text-teal-500" />,
      title: "Real-Time Availability",
      description: "Find available parking spots instantly with live updates and precise location tracking."
    },
    {
      icon: <Shield className="w-12 h-12 text-teal-500" />,
      title: "Secure Booking",
      description: "Book with confidence using our encrypted payment system and verified parking spots."
    },
    {
      icon: <Clock className="w-12 h-12 text-teal-500" />,
      title: "Time-Saving",
      description: "Reserve your spot in advance and skip the hassle of circling for parking."
    },
    {
      icon: <Smartphone className="w-12 h-12 text-teal-500" />,
      title: "Mobile Access",
      description: "Manage bookings anytime, anywhere with our sleek mobile-first interface."
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
      {/* Fixed Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md shadow-md">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2 hover:scale-105 transition-transform">
              <Car className="h-8 w-8 text-teal-500" />
              <h1 className="text-2xl font-bold text-gray-900">SmartPark</h1>
            </div>
            
            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-8">
              <button 
                onClick={() => handleNavigation('/')}
                className="text-gray-700 hover:text-teal-500 transition-colors font-medium"
              >
                Home
              </button>
              <button 
                onClick={() => {
                  const featuresSection = document.getElementById('features');
                  featuresSection?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="text-gray-700 hover:text-teal-500 transition-colors font-medium"
              >
                Features
              </button>
              
              <div className="flex items-center space-x-4">
                <Button asChild variant="ghost" 
                  className="text-gray-700 hover:text-teal-500 hover:bg-teal-50"
                >
                  <Link to="/signin" target="_blank" rel="noopener noreferrer">Sign In</Link>
                </Button>
                <Button asChild variant="default" 
                  className="bg-teal-500 hover:bg-teal-600 text-white hover:scale-105 transition-transform shadow-md"
                >
                  <Link to="/signup" target="_blank" rel="noopener noreferrer">Sign Up</Link>
                </Button>
              </div>
            </div>
            
            {/* Mobile Menu Button */}
            <button className="md:hidden text-gray-700 hover:text-teal-500">
              <Menu className="h-6 w-6" />
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-br from-teal-600 to-purple-700 pt-16">
        <div className="absolute inset-0 bg-grid-white/[0.05] bg-[size:60px_60px] animate-pulse"></div>
        <div className="container mx-auto px-4 py-24">
          <div className="space-y-8 relative z-10 max-w-4xl mx-auto text-center">
            <h2 className="text-7xl font-bold text-white leading-tight animate-fade-in-up">
              Park <span className="text-teal-300 animate-pulse">Smarter</span> Today
            </h2>
            <p className="text-xl text-gray-100 leading-relaxed animate-fade-in-up delay-200">
              Discover hassle-free parking with real-time availability, secure bookings, and seamless payments—all in one place.
            </p>
            <div className="flex gap-4 animate-fade-in-up delay-400 justify-center">
              <Button asChild size="lg" 
                className="bg-teal-500 text-white hover:bg-teal-600 hover:scale-105 transition-all shadow-lg px-8 py-6 text-lg group">
                <Link to="/signup" target="_blank" rel="noopener noreferrer">
                  Sign Up <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Link>
              </Button>
              <Button asChild size="lg" 
                className="bg-teal-500 text-white hover:bg-teal-600 hover:scale-105 transition-all shadow-lg px-8 py-6 text-lg group">
                <Link to="/about">
                  Watch Demo <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Link>
              </Button>
            </div>
            {/* Stats */}
            <div className="grid grid-cols-3 gap-8 pt-8 mt-8 border-t border-white/20 animate-fade-in-up delay-600">
              <div>
                <div className="text-3xl font-bold text-white">50K+</div>
                <div className="text-gray-200">Active Users</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-white">100+</div>
                <div className="text-gray-200">Locations</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-white">4.9</div>
                <div className="text-gray-200">User Rating</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <section id="features" className="py-24 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16 animate-fade-in-up">
            <h2 className="text-5xl font-bold text-gray-900 mb-4">Why SmartPark?</h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Innovative features designed to simplify parking for everyone.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <div 
                key={index}
                className="p-6 rounded-xl bg-white shadow-md hover:shadow-xl hover:scale-105 transition-all duration-300 border border-gray-100 animate-fade-in-up"
                style={{ animationDelay: `${index * 200}ms` }}
              >
                <div className="mb-4 p-2 rounded-lg bg-teal-50 inline-block">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {feature.title}
                </h3>
                <p className="text-gray-600">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <div className="bg-gray-50 py-24">
        <div className="container mx-auto px-4">
          <h3 className="text-4xl font-bold text-center mb-12 animate-fade-in-up">How It Works</h3>
          <div className="grid md:grid-cols-4 gap-8">
            {[
              { icon: <MapPin className="w-6 h-6 text-teal-500" />, title: "Find", description: "Search for parking near you." },
              { icon: <CheckCircle2 className="w-6 h-6 text-teal-500" />, title: "Book", description: "Reserve your spot instantly." },
              { icon: <Car className="w-6 h-6 text-teal-500" />, title: "Park", description: "Arrive and park with ease." },
              { icon: <CreditCard className="w-6 h-6 text-teal-500" />, title: "Pay", description: "Securely pay online." }
            ].map((step, index) => (
              <div key={step.title} className="text-center animate-fade-in-up" style={{ animationDelay: `${index * 200}ms` }}>
                <div className="w-16 h-16 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  {step.icon}
                </div>
                <h4 className="text-xl font-semibold mb-2">{step.title}</h4>
                <p className="text-gray-600">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Testimonials */}
      <div className="container mx-auto px-4 py-24">
        <h3 className="text-4xl font-bold text-center mb-12 animate-fade-in-up">What Our Users Say</h3>
        <div className="grid md:grid-cols-3 gap-8">
          {[
            { 
              name: "John Doe", 
              role: "Regular User", 
              comment: "SmartPark saves me so much time!", 
              img: <User className="w-full h-full text-gray-600" />
            },
            { 
              name: "Jane Smith", 
              role: "Business Owner", 
              comment: "Managing my parking has never been easier.", 
              img: <User className="w-full h-full text-gray-600" />
            },
            { 
              name: "Mike Johnson", 
              role: "Daily Commuter", 
              comment: "Real-time updates are a game-changer!", 
              img: <User className="w-full h-full text-gray-600" />
            }
          ].map((testimonial, index) => (
            <div key={testimonial.name} className="bg-white p-6 rounded-xl shadow-md animate-fade-in-up" style={{ animationDelay: `${index * 200}ms` }}>
              <div className="flex items-center gap-2 mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                ))}
              </div>
              <p className="text-gray-600 mb-4">{testimonial.comment}</p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                  {testimonial.img}
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{testimonial.name}</p>
                  <p className="text-sm text-gray-500">{testimonial.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-teal-600 text-white py-24">
        <div className="container mx-auto px-4 text-center">
          <h3 className="text-4xl font-bold mb-6 animate-fade-in-up">Ready to Park Smarter?</h3>
          <p className="text-xl text-gray-100 mb-8 animate-fade-in-up delay-200">
            Join thousands enjoying stress-free parking today.
          </p>
          <Button asChild size="lg" variant="default" 
            className="bg-white text-teal-600 hover:bg-gray-100 hover:scale-105 transition-transform shadow-md animate-fade-in-up delay-400">
            <Link to="/signup" target="_blank" rel="noopener noreferrer">Sign Up Now <ArrowRight className="ml-2" /></Link>
          </Button>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-300 py-12">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Car className="h-6 w-6 text-teal-500" />
                <h4 className="text-xl font-bold text-white">SmartPark</h4>
              </div>
              <p className="text-gray-400">Smarter parking for a better day.</p>
            </div>
            <div>
              <h5 className="font-semibold mb-4 text-white">Quick Links</h5>
              <ul className="space-y-2">
                <li><Link to="/about" className="hover:text-teal-500 transition-colors">About Us</Link></li>
                <li><Link to="/features" className="hover:text-teal-500 transition-colors">Features</Link></li>
                <li><Link to="/pricing" className="hover:text-teal-500 transition-colors">Pricing</Link></li>
              </ul>
            </div>
            <div>
              <h5 className="font-semibold mb-4 text-white">Support</h5>
              <ul className="space-y-2">
                <li><Link to="/help" className="hover:text-teal-500 transition-colors">Help Center</Link></li>
                <li><Link to="/contact" className="hover:text-teal-500 transition-colors">Contact Us</Link></li>
                <li><Link to="/faq" className="hover:text-teal-500 transition-colors">FAQs</Link></li>
              </ul>
            </div>
            <div>
              <h5 className="font-semibold mb-4 text-white">Follow Us</h5>
              <div className="flex gap-4">
                <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" className="hover:text-teal-500 transition-colors">
                  <Facebook className="w-6 h-6" />
                </a>
                <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="hover:text-teal-500 transition-colors">
                  <Twitter className="w-6 h-6" />
                </a>
                <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="hover:text-teal-500 transition-colors">
                  <Instagram className="w-6 h-6" />
                </a>
              </div>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-12 pt-8 text-center text-gray-400">
            <p> {new Date().getFullYear()} SmartPark. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
