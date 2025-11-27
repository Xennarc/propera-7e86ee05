import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ResortProvider } from "@/contexts/ResortContext";
import { GuestAuthProvider } from "@/contexts/GuestAuthContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { GuestLayout } from "@/components/guest/GuestLayout";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import GuestsPage from "./pages/guests/GuestsPage";
import GuestDetailPage from "./pages/guests/GuestDetailPage";
import ActivitiesPage from "./pages/activities/ActivitiesPage";
import ActivitySessionsPage from "./pages/activities/ActivitySessionsPage";
import ActivitySessionDetailPage from "./pages/activities/ActivitySessionDetailPage";
import RestaurantsPage from "./pages/restaurants/RestaurantsPage";
import RestaurantSlotsPage from "./pages/restaurants/RestaurantSlotsPage";
import RestaurantSlotDetailPage from "./pages/restaurants/RestaurantSlotDetailPage";
import ResortsPage from "./pages/settings/ResortsPage";
import ResourcesPage from "./pages/settings/ResourcesPage";
import SettingsPage from "./pages/settings/SettingsPage";
import Reports from "./pages/Reports";
import ActivitiesReport from "./pages/reports/ActivitiesReport";
import RestaurantsReport from "./pages/reports/RestaurantsReport";
import GuestBehaviourReport from "./pages/reports/GuestBehaviourReport";
import MarketReport from "./pages/reports/MarketReport";
import GuestRequestsPage from "./pages/staff/GuestRequestsPage";
import GuestLogin from "./pages/guest/GuestLogin";
import GuestHome from "./pages/guest/GuestHome";
import GuestMyBookings from "./pages/guest/GuestMyBookings";
import GuestActivitiesBrowser from "./pages/guest/GuestActivitiesBrowser";
import GuestActivityBookingPage from "./pages/guest/GuestActivityBookingPage";
import GuestRestaurantBrowser from "./pages/guest/GuestRestaurantBrowser";
import GuestRestaurantBookingPage from "./pages/guest/GuestRestaurantBookingPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <ResortProvider>
          <GuestAuthProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Routes>
                {/* Staff routes */}
                <Route path="/auth" element={<Auth />} />
                <Route path="/" element={<AppLayout />}>
                  <Route index element={<Navigate to="/dashboard" replace />} />
                  <Route path="dashboard" element={<Dashboard />} />
                  <Route path="guests" element={<GuestsPage />} />
                  <Route path="guests/:id" element={<GuestDetailPage />} />
                  <Route path="activities" element={<ActivitiesPage />} />
                  <Route path="activities/sessions" element={<ActivitySessionsPage />} />
                  <Route path="activities/sessions/:id" element={<ActivitySessionDetailPage />} />
                  <Route path="restaurants" element={<RestaurantsPage />} />
                  <Route path="restaurants/slots" element={<RestaurantSlotsPage />} />
                  <Route path="restaurants/slots/:id" element={<RestaurantSlotDetailPage />} />
                  <Route path="reports" element={<Reports />} />
                  <Route path="reports/activities" element={<ActivitiesReport />} />
                  <Route path="reports/restaurants" element={<RestaurantsReport />} />
                  <Route path="reports/guest-behaviour" element={<GuestBehaviourReport />} />
                  <Route path="reports/market" element={<MarketReport />} />
                  <Route path="guest-requests" element={<GuestRequestsPage />} />
                  <Route path="settings" element={<SettingsPage />} />
                  <Route path="settings/resorts" element={<ResortsPage />} />
                  <Route path="settings/resources" element={<ResourcesPage />} />
                </Route>
                {/* Guest portal routes */}
                <Route path="/guest/login" element={<GuestLogin />} />
                <Route path="/guest" element={<GuestLayout />}>
                  <Route index element={<GuestHome />} />
                  <Route path="bookings" element={<GuestMyBookings />} />
                  <Route path="activities" element={<GuestActivitiesBrowser />} />
                  <Route path="activities/book/:sessionId" element={<GuestActivityBookingPage />} />
                  <Route path="restaurants" element={<GuestRestaurantBrowser />} />
                  <Route path="restaurants/book/:slotId" element={<GuestRestaurantBookingPage />} />
                </Route>
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </GuestAuthProvider>
        </ResortProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
