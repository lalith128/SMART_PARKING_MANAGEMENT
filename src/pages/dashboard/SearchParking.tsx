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

type ParkingLot = Database["public"]["Tables"]["parking_lots"]["Row"];

export default function SearchParking() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [location, setLocation] = useState("");
  const [maxPrice, setMaxPrice] = useState(50);
  const [distance, setDistance] = useState("5");
  const [parkingLots, setParkingLots] = useState<ParkingLot[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchParkingLots();
  }, []);

  const fetchParkingLots = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("parking_lots")
        .select("*")
        .gt("available_slots", 0)
        .order("price_per_hour");

      if (error) throw error;
      setParkingLots(data || []);
    } catch (error) {
      console.error("Error fetching parking lots:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load parking lots. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleBook = async (parkingLotId: number) => {
    try {
      const { data, error } = await supabase
        .from("bookings")
        .insert([
          {
            parking_lot_id: parkingLotId,
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

  const filteredParkingLots = parkingLots.filter((lot) => {
    const matchesLocation = location
      ? lot.location.toLowerCase().includes(location.toLowerCase())
      : true;
    const matchesPrice = lot.price_per_hour <= maxPrice;
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
            ${maxPrice}
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
            Loading parking lots...
          </div>
        ) : filteredParkingLots.length === 0 ? (
          <div className="col-span-full text-center py-12">
            No parking lots found. Try adjusting your filters.
          </div>
        ) : (
          filteredParkingLots.map((lot) => (
            <div
              key={lot.id}
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900">{lot.name}</h3>
                  <p className="mt-1 text-sm text-gray-600 flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    {lot.location}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-teal-600">
                    ${lot.price_per_hour}/hr
                  </p>
                  <p className="mt-1 text-sm text-gray-600 flex items-center gap-1 justify-end">
                    <Car className="h-4 w-4" />
                    {lot.available_slots} slots
                  </p>
                </div>
              </div>

              <div className="mt-4">
                <Button
                  onClick={() => handleBook(lot.id)}
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
