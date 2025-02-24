import { useState, useEffect, useCallback } from "react";
import { format } from "date-fns";
import { Clock, Calendar, MapPin } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
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
import type { Database } from "@/types/supabase";

type Booking = Database["public"]["Tables"]["bookings"]["Row"] & {
  parking_spaces: Database["public"]["Tables"]["parking_spaces"]["Row"];
};

export default function MyBookings() {
  const { toast } = useToast();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchBookings = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select('*, parking_spaces(*)')
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
  }, [toast]);

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
      const { error } = await supabase
        .from('bookings')
        .update({ status: 'cancelled' })
        .eq('id', bookingId);

      if (error) throw error;

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

  const handleExtend = async (bookingId: string) => {
    try {
      // Add 1 hour to the end time
      const { error } = await supabase
        .from('bookings')
        .update({
          end_time: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
        })
        .eq('id', bookingId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Booking extended successfully.",
      });
    } catch (error) {
      console.error('Error extending booking:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to extend booking. Please try again.",
      });
    }
  };

  const filterBookings = (status: string) => {
    return bookings.filter((booking) => booking.status === status);
  };

  const BookingCard = ({ booking }: { booking: Booking }) => (
    <Card>
      <CardHeader>
        <CardTitle>{booking.parking_spaces.address}</CardTitle>
        <CardDescription className="flex items-center gap-1">
          <MapPin className="h-4 w-4" />
          {`${booking.parking_spaces.location.lat}, ${booking.parking_spaces.location.lng}`}
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
                  variant="outline"
                  size="sm"
                  onClick={() => handleExtend(booking.id)}
                >
                  Extend
                </Button>
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
    return <div>Loading bookings...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">My Bookings</h1>
        <p className="mt-2 text-gray-600">
          View and manage your parking bookings
        </p>
      </div>

      <Tabs defaultValue="active">
        <TabsList>
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
