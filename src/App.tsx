import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/components/ThemeProvider";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClientProvider, QueryErrorResetBoundary } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useParams, useLocation } from "react-router-dom";
import { queryClient } from "@/lib/query-client-config";
import { ConnectionBanner } from "@/components/ui/connection-banner";
import { ConnectionErrorBoundary } from "@/components/ui/connection-error-boundary";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

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

// Critical pages loaded eagerly (landing, auth, layouts)
import LandingPage from "./pages/LandingPage";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";

// Lazy loaded pages - Staff
const Dashboard = lazy(() => import("./pages/Dashboard"));
const GuestsPage = lazy(() => import("./pages/guests/GuestsPage"));
const GuestDetailPage = lazy(() => import("./pages/guests/GuestDetailPage"));
const ActivitiesPage = lazy(() => import("./pages/activities/ActivitiesPage"));
const ActivitySessionsPage = lazy(() => import("./pages/activities/ActivitySessionsPage"));
const CreateSessionWizard = lazy(() => import("./pages/activities/CreateSessionWizard"));
const ActivitySessionDetailPage = lazy(() => import("./pages/activities/ActivitySessionDetailPage"));
const ActivityCheatsheetPage = lazy(() => import("./pages/activities/ActivityCheatsheetPage"));
const RestaurantsPage = lazy(() => import("./pages/restaurants/RestaurantsPage"));
const RestaurantSlotsPage = lazy(() => import("./pages/restaurants/RestaurantSlotsPage"));
const RestaurantSlotDetailPage = lazy(() => import("./pages/restaurants/RestaurantSlotDetailPage"));
const CreateRestaurantSlotWizard = lazy(() => import('./pages/restaurants/CreateRestaurantSlotWizard'));
const ResortsPage = lazy(() => import("./pages/settings/ResortsPage"));
const ResourcesPage = lazy(() => import("./pages/settings/ResourcesPage"));
const SettingsPage = lazy(() => import("./pages/settings/SettingsPage"));
const UserManagementPage = lazy(() => import("./pages/settings/UserManagementPage"));
const ResortStaffPage = lazy(() => import("./pages/settings/ResortStaffPage"));
const BookingHealthPage = lazy(() => import("./pages/settings/BookingHealthPage"));
const PermissionsDebugPage = lazy(() => import("./pages/settings/PermissionsDebugPage"));
const GuestImportPage = lazy(() => import("./pages/settings/GuestImportPage"));
const Reports = lazy(() => import("./pages/Reports"));
const ActivitiesReport = lazy(() => import("./pages/reports/ActivitiesReport"));
const RestaurantsReport = lazy(() => import("./pages/reports/RestaurantsReport"));
const CancellationsReport = lazy(() => import("./pages/reports/CancellationsReport"));
const GuestsReport = lazy(() => import("./pages/reports/GuestsReport"));
const GuestBehaviourReport = lazy(() => import("./pages/reports/GuestBehaviourReport"));
const MarketReport = lazy(() => import("./pages/reports/MarketReport"));
const StayFeedbackReport = lazy(() => import("./pages/reports/StayFeedbackReport"));
const SalesPerformanceReport = lazy(() => import("./pages/reports/SalesPerformanceReport"));
const GuestRequestsPage = lazy(() => import("./pages/staff/GuestRequestsPage"));
const TodaysOpportunitiesPage = lazy(() => import("./pages/staff/TodaysOpportunitiesPage"));
const PrearrivalDashboardPage = lazy(() => import("./pages/staff/PrearrivalDashboardPage"));
const StaffInviteAcceptPage = lazy(() => import("./pages/staff/StaffInviteAcceptPage"));
const StaffDirectoryPage = lazy(() => import("./pages/staff/StaffDirectoryPage"));
const ResortOnboardingPage = lazy(() => import("./pages/onboarding/ResortOnboardingPage"));
const ResortPublicLinksPage = lazy(() => import("./pages/settings/ResortPublicLinksPage"));
const ResortBrandingPage = lazy(() => import("./pages/settings/ResortBrandingPage"));
const ResortPricingPage = lazy(() => import("./pages/settings/ResortPricingPage"));
const SubscriptionTiersPage = lazy(() => import("./pages/settings/SubscriptionTiersPage"));
const ResortDirectoryPage = lazy(() => import("./pages/settings/ResortDirectoryPage"));
const PrearrivalSettingsPage = lazy(() => import("./pages/settings/PrearrivalSettingsPage"));
const AccessManagementPage = lazy(() => import("./pages/settings/AccessManagementPage"));

