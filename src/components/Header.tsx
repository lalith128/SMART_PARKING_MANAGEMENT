
import { Menu, X } from "lucide-react";
import { useState } from "react";
import { AuthModal } from "./AuthModal";

export const Header = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [authModal, setAuthModal] = useState<{ isOpen: boolean; mode: "login" | "signup" }>({
    isOpen: false,
    mode: "login",
  });

  const openAuthModal = (mode: "login" | "signup") => {
    setAuthModal({ isOpen: true, mode });
  };

  const closeAuthModal = () => {
    setAuthModal({ ...authModal, isOpen: false });
  };

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md shadow-sm">
        <nav className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex-shrink-0">
              <a href="/" className="font-display text-2xl font-bold gradient-text">
                ParkEase
              </a>
            </div>

            {/* Desktop menu */}
            <div className="hidden md:flex items-center space-x-8">
              <a href="#features" className="text-primary hover:text-primary-hover transition-colors hover-lift">
                Features
              </a>
              <a href="#how-it-works" className="text-primary hover:text-primary-hover transition-colors hover-lift">
                How It Works
              </a>
              <a href="#testimonials" className="text-primary hover:text-primary-hover transition-colors hover-lift">
                Testimonials
              </a>
              <button className="primary-btn" onClick={() => openAuthModal("login")}>
                Log In
              </button>
              <button className="secondary-btn" onClick={() => openAuthModal("signup")}>
                Sign Up
              </button>
            </div>

            {/* Mobile menu button */}
            <div className="md:hidden">
              <button
                onClick={() => setIsOpen(!isOpen)}
                className="text-primary hover:text-primary-hover p-2 hover:bg-primary/5 rounded-lg transition-colors"
              >
                {isOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>
          </div>

          {/* Mobile menu */}
          {isOpen && (
            <div className="md:hidden py-4 animate-fadeIn bg-white/95 backdrop-blur-md rounded-b-2xl shadow-lg">
              <div className="flex flex-col space-y-4">
                <a
                  href="#features"
                  className="text-primary hover:text-primary-hover px-4 py-2 rounded-lg hover:bg-primary/5"
                  onClick={() => setIsOpen(false)}
                >
                  Features
                </a>
                <a
                  href="#how-it-works"
                  className="text-primary hover:text-primary-hover px-4 py-2 rounded-lg hover:bg-primary/5"
                  onClick={() => setIsOpen(false)}
                >
                  How It Works
                </a>
                <a
                  href="#testimonials"
                  className="text-primary hover:text-primary-hover px-4 py-2 rounded-lg hover:bg-primary/5"
                  onClick={() => setIsOpen(false)}
                >
                  Testimonials
                </a>
                <button 
                  className="w-full primary-btn"
                  onClick={() => {
                    setIsOpen(false);
                    openAuthModal("login");
                  }}
                >
                  Log In
                </button>
                <button 
                  className="w-full secondary-btn"
                  onClick={() => {
                    setIsOpen(false);
                    openAuthModal("signup");
                  }}
                >
                  Sign Up
                </button>
              </div>
            </div>
          )}
        </nav>
      </header>

      <AuthModal
        isOpen={authModal.isOpen}
        onClose={closeAuthModal}
        mode={authModal.mode}
      />
    </>
  );
};
