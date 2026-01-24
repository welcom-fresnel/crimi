import { Toaster } from '@/components/ui/toaster';
import { Toaster as Sonner } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { CriminalsProvider } from '@/contexts/CriminalsContext';
import { AppLayout } from '@/components/layout/AppLayout';
import Index from './pages/Index';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import CriminalsList from './pages/CriminalsList';
import CriminalDetail from './pages/CriminalDetail';
import CriminalNew from './pages/CriminalNew';
import CriminalEdit from './pages/CriminalEdit';
import SearchPage from './pages/SearchPage';
import HistoryPage from './pages/HistoryPage';
import NotFound from './pages/NotFound';

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return <AppLayout>{children}</AppLayout>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Index />} />
      <Route path="/login" element={<Login />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/criminals"
        element={
          <ProtectedRoute>
            <CriminalsList />
          </ProtectedRoute>
        }
      />
      <Route
        path="/criminals/new"
        element={
          <ProtectedRoute>
            <CriminalNew />
          </ProtectedRoute>
        }
      />
      <Route
        path="/criminals/:id"
        element={
          <ProtectedRoute>
            <CriminalDetail />
          </ProtectedRoute>
        }
      />
      <Route
        path="/criminals/:id/edit"
        element={
          <ProtectedRoute>
            <CriminalEdit />
          </ProtectedRoute>
        }
      />
      <Route
        path="/search"
        element={
          <ProtectedRoute>
            <SearchPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/history"
        element={
          <ProtectedRoute>
            <HistoryPage />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <CriminalsProvider>
            <AppRoutes />
          </CriminalsProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
