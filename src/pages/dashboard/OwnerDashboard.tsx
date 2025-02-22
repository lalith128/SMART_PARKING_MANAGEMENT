import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import { supabase } from '../../lib/supabase';
import 'leaflet/dist/leaflet.css';
import { Icon } from 'leaflet';

interface ParkingSpace {
  id?: string;
  location: {
    lat: number;
    lng: number;
  };
  address: string;
  hourlyRate: number;
  bikeCapacity: number;
  carCapacity: number;
  owner_id: string;
}

const LocationPicker = ({ onLocationSelect }: { onLocationSelect: (lat: number, lng: number) => void }) => {
  useMapEvents({
    click: (e) => {
      onLocationSelect(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
};

export default function OwnerDashboard() {
  const [parkingSpaces, setParkingSpaces] = useState<ParkingSpace[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<[number, number] | null>(null);
  const [address, setAddress] = useState('');
  const [hourlyRate, setHourlyRate] = useState('');
  const [bikeCapacity, setBikeCapacity] = useState('');
  const [carCapacity, setCarCapacity] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadParkingSpaces();
  }, []);

  const loadParkingSpaces = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('parking_spaces')
        .select('*')
        .eq('owner_id', user.id);

      if (error) throw error;
      setParkingSpaces(data || []);
    } catch (error) {
      console.error('Error loading parking spaces:', error);
    }
  };

  const handleLocationSelect = async (lat: number, lng: number) => {
    setSelectedLocation([lat, lng]);
    
    // Reverse geocoding using Nominatim
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
      );
      const data = await response.json();
      setAddress(data.display_name || '');
    } catch (error) {
      console.error('Error getting address:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLocation) return;

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      const parkingSpace = {
        location: {
          lat: selectedLocation[0],
          lng: selectedLocation[1],
        },
        address,
        hourlyRate: parseFloat(hourlyRate),
        bikeCapacity: parseInt(bikeCapacity),
        carCapacity: parseInt(carCapacity),
        owner_id: user.id,
      };

      const { error } = await supabase
        .from('parking_spaces')
        .insert([parkingSpace]);

      if (error) throw error;

      // Reset form
      setSelectedLocation(null);
      setAddress('');
      setHourlyRate('');
      setBikeCapacity('');
      setCarCapacity('');
      
      await loadParkingSpaces();
    } catch (error) {
      console.error('Error saving parking space:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">Owner Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h2 className="text-xl font-semibold mb-4">Add Parking Space</h2>
          <div className="h-[400px] mb-4 rounded-lg overflow-hidden">
            <MapContainer
              center={[20.5937, 78.9629]} // Center of India
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
              <label className="block text-sm font-medium text-gray-700">Address</label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Hourly Rate (₹)</label>
              <input
                type="number"
                value={hourlyRate}
                onChange={(e) => setHourlyRate(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Bike Capacity</label>
              <input
                type="number"
                value={bikeCapacity}
                onChange={(e) => setBikeCapacity(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Car Capacity</label>
              <input
                type="number"
                value={carCapacity}
                onChange={(e) => setCarCapacity(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading || !selectedLocation}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-blue-300"
            >
              {loading ? 'Saving...' : 'Add Parking Space'}
            </button>
          </form>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-4">Your Parking Spaces</h2>
          <div className="space-y-4">
            {parkingSpaces.map((space) => (
              <div key={space.id} className="border rounded-lg p-4 shadow-sm">
                <h3 className="font-medium">{space.address}</h3>
                <p className="text-sm text-gray-600">Hourly Rate: ₹{space.hourlyRate}</p>
                <p className="text-sm text-gray-600">
                  Capacity: {space.bikeCapacity} bikes, {space.carCapacity} cars
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
