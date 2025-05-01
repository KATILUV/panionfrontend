import { useEffect } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Desktop from "./components/Desktop";
import ClaraAgent from "./components/agents/ClaraAgent";
import NotesAgent from "./components/agents/NotesAgent";
import { useAgentStore } from "./state/agentStore";

function Router() {
  return (
    <Switch>
      {/* Main desktop environment */}
      <Route path="/" component={Desktop} />
      {/* Fallback to 404 */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  // Register available agents with their actual components
  useEffect(() => {
    const agentStore = useAgentStore.getState();
    
    // Clara Agent
    const claraIcon = `
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" />
        <circle cx="12" cy="12" r="4" fill="currentColor" />
      </svg>
    `;
    
    agentStore.registerAgent({
      id: 'clara',
      title: 'Clara AI',
      icon: claraIcon,
      component: ClaraAgent,
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
      component: NotesAgent,
      defaultPosition: { x: 760, y: 100 },
      defaultSize: { width: 400, height: 500 }
    });
    
    // Auto-open Clara window by default
    agentStore.openAgent('clara');
  }, []);
  
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
