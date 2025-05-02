import { useEffect } from "react";
import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import DesktopPage from "./pages/desktop-page";
import LandingPage from "./pages/landing-page";
import AuthPage from "./pages/auth-page";
import ClaraAgent from "./components/agents/ClaraAgent";
import NotesAgent from "./components/agents/NotesAgent";
import { useAgentStore } from "./state/agentStore";
import ThemeProvider from "./components/common/ThemeProvider";

function Router() {
  return (
    <Switch>
      {/* Landing page */}
      <Route path="/" component={LandingPage} />
      
      {/* Auth page */}
      <Route path="/auth" component={AuthPage} />
      
      {/* Desktop environment */}
      <Route path="/desktop" component={DesktopPage} />
      
      {/* Redirect old root path to landing page */}
      <Route path="/desktop/old">
        <Redirect to="/desktop" />
      </Route>
      
      {/* Fallback to 404 */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  // Register available agents with their actual components
  useEffect(() => {
    const agentStore = useAgentStore.getState();
    
    // Panion Agent
    const claraIcon = `
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" />
        <circle cx="12" cy="12" r="4" fill="currentColor" />
      </svg>
    `;
    
    agentStore.registerAgent({
      id: 'clara',
      title: 'Panion',
      icon: claraIcon,
      component: () => <ClaraAgent />,
      defaultPosition: { x: 100, y: 100 },
      defaultSize: { width: 640, height: 600 }
    });
    
    // Notes Agent
    const notesIcon = `
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M19 3H5C3.89543 3 3 3.89543 3 5V19C3 20.1046 3.89543 21 5 21H19C20.1046 21 21 20.1046 21 19V5C21 3.89543 20.1046 3 19 3Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M8 7H16" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M8 12H16" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M8 17H12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    `;
    
    agentStore.registerAgent({
      id: 'notes',
      title: 'Quick Notes',
      icon: notesIcon,
      component: () => <NotesAgent />,
      defaultPosition: { x: 760, y: 100 },
      defaultSize: { width: 400, height: 500 }
    });
    
    // Auto-open Panion window by default
    agentStore.openAgent('clara');
  }, []);
  
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