// Super Admin pages
const SuperAdminDashboard = lazy(() => import("./pages/superadmin/SuperAdminDashboard"));
const ResortDetailPage = lazy(() => import("./pages/superadmin/ResortDetailPage"));
const GlobalStaffPage = lazy(() => import("./pages/superadmin/GlobalStaffPage"));
const AuditLogsPage = lazy(() => import("./pages/superadmin/AuditLogsPage"));
const NotificationsPage = lazy(() => import("./pages/notifications/NotificationsPage"));
const LoyaltyOverviewPage = lazy(() => import("./pages/loyalty/LoyaltyOverviewPage"));
const LoyaltyProgramSettingsPage = lazy(() => import("./pages/loyalty/LoyaltyProgramSettingsPage"));
const LoyaltyTiersPage = lazy(() => import("./pages/loyalty/LoyaltyTiersPage"));
const LoyaltyMemberDetailPage = lazy(() => import("./pages/loyalty/LoyaltyMemberDetailPage"));

// Lazy loaded pages - Guest
const GuestLogin = lazy(() => import("./pages/guest/GuestLogin"));
const GuestFindResort = lazy(() => import("./pages/guest/GuestFindResort"));
const ResortGuestLogin = lazy(() => import("./pages/guest/ResortGuestLogin"));
const GuestHome = lazy(() => import("./pages/guest/GuestHome"));
const GuestMyBookings = lazy(() => import("./pages/guest/GuestMyBookings"));
const GuestActivitiesBrowser = lazy(() => import("./pages/guest/GuestActivitiesBrowser"));
const GuestActivityCataloguePage = lazy(() => import("./pages/guest/GuestActivityCataloguePage"));
const GuestActivitySessionsPage = lazy(() => import("./pages/guest/GuestActivitySessionsPage"));
const GuestActivityBookingPage = lazy(() => import("./pages/guest/GuestActivityBookingPage"));
const GuestRestaurantBrowser = lazy(() => import("./pages/guest/GuestRestaurantBrowser"));
const GuestRestaurantBookingPage = lazy(() => import("./pages/guest/GuestRestaurantBookingPage"));
const GuestStayFeedback = lazy(() => import("./pages/guest/GuestStayFeedback"));
const GuestActivityExplorer = lazy(() => import("./pages/guest/GuestActivityExplorer"));
const GuestActivityDetailPage = lazy(() => import("./pages/guest/GuestActivityDetailPage"));
const GuestProfilePage = lazy(() => import("./pages/guest/GuestProfilePage"));
const GuestNotificationsPage = lazy(() => import("./pages/guest/GuestNotificationsPage"));
const PreArrivalPage = lazy(() => import("./pages/guest/PreArrivalPage"));
const PrearrivalLandingPage = lazy(() => import("./pages/prearrival/PrearrivalLandingPage"));
const PrearrivalCheckinWizard = lazy(() => import("./pages/prearrival/PrearrivalCheckinWizard"));
const GuestLoyaltyPage = lazy(() => import("./pages/guest/GuestLoyaltyPage"));
const GuestTravelPartyPage = lazy(() => import("./pages/guest/GuestTravelPartyPage"));

// Lazy loaded pages - Public
const ResortMarketingPage = lazy(() => import("./pages/resorts/ResortMarketingPage"));
const PricingPage = lazy(() => import("./pages/PricingPage"));
const AboutPage = lazy(() => import("./pages/AboutPage"));

