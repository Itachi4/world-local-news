import { useState, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import UserProfile from "./components/UserProfile";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showAuth, setShowAuth] = useState(true); // Always show auth by default
  const [showProfile, setShowProfile] = useState(false);

  useEffect(() => {
    // Get initial session
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
      setShowAuth(!session?.user); // Only show auth if no user
      setLoading(false);
    };

    getSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setUser(session?.user ?? null);
        setShowAuth(!session?.user); // Only show auth if no user
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const handleAuthSuccess = () => {
    setShowAuth(false);
    setShowProfile(false);
  };

  const handleLogout = () => {
    setUser(null);
    setShowProfile(false);
    setShowAuth(true); // Show auth modal after logout
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route 
              path="/" 
              element={
                <Index 
                  user={user}
                  onLogin={() => setShowAuth(true)}
                  onProfile={() => setShowProfile(true)}
                />
              } 
            />
            <Route path="*" element={<NotFound />} />
          </Routes>
          
          {/* Auth Modal */}
          {showAuth && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
              <Auth 
                onAuthSuccess={handleAuthSuccess}
                onBack={() => {}} // Not used anymore
              />
            </div>
          )}
          
          {/* Profile Modal */}
          {showProfile && user && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
              <div className="relative">
                <button
                  onClick={() => setShowProfile(false)}
                  className="absolute -top-4 -right-4 w-8 h-8 rounded-full bg-background border flex items-center justify-center hover:bg-muted"
                >
                  ×
                </button>
                <UserProfile onLogout={handleLogout} />
              </div>
            </div>
          )}
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
