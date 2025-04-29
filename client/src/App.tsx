import { Switch, Route, Link } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Chat from "@/pages/chat";
import Basic from "@/pages/basic";

function Router() {
  return (
    <Switch>
      {/* Main chat page */}
      <Route path="/" component={Chat} />
      {/* Basic test page with simplified input */}
      <Route path="/basic" component={Basic} />
      {/* Fallback to 404 */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
        
        {/* Dev navigation */}
        <div className="fixed bottom-4 right-4 bg-black/50 backdrop-blur-md p-2 rounded-xl text-xs text-white">
          <Link href="/">Main</Link> | <Link href="/basic">Basic</Link>
        </div>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
