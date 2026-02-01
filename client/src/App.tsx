import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import SecurityDashboard from "@/pages/security-dashboard";
import HomeMap from "@/pages/dashboard";
import DeviceDiscovery from "@/pages/device-discovery";
import NetworkTopology from "@/pages/network-topology";
import PingMonitoring from "@/pages/ping-monitoring";
import AdvancedAnalytics from "@/pages/advanced-analytics";
import UserOnboarding from "@/pages/user-onboarding";
import DownloadPage from "@/pages/download";
import TermsOfService from "@/pages/terms-of-service";
import PrivacyPolicy from "@/pages/privacy-policy";
import HelpPage from "@/pages/help";
import NotFound from "@/pages/not-found";
import { Component, ErrorInfo, ReactNode } from "react";

class ErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('App Error Boundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ 
          padding: '20px', 
          textAlign: 'center', 
          fontFamily: 'Arial, sans-serif',
          backgroundColor: '#f8f9fa',
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center'
        }}>
          <h1 style={{ color: '#dc3545', marginBottom: '16px' }}>SmartBlueprint Pro</h1>
          <h2 style={{ color: '#6c757d', marginBottom: '16px' }}>Loading Error</h2>
          <p style={{ color: '#6c757d', marginBottom: '16px' }}>
            The application encountered an error while loading. Please refresh the page.
          </p>
          <button 
            onClick={() => window.location.reload()}
            style={{
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              padding: '10px 20px',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Refresh Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

function Router() {
  return (
    <Switch>
      {/* Security Dashboard - main landing page for home security */}
      <Route path="/" component={SecurityDashboard} />

      {/* Home Security Map - WiFi signal visualization and room mapping */}
      <Route path="/map" component={HomeMap} />

      {/* Device Management - discover and manage trusted devices */}
      <Route path="/devices" component={DeviceDiscovery} />

      {/* Network View - see network topology and connections */}
      <Route path="/network" component={NetworkTopology} />

      {/* Device Monitoring - real-time device health and status */}
      <Route path="/monitoring" component={PingMonitoring} />

      {/* Security Analytics - event analysis and insights */}
      <Route path="/analytics" component={AdvancedAnalytics} />

      {/* Setup - initial configuration and calibration */}
      <Route path="/setup" component={UserOnboarding} />

      {/* Mobile App Download */}
      <Route path="/download" component={DownloadPage} />

      {/* Legal Pages */}
      <Route path="/terms" component={TermsOfService} />
      <Route path="/privacy" component={PrivacyPolicy} />

      {/* Help & Documentation */}
      <Route path="/help" component={HelpPage} />

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  console.log('App component rendering...');
  
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <div style={{ minHeight: '100vh', backgroundColor: '#f8f9fa' }}>
            <Toaster />
            <Router />
          </div>
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
