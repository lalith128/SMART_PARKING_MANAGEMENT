
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { ImageIcon, MapPin } from 'lucide-react';
import type { Database } from '@/types/supabase';

type ParkingSpace = Database['public']['Tables']['parking_spaces']['Row'];

export default function ParkingSearch() {
  const [searchQuery, setSearchQuery] = useState('');
  const [parkingSpaces, setParkingSpaces] = useState<ParkingSpace[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      toast({
        title: "Search Error",
        description: "Please enter a location to search",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('parking_spaces')
        .select('*')
        .textSearch('location_search', searchQuery.trim());

      if (error) throw error;

      setParkingSpaces(data || []);

      if (data?.length === 0) {
        toast({
          title: "No Results",
          description: "No parking spaces found in this location",
          variant: "default",
        });
      }
    } catch (error) {
      console.error('Error searching parking spaces:', error);
      toast({
        title: "Error",
        description: "Failed to search parking spaces. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">Find Parking Spaces</h1>

      <div className="flex gap-2 mb-8">
        <div className="relative flex-1">
          <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
          <Input
            type="text"
            placeholder="Search by address, district, state, or country"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleSearch();
              }
            }}
            className="pl-10"
          />
        </div>
        <Button 
          onClick={handleSearch}
          disabled={loading}
        >
          {loading ? 'Searching...' : 'Search'}
        </Button>
      </div>

      <div className="space-y-4">
        {parkingSpaces.map((space) => (
          <Card key={space.id} className="p-4">
            <div className="flex gap-4">
              {space.images && space.images.length > 0 ? (
                <img
                  src={space.images[0]}
                  alt={`Parking at ${space.address}`}
                  className="w-48 h-32 object-cover rounded-lg"
                />
              ) : (
                <div className="w-48 h-32 bg-gray-100 rounded-lg flex items-center justify-center">
                  <ImageIcon className="h-8 w-8 text-gray-400" />
                </div>
              )}
              <div className="flex-1">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold text-lg">{space.address}</h3>
                    <p className="text-gray-600">{space.district}, {space.state}, {space.country}</p>
                    <p className="text-gray-600 mt-2">
                      Available Spaces:
                      <span className="ml-2">🛵 {space.two_wheeler_capacity} two-wheelers</span>
                      <span className="ml-2">🚗 {space.four_wheeler_capacity} four-wheelers</span>
                      <span className="ml-2">🚛 {space.heavy_vehicle_capacity} heavy vehicles</span>
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-semibold text-green-600">
                      ₹{space.hourly_rate}/hr
                    </p>
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="mt-2"
                      onClick={() => {
                        window.open(
                          `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                            `${space.address}, ${space.district}, ${space.state}, ${space.country}`
                          )}`,
                          '_blank'
                        );
                      }}
                    >
                      View on Map
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
