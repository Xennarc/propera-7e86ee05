import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/components/ThemeProvider";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useParams, useLocation } from "react-router-dom";

// Helper component for legacy redirects with dynamic params
function LegacyRedirect({ to }: { to: string }) {
  const params = useParams();
  const location = useLocation();
  
  let targetPath = to;
  Object.entries(params).forEach(([key, value]) => {
    if (value) {
      targetPath = targetPath.replace(`:${key}`, value);
    }
  });
  
  return <Navigate to={targetPath + location.search} replace />;
}
import { AuthProvider } from "@/contexts/AuthContext";
import { ResortProvider } from "@/contexts/ResortContext";
import { GuestAuthProvider } from "@/contexts/GuestAuthContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { GuestLayout } from "@/components/guest/GuestLayout";
import LandingPage from "./pages/LandingPage";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import GuestsPage from "./pages/guests/GuestsPage";
import GuestDetailPage from "./pages/guests/GuestDetailPage";
import ActivitiesPage from "./pages/activities/ActivitiesPage";
import ActivitySessionsPage from "./pages/activities/ActivitySessionsPage";
import CreateSessionWizard from "./pages/activities/CreateSessionWizard";
import ActivitySessionDetailPage from "./pages/activities/ActivitySessionDetailPage";
import ActivityCheatsheetPage from "./pages/activities/ActivityCheatsheetPage";
import RestaurantsPage from "./pages/restaurants/RestaurantsPage";
import RestaurantSlotsPage from "./pages/restaurants/RestaurantSlotsPage";
import RestaurantSlotDetailPage from "./pages/restaurants/RestaurantSlotDetailPage";
import CreateRestaurantSlotWizard from './pages/restaurants/CreateRestaurantSlotWizard';
import ResortsPage from "./pages/settings/ResortsPage";
import ResourcesPage from "./pages/settings/ResourcesPage";
import SettingsPage from "./pages/settings/SettingsPage";
import UserManagementPage from "./pages/settings/UserManagementPage";
import ResortStaffPage from "./pages/settings/ResortStaffPage";
import BookingHealthPage from "./pages/settings/BookingHealthPage";
import PermissionsDebugPage from "./pages/settings/PermissionsDebugPage";
import GuestImportPage from "./pages/settings/GuestImportPage";
import Reports from "./pages/Reports";
import ActivitiesReport from "./pages/reports/ActivitiesReport";
import RestaurantsReport from "./pages/reports/RestaurantsReport";
import CancellationsReport from "./pages/reports/CancellationsReport";
import GuestsReport from "./pages/reports/GuestsReport";
import GuestBehaviourReport from "./pages/reports/GuestBehaviourReport";
import MarketReport from "./pages/reports/MarketReport";
import StayFeedbackReport from "./pages/reports/StayFeedbackReport";
import SalesPerformanceReport from "./pages/reports/SalesPerformanceReport";
import GuestRequestsPage from "./pages/staff/GuestRequestsPage";
import TodaysOpportunitiesPage from "./pages/staff/TodaysOpportunitiesPage";
import StaffInviteAcceptPage from "./pages/staff/StaffInviteAcceptPage";
import ResortOnboardingPage from "./pages/onboarding/ResortOnboardingPage";
import GuestLogin from "./pages/guest/GuestLogin";
import GuestFindResort from "./pages/guest/GuestFindResort";
import ResortGuestLogin from "./pages/guest/ResortGuestLogin";
import ResortPublicLinksPage from "./pages/settings/ResortPublicLinksPage";
import ResortBrandingPage from "./pages/settings/ResortBrandingPage";
import GuestHome from "./pages/guest/GuestHome";
import GuestMyBookings from "./pages/guest/GuestMyBookings";
import GuestActivitiesBrowser from "./pages/guest/GuestActivitiesBrowser";
import GuestActivityBookingPage from "./pages/guest/GuestActivityBookingPage";
import GuestRestaurantBrowser from "./pages/guest/GuestRestaurantBrowser";
import GuestRestaurantBookingPage from "./pages/guest/GuestRestaurantBookingPage";
import GuestStayFeedback from "./pages/guest/GuestStayFeedback";
import GuestActivityExplorer from "./pages/guest/GuestActivityExplorer";
import GuestActivityDetailPage from "./pages/guest/GuestActivityDetailPage";
import NotificationsPage from "./pages/notifications/NotificationsPage";
import GuestNotificationsPage from "./pages/guest/GuestNotificationsPage";
import PreArrivalPage from "./pages/guest/PreArrivalPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <ThemeProvider>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <ResortProvider>
            <GuestAuthProvider>
              <Toaster />
              <Sonner />
              <BrowserRouter>
              <Routes>
                {/* Public landing page */}
                <Route path="/" element={<LandingPage />} />
                
                {/* Staff routes */}
                <Route path="/staff/auth" element={<Auth />} />
                <Route path="/staff" element={<AppLayout />}>
                  <Route index element={<Navigate to="/staff/dashboard" replace />} />
                  <Route path="dashboard" element={<Dashboard />} />
                  <Route path="guests" element={<GuestsPage />} />
                  <Route path="guests/:id" element={<GuestDetailPage />} />
                  <Route path="activities" element={<ActivitiesPage />} />
                  <Route path="activities/sessions" element={<ActivitySessionsPage />} />
                  <Route path="activities/sessions/new" element={<CreateSessionWizard />} />
                  <Route path="activities/sessions/:id" element={<ActivitySessionDetailPage />} />
                  <Route path="activities/cheatsheet" element={<ActivityCheatsheetPage />} />
                  <Route path="restaurants" element={<RestaurantsPage />} />
                  <Route path="restaurants/slots" element={<RestaurantSlotsPage />} />
                  <Route path="restaurants/slots/new" element={<CreateRestaurantSlotWizard />} />
                  <Route path="restaurants/slots/:id" element={<RestaurantSlotDetailPage />} />
                  <Route path="reports" element={<Reports />} />
                  <Route path="reports/sales" element={<SalesPerformanceReport />} />
                  <Route path="reports/activities" element={<ActivitiesReport />} />
                  <Route path="reports/restaurants" element={<RestaurantsReport />} />
                  <Route path="reports/cancellations" element={<CancellationsReport />} />
                  <Route path="reports/guests" element={<GuestsReport />} />
                  <Route path="reports/guest-behaviour" element={<GuestBehaviourReport />} />
                  <Route path="reports/market" element={<MarketReport />} />
                  <Route path="reports/stay-feedback" element={<StayFeedbackReport />} />
                  <Route path="guest-requests" element={<GuestRequestsPage />} />
                  <Route path="today" element={<TodaysOpportunitiesPage />} />
                  <Route path="settings" element={<SettingsPage />} />
                  <Route path="settings/users" element={<UserManagementPage />} />
                  <Route path="settings/resorts" element={<ResortsPage />} />
                  <Route path="settings/resources" element={<ResourcesPage />} />
                  <Route path="settings/resort-staff" element={<ResortStaffPage />} />
                  <Route path="settings/booking-health" element={<BookingHealthPage />} />
                  <Route path="settings/permissions" element={<PermissionsDebugPage />} />
                  <Route path="settings/import/guests" element={<GuestImportPage />} />
                  <Route path="settings/public-links" element={<ResortPublicLinksPage />} />
                  <Route path="settings/branding" element={<ResortBrandingPage />} />
                  <Route path="onboarding" element={<ResortOnboardingPage />} />
                  <Route path="notifications" element={<NotificationsPage />} />
                </Route>
                
                {/* Staff invitation acceptance (public) */}
                <Route path="/staff/invite/:token" element={<StaffInviteAcceptPage />} />
                
                {/* Legacy staff routes - redirect to new /staff prefix */}
                <Route path="/auth" element={<Navigate to="/staff/auth" replace />} />
                <Route path="/dashboard" element={<Navigate to="/staff/dashboard" replace />} />
                <Route path="/guests" element={<Navigate to="/staff/guests" replace />} />
                <Route path="/guests/:id" element={<LegacyRedirect to="/staff/guests/:id" />} />
                <Route path="/activities" element={<Navigate to="/staff/activities" replace />} />
                <Route path="/activities/sessions" element={<Navigate to="/staff/activities/sessions" replace />} />
                <Route path="/activities/sessions/new" element={<Navigate to="/staff/activities/sessions/new" replace />} />
                <Route path="/activities/sessions/:id" element={<LegacyRedirect to="/staff/activities/sessions/:id" />} />
                <Route path="/restaurants" element={<Navigate to="/staff/restaurants" replace />} />
                <Route path="/restaurants/slots" element={<Navigate to="/staff/restaurants/slots" replace />} />
                <Route path="/restaurants/slots/:id" element={<LegacyRedirect to="/staff/restaurants/slots/:id" />} />
                <Route path="/reports" element={<Navigate to="/staff/reports" replace />} />
                <Route path="/reports/activities" element={<Navigate to="/staff/reports/activities" replace />} />
                <Route path="/reports/restaurants" element={<Navigate to="/staff/reports/restaurants" replace />} />
                <Route path="/reports/guest-behaviour" element={<Navigate to="/staff/reports/guest-behaviour" replace />} />
                <Route path="/reports/market" element={<Navigate to="/staff/reports/market" replace />} />
                <Route path="/guest-requests" element={<Navigate to="/staff/guest-requests" replace />} />
                <Route path="/settings" element={<Navigate to="/staff/settings" replace />} />
                <Route path="/settings/users" element={<Navigate to="/staff/settings/users" replace />} />
                <Route path="/settings/resorts" element={<Navigate to="/staff/settings/resorts" replace />} />
                <Route path="/settings/resources" element={<Navigate to="/staff/settings/resources" replace />} />
                
                {/* Resort-specific guest login */}
                <Route path="/resort/:code/guest/login" element={<ResortGuestLogin />} />
                
                {/* Resort-specific guest activity explorer */}
                <Route path="/resort/:code/guest" element={<GuestLayout />}>
                  <Route path="activities" element={<GuestActivityExplorer />} />
                  <Route path="activities/:activityId" element={<GuestActivityDetailPage />} />
                </Route>
                
                {/* Pre-arrival route (token-based, no auth required) */}
                <Route path="/prearrival/:token" element={<PreArrivalPage />} />
                
                {/* Guest portal routes */}
                <Route path="/guest/login" element={<GuestLogin />} />
                <Route path="/guest/find" element={<GuestFindResort />} />
                <Route path="/guest" element={<GuestLayout />}>
                  <Route index element={<GuestHome />} />
                  <Route path="bookings" element={<GuestMyBookings />} />
                  <Route path="activities" element={<GuestActivitiesBrowser />} />
                  <Route path="activities/book/:sessionId" element={<GuestActivityBookingPage />} />
                  <Route path="restaurants" element={<GuestRestaurantBrowser />} />
                  <Route path="restaurants/book/:slotId" element={<GuestRestaurantBookingPage />} />
                  <Route path="feedback" element={<GuestStayFeedback />} />
                  <Route path="notifications" element={<GuestNotificationsPage />} />
                </Route>
                
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </GuestAuthProvider>
        </ResortProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
  </ThemeProvider>
);

export default App;
