import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { PermissionsProvider } from "@/contexts/PermissionsContext";
import { ProfileProvider } from "@/contexts/ProfileContext";
import { ThemeProvider } from "@/components/ThemeProvider";
import { AppLayout } from "@/components/layout/AppLayout";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Dashboard from "./pages/Dashboard";
import Agents from "./pages/Agents";
import AgentForm from "./pages/AgentForm";
import Conversations from "./pages/Conversations";
import Analytics from "./pages/Analytics";
import Settings from "./pages/Settings";
import Integrations from "./pages/Integrations";
import Profile from "./pages/Profile";
import Tenants from "./pages/Tenants";
import Team from "./pages/Team";
import AcceptInvite from "./pages/AcceptInvite";
import Notifications from "./pages/Notifications";
import ActivityLogs from "./pages/ActivityLogs";
import SecurityDashboard from "./pages/SecurityDashboard";
import SuperAdminDashboard from "./pages/SuperAdminDashboard";
import UserPermissions from "./pages/UserPermissions";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function LoadingSpinner() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-8 h-8 border-4 border-purple/30 border-t-purple rounded-full animate-spin" />
    </div>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) return <LoadingSpinner />;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) return <LoadingSpinner />;
  if (user) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

const AppRoutes = () => (
  <Routes>
    {/* Auth Routes */}
    <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
    <Route path="/signup" element={<PublicRoute><Signup /></PublicRoute>} />
    <Route path="/accept-invite" element={<AcceptInvite />} />
    
    {/* Protected App Routes */}
    <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/agents" element={<Agents />} />
      <Route path="/agents/new" element={<AgentForm />} />
      <Route path="/agents/:id/edit" element={<AgentForm />} />
      <Route path="/conversations" element={<Conversations />} />
      <Route path="/analytics" element={<Analytics />} />
      <Route path="/settings" element={<Settings />} />
      <Route path="/integrations" element={<Integrations />} />
      <Route path="/tenants" element={<Tenants />} />
      <Route path="/team" element={<Team />} />
      <Route path="/notifications" element={<Notifications />} />
      <Route path="/activity-logs" element={<ActivityLogs />} />
      <Route path="/security" element={<SecurityDashboard />} />
      <Route path="/super-admin" element={<SuperAdminDashboard />} />
      <Route path="/user-permissions" element={<UserPermissions />} />
      <Route path="/profile" element={<Profile />} />
    </Route>
    
    {/* Redirects */}
    <Route path="/" element={<Navigate to="/login" replace />} />
    
    {/* 404 */}
    <Route path="*" element={<NotFound />} />
  </Routes>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <AuthProvider>
            <ProfileProvider>
              <PermissionsProvider>
                <AppRoutes />
              </PermissionsProvider>
            </ProfileProvider>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
