import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { MapPin, Clock, Car } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/lib/supabase";
import type { Database } from "@/types/supabase";

type ParkingSpace = Database["public"]["Tables"]["parking_spaces"]["Row"];

export default function SearchParking() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [location, setLocation] = useState("");
  const [maxPrice, setMaxPrice] = useState(50);
  const [distance, setDistance] = useState("5");
  const [parkingSpaces, setParkingSpaces] = useState<ParkingSpace[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchParkingSpaces();
  }, []);

  const fetchParkingSpaces = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('parking_spaces')
        .select('*')
        .order('hourly_rate');

      if (error) throw error;
      setParkingSpaces(data || []);
    } catch (error) {
      console.error("Error fetching parking spaces:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load parking spaces. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleBook = async (parkingSpaceId: string) => {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .insert([
          {
            parking_space_id: parkingSpaceId,
            start_time: new Date().toISOString(),
            status: "pending",
          },
        ])
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Success",
        description: "Booking created successfully!",
      });

      navigate("/dashboard/user/bookings");
    } catch (error) {
      console.error("Error creating booking:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to create booking. Please try again.",
      });
    }
  };

  const filteredParkingSpaces = parkingSpaces.filter((space) => {
    const matchesLocation = location
      ? space.address.toLowerCase().includes(location.toLowerCase())
      : true;
    const matchesPrice = space.hourly_rate <= maxPrice;
    return matchesLocation && matchesPrice;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Search Parking</h1>
        <p className="mt-2 text-gray-600">
          Find and book parking spots near you
        </p>
      </div>

      {/* Search Filters */}
      <div className="grid gap-6 md:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="location">Location</Label>
          <div className="relative">
            <MapPin className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              id="location"
              placeholder="Enter location..."
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Maximum Price (per hour)</Label>
          <Slider
            value={[maxPrice]}
            onValueChange={(value) => setMaxPrice(value[0])}
            max={100}
            step={5}
            className="py-4"
          />
          <div className="text-sm text-gray-500">
            ₹{maxPrice}
          </div>
        </div>

        <div className="space-y-2">
          <Label>Distance</Label>
          <Select value={distance} onValueChange={setDistance}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">Within 1 km</SelectItem>
              <SelectItem value="5">Within 5 km</SelectItem>
              <SelectItem value="10">Within 10 km</SelectItem>
              <SelectItem value="20">Within 20 km</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Results */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {loading ? (
          <div className="col-span-full text-center py-12">
            Loading parking spaces...
          </div>
        ) : filteredParkingSpaces.length === 0 ? (
          <div className="col-span-full text-center py-12">
            No parking spaces found. Try adjusting your filters.
          </div>
        ) : (
          filteredParkingSpaces.map((space) => (
            <div
              key={space.id}
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900">{space.address}</h3>
                  <p className="mt-1 text-sm text-gray-600 flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    {`${space.location.lat}, ${space.location.lng}`}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-teal-600">
                    ₹{space.hourly_rate}/hr
                  </p>
                  <p className="mt-1 text-sm text-gray-600 flex items-center gap-1 justify-end">
                    <Car className="h-4 w-4" />
                    {space.two_wheeler_capacity} two-wheelers, {space.four_wheeler_capacity} four-wheelers
                  </p>
                </div>
              </div>

              <div className="mt-4">
                <Button
                  onClick={() => handleBook(space.id)}
                  className="w-full bg-teal-600 hover:bg-teal-700"
                >
                  Book Now
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
