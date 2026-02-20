import { Toaster } from '@/components/ui/toaster'
import { Toaster as Sonner } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from '@/contexts/AuthContext'
import { OrdersProvider } from '@/contexts/OrdersContext'
import { ThemeProvider } from '@/contexts/ThemeContext'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { AppLayout } from '@/components/layout/AppLayout'
import Index from './pages/Index'
import Kitchen from './pages/Kitchen'
import Analytics from './pages/Analytics'
import Admin from './pages/Admin'
import WhitelistAdmin from './pages/WhitelistAdmin'
import Login from './pages/Login'
import Signup from './pages/Signup'
import ConfirmEmail from './pages/ConfirmEmail'
import NotFound from './pages/NotFound'
import Pedir from './pages/Pedir'

const queryClient = new QueryClient()

const App = () => (
  <ThemeProvider>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              {/* Public routes (no sidebar) */}
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/confirm-email" element={<ConfirmEmail />} />
              <Route path="/pedir" element={<Pedir />} />

              {/* Protected routes with shared OrdersProvider + AppLayout */}
              <Route
                element={
                  <ProtectedRoute>
                    <OrdersProvider>
                      <AppLayout />
                    </OrdersProvider>
                  </ProtectedRoute>
                }
              >
                <Route path="/" element={<Index />} />
                <Route path="/kitchen" element={<Kitchen />} />
                <Route path="/analytics" element={<Analytics />} />
                <Route path="/admin" element={<Admin />} />
                <Route path="/admin/whitelist" element={<WhitelistAdmin />} />
              </Route>

              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  </ThemeProvider>
)

export default App
