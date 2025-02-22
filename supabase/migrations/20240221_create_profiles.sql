-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'owner')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create a trigger to automatically update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS on profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create policies for profiles table
-- Public can read profiles (needed for displaying parking lot owner info)
CREATE POLICY "Profiles are viewable by everyone" ON profiles
    FOR SELECT
    TO public;

-- Users can update their own profile
CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- Users can insert their own profile only
CREATE POLICY "Enable insert for authenticated users only" ON profiles
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = id);

-- Users can delete their own profile
CREATE POLICY "Users can delete own profile" ON profiles
    FOR DELETE
    TO authenticated
    USING (auth.uid() = id);

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'role'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically create profile on signup
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create parking_lots table
CREATE TABLE IF NOT EXISTS parking_lots (
  id SERIAL PRIMARY KEY,
  owner_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  location TEXT NOT NULL,
  total_slots INTEGER NOT NULL CHECK (total_slots >= 0),
  price_per_hour DECIMAL NOT NULL CHECK (price_per_hour >= 0),
  available_slots INTEGER NOT NULL DEFAULT total_slots CHECK (available_slots >= 0 AND available_slots <= total_slots),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on parking_lots
ALTER TABLE parking_lots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners manage their lots" ON parking_lots
  FOR ALL TO authenticated
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'owner' AND auth.uid() = owner_id)
  WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) = 'owner' AND auth.uid() = owner_id);

-- Create bookings table
CREATE TABLE IF NOT EXISTS bookings (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  parking_lot_id INTEGER REFERENCES parking_lots(id) ON DELETE CASCADE,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE,
  total_cost DECIMAL GENERATED ALWAYS AS (
    CASE WHEN end_time IS NOT NULL THEN
      (EXTRACT(EPOCH FROM (end_time - start_time)) / 3600) * (SELECT price_per_hour FROM parking_lots WHERE id = parking_lot_id)
    ELSE NULL END
  ) STORED,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'completed', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on bookings
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage their bookings" ON bookings
  FOR ALL TO authenticated
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'user' AND auth.uid() = user_id)
  WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) = 'user' AND auth.uid() = user_id);

CREATE POLICY "Owners view their lot bookings" ON bookings
  FOR SELECT TO authenticated
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'owner' AND parking_lot_id IN (SELECT id FROM parking_lots WHERE owner_id = auth.uid()));

-- Create payments table
CREATE TABLE IF NOT EXISTS payments (
  id SERIAL PRIMARY KEY,
  booking_id INTEGER REFERENCES bookings(id) ON DELETE SET NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  amount DECIMAL NOT NULL CHECK (amount >= 0),
  payment_method TEXT NOT NULL CHECK (payment_method IN ('credit_card', 'wallet', 'cash')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on payments
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage their payments" ON payments
  FOR ALL TO authenticated
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'user' AND auth.uid() = user_id)
  WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) = 'user' AND auth.uid() = user_id);

CREATE POLICY "Owners view payments for their lots" ON payments
  FOR SELECT TO authenticated
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'owner' AND booking_id IN (
    SELECT id FROM bookings WHERE parking_lot_id IN (
      SELECT id FROM parking_lots WHERE owner_id = auth.uid()
    )
  ));

-- Create notifications table
CREATE TABLE notifications (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('info', 'warning', 'success', 'error')),
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on notifications
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Create notification policies
CREATE POLICY "Users can view their own notifications"
  ON notifications FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
  ON notifications FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create function to set role claim
CREATE OR REPLACE FUNCTION public.set_role_claim()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM auth.set_claim(NEW.id, 'role', to_jsonb(NEW.role));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for role claim
CREATE TRIGGER on_profile_created
  AFTER INSERT ON profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_role_claim();

-- Create function to update parking lot availability
CREATE OR REPLACE FUNCTION update_parking_lot_availability()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'active' THEN
    UPDATE parking_lots
    SET available_slots = available_slots - 1
    WHERE id = NEW.parking_lot_id AND available_slots > 0;
  ELSIF NEW.status = 'cancelled' OR NEW.status = 'completed' THEN
    UPDATE parking_lots
    SET available_slots = available_slots + 1
    WHERE id = NEW.parking_lot_id AND available_slots < total_slots;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for parking lot availability
CREATE TRIGGER on_booking_status_change
  AFTER INSERT OR UPDATE OF status ON bookings
  FOR EACH ROW EXECUTE FUNCTION update_parking_lot_availability();

-- Create function to create notification on booking status change
CREATE OR REPLACE FUNCTION create_booking_notification()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'active' THEN
    INSERT INTO notifications (user_id, message, type)
    VALUES (
      NEW.user_id,
      'Your booking has been confirmed. Parking slot is ready for use.',
      'success'
    );
  ELSIF NEW.status = 'cancelled' THEN
    INSERT INTO notifications (user_id, message, type)
    VALUES (
      NEW.user_id,
      'Your booking has been cancelled.',
      'info'
    );
  ELSIF NEW.status = 'completed' THEN
    INSERT INTO notifications (user_id, message, type)
    VALUES (
      NEW.user_id,
      'Your booking has been completed. Thank you for using SmartPark!',
      'success'
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for booking notifications
CREATE TRIGGER on_booking_notification
  AFTER UPDATE OF status ON bookings
  FOR EACH ROW EXECUTE FUNCTION create_booking_notification();

-- Create indexes for better performance
CREATE INDEX idx_parking_lots_owner ON parking_lots(owner_id);
CREATE INDEX idx_bookings_user ON bookings(user_id);
CREATE INDEX idx_bookings_parking_lot ON bookings(parking_lot_id);
CREATE INDEX idx_payments_booking ON payments(booking_id);
CREATE INDEX idx_payments_user ON payments(user_id);
