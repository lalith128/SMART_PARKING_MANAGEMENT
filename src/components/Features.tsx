
import { Search, CreditCard, BarChart3, Clock, Shield, PieChart } from "lucide-react";

export const Features = () => {
  const features = [
    {
      title: "For Users",
      items: [
        {
          icon: Search,
          text: "Search and book parking by location, price, or availability.",
        },
        {
          icon: Clock,
          text: "Real-time updates on parking slots and booking status.",
        },
        {
          icon: CreditCard,
          text: "Pay securely online with multiple options.",
        },
      ],
    },
    {
      title: "For Parking Lot Owners",
      items: [
        {
          icon: BarChart3,
          text: "Register and list your spaces in minutes.",
        },
        {
          icon: PieChart,
          text: "Set custom prices and track earnings with analytics.",
        },
        {
          icon: Clock,
          text: "Manage slots and bookings in real time.",
        },
      ],
    },
    {
      title: "For Admins",
      items: [
        {
          icon: Shield,
          text: "Oversee a secure, fraud-free platform.",
        },
        {
          icon: BarChart3,
          text: "Monitor transactions and user activity.",
        },
      ],
    },
  ];

  return (
    <section id="features" className="section-padding bg-gradient-to-b from-secondary to-white">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="section-title">
            Everything You Need for Parking Success
          </h2>
          <p className="section-subtitle">
            Comprehensive solutions for users, owners, and administrators.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((category, index) => (
            <div 
              key={index} 
              className="feature-card hover-lift animate-fadeIn" 
              style={{ animationDelay: `${index * 0.2}s` }}
            >
              <div className="relative">
                <h3 className="font-display text-xl font-semibold mb-6">{category.title}</h3>
                <div className="absolute -top-4 -right-4 w-12 h-12 bg-primary/5 rounded-full" />
              </div>
              <div className="space-y-6">
                {category.items.map((item, itemIndex) => (
                  <div 
                    key={itemIndex} 
                    className="flex items-start space-x-4 p-4 rounded-lg hover:bg-secondary/50 transition-colors duration-300"
                  >
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <item.icon className="w-6 h-6 text-primary flex-shrink-0" />
                    </div>
                    <p className="text-gray-600">{item.text}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
