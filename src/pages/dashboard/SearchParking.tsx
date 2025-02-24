
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import type { Database } from "@/types/supabase";

type ParkingSpace = Database["public"]["Tables"]["parking_spaces"]["Row"];

export default function SearchParking() {
  const [location, setLocation] = useState("");
  const [maxPrice, setMaxPrice] = useState(50);
  const [distance, setDistance] = useState("5");
  const [parkingSpaces, setParkingSpaces] = useState<ParkingSpace[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSearch = async () => {
    if (!location.trim()) {
      toast({
        title: "Error",
        description: "Please enter a location",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('parking_spaces')
        .select('*')
        .textSearch('location_search', location)
        .lte('hourly_rate', maxPrice);

      if (error) throw error;
      setParkingSpaces(data || []);

      if (!data?.length) {
        toast({
          title: "No Results",
          description: "No parking spaces found matching your criteria",
        });
      }
    } catch (error) {
      console.error('Error searching parking spaces:', error);
      toast({
        title: "Error",
        description: "Failed to search parking spaces",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Find Parking</h1>
      
      <div className="flex flex-col md:flex-row gap-4 mb-8">
        <Input
          placeholder="Enter location..."
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          className="flex-1"
        />
        
        <Select value={distance} onValueChange={setDistance}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Distance" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1">Within 1 km</SelectItem>
            <SelectItem value="5">Within 5 km</SelectItem>
            <SelectItem value="10">Within 10 km</SelectItem>
          </SelectContent>
        </Select>

        <Button onClick={handleSearch} disabled={loading}>
          {loading ? "Searching..." : "Search"}
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {parkingSpaces.map((space) => (
          <div
            key={space.id}
            className="bg-white rounded-lg shadow-md p-6"
          >
            <h3 className="font-semibold text-lg mb-2">{space.address}</h3>
            <p className="text-gray-600 mb-4">{space.district}, {space.state}</p>
            
            <div className="space-y-2 text-sm text-gray-600">
              <p>Two Wheelers: {space.two_wheeler_capacity} spaces</p>
              <p>Four Wheelers: {space.four_wheeler_capacity} spaces</p>
              <p>Heavy Vehicles: {space.heavy_vehicle_capacity} spaces</p>
            </div>
            
            <div className="mt-4 flex items-center justify-between">
              <span className="text-xl font-bold text-green-600">
                ₹{space.hourly_rate}/hr
              </span>
              <Button variant="outline" size="sm">
                View Details
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
