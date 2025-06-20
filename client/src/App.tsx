import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Dashboard from "@/pages/dashboard";
import SimpleDashboard from "@/pages/simple-dashboard";
import AIInsights from "@/pages/ai-insights";
import PlatformIntegrations from "@/pages/platform-integrations";
import DeviceControl from "@/pages/device-control";
import DeviceDiscovery from "@/pages/device-discovery";
import PingMonitoring from "@/pages/ping-monitoring";
import UserOnboarding from "@/pages/user-onboarding";
import PetRecognition from "@/pages/pet-recognition";
import PredictiveMaintenance from "@/pages/predictive-maintenance";
import PredictiveAnalytics from "@/pages/predictive-analytics";
import AdvancedAnalytics from "@/pages/advanced-analytics";
import NetworkTopology from "@/pages/network-topology";
import MobilePingDashboard from "@/pages/mobile-ping-dashboard";
import DownloadPage from "@/pages/download";
import TermsOfService from "@/pages/terms-of-service";
import PrivacyPolicy from "@/pages/privacy-policy";
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
      <Route path="/" component={Dashboard} />
      <Route path="/ai-insights" component={AIInsights} />
      <Route path="/platforms" component={PlatformIntegrations} />
      <Route path="/device-control" component={DeviceControl} />
      <Route path="/device-discovery" component={DeviceDiscovery} />
      <Route path="/ping-monitoring" component={PingMonitoring} />
      <Route path="/onboarding" component={UserOnboarding} />
      <Route path="/pet-recognition" component={PetRecognition} />
      <Route path="/predictive-maintenance" component={PredictiveMaintenance} />
      <Route path="/predictive-analytics" component={PredictiveAnalytics} />
      <Route path="/advanced-analytics" component={AdvancedAnalytics} />
      <Route path="/network-topology" component={NetworkTopology} />
      <Route path="/mobile-ping" component={MobilePingDashboard} />
      <Route path="/download" component={DownloadPage} />
      <Route path="/terms" component={TermsOfService} />
      <Route path="/privacy" component={PrivacyPolicy} />
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
