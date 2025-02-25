import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { Search, MapPin, Bike, Car, Truck, IndianRupee, ArrowRight } from "lucide-react";
import type { Database } from "@/types/supabase";

type ParkingSpace = Database["public"]["Tables"]["parking_spaces"]["Row"];

export default function SearchParking() {
  const [searchQuery, setSearchQuery] = useState("");
  const [maxPrice, setMaxPrice] = useState<number>(1000);
  const [parkingSpaces, setParkingSpaces] = useState<ParkingSpace[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSearch = async () => {
    if (!searchQuery.trim() && !maxPrice) {
      toast({
        title: "Error",
        description: "Please enter a search term or set a price filter",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      let query = supabase
        .from('parking_spaces')
        .select('*');

      // Add price filter
      if (maxPrice > 0) {
        query = query.lte('hourly_rate', maxPrice);
      }

      // Add location search if there's a search query
      if (searchQuery.trim()) {
        query = query.or(`address.ilike.%${searchQuery}%,district.ilike.%${searchQuery}%,state.ilike.%${searchQuery}%,country.ilike.%${searchQuery}%`);
      }

      const { data, error } = await query;

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
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Find Your Perfect Parking Space
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Search through our network of verified parking spaces across the country
          </p>
        </div>
        
        <div className="max-w-3xl mx-auto mb-12">
          <div className="bg-white p-4 rounded-2xl shadow-lg flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <Input
                  placeholder="Search by location (city, state, country)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-3 w-full rounded-lg border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
            </div>
            
            <div className="w-full md:w-48">
              <Input
                type="number"
                placeholder="Max price/hr"
                value={maxPrice}
                onChange={(e) => setMaxPrice(Number(e.target.value))}
                min="0"
                className="w-full rounded-lg border-gray-200 focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
            
            <Button
              onClick={handleSearch}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 rounded-lg"
            >
              {loading ? "Searching..." : "Search"}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {parkingSpaces.map((space) => (
            <Card 
              key={space.id}
              className="overflow-hidden hover:shadow-xl transition-shadow duration-300"
            >
              <div className="relative h-48 bg-gray-100">
                {space.images && space.images[0] ? (
                  <img
                    src={space.images[0]}
                    alt={space.address}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gray-100">
                    <MapPin className="h-12 w-12 text-gray-300" />
                  </div>
                )}
                <div className="absolute top-4 right-4 bg-blue-600 text-white px-3 py-1 rounded-full text-sm font-semibold">
                  ₹{space.hourly_rate}/hr
                </div>
              </div>

              <CardContent className="p-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-2 line-clamp-1">
                  {space.address}
                </h3>
                <div className="flex items-center gap-2 text-gray-500 mb-4">
                  <MapPin className="h-4 w-4" />
                  <span className="line-clamp-1">
                    {space.district}, {space.state}, {space.country}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="text-center p-2 bg-gray-50 rounded-lg">
                    <Bike className="h-5 w-5 text-blue-500 mx-auto mb-1" />
                    <span className="block text-xs text-gray-500">Two Wheeler</span>
                    <span className="block font-semibold">{space.two_wheeler_capacity}</span>
                  </div>
                  <div className="text-center p-2 bg-gray-50 rounded-lg">
                    <Car className="h-5 w-5 text-indigo-500 mx-auto mb-1" />
                    <span className="block text-xs text-gray-500">Four Wheeler</span>
                    <span className="block font-semibold">{space.four_wheeler_capacity}</span>
                  </div>
                  <div className="text-center p-2 bg-gray-50 rounded-lg">
                    <Truck className="h-5 w-5 text-purple-500 mx-auto mb-1" />
                    <span className="block text-xs text-gray-500">Heavy Vehicle</span>
                    <span className="block font-semibold">{space.heavy_vehicle_capacity}</span>
                  </div>
                </div>

                <Button 
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white"
                  onClick={() => {/* Handle booking */}}
                >
                  Book Now
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {parkingSpaces.length === 0 && !loading && searchQuery && (
          <div className="text-center py-12">
            <div className="bg-gray-50 rounded-lg p-8 max-w-md mx-auto">
              <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No parking spaces found</h3>
              <p className="text-gray-600">
                Try adjusting your search criteria or exploring a different location
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
