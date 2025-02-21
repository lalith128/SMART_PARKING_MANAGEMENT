
import { UserCircle2, Search, CreditCard, Car, Building2, DollarSign, BarChart3, LineChart } from "lucide-react";
import { useState } from "react";

export const HowItWorks = () => {
  const [activeTab, setActiveTab] = useState<'users' | 'owners'>('users');

  const userSteps = [
    {
      icon: UserCircle2,
      title: "Sign up or log in with ease",
      description: "Create your account in seconds and start finding parking spots.",
    },
    {
      icon: Search,
      title: "Search for parking near you",
      description: "Find available spots based on location, price, and real-time availability.",
    },
    {
      icon: CreditCard,
      title: "Book and pay securely",
      description: "Reserve your spot and pay safely through our secure payment system.",
    },
    {
      icon: Car,
      title: "Park hassle-free",
      description: "Follow the directions to your spot and enjoy stress-free parking.",
    },
  ];

  const ownerSteps = [
    {
      icon: Building2,
      title: "Register your parking lot",
      description: "List your property and start earning in minutes.",
    },
    {
      icon: DollarSign,
      title: "Set competitive prices",
      description: "Define your rates and special offers to attract more customers.",
    },
    {
      icon: BarChart3,
      title: "Manage bookings",
      description: "Track and manage all your parking space bookings in real-time.",
    },
    {
      icon: LineChart,
      title: "Grow with insights",
      description: "Access detailed analytics to optimize your parking business.",
    },
  ];

  return (
    <section id="how-it-works" className="section-padding relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-secondary/50 to-white pointer-events-none" />
      <div className="max-w-7xl mx-auto relative">
        <h2 className="section-title">Get Started in Just a Few Steps</h2>
        <p className="section-subtitle">
          Whether you're looking for parking or want to list your space, we've got you covered.
        </p>

        <div className="flex justify-center mb-12">
          <div className="inline-flex p-1 bg-secondary/50 backdrop-blur-sm rounded-lg">
            <button
              onClick={() => setActiveTab('users')}
              className={`px-6 py-2 rounded-md transition-all duration-300 ${
                activeTab === 'users'
                  ? 'bg-white shadow-md text-primary'
                  : 'text-gray-600 hover:text-primary'
              }`}
            >
              For Users
            </button>
            <button
              onClick={() => setActiveTab('owners')}
              className={`px-6 py-2 rounded-md transition-all duration-300 ${
                activeTab === 'owners'
                  ? 'bg-white shadow-md text-primary'
                  : 'text-gray-600 hover:text-primary'
              }`}
            >
              For Owners
            </button>
          </div>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {(activeTab === 'users' ? userSteps : ownerSteps).map((step, index) => (
            <div
              key={index}
              className="glass-card p-6 hover-lift animate-fadeIn"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="relative mb-4">
                <div className="absolute -top-2 -right-2 w-12 h-12 bg-primary/5 rounded-full" />
                <div className="relative z-10 w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                  <step.icon className="w-6 h-6 text-primary" />
                </div>
              </div>
              <h3 className="font-display text-lg font-semibold mb-2">{step.title}</h3>
              <p className="text-gray-600">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
