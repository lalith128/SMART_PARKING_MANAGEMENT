import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { Plus, Building2, Car, Bike, Truck, IndianRupee, ImagePlus, X, ImageIcon } from 'lucide-react';
import type { Database } from '@/types/supabase';

type ParkingSpace = Database['public']['Tables']['parking_spaces']['Row'];

export default function OwnerDashboard() {
  const { user, userRole } = useAuth();
  const [parkingSpaces, setParkingSpaces] = useState<ParkingSpace[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddingSpace, setIsAddingSpace] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
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

  // Add profile editing states
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileData, setProfileData] = useState({
    fullName: '',
    email: '',
    phoneNumber: ''
  });

  useEffect(() => {
    if (user) {
      loadProfile();
      loadParkingSpaces();
    }
  }, [user]);

  const loadProfile = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) throw error;

      if (data) {
        setProfileData({
          fullName: data.full_name || '',
          email: user.email || '',
          phoneNumber: data.phone_number || ''
        });
      }
    } catch (error) {
      console.error('Error loading profile:', error);
      toast.error('Failed to load profile');
    }
  };

  const handleProfileUpdate = async () => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: profileData.fullName,
          phone_number: profileData.phoneNumber
        })
        .eq('id', user.id);

      if (error) throw error;

      toast.success('Profile updated successfully');
      setIsEditingProfile(false);
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
    }
  };

  useEffect(() => {
    if (user) {
      loadParkingSpaces();
    }
  }, [user]);

  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length > 5) {
      toast.error("You can only upload up to 5 images");
      return;
    }

    setSelectedImages(files);
    const urls = files.map(file => URL.createObjectURL(file));
    setPreviewUrls(urls);
  };

  const removeImage = (index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
    setPreviewUrls(prev => prev.filter((_, i) => i !== index));
  };

  const generateUniqueId = () => {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
  };

  const uploadImages = async (parkingSpaceId: string) => {
    const uploadedUrls: string[] = [];

    for (const file of selectedImages) {
      const fileExt = file.name.split('.').pop();
      const fileName = `${parkingSpaceId}/${generateUniqueId()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('parking-images')
        .upload(fileName, file);

      if (uploadError) {
        console.error('Error uploading image:', uploadError);
        continue;
      }

      const { data } = supabase.storage
        .from('parking-images')
        .getPublicUrl(fileName);

      uploadedUrls.push(data.publicUrl);
    }

    return uploadedUrls;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error("You must be logged in to add a parking space");
      return;
    }

    if (!formData.address || !formData.district || !formData.state || !formData.country) {
      toast.error("Please fill in all location fields");
      return;
    }

    if (!formData.hourly_rate || parseFloat(formData.hourly_rate) <= 0) {
      toast.error("Please enter a valid hourly rate");
      return;
    }

    setLoading(true);
    setUploadingImages(true);
    try {
      const parkingSpaceData = {
        owner_id: user.id,
        address: formData.address,
        district: formData.district,
        state: formData.state,
        country: formData.country,
        hourly_rate: parseFloat(formData.hourly_rate),
        two_wheeler_capacity: parseInt(formData.two_wheeler_capacity) || 0,
        four_wheeler_capacity: parseInt(formData.four_wheeler_capacity) || 0,
        heavy_vehicle_capacity: parseInt(formData.heavy_vehicle_capacity) || 0,
        location: { lat: 0, lng: 0 },
      };

      const { data: newSpace, error } = await supabase
        .from('parking_spaces')
        .insert([parkingSpaceData])
        .select()
        .single();

      if (error) {
        throw error;
      }
      
      if (!newSpace) {
        throw new Error('Failed to create parking space');
      }

      if (selectedImages.length > 0) {
        const imageUrls = await uploadImages(newSpace.id);
        
        const { error: updateError } = await supabase
          .from('parking_spaces')
          .update({ images: imageUrls })
          .eq('id', newSpace.id);

        if (updateError) {
          throw updateError;
        }
      }

      toast.success('Parking space added successfully');
      
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
      setSelectedImages([]);
      setPreviewUrls([]);
      setIsAddingSpace(false);
      
      await loadParkingSpaces();
    } catch (error) {
      console.error('Error saving parking space:', error);
      toast.error('Failed to save parking space');
    } finally {
      setLoading(false);
      setUploadingImages(false);
    }
  };

  const loadParkingSpaces = useCallback(async () => {
    if (!user) {
      console.log('No user found, skipping loadParkingSpaces');
      return;
    }

    try {
      console.log('Fetching parking spaces for user:', user.id);
      const { data, error } = await supabase
        .from('parking_spaces')
        .select('*')
        .eq('owner_id', user.id);

      if (error) {
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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Profile Section */}
        <Card className="border-none shadow-lg bg-white/80 backdrop-blur-sm">
          <CardHeader className="space-y-1 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
            <CardTitle className="text-2xl font-display">Owner Profile</CardTitle>
            <CardDescription>Manage your personal information</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            {isEditingProfile ? (
              <form onSubmit={(e) => { e.preventDefault(); handleProfileUpdate(); }} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Full Name</label>
                    <Input
                      value={profileData.fullName}
                      onChange={(e) => setProfileData({ ...profileData, fullName: e.target.value })}
                      className="bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Phone Number</label>
                    <Input
                      value={profileData.phoneNumber}
                      onChange={(e) => setProfileData({ ...profileData, phoneNumber: e.target.value })}
                      className="bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Email</label>
                    <Input value={profileData.email} disabled className="bg-gray-50" />
                  </div>
                </div>
                <div className="flex justify-end gap-4 mt-6">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsEditingProfile(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit">Save Changes</Button>
                </div>
              </form>
            ) : (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Full Name</p>
                    <p className="mt-1">{profileData.fullName || 'Not set'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Phone Number</p>
                    <p className="mt-1">{profileData.phoneNumber || 'Not set'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Email</p>
                    <p className="mt-1">{profileData.email}</p>
                  </div>
                </div>
                <Button
                  onClick={() => setIsEditingProfile(true)}
                  variant="outline"
                  className="mt-4"
                >
                  Edit Profile
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Dashboard Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-display font-bold text-gray-900 mb-2">
            Parking Space Management
          </h1>
          <p className="text-lg text-gray-600 font-light">
            Manage your parking spaces and track their performance
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="border-none shadow-lg bg-white/80 backdrop-blur-sm hover:shadow-xl transition-shadow">
            <CardHeader className="space-y-1">
              <CardTitle className="text-2xl font-display">Total Spaces</CardTitle>
              <CardDescription>Number of parking spaces you manage</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center">
                  <Building2 className="h-6 w-6 text-white" />
                </div>
                <div className="text-3xl font-bold text-gray-900">{parkingSpaces.length}</div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg bg-white/80 backdrop-blur-sm hover:shadow-xl transition-shadow">
            <CardHeader className="space-y-1">
              <CardTitle className="text-2xl font-display">Total Capacity</CardTitle>
              <CardDescription>Combined vehicle capacity</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center">
                      <Bike className="h-4 w-4 text-white" />
                    </div>
                    <span>Two Wheelers</span>
                  </div>
                  <span className="font-semibold">
                    {parkingSpaces.reduce((sum, space) => sum + (space.two_wheeler_capacity || 0), 0)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center">
                      <Car className="h-4 w-4 text-white" />
                    </div>
                    <span>Four Wheelers</span>
                  </div>
                  <span className="font-semibold">
                    {parkingSpaces.reduce((sum, space) => sum + (space.four_wheeler_capacity || 0), 0)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-full bg-gradient-to-br from-pink-400 to-pink-600 flex items-center justify-center">
                      <Truck className="h-4 w-4 text-white" />
                    </div>
                    <span>Heavy Vehicles</span>
                  </div>
                  <span className="font-semibold">
                    {parkingSpaces.reduce((sum, space) => sum + (space.heavy_vehicle_capacity || 0), 0)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg bg-white/80 backdrop-blur-sm hover:shadow-xl transition-shadow">
            <CardHeader className="space-y-1">
              <CardTitle className="text-2xl font-display">Average Rate</CardTitle>
              <CardDescription>Average hourly parking rate</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center">
                  <IndianRupee className="h-6 w-6 text-white" />
                </div>
                <div className="text-3xl font-bold text-gray-900">
                  ₹{parkingSpaces.length > 0
                    ? (parkingSpaces.reduce((sum, space) => sum + (space.hourly_rate || 0), 0) / parkingSpaces.length).toFixed(2)
                    : '0.00'
                  }
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Parking Spaces Section */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-display font-semibold text-gray-900">Your Parking Spaces</h2>
            <Button
              onClick={() => setIsAddingSpace(true)}
              className="bg-gradient-to-r from-teal-600 to-teal-700 hover:from-teal-700 hover:to-teal-800 text-white shadow-lg hover:shadow-xl transition-all flex items-center gap-2"
            >
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
                        min="0"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">Four Wheeler Capacity</label>
                      <Input
                        type="number"
                        value={formData.four_wheeler_capacity}
                        onChange={(e) => setFormData({ ...formData, four_wheeler_capacity: e.target.value })}
                        min="0"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">Heavy Vehicle Capacity</label>
                      <Input
                        type="number"
                        value={formData.heavy_vehicle_capacity}
                        onChange={(e) => setFormData({ ...formData, heavy_vehicle_capacity: e.target.value })}
                        min="0"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <label className="block text-sm font-medium mb-2">
                      Parking Space Images (Max 5)
                    </label>
                    <div className="flex items-center gap-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => fileInputRef.current?.click()}
                        className="flex items-center gap-2"
                      >
                        <ImagePlus className="h-4 w-4" />
                        Select Images
                      </Button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={handleImageSelect}
                      />
                    </div>

                    {previewUrls.length > 0 && (
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4">
                        {previewUrls.map((url, index) => (
                          <div key={url} className="relative group">
                            <img
                              src={url}
                              alt={`Preview ${index + 1}`}
                              className="w-full h-40 object-cover rounded-lg"
                            />
                            <button
                              type="button"
                              onClick={() => removeImage(index)}
                              className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex justify-end gap-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setIsAddingSpace(false);
                        setSelectedImages([]);
                        setPreviewUrls([]);
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={loading || uploadingImages}
                    >
                      {loading || uploadingImages ? 'Saving...' : 'Add Parking Space'}
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
                  <div className="relative h-48">
                    {space.images && space.images.length > 0 ? (
                      <img
                        src={space.images[0]}
                        alt={`Parking at ${space.address}`}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                        <ImagePlus className="h-12 w-12 text-gray-400" />
                      </div>
                    )}
                  </div>
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
    </div>
  );
}
