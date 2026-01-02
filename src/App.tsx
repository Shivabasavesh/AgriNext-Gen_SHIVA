import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import ProtectedRoute from "@/components/ProtectedRoute";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import NotFound from "./pages/NotFound";
import FarmerDashboard from "./pages/farmer/Dashboard";
import FarmerProfile from "./pages/farmer/Profile";
import FarmerCrops from "./pages/farmer/Crops";
import NewCrop from "./pages/farmer/NewCrop";
import FarmerTransport from "./pages/farmer/Transport";
import NewTransport from "./pages/farmer/NewTransport";
import AIAdvice from "./pages/farmer/AIAdvice";
import FarmerFarmlands from "./pages/farmer/Farmlands";
import FarmerListings from "./pages/farmer/Listings";
import FarmerOrders from "./pages/farmer/Orders";
import FarmerEarnings from "./pages/farmer/Earnings";
import FarmerNotifications from "./pages/farmer/Notifications";
import FarmerSettings from "./pages/farmer/Settings";
import TransporterDashboard from "./pages/transporter/Dashboard";
import TransporterLoads from "./pages/transporter/Loads";
import TransporterTripDetail from "./pages/transporter/TripDetail";
import TransporterHistory from "./pages/transporter/History";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />

            <Route path="/farmer" element={<Navigate to="/farmer/dashboard" replace />} />
            <Route
              path="/farmer/dashboard"
              element={
                <ProtectedRoute allowedRoles={["FARMER"]}>
                  <FarmerDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/farmer/profile"
              element={
                <ProtectedRoute allowedRoles={["FARMER"]}>
                  <FarmerProfile />
                </ProtectedRoute>
              }
            />
            <Route
              path="/farmer/crops"
              element={
                <ProtectedRoute allowedRoles={["FARMER"]}>
                  <FarmerCrops />
                </ProtectedRoute>
              }
            />
            <Route
              path="/farmer/crops/new"
              element={
                <ProtectedRoute allowedRoles={["FARMER"]}>
                  <NewCrop />
                </ProtectedRoute>
              }
            />
            <Route
              path="/farmer/farmlands"
              element={
                <ProtectedRoute allowedRoles={["FARMER"]}>
                  <FarmerFarmlands />
                </ProtectedRoute>
              }
            />
            <Route
              path="/farmer/transport"
              element={
                <ProtectedRoute allowedRoles={["FARMER"]}>
                  <FarmerTransport />
                </ProtectedRoute>
              }
            />
            <Route
              path="/farmer/transport/new"
              element={
                <ProtectedRoute allowedRoles={["FARMER"]}>
                  <NewTransport />
                </ProtectedRoute>
              }
            />
            <Route
              path="/farmer/ai"
              element={
                <ProtectedRoute allowedRoles={["FARMER"]}>
                  <AIAdvice />
                </ProtectedRoute>
              }
            />
            <Route
              path="/farmer/listings"
              element={
                <ProtectedRoute allowedRoles={["FARMER"]}>
                  <FarmerListings />
                </ProtectedRoute>
              }
            />
            <Route
              path="/farmer/orders"
              element={
                <ProtectedRoute allowedRoles={["FARMER"]}>
                  <FarmerOrders />
                </ProtectedRoute>
              }
            />
            <Route
              path="/farmer/earnings"
              element={
                <ProtectedRoute allowedRoles={["FARMER"]}>
                  <FarmerEarnings />
                </ProtectedRoute>
              }
            />
            <Route
              path="/farmer/notifications"
              element={
                <ProtectedRoute allowedRoles={["FARMER"]}>
                  <FarmerNotifications />
                </ProtectedRoute>
              }
            />
            <Route
              path="/farmer/settings"
              element={
                <ProtectedRoute allowedRoles={["FARMER"]}>
                  <FarmerSettings />
                </ProtectedRoute>
              }
            />

            <Route
              path="/transporter"
              element={
                <ProtectedRoute allowedRoles={["TRANSPORTER"]}>
                  <TransporterDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/transporter/loads"
              element={
                <ProtectedRoute allowedRoles={["TRANSPORTER"]}>
                  <TransporterLoads />
                </ProtectedRoute>
              }
            />
            <Route
              path="/transporter/trips/:id"
              element={
                <ProtectedRoute allowedRoles={["TRANSPORTER"]}>
                  <TransporterTripDetail />
                </ProtectedRoute>
              }
            />
            <Route
              path="/transporter/history"
              element={
                <ProtectedRoute allowedRoles={["TRANSPORTER"]}>
                  <TransporterHistory />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
