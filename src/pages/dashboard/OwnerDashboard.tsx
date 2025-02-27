import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { toast } from 'sonner';
import { Plus, Building2, Car, Bike, Truck, IndianRupee, ImagePlus, X, ImageIcon, Edit, MapPin, Phone, Mail, User, ArrowRight, LogOut } from 'lucide-react';
import type { Database } from '@/types/supabase';

type ParkingSpace = Database['public']['Tables']['parking_spaces']['Row'];

export default function OwnerDashboard() {
  const { user, userRole, signOut } = useAuth();
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

  // Add parking space editing states
  const [isEditingSpace, setIsEditingSpace] = useState(false);
  const [currentEditSpace, setCurrentEditSpace] = useState<ParkingSpace | null>(null);

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

  const handleEditSpace = (space: ParkingSpace) => {
    setCurrentEditSpace(space);
    setFormData({
      address: space.address,
      district: space.district,
      state: space.state,
      country: space.country,
      hourly_rate: space.hourly_rate.toString(),
      two_wheeler_capacity: space.two_wheeler_capacity.toString(),
      four_wheeler_capacity: space.four_wheeler_capacity.toString(),
      heavy_vehicle_capacity: space.heavy_vehicle_capacity.toString(),
    });
    
    // Set existing images if available
    if (space.images && space.images.length > 0) {
      setPreviewUrls(space.images);
    } else {
      setPreviewUrls([]);
    }
    
    setIsEditingSpace(true);
    setIsAddingSpace(true);
  };

  const handleUpdateSpace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !currentEditSpace) {
      toast.error("You must be logged in to update a parking space");
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
    setUploadingImages(selectedImages.length > 0);
    try {
      const parkingSpaceData = {
        address: formData.address,
        district: formData.district,
        state: formData.state,
        country: formData.country,
        hourly_rate: parseFloat(formData.hourly_rate),
        two_wheeler_capacity: parseInt(formData.two_wheeler_capacity) || 0,
        four_wheeler_capacity: parseInt(formData.four_wheeler_capacity) || 0,
        heavy_vehicle_capacity: parseInt(formData.heavy_vehicle_capacity) || 0,
      };

      console.log('Updating parking space data:', parkingSpaceData);

      const { error } = await supabase
        .from('parking_spaces')
        .update(parkingSpaceData)
        .eq('id', currentEditSpace.id);

      if (error) {
        console.error('Supabase update error:', error);
        throw error;
      }

      // Handle image updates
      if (selectedImages.length > 0) {
        console.log('Uploading new images for existing space...');
        const imageUrls = await uploadImages(currentEditSpace.id);
        console.log('New image URLs:', imageUrls);
        
        // Get current images from the database to ensure we have the latest
        const { data: spaceData, error: fetchError } = await supabase
          .from('parking_spaces')
          .select('images')
          .eq('id', currentEditSpace.id)
          .single();
          
        if (fetchError) {
          console.error('Error fetching current images:', fetchError);
          throw fetchError;
        }
        
        // Combine existing images with new ones
        const existingImages = spaceData?.images || [];
        const updatedImages = [...existingImages, ...imageUrls];
        
        console.log('Combined image URLs:', updatedImages);
        
        const { error: updateError } = await supabase
          .from('parking_spaces')
          .update({ images: updatedImages })
          .eq('id', currentEditSpace.id);

        if (updateError) {
          console.error('Error updating images:', updateError);
          throw updateError;
        }
      }

      toast.success('Parking space updated successfully');
      
      // Reset form
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
      setIsEditingSpace(false);
      setCurrentEditSpace(null);
      
      // Reload parking spaces
      await loadParkingSpaces();
    } catch (error) {
      console.error('Error updating parking space:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update parking space');
    } finally {
      setLoading(false);
      setUploadingImages(false);
    }
  };

  const handleDeleteSpace = async (spaceId: string) => {
    if (!confirm('Are you sure you want to delete this parking space? This action cannot be undone.')) {
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('parking_spaces')
        .delete()
        .eq('id', spaceId);

      if (error) {
        throw error;
      }

      toast.success('Parking space deleted successfully');
      await loadParkingSpaces();
    } catch (error) {
      console.error('Error deleting parking space:', error);
      toast.error('Failed to delete parking space');
    } finally {
      setLoading(false);
    }
  };

  const removeExistingImage = async (spaceId: string, imageUrl: string, index: number) => {
    try {
      // Get current images
      const { data, error } = await supabase
        .from('parking_spaces')
        .select('images')
        .eq('id', spaceId)
        .single();
      
      if (error) throw error;
      
      if (!data || !data.images) return;
      
      // Filter out the removed image
      const updatedImages = data.images.filter((url: string) => url !== imageUrl);
      
      // Update the space with new image array
      const { error: updateError } = await supabase
        .from('parking_spaces')
        .update({ images: updatedImages })
        .eq('id', spaceId);
      
      if (updateError) throw updateError;
      
      // Update UI
      setPreviewUrls(prev => prev.filter((_, i) => i !== index));
      
      toast.success('Image removed successfully');
    } catch (error) {
      console.error('Error removing image:', error);
      toast.error('Failed to remove image');
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
    <div className="min-h-screen bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Dashboard Header */}
        <div className="mb-12">
          <div className="flex justify-between items-center mb-6">
            <div className="text-center flex-1">
              <h1 className="text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600 mb-4">
                Owner Dashboard
              </h1>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                Manage your parking spaces and monitor their performance in real-time
              </p>
            </div>
            <Button
              onClick={signOut}
              variant="outline"
              className="flex items-center gap-2 border-red-200 text-red-600 hover:bg-red-50"
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </Button>
          </div>
        </div>

        {/* Profile Section */}
        <div className="mb-12">
          <Card className="overflow-hidden border-0 shadow-xl bg-white rounded-xl">
            <div className="relative h-32 bg-gradient-to-r from-blue-600 to-indigo-600">
              <div className="absolute -bottom-16 left-8">
                <div className="h-32 w-32 rounded-full border-4 border-white bg-white shadow-lg flex items-center justify-center overflow-hidden">
                  <User className="h-16 w-16 text-gray-300" />
                </div>
              </div>
            </div>
            
            <CardContent className="pt-20 pb-8 px-8">
              {isEditingProfile ? (
                <form onSubmit={(e) => { e.preventDefault(); handleProfileUpdate(); }} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
                      <Input
                        value={profileData.fullName}
                        onChange={(e) => setProfileData({ ...profileData, fullName: e.target.value })}
                        className="bg-gray-50 border-gray-200 focus:border-indigo-500 focus:ring-indigo-500"
                        placeholder="Enter your full name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
                      <Input
                        value={profileData.phoneNumber}
                        onChange={(e) => setProfileData({ ...profileData, phoneNumber: e.target.value })}
                        className="bg-gray-50 border-gray-200 focus:border-indigo-500 focus:ring-indigo-500"
                        placeholder="Enter your phone number"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                      <Input 
                        value={profileData.email} 
                        disabled 
                        className="bg-gray-100 border-gray-200 text-gray-500" 
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-4 mt-6">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsEditingProfile(false)}
                      className="border-gray-300 text-gray-700 hover:bg-gray-50"
                    >
                      Cancel
                    </Button>
                    <Button 
                      type="submit"
                      className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white"
                    >
                      Save Changes
                    </Button>
                  </div>
                </form>
              ) : (
                <div>
                  <div className="mb-6">
                    <h2 className="text-2xl font-bold text-gray-900">{profileData.fullName || 'Owner'}</h2>
                    <p className="text-gray-500">Parking Space Owner</p>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                        <Mail className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Email</p>
                        <p className="font-medium">{profileData.email}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center">
                        <Phone className="h-5 w-5 text-indigo-600" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Phone</p>
                        <p className="font-medium">{profileData.phoneNumber || 'Not set'}</p>
                      </div>
                    </div>
                  </div>
                  
                  <Button
                    onClick={() => setIsEditingProfile(true)}
                    variant="outline"
                    className="border-indigo-200 text-indigo-600 hover:bg-indigo-50"
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Profile
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <Card className="border-0 shadow-lg bg-white rounded-xl overflow-hidden transform transition hover:scale-105">
            <div className="h-2 bg-gradient-to-r from-purple-400 to-purple-600"></div>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-700">Total Spaces</h3>
                <div className="h-12 w-12 rounded-lg bg-purple-100 flex items-center justify-center">
                  <Building2 className="h-6 w-6 text-purple-600" />
                </div>
              </div>
              <div className="flex items-baseline">
                <span className="text-3xl font-bold text-gray-900">{parkingSpaces.length}</span>
                <span className="ml-2 text-sm text-gray-500">spaces</span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-white rounded-xl overflow-hidden transform transition hover:scale-105">
            <div className="h-2 bg-gradient-to-r from-blue-400 to-blue-600"></div>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-700">Vehicle Capacity</h3>
                <div className="h-12 w-12 rounded-lg bg-blue-100 flex items-center justify-center">
                  <Car className="h-6 w-6 text-blue-600" />
                </div>
          </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Bike className="h-4 w-4 text-gray-500" />
                    <span className="text-sm text-gray-600">Two Wheelers</span>
                  </div>
                  <span className="font-semibold">
                    {parkingSpaces.reduce((sum, space) => sum + (space.two_wheeler_capacity || 0), 0)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Car className="h-4 w-4 text-gray-500" />
                    <span className="text-sm text-gray-600">Four Wheelers</span>
                  </div>
                  <span className="font-semibold">
                    {parkingSpaces.reduce((sum, space) => sum + (space.four_wheeler_capacity || 0), 0)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Truck className="h-4 w-4 text-gray-500" />
                    <span className="text-sm text-gray-600">Heavy Vehicles</span>
                  </div>
                  <span className="font-semibold">
                    {parkingSpaces.reduce((sum, space) => sum + (space.heavy_vehicle_capacity || 0), 0)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-white rounded-xl overflow-hidden transform transition hover:scale-105">
            <div className="h-2 bg-gradient-to-r from-green-400 to-green-600"></div>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-700">Average Rate</h3>
                <div className="h-12 w-12 rounded-lg bg-green-100 flex items-center justify-center">
                  <IndianRupee className="h-6 w-6 text-green-600" />
                </div>
              </div>
              <div className="flex items-baseline">
                <span className="text-3xl font-bold text-gray-900">
                  ₹{parkingSpaces.length > 0
                    ? (parkingSpaces.reduce((sum, space) => sum + (space.hourly_rate || 0), 0) / parkingSpaces.length).toFixed(2)
                    : '0.00'
                  }
                </span>
                <span className="ml-2 text-sm text-gray-500">per hour</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Parking Spaces Section */}
        <div className="space-y-8">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Your Parking Spaces</h2>
              <p className="text-gray-600">Manage all your parking locations</p>
            </div>
            <Button
              onClick={() => setIsAddingSpace(true)}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transition-all flex items-center gap-2 px-6 rounded-full"
            >
              <Plus className="h-4 w-4" />
              Add New Space
            </Button>
          </div>

          {isAddingSpace && (
            <Card className="border-0 shadow-xl bg-white rounded-xl overflow-hidden mb-8">
              <div className="h-2 bg-gradient-to-r from-blue-600 to-indigo-600"></div>
              <CardHeader className="border-b">
                <CardTitle className="text-2xl">{isEditingSpace ? 'Edit Parking Space' : 'Add New Parking Space'}</CardTitle>
                <CardDescription>{isEditingSpace ? 'Update the details of your parking space' : 'Enter the details of your parking space'}</CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <form onSubmit={isEditingSpace ? handleUpdateSpace : handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Street Address</label>
              <Input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        className="bg-gray-50 border-gray-200 focus:border-indigo-500 focus:ring-indigo-500"
                        placeholder="Street address"
                required
              />
            </div>

            <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">District</label>
              <Input
                type="text"
                value={formData.district}
                onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                        className="bg-gray-50 border-gray-200 focus:border-indigo-500 focus:ring-indigo-500"
                        placeholder="District"
                required
              />
            </div>

            <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">State</label>
              <Input
                type="text"
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                        className="bg-gray-50 border-gray-200 focus:border-indigo-500 focus:ring-indigo-500"
                        placeholder="State"
                required
              />
            </div>

            <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Country</label>
              <Input
                type="text"
                value={formData.country}
                onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                        className="bg-gray-50 border-gray-200 focus:border-indigo-500 focus:ring-indigo-500"
                        placeholder="Country"
                required
              />
            </div>

            <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Hourly Rate (₹)</label>
              <Input
                type="number"
                value={formData.hourly_rate}
                onChange={(e) => setFormData({ ...formData, hourly_rate: e.target.value })}
                min="0"
                step="0.01"
                        className="bg-gray-50 border-gray-200 focus:border-indigo-500 focus:ring-indigo-500"
                        placeholder="0.00"
                required
              />
            </div>

            <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Two Wheeler Capacity</label>
              <Input
                type="number"
                value={formData.two_wheeler_capacity}
                onChange={(e) => setFormData({ ...formData, two_wheeler_capacity: e.target.value })}
                        min="0"
                        className="bg-gray-50 border-gray-200 focus:border-indigo-500 focus:ring-indigo-500"
                        placeholder="0"
                required
              />
            </div>

            <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Four Wheeler Capacity</label>
              <Input
                type="number"
                value={formData.four_wheeler_capacity}
                onChange={(e) => setFormData({ ...formData, four_wheeler_capacity: e.target.value })}
                        min="0"
                        className="bg-gray-50 border-gray-200 focus:border-indigo-500 focus:ring-indigo-500"
                        placeholder="0"
                required
              />
            </div>

            <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Heavy Vehicle Capacity</label>
              <Input
                type="number"
                value={formData.heavy_vehicle_capacity}
                onChange={(e) => setFormData({ ...formData, heavy_vehicle_capacity: e.target.value })}
                        min="0"
                        className="bg-gray-50 border-gray-200 focus:border-indigo-500 focus:ring-indigo-500"
                        placeholder="0"
                required
              />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Parking Space Images (Max 5)
                    </label>
                    <div>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => fileInputRef.current?.click()}
                        className="flex items-center gap-2 border-dashed border-2 border-gray-300 bg-gray-50 hover:bg-gray-100 text-gray-700"
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
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-4">
                        {previewUrls.map((url, index) => (
                          <div key={url} className="relative group rounded-lg overflow-hidden shadow-md">
                            <img
                              src={url}
                              alt={`Preview ${index + 1}`}
                              className="w-full h-24 object-cover"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                if (isEditingSpace && currentEditSpace) {
                                  removeExistingImage(currentEditSpace.id, url, index);
                                } else {
                                  removeImage(index);
                                }
                              }}
                              className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <X className="h-6 w-6 text-white" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
            </div>

                  <div className="flex justify-end gap-4 pt-4 border-t">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setIsAddingSpace(false);
                        setIsEditingSpace(false);
                        setCurrentEditSpace(null);
                        setSelectedImages([]);
                        setPreviewUrls([]);
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
                      }}
                      className="border-gray-300 text-gray-700"
                    >
                      Cancel
                    </Button>
            <Button
              type="submit"
                      disabled={loading || uploadingImages}
                      className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white"
            >
                      {loading || uploadingImages ? 'Saving...' : isEditingSpace ? 'Update Parking Space' : 'Add Parking Space'}
            </Button>
                  </div>
          </form>
              </CardContent>
            </Card>
          )}

          {parkingSpaces.length === 0 ? (
            <Card className="border-0 shadow-lg bg-white rounded-xl overflow-hidden p-8 text-center">
              <div className="max-w-md mx-auto">
                <div className="h-20 w-20 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-6">
                  <Building2 className="h-10 w-10 text-blue-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">No parking spaces yet</h3>
                <p className="text-gray-600 mb-6">Start managing your parking business by adding your first parking space.</p>
                <Button 
                  onClick={() => setIsAddingSpace(true)}
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-6 py-2 rounded-full shadow-lg"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Your First Space
                </Button>
              </div>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {parkingSpaces.map((space) => (
                <Card key={space.id} className="border-0 shadow-lg bg-white rounded-xl overflow-hidden transform transition-all hover:shadow-xl hover:translate-y-1">
                  <div className="relative h-48">
                    {space.images && space.images.length > 0 ? (
                      <img
                        src={space.images[0]}
                        alt={`Parking at ${space.address}`}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                        <ImageIcon className="h-12 w-12 text-gray-300" />
                      </div>
                    )}
                    <div className="absolute top-4 right-4 bg-blue-600 text-white text-sm font-semibold px-3 py-1 rounded-full">
                      ₹{space.hourly_rate}/hr
                    </div>
                  </div>
                  
                  <CardContent className="p-6">
                    <h3 className="text-xl font-semibold text-gray-900 mb-2 line-clamp-1">{space.address}</h3>
                    <div className="flex items-center gap-2 text-gray-500 mb-4">
                      <MapPin className="h-4 w-4" />
                      <span className="line-clamp-1">{space.district}, {space.state}, {space.country}</span>
        </div>

                    <div className="grid grid-cols-3 gap-2 mb-4">
                      <div className="bg-gray-50 p-2 rounded-lg text-center">
                        <div className="flex items-center justify-center mb-1">
                          <Bike className="h-4 w-4 text-blue-500" />
                        </div>
                        <span className="text-xs text-gray-500">Two Wheeler</span>
                        <p className="font-semibold">{space.two_wheeler_capacity}</p>
                      </div>
                      <div className="bg-gray-50 p-2 rounded-lg text-center">
                        <div className="flex items-center justify-center mb-1">
                          <Car className="h-4 w-4 text-indigo-500" />
                        </div>
                        <span className="text-xs text-gray-500">Four Wheeler</span>
                        <p className="font-semibold">{space.four_wheeler_capacity}</p>
                      </div>
                      <div className="bg-gray-50 p-2 rounded-lg text-center">
                        <div className="flex items-center justify-center mb-1">
                          <Truck className="h-4 w-4 text-purple-500" />
                        </div>
                        <span className="text-xs text-gray-500">Heavy Vehicle</span>
                        <p className="font-semibold">{space.heavy_vehicle_capacity}</p>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="px-6 py-4 bg-gray-50 border-t flex justify-between">
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="text-blue-600 border-blue-200 hover:bg-blue-50"
                      onClick={() => handleEditSpace(space)}
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="text-red-600 border-red-200 hover:bg-red-50"
                      onClick={() => handleDeleteSpace(space.id)}
                    >
                      <X className="h-4 w-4 mr-2" />
                      Delete
                    </Button>
                  </CardFooter>
              </Card>
            ))}
          </div>
          )}
        </div>
      </div>
    </div>
  );
}