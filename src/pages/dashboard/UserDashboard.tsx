import { Routes, Route, Navigate } from "react-router-dom";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import SearchParking from "./SearchParking";
import MyBookings from "./MyBookings";
import Payments from "./Payments";
import Profile from "./Profile";
import Notifications from "./Notifications";

export default function UserDashboard() {
  return (
    <DashboardLayout>
      <Routes>
        <Route index element={<SearchParking />} />
        <Route path="bookings" element={<MyBookings />} />
        <Route path="payments" element={<Payments />} />
        <Route path="profile" element={<Profile />} />
        <Route path="notifications" element={<Notifications />} />
        <Route path="*" element={<Navigate to="/dashboard/user" replace />} />
      </Routes>
    </DashboardLayout>
  );
}
