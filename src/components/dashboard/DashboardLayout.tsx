import { useState, useEffect, useCallback } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Car, Search, Calendar, CreditCard, User, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const { user, userRole, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchUnreadCount = useCallback(async () => {
    if (!user?.id) return;
    
    const { count } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('is_read', false);

    setUnreadCount(count || 0);
  }, [user?.id]);

  useEffect(() => {
    if (userRole !== 'user') {
      navigate('/');
      return;
    }

    // Subscribe to notifications
    const channel = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user?.id}`,
        },
        () => {
          fetchUnreadCount();
        }
      )
      .subscribe();

    fetchUnreadCount();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, userRole, navigate, fetchUnreadCount]);

  const navItems = [
    {
      name: "Search Parking",
      path: "/dashboard/user",
      icon: Search,
    },
    {
      name: "My Bookings",
      path: "/dashboard/user/bookings",
      icon: Calendar,
    },
    {
      name: "Payments",
      path: "/dashboard/user/payments",
      icon: CreditCard,
    },
    {
      name: "Profile",
      path: "/dashboard/user/profile",
      icon: User,
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Header */}
      <header className="bg-white/90 backdrop-blur border-b border-gray-200 sticky top-0 z-30">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <Link
              to="/"
              className="flex items-center gap-2 text-2xl font-bold text-teal-600 hover:scale-105 transition-all"
            >
              <Car className="h-8 w-8" />
              SmartPark
            </Link>

            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                asChild
                className="relative"
              >
                <Link to="/dashboard/user/notifications">
                  <Bell className="h-5 w-5" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-red-500 text-[10px] font-medium text-white flex items-center justify-center">
                      {unreadCount}
                    </span>
                  )}
                </Link>
              </Button>

              <Button
                variant="ghost"
                onClick={() => signOut()}
              >
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex flex-col lg:flex-row">
        {/* Sidebar */}
        <aside className="w-full lg:w-64 bg-white border-r border-gray-200 lg:min-h-[calc(100vh-4rem)]">
          <nav className="p-3 lg:p-4 flex lg:block gap-2 overflow-x-auto lg:overflow-visible">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`shrink-0 flex items-center gap-2 lg:gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-teal-50 text-teal-700 border border-teal-100"
                      : "text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  <item.icon className="h-5 w-5" />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
