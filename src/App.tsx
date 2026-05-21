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
import About from "./pages/About";
import Contact from "./pages/Contact";
import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";
import Unsubscribe from "./pages/Unsubscribe";

const queryClient = new QueryClient();

const App = () => {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showAuth, setShowAuth] = useState(false); // Don't block browsing; show only when user tries to sign in or do a protected action
  const [showProfile, setShowProfile] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const getSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!cancelled) {
          setUser(session?.user ?? null);
        }
      } catch (err) {
        console.warn("Session check failed:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    getSession();

    // Fallback: stop loading after 2s so the page never stays blank
    const timeout = setTimeout(() => {
      if (!cancelled) setLoading(false);
    }, 2000);

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (cancelled) return;
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          setUser(session?.user ?? null);
          setShowAuth(false);
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          setShowAuth(false);
        } else {
          setUser(session?.user ?? null);
          if (!session?.user) setShowAuth(false);
        }
        setLoading(false);
      }
    );

    return () => {
      cancelled = true;
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, []);

  const handleAuthSuccess = () => {
    setShowAuth(false);
    setShowProfile(false);
  };

  const handleLogout = () => {
    setUser(null);
    setShowProfile(false);
    setShowAuth(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary border-t-transparent" />
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
            <Route path="/about" element={<About />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/unsubscribe" element={<Unsubscribe />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
          
          {/* Auth Modal */}
          {showAuth && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
              <button
                type="button"
                onClick={() => setShowAuth(false)}
                className="absolute top-4 right-4 z-[60] w-10 h-10 rounded-full bg-background border shadow-md flex items-center justify-center text-xl text-muted-foreground hover:text-foreground hover:bg-muted"
                aria-label="Close"
              >
                ×
              </button>
              <Auth 
                onAuthSuccess={handleAuthSuccess}
                onBack={() => {}}
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
