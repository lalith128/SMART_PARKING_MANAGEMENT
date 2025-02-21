
import { Facebook, Twitter, Instagram, Linkedin } from "lucide-react";

export const Footer = () => {
  return (
    <footer className="bg-primary text-primary-foreground">
      <div className="max-w-7xl mx-auto section-padding">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
          <div>
            <h3 className="font-display text-lg font-semibold mb-4">Company</h3>
            <ul className="space-y-2">
              <li><a href="#" className="hover:opacity-80 transition-opacity">About Us</a></li>
              <li><a href="#" className="hover:opacity-80 transition-opacity">Contact</a></li>
              <li><a href="#" className="hover:opacity-80 transition-opacity">Careers</a></li>
            </ul>
          </div>
          <div>
            <h3 className="font-display text-lg font-semibold mb-4">Product</h3>
            <ul className="space-y-2">
              <li><a href="#" className="hover:opacity-80 transition-opacity">Features</a></li>
              <li><a href="#" className="hover:opacity-80 transition-opacity">Pricing</a></li>
              <li><a href="#" className="hover:opacity-80 transition-opacity">Support</a></li>
            </ul>
          </div>
          <div>
            <h3 className="font-display text-lg font-semibold mb-4">Legal</h3>
            <ul className="space-y-2">
              <li><a href="#" className="hover:opacity-80 transition-opacity">Privacy Policy</a></li>
              <li><a href="#" className="hover:opacity-80 transition-opacity">Terms of Service</a></li>
              <li><a href="#" className="hover:opacity-80 transition-opacity">Cookie Policy</a></li>
            </ul>
          </div>
          <div>
            <h3 className="font-display text-lg font-semibold mb-4">Connect</h3>
            <div className="flex space-x-4">
              <a href="#" className="hover:opacity-80 transition-opacity">
                <Facebook size={24} />
              </a>
              <a href="#" className="hover:opacity-80 transition-opacity">
                <Twitter size={24} />
              </a>
              <a href="#" className="hover:opacity-80 transition-opacity">
                <Instagram size={24} />
              </a>
              <a href="#" className="hover:opacity-80 transition-opacity">
                <Linkedin size={24} />
              </a>
            </div>
          </div>
        </div>
        <div className="border-t border-white/10 pt-8">
          <p className="text-center text-sm">
            © {new Date().getFullYear()} ParkEase. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};
