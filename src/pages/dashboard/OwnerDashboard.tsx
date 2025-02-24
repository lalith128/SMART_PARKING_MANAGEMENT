
import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import 'leaflet/dist/leaflet.css';
import type { Database } from '@/types/supabase';

type ParkingSpace = Database['public']['Tables']['parking_spaces']['Row'];

const LocationPicker = ({ onLocationSelect }: { onLocationSelect: (lat: number, lng: number) => void }) => {
  useMapEvents({
    click: (e) => {
      onLocationSelect(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
};

export default function OwnerDashboard() {
  const { user } = useAuth();
  const [parkingSpaces, setParkingSpaces] = useState<ParkingSpace[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<[number, number] | null>(null);
  const [formData, setFormData] = useState({
    address: '',
    district: '',
    state: '',
    country: '',
    hourly_rate: '',
    two_wheeler_capacity: '',
    four_wheeler_capacity: '',
    heavy_vehicle_capacity: '',
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      loadParkingSpaces();
    }
  }, [user]);

  const loadParkingSpaces = async () => {
    try {
      if (!user) return;

      const { data, error } = await supabase
        .from('parking_spaces')
        .select('*')
        .eq('owner_id', user.id);

      if (error) throw error;
      setParkingSpaces(data);
    } catch (error) {
      console.error('Error loading parking spaces:', error);
      toast.error('Failed to load parking spaces');
    }
  };

  const handleLocationSelect = async (lat: number, lng: number) => {
    setSelectedLocation([lat, lng]);
    
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
      );
      const data = await response.json();
      
      // Parse the address components
      const address = {
        road: data.address?.road || '',
        district: data.address?.suburb || data.address?.city_district || '',
        state: data.address?.state || '',
        country: data.address?.country || '',
      };

      setFormData(prev => ({
        ...prev,
        address: `${address.road}`,
        district: address.district,
        state: address.state,
        country: address.country,
      }));
    } catch (error) {
      console.error('Error getting address:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLocation || !user) return;

    setLoading(true);
    try {
      const parkingSpaceData = {
        location: {
          lat: selectedLocation[0],
          lng: selectedLocation[1],
        },
        address: formData.address,
        district: formData.district,
        state: formData.state,
        country: formData.country,
        hourly_rate: parseFloat(formData.hourly_rate),
        two_wheeler_capacity: parseInt(formData.two_wheeler_capacity),
        four_wheeler_capacity: parseInt(formData.four_wheeler_capacity),
        heavy_vehicle_capacity: parseInt(formData.heavy_vehicle_capacity),
        owner_id: user.id,
      };

      const { error } = await supabase
        .from('parking_spaces')
        .insert([parkingSpaceData]);

      if (error) throw error;

      toast.success('Parking space added successfully');
      loadParkingSpaces();
      
      // Reset form
      setSelectedLocation(null);
      setFormData({
        address: '',
        district: '',
        state: '',
        country: '',
        hourly_rate: '',
        two_wheeler_capacity: '',
        four_wheeler_capacity: '',
        heavy_vehicle_capacity: '',
      });
    } catch (error) {
      console.error('Error saving parking space:', error);
      toast.error('Failed to save parking space');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">Manage Parking Spaces</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h2 className="text-xl font-semibold mb-4">Add Parking Space</h2>
          <div className="h-[400px] mb-4 rounded-lg overflow-hidden">
            <MapContainer
              center={[20.5937, 78.9629]}
              zoom={5}
              style={{ height: '100%', width: '100%' }}
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              />
              <LocationPicker onLocationSelect={handleLocationSelect} />
              {selectedLocation && (
                <Marker position={selectedLocation} />
              )}
            </MapContainer>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Street Address</label>
              <Input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">District</label>
              <Input
                type="text"
                value={formData.district}
                onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">State</label>
              <Input
                type="text"
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Country</label>
              <Input
                type="text"
                value={formData.country}
                onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Hourly Rate (₹)</label>
              <Input
                type="number"
                value={formData.hourly_rate}
                onChange={(e) => setFormData({ ...formData, hourly_rate: e.target.value })}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Two Wheeler Capacity</label>
              <Input
                type="number"
                value={formData.two_wheeler_capacity}
                onChange={(e) => setFormData({ ...formData, two_wheeler_capacity: e.target.value })}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Four Wheeler Capacity</label>
              <Input
                type="number"
                value={formData.four_wheeler_capacity}
                onChange={(e) => setFormData({ ...formData, four_wheeler_capacity: e.target.value })}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Heavy Vehicle Capacity</label>
              <Input
                type="number"
                value={formData.heavy_vehicle_capacity}
                onChange={(e) => setFormData({ ...formData, heavy_vehicle_capacity: e.target.value })}
                required
              />
            </div>

            <Button
              type="submit"
              disabled={loading || !selectedLocation}
              className="w-full"
            >
              {loading ? 'Saving...' : 'Add Parking Space'}
            </Button>
          </form>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-4">Your Parking Spaces</h2>
          <div className="space-y-4">
            {parkingSpaces.map((space) => (
              <Card key={space.id} className="p-4">
                <h3 className="font-medium">{space.address}</h3>
                <p className="text-sm text-gray-600">{space.district}, {space.state}, {space.country}</p>
                <p className="text-sm text-gray-600">Hourly Rate: ₹{space.hourly_rate}</p>
                <p className="text-sm text-gray-600">
                  Capacity: {space.two_wheeler_capacity} two-wheelers, {space.four_wheeler_capacity} four-wheelers, {space.heavy_vehicle_capacity} heavy vehicles
                </p>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