// Loading fallback component
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-[50vh]">
    <LoadingSpinner size="lg" />
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <QueryErrorResetBoundary>
      {({ reset }) => (
        <ConnectionErrorBoundary onReset={reset}>
          <ThemeProvider>
            <TooltipProvider>
              <AuthProvider>
                <ResortProvider>
                  <GuestAuthProvider>
                    <ConnectionBanner />
                    <Toaster />
                    <Sonner />
                    <BrowserRouter>
                      <Suspense fallback={<PageLoader />}>
              <Routes>
                {/* Public landing page */}
                <Route path="/" element={<LandingPage />} />
                <Route path="/pricing" element={<PricingPage />} />
                <Route path="/about" element={<AboutPage />} />
                
                {/* Public resort marketing pages */}
                <Route path="/resorts/:code" element={<ResortMarketingPage />} />
                
                {/* Super Admin routes */}
                <Route path="/superadmin" element={<AppLayout />}>
                  <Route index element={<SuperAdminDashboard />} />
                  <Route path="resorts/:resortId" element={<ResortDetailPage />} />
                  <Route path="staff" element={<GlobalStaffPage />} />
                  <Route path="audit" element={<AuditLogsPage />} />
                </Route>
                
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
                  <Route path="prearrival" element={<PrearrivalDashboardPage />} />
                  <Route path="team" element={<StaffDirectoryPage />} />
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
                  <Route path="settings/pricing" element={<ResortPricingPage />} />
                  <Route path="settings/subscriptions" element={<SubscriptionTiersPage />} />
                  <Route path="settings/directory" element={<ResortDirectoryPage />} />
                  <Route path="settings/prearrival" element={<PrearrivalSettingsPage />} />
                  <Route path="settings/access" element={<AccessManagementPage />} />
                  <Route path="onboarding" element={<ResortOnboardingPage />} />
                  <Route path="notifications" element={<NotificationsPage />} />
                  <Route path="loyalty" element={<LoyaltyOverviewPage />} />
                  <Route path="loyalty/program" element={<LoyaltyProgramSettingsPage />} />
                  <Route path="loyalty/tiers" element={<LoyaltyTiersPage />} />
                  <Route path="loyalty/members/:id" element={<LoyaltyMemberDetailPage />} />
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
                  <Route path="activities/book/:sessionId" element={<GuestActivityBookingPage />} />
                </Route>
                
                {/* Pre-arrival routes (token-based, no auth required) */}
                <Route path="/prearrival/:token" element={<PrearrivalLandingPage />} />
                <Route path="/prearrival/:token/checkin" element={<PrearrivalCheckinWizard />} />
                <Route path="/prearrival/:token/experiences" element={<PreArrivalPage />} />
                
                {/* Guest portal routes */}
                <Route path="/guest/login" element={<GuestLogin />} />
                <Route path="/guest/find" element={<GuestFindResort />} />
                <Route path="/guest" element={<GuestLayout />}>
                  <Route index element={<GuestHome />} />
                  <Route path="profile" element={<GuestProfilePage />} />
                  <Route path="bookings" element={<GuestMyBookings />} />
                  <Route path="activities" element={<GuestActivityCataloguePage />} />
                  <Route path="activities/sessions" element={<GuestActivitySessionsPage />} />
                  <Route path="activities/book/:sessionId" element={<GuestActivityBookingPage />} />
                  <Route path="activities/:activityId" element={<GuestActivityDetailPage />} />
                  <Route path="restaurants" element={<GuestRestaurantBrowser />} />
                  <Route path="restaurants/book/:slotId" element={<GuestRestaurantBookingPage />} />
                  <Route path="feedback" element={<GuestStayFeedback />} />
                  <Route path="notifications" element={<GuestNotificationsPage />} />
                  <Route path="loyalty" element={<GuestLoyaltyPage />} />
                  <Route path="travel-party" element={<GuestTravelPartyPage />} />
                </Route>
                
                <Route path="*" element={<NotFound />} />
              </Routes>
                      </Suspense>
              </BrowserRouter>
                  </GuestAuthProvider>
                </ResortProvider>
              </AuthProvider>
            </TooltipProvider>
          </ThemeProvider>
        </ConnectionErrorBoundary>
      )}
    </QueryErrorResetBoundary>
  </QueryClientProvider>
);

export default App;
