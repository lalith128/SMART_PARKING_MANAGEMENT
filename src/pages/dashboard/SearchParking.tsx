import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { 
  Search, MapPin, Bike, Car, Truck, IndianRupee, ArrowRight, 
  Calendar, Clock, CreditCard, Wallet, QrCode, X, CheckCircle2
} from "lucide-react";
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { format } from "date-fns";
import type { Database } from "@/types/supabase";

type ParkingSpace = Database["public"]["Tables"]["parking_spaces"]["Row"];
type VehicleType = "two_wheeler" | "four_wheeler" | "heavy_vehicle";

export default function SearchParking() {
  const [searchQuery, setSearchQuery] = useState("");
  const [maxPrice, setMaxPrice] = useState<number>(1000);
  const [parkingSpaces, setParkingSpaces] = useState<ParkingSpace[]>([]);
  const [loading, setLoading] = useState(false);
  const [vehicleFilters, setVehicleFilters] = useState<{
    two_wheeler: boolean;
    four_wheeler: boolean;
    heavy_vehicle: boolean;
  }>({
    two_wheeler: false,
    four_wheeler: false,
    heavy_vehicle: false
  });
  const [bookingModalOpen, setBookingModalOpen] = useState(false);
  const [selectedSpace, setSelectedSpace] = useState<ParkingSpace | null>(null);
  const [selectedVehicleType, setSelectedVehicleType] = useState<VehicleType>("four_wheeler");
  const [bookingHours, setBookingHours] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState("upi");
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const { toast } = useToast();

  const handleSearch = async () => {
    if (!searchQuery.trim() && !maxPrice && !Object.values(vehicleFilters).some(v => v)) {
      toast({
        title: "Error",
        description: "Please enter a search term, set a price filter, or select a vehicle type",
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

      // Get the data first, then filter by vehicle capacity in JS
      const { data, error } = await query;

      if (error) throw error;

      // Filter by vehicle type if any are selected
      let filteredData = data || [];
      
      if (vehicleFilters.two_wheeler || vehicleFilters.four_wheeler || vehicleFilters.heavy_vehicle) {
        filteredData = filteredData.filter(space => {
          if (vehicleFilters.two_wheeler && space.two_wheeler_capacity > 0) return true;
          if (vehicleFilters.four_wheeler && space.four_wheeler_capacity > 0) return true;
          if (vehicleFilters.heavy_vehicle && space.heavy_vehicle_capacity > 0) return true;
          return false;
        });
      }

      setParkingSpaces(filteredData);

      if (filteredData.length === 0) {
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

  const handleBookNow = (space: ParkingSpace) => {
    setSelectedSpace(space);
    
    // Set default vehicle type based on available capacity
    if (space.four_wheeler_capacity > 0) {
      setSelectedVehicleType("four_wheeler");
    } else if (space.two_wheeler_capacity > 0) {
      setSelectedVehicleType("two_wheeler");
    } else if (space.heavy_vehicle_capacity > 0) {
      setSelectedVehicleType("heavy_vehicle");
    }
    
    setBookingModalOpen(true);
    setBookingSuccess(false);
  };

  const handleConfirmBooking = () => {
    // In a real app, you would save the booking to the database here
    setBookingSuccess(true);
    
    // Show success toast
    toast({
      title: "Booking Successful",
      description: `Your parking space has been booked for ${bookingHours} hour${bookingHours > 1 ? 's' : ''}`,
    });
    
    // Close modal after 3 seconds
    setTimeout(() => {
      setBookingModalOpen(false);
      setBookingSuccess(false);
    }, 3000);
  };

  const calculateTotalPrice = () => {
    if (!selectedSpace) return 0;
    return Number(selectedSpace.hourly_rate) * bookingHours;
  };

  const getVehicleTypeLabel = (type: VehicleType) => {
    switch (type) {
      case "two_wheeler": return "Two Wheeler";
      case "four_wheeler": return "Four Wheeler";
      case "heavy_vehicle": return "Heavy Vehicle";
    }
  };

  const getVehicleCapacity = (space: ParkingSpace, type: VehicleType) => {
    switch (type) {
      case "two_wheeler": return space.two_wheeler_capacity;
      case "four_wheeler": return space.four_wheeler_capacity;
      case "heavy_vehicle": return space.heavy_vehicle_capacity;
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
        
        <div className="max-w-4xl mx-auto mb-12">
          <div className="bg-white p-6 rounded-2xl shadow-lg">
            <div className="flex flex-col md:flex-row gap-6 mb-6">
              <div className="flex-1">
                <Label htmlFor="location" className="text-sm font-medium text-gray-700 mb-2 block">Location</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                  <Input
                    id="location"
                    placeholder="Search by city, state, or address..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 pr-4 py-3 w-full rounded-lg border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
              </div>
              
              <div className="w-full md:w-48">
                <Label htmlFor="price" className="text-sm font-medium text-gray-700 mb-2 block">Max Price</Label>
                <div className="relative">
                  <IndianRupee className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                  <Input
                    id="price"
                    type="number"
                    placeholder="Max price/hr"
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(Number(e.target.value))}
                    min="0"
                    className="pl-10 w-full rounded-lg border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
            
            <div className="mb-6">
              <Label className="text-sm font-medium text-gray-700 mb-2 block">Vehicle Type</Label>
              <div className="flex flex-wrap gap-4">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="two_wheeler" 
                    checked={vehicleFilters.two_wheeler}
                    onCheckedChange={(checked) => 
                      setVehicleFilters({...vehicleFilters, two_wheeler: checked === true})
                    }
                  />
                  <Label 
                    htmlFor="two_wheeler" 
                    className="flex items-center cursor-pointer"
                  >
                    <Bike className="h-4 w-4 text-blue-500 mr-2" />
                    <span>Two Wheeler</span>
                  </Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="four_wheeler" 
                    checked={vehicleFilters.four_wheeler}
                    onCheckedChange={(checked) => 
                      setVehicleFilters({...vehicleFilters, four_wheeler: checked === true})
                    }
                  />
                  <Label 
                    htmlFor="four_wheeler" 
                    className="flex items-center cursor-pointer"
                  >
                    <Car className="h-4 w-4 text-indigo-500 mr-2" />
                    <span>Four Wheeler</span>
                  </Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="heavy_vehicle" 
                    checked={vehicleFilters.heavy_vehicle}
                    onCheckedChange={(checked) => 
                      setVehicleFilters({...vehicleFilters, heavy_vehicle: checked === true})
                    }
                  />
                  <Label 
                    htmlFor="heavy_vehicle" 
                    className="flex items-center cursor-pointer"
                  >
                    <Truck className="h-4 w-4 text-purple-500 mr-2" />
                    <span>Heavy Vehicle</span>
                  </Label>
                </div>
              </div>
            </div>
            
            <div className="flex justify-center">
              <Button
                onClick={handleSearch}
                disabled={loading}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-8 py-3 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 min-w-[150px]"
              >
                {loading ? "Searching..." : "Search Parking"}
              </Button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {parkingSpaces.map((space) => (
            <Card 
              key={space.id}
              className="overflow-hidden hover:shadow-xl transition-shadow duration-300 border-0 rounded-xl"
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
                  {space.two_wheeler_capacity > 0 && (
                    <div className="text-center p-2 bg-gray-50 rounded-lg">
                      <Bike className="h-5 w-5 text-blue-500 mx-auto mb-1" />
                      <span className="block text-xs text-gray-500">Two Wheeler</span>
                      <span className="block font-semibold">{space.two_wheeler_capacity}</span>
                    </div>
                  )}
                  
                  {space.four_wheeler_capacity > 0 && (
                    <div className="text-center p-2 bg-gray-50 rounded-lg">
                      <Car className="h-5 w-5 text-indigo-500 mx-auto mb-1" />
                      <span className="block text-xs text-gray-500">Four Wheeler</span>
                      <span className="block font-semibold">{space.four_wheeler_capacity}</span>
                    </div>
                  )}
                  
                  {space.heavy_vehicle_capacity > 0 && (
                    <div className="text-center p-2 bg-gray-50 rounded-lg">
                      <Truck className="h-5 w-5 text-purple-500 mx-auto mb-1" />
                      <span className="block text-xs text-gray-500">Heavy Vehicle</span>
                      <span className="block font-semibold">{space.heavy_vehicle_capacity}</span>
                    </div>
                  )}
                </div>

                <Button 
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white"
                  onClick={() => handleBookNow(space)}
                >
                  Book Now
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {parkingSpaces.length === 0 && !loading && (searchQuery || Object.values(vehicleFilters).some(v => v)) && (
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

      {/* Booking Modal */}
      <Dialog open={bookingModalOpen} onOpenChange={setBookingModalOpen}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <button 
            onClick={() => setBookingModalOpen(false)}
            className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground"
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </button>
          
          {bookingSuccess ? (
            <div className="py-10 text-center">
              <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <CheckCircle2 className="h-10 w-10 text-green-600" />
              </div>
              <DialogTitle className="text-2xl font-bold text-gray-900 mb-2">Booking Confirmed!</DialogTitle>
              <DialogDescription className="text-gray-600 mb-6">
                Your parking space has been successfully booked.
              </DialogDescription>
              <p className="text-sm text-gray-500">
                A confirmation has been sent to your email.
              </p>
            </div>
          ) : selectedSpace && (
            <>
              <DialogHeader>
                <DialogTitle className="text-xl font-bold pr-6">Book Parking Space</DialogTitle>
                <DialogDescription>
                  {selectedSpace.address}, {selectedSpace.district}
                </DialogDescription>
              </DialogHeader>
              
              <div className="py-4">
                <div className="mb-6">
                  <Label className="text-sm font-medium text-gray-700 mb-2 block">Select Vehicle Type</Label>
                  <RadioGroup 
                    value={selectedVehicleType} 
                    onValueChange={(value) => setSelectedVehicleType(value as VehicleType)}
                    className="grid grid-cols-1 gap-2"
                  >
                    {selectedSpace.two_wheeler_capacity > 0 && (
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="two_wheeler" id="two_wheeler_option" />
                        <Label htmlFor="two_wheeler_option" className="flex items-center">
                          <Bike className="h-4 w-4 text-blue-500 mr-2" />
                          <span>Two Wheeler</span>
                          <span className="ml-auto text-sm text-gray-500">
                            {selectedSpace.two_wheeler_capacity} available
                          </span>
                        </Label>
                      </div>
                    )}
                    
                    {selectedSpace.four_wheeler_capacity > 0 && (
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="four_wheeler" id="four_wheeler_option" />
                        <Label htmlFor="four_wheeler_option" className="flex items-center">
                          <Car className="h-4 w-4 text-indigo-500 mr-2" />
                          <span>Four Wheeler</span>
                          <span className="ml-auto text-sm text-gray-500">
                            {selectedSpace.four_wheeler_capacity} available
                          </span>
                        </Label>
                      </div>
                    )}
                    
                    {selectedSpace.heavy_vehicle_capacity > 0 && (
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="heavy_vehicle" id="heavy_vehicle_option" />
                        <Label htmlFor="heavy_vehicle_option" className="flex items-center">
                          <Truck className="h-4 w-4 text-purple-500 mr-2" />
                          <span>Heavy Vehicle</span>
                          <span className="ml-auto text-sm text-gray-500">
                            {selectedSpace.heavy_vehicle_capacity} available
                          </span>
                        </Label>
                      </div>
                    )}
                  </RadioGroup>
                </div>
                
                <div className="mb-6">
                  <Label htmlFor="booking_hours" className="text-sm font-medium text-gray-700 mb-2 block">
                    Booking Duration (hours)
                  </Label>
                  <div className="flex items-center">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setBookingHours(Math.max(1, bookingHours - 1))}
                      className="h-10 px-3"
                    >
                      -
                    </Button>
                    <Input
                      id="booking_hours"
                      type="number"
                      min="1"
                      value={bookingHours}
                      onChange={(e) => setBookingHours(Math.max(1, parseInt(e.target.value) || 1))}
                      className="mx-2 text-center"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setBookingHours(bookingHours + 1)}
                      className="h-10 px-3"
                    >
                      +
                    </Button>
                  </div>
                </div>
                
                <div className="mb-6">
                  <Label className="text-sm font-medium text-gray-700 mb-2 block">Booking Details</Label>
                  <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center text-gray-600">
                        <Calendar className="h-4 w-4 mr-2" />
                        <span>Date</span>
                      </div>
                      <span className="font-medium">{format(new Date(), 'dd MMM yyyy')}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <div className="flex items-center text-gray-600">
                        <Clock className="h-4 w-4 mr-2" />
                        <span>Duration</span>
                      </div>
                      <span className="font-medium">{bookingHours} hour{bookingHours > 1 ? 's' : ''}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <div className="flex items-center text-gray-600">
                        <IndianRupee className="h-4 w-4 mr-2" />
                        <span>Rate</span>
                      </div>
                      <span className="font-medium">₹{selectedSpace.hourly_rate}/hour</span>
                    </div>
                    <div className="pt-2 border-t border-gray-200 flex justify-between items-center">
                      <span className="font-semibold">Total</span>
                      <span className="font-bold text-lg">₹{calculateTotalPrice()}</span>
                    </div>
                  </div>
                </div>
                
                <div className="mb-6">
                  <Label className="text-sm font-medium text-gray-700 mb-2 block">Payment Method</Label>
                  <Tabs defaultValue="upi" value={paymentMethod} onValueChange={setPaymentMethod}>
                    <TabsList className="grid grid-cols-3 mb-4">
                      <TabsTrigger value="upi" className="flex items-center justify-center">
                        <QrCode className="h-4 w-4 mr-2" />
                        UPI
                      </TabsTrigger>
                      <TabsTrigger value="card" className="flex items-center justify-center">
                        <CreditCard className="h-4 w-4 mr-2" />
                        Card
                      </TabsTrigger>
                      <TabsTrigger value="wallet" className="flex items-center justify-center">
                        <Wallet className="h-4 w-4 mr-2" />
                        Wallet
                      </TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="upi" className="mt-0">
                      <div className="bg-gray-50 rounded-lg p-4 text-center">
                        <QrCode className="h-24 w-24 mx-auto mb-2 text-gray-400" />
                        <p className="text-sm text-gray-600">
                          Scan QR code or enter UPI ID
                        </p>
                        <Input 
                          placeholder="Enter UPI ID" 
                          className="mt-2"
                        />
                      </div>
                    </TabsContent>
                    
                    <TabsContent value="card" className="mt-0">
                      <div className="space-y-4">
                        <Input placeholder="Card Number" />
                        <div className="grid grid-cols-2 gap-4">
                          <Input placeholder="MM/YY" />
                          <Input placeholder="CVV" />
                        </div>
                        <Input placeholder="Cardholder Name" />
                      </div>
                    </TabsContent>
                    
                    <TabsContent value="wallet" className="mt-0">
                      <div className="bg-gray-50 rounded-lg p-4 text-center">
                        <div className="flex flex-col items-center justify-center space-y-2">
                          <Button variant="outline" className="w-full justify-start">
                            <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/f/f2/Paytm_Logo_%28standalone%29.svg/2560px-Paytm_Logo_%28standalone%29.svg.png" 
                                alt="Paytm" 
                                className="h-6 mr-2" />
                            Paytm
                          </Button>
                          <Button variant="outline" className="w-full justify-start">
                            <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/e/e1/PhonePe_Logo.svg/2560px-PhonePe_Logo.svg.png" 
                                alt="PhonePe" 
                                className="h-6 mr-2" />
                            PhonePe
                          </Button>
                          <Button variant="outline" className="w-full justify-start">
                            <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/f/f7/Amazon_Pay_logo.svg/1280px-Amazon_Pay_logo.svg.png" 
                                alt="Amazon Pay" 
                                className="h-6 mr-2" />
                            Amazon Pay
                          </Button>
                        </div>
                      </div>
                    </TabsContent>
                  </Tabs>
                </div>
              </div>
              
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setBookingModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white"
                  onClick={handleConfirmBooking}
                >
                  Confirm Booking
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
