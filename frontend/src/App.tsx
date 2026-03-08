import { Toaster as Sonner } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { CriminalsProvider } from '@/contexts/CriminalsContext';
import { AppLayout } from '@/components/layout/AppLayout';
import ErrorBoundary from '@/components/ErrorBoundary';
import Index from './pages/Index';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import CriminalsList from './pages/CriminalsList';
import CriminalDetail from './pages/CriminalDetail';
import CriminalNew from './pages/CriminalNew';
import CriminalEdit from './pages/CriminalEdit';
import SearchPage from './pages/SearchPage';
import HistoryPage from './pages/HistoryPage';
import AdminUsers from './pages/AdminUsers';
import ProfilePage from './pages/ProfilePage';
import NotFound from './pages/NotFound';

const queryClient = new QueryClient();

function ProtectedLayout() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return null;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <AppLayout>
      <Outlet />
    </AppLayout>
  );
}

function AdminOnlyLayout() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return null;
  }

  const isAdmin = user?.roles?.includes('ADMIN');
  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Index />} />
      <Route path="/login" element={<Login />} />
      <Route element={<ProtectedLayout />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/criminals" element={<CriminalsList />} />
        <Route path="/criminals/new" element={<CriminalNew />} />
        <Route path="/criminals/:id" element={<CriminalDetail />} />
        <Route path="/criminals/:id/edit" element={<CriminalEdit />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route element={<AdminOnlyLayout />}>
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/admin/users" element={<AdminUsers />} />
        </Route>
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <CriminalsProvider>
            <ErrorBoundary>
              <AppRoutes />
            </ErrorBoundary>
          </CriminalsProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
