import React, { useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SplashScreen } from "@capacitor/splash-screen";
import Index from "./pages/Index.tsx";
import NotFound from "./pages/NotFound.tsx";
import { Capacitor } from "@capacitor/core";

// --- GLOBAL ERROR BOUNDARY ---
class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean; error: any }> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }
  componentDidCatch(error: any, info: any) {
    console.error("APP CRASH:", error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          height: '100vh', width: '100vw', background: '#121821', color: '#e6edf3',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          padding: '2rem', textAlign: 'center', fontFamily: 'Sora, sans-serif'
        }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚠️</div>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>Something went wrong.</h2>
          <p style={{ fontSize: '0.85rem', color: '#8b949e', marginBottom: '1.5rem', maxWidth: '300px' }}>
            The app encountered a runtime error and could not continue.
          </p>
          <div style={{
            background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '12px',
            fontSize: '0.7rem', color: '#f78166', fontFamily: 'monospace', marginBottom: '1.5rem',
            maxWidth: '90%', overflow: 'auto', textAlign: 'left'
          }}>
            {this.state.error?.toString()}
          </div>
          <button
            onClick={() => window.location.reload()}
            style={{
              background: '#58a6ff', color: 'white', border: 'none',
              padding: '0.75rem 2rem', borderRadius: '12px', fontWeight: 'bold',
              cursor: 'pointer', boxShadow: '0 4px 20px rgba(88,166,255,0.3)'
            }}
          >
            Reload App
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

const queryClient = new QueryClient();

const App = () => {
  useEffect(() => {
    // Hide splash screen after app mounts to prevent black screen
    const hideSplash = async () => {
      try {
        await SplashScreen.hide();
      } catch (e) {
        console.warn("SplashScreen.hide() failed", e);
      }
    };
    hideSplash();
  }, []);

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default App;
