import { useState, useEffect, useCallback } from "react";
import { format } from "date-fns";
import { Clock, Calendar, MapPin } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import type { Database } from "@/types/supabase";

type Booking = Database["public"]["Tables"]["bookings"]["Row"] & {
  parking_spaces: Database["public"]["Tables"]["parking_spaces"]["Row"];
};

export default function MyBookings() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchBookings = useCallback(async () => {
    if (!user) {
      setBookings([]);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('bookings')
        .select('*, parking_spaces(*)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setBookings(data || []);
    } catch (error) {
      console.error('Error fetching bookings:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load bookings. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  }, [toast, user]);

  useEffect(() => {
    fetchBookings();

    // Subscribe to booking changes
    const channel = supabase
      .channel('bookings')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bookings',
        },
        () => {
          fetchBookings();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchBookings]);

  const handleCancel = async (bookingId: string) => {
    try {
      if (!user) return;

      const { data, error } = await supabase.rpc('cancel_booking', {
        p_booking_id: bookingId,
        p_cancelled_by_user_id: user.id,
      });

      if (error) throw error;
      if (!data) {
        throw new Error('Booking cannot be cancelled now');
      }

      toast({
        title: "Success",
        description: "Booking cancelled successfully.",
      });
    } catch (error) {
      console.error('Error cancelling booking:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to cancel booking. Please try again.",
      });
    }
  };

  const filterBookings = (status: string) => {
    return bookings.filter((booking) => booking.status === status);
  };

  const statusBadgeClass = (status: string) => {
    if (status === "active") return "bg-emerald-100 text-emerald-700 border-emerald-200";
    if (status === "pending") return "bg-amber-100 text-amber-700 border-amber-200";
    if (status === "completed") return "bg-blue-100 text-blue-700 border-blue-200";
    return "bg-rose-100 text-rose-700 border-rose-200";
  };

  const BookingCard = ({ booking }: { booking: Booking }) => (
    <Card className="border-0 shadow-md hover:shadow-lg transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
        <CardTitle>{booking.parking_spaces.address}</CardTitle>
          <Badge variant="outline" className={statusBadgeClass(booking.status)}>
            {booking.status}
          </Badge>
        </div>
        <CardDescription className="flex items-center gap-1">
          <MapPin className="h-4 w-4" />
          {`${booking.parking_spaces.district}, ${booking.parking_spaces.state}`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-gray-500" />
              <span>
                {format(new Date(booking.start_time), "MMM d, yyyy")}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-gray-500" />
              <span>
                {format(new Date(booking.start_time), "h:mm a")}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between">
                <span className="font-medium">
                  ₹{booking.parking_spaces.hourly_rate}/hr
                </span>
                {booking.status === 'active' && (
                  <div className="space-x-2">
                    <Button
                      variant="destructive"
                      size="sm"
                  onClick={() => handleCancel(booking.id)}
                >
                  Cancel
                </Button>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (loading) {
    return <div className="text-sm text-gray-500">Loading bookings...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">My Bookings</h1>
        <p className="mt-2 text-gray-600">
          View and manage your parking bookings
        </p>
      </div>

      <Tabs defaultValue="active" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 bg-white border">
          <TabsTrigger value="active">Active</TabsTrigger>
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
          <TabsTrigger value="cancelled">Cancelled</TabsTrigger>
        </TabsList>

        {['active', 'pending', 'completed', 'cancelled'].map((status) => (
          <TabsContent key={status} value={status}>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {filterBookings(status).length === 0 ? (
                <div className="col-span-full text-center py-12 text-gray-500">
                  No {status} bookings found
                </div>
              ) : (
                filterBookings(status).map((booking) => (
                  <BookingCard key={booking.id} booking={booking} />
                ))
              )}
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
