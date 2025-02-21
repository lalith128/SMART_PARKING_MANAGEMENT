
import { Menu, X } from "lucide-react";
import { useState } from "react";

export const Header = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md shadow-sm">
      <nav className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex-shrink-0">
            <a href="/" className="font-display text-2xl font-bold text-primary">
              ParkEase
            </a>
          </div>

          {/* Desktop menu */}
          <div className="hidden md:flex items-center space-x-8">
            <a href="#features" className="text-primary hover:text-primary-hover transition-colors">
              Features
            </a>
            <a href="#how-it-works" className="text-primary hover:text-primary-hover transition-colors">
              How It Works
            </a>
            <a href="#testimonials" className="text-primary hover:text-primary-hover transition-colors">
              Testimonials
            </a>
            <button className="px-4 py-2 text-primary-foreground bg-primary hover:bg-primary-hover rounded-lg button-transition">
              Log In
            </button>
            <button className="px-4 py-2 text-primary bg-secondary hover:bg-secondary-hover rounded-lg button-transition">
              Sign Up
            </button>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="text-primary hover:text-primary-hover p-2"
            >
              {isOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {isOpen && (
          <div className="md:hidden py-4 animate-fadeIn">
            <div className="flex flex-col space-y-4">
              <a
                href="#features"
                className="text-primary hover:text-primary-hover px-4 py-2 rounded-lg"
                onClick={() => setIsOpen(false)}
              >
                Features
              </a>
              <a
                href="#how-it-works"
                className="text-primary hover:text-primary-hover px-4 py-2 rounded-lg"
                onClick={() => setIsOpen(false)}
              >
                How It Works
              </a>
              <a
                href="#testimonials"
                className="text-primary hover:text-primary-hover px-4 py-2 rounded-lg"
                onClick={() => setIsOpen(false)}
              >
                Testimonials
              </a>
              <button className="w-full px-4 py-2 text-primary-foreground bg-primary hover:bg-primary-hover rounded-lg">
                Log In
              </button>
              <button className="w-full px-4 py-2 text-primary bg-secondary hover:bg-secondary-hover rounded-lg">
                Sign Up
              </button>
            </div>
          </div>
        )}
      </nav>
    </header>
  );
};
