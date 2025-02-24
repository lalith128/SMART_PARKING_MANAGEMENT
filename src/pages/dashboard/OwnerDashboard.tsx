import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { Plus, Building2, Car, Bike, Truck, IndianRupee } from 'lucide-react';
import type { Database } from '@/types/supabase';

type ParkingSpace = Database['public']['Tables']['parking_spaces']['Row'];

export default function OwnerDashboard() {
  const { user, userRole } = useAuth();
  const [parkingSpaces, setParkingSpaces] = useState<ParkingSpace[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddingSpace, setIsAddingSpace] = useState(false);
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

  const loadParkingSpaces = useCallback(async () => {
    try {
      if (!user) {
        console.log('No user found, skipping loadParkingSpaces');
        return;
      }

      console.log('Fetching parking spaces for user:', user.id);
      const { data, error } = await supabase
        .from('parking_spaces')
        .select('*')
        .eq('owner_id', user.id);

      if (error) {
        console.error('Error loading parking spaces:', error);
        throw error;
      }
      
      console.log('Parking spaces loaded:', data);
      setParkingSpaces(data);
    } catch (error) {
      console.error('Error in loadParkingSpaces:', error);
      toast.error('Failed to load parking spaces');
    } finally {
      setLoading(false);
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    try {
      const parkingSpaceData = {
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
      
      // Reset form and close add space form
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
      setIsAddingSpace(false);
    } catch (error) {
      console.error('Error saving parking space:', error);
      toast.error('Failed to save parking space');
    } finally {
      setLoading(false);
    }
  };

  if (!user || userRole !== 'owner') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-600">You must be logged in as an owner to view this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Parking Space Management</h1>
        <p className="mt-2 text-gray-600">
          Manage your parking spaces and track their details
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl">Total Spaces</CardTitle>
            <CardDescription>Number of parking spaces you manage</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-teal-100 flex items-center justify-center">
                <Building2 className="h-6 w-6 text-teal-600" />
              </div>
              <div className="text-2xl font-bold">{parkingSpaces.length}</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl">Total Capacity</CardTitle>
            <CardDescription>Combined vehicle capacity</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bike className="h-5 w-5 text-teal-600" />
                  <span>Two Wheelers</span>
                </div>
                <span className="font-semibold">
                  {parkingSpaces.reduce((sum, space) => sum + (space.two_wheeler_capacity || 0), 0)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Car className="h-5 w-5 text-teal-600" />
                  <span>Four Wheelers</span>
                </div>
                <span className="font-semibold">
                  {parkingSpaces.reduce((sum, space) => sum + (space.four_wheeler_capacity || 0), 0)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Truck className="h-5 w-5 text-teal-600" />
                  <span>Heavy Vehicles</span>
                </div>
                <span className="font-semibold">
                  {parkingSpaces.reduce((sum, space) => sum + (space.heavy_vehicle_capacity || 0), 0)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl">Average Rate</CardTitle>
            <CardDescription>Average hourly parking rate</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-teal-100 flex items-center justify-center">
                <IndianRupee className="h-6 w-6 text-teal-600" />
              </div>
              <div className="text-2xl font-bold">
                ₹{parkingSpaces.length > 0
                  ? (parkingSpaces.reduce((sum, space) => sum + (space.hourly_rate || 0), 0) / parkingSpaces.length).toFixed(2)
                  : '0.00'
                }
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Your Parking Spaces</h2>
          <Button onClick={() => setIsAddingSpace(true)} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Add Space
          </Button>
        </div>

        {isAddingSpace && (
          <Card>
            <CardHeader>
              <CardTitle>Add New Parking Space</CardTitle>
              <CardDescription>Enter the details of your parking space</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                      min="0"
                      step="0.01"
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
                </div>

                <div className="flex justify-end gap-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsAddingSpace(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={loading}
                  >
                    {loading ? 'Saving...' : 'Add Parking Space'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {parkingSpaces.length === 0 ? (
            <Card className="col-span-full p-8">
              <div className="text-center">
                <Building2 className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No parking spaces yet</h3>
                <p className="text-gray-600 mb-4">Add your first parking space to start managing it.</p>
                <Button onClick={() => setIsAddingSpace(true)}>
                  Add Your First Space
                </Button>
              </div>
            </Card>
          ) : (
            parkingSpaces.map((space) => (
              <Card key={space.id} className="overflow-hidden">
                <CardHeader className="border-b bg-gray-50">
                  <CardTitle>{space.address}</CardTitle>
                  <CardDescription>{space.district}, {space.state}, {space.country}</CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Hourly Rate</span>
                      <span className="font-semibold">₹{space.hourly_rate}</span>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <Bike className="h-4 w-4" />
                          <span>Two Wheelers</span>
                        </div>
                        <span>{space.two_wheeler_capacity}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <Car className="h-4 w-4" />
                          <span>Four Wheelers</span>
                        </div>
                        <span>{space.four_wheeler_capacity}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <Truck className="h-4 w-4" />
                          <span>Heavy Vehicles</span>
                        </div>
                        <span>{space.heavy_vehicle_capacity}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
