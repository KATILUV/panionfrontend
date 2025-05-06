import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { AIThinking } from '@/components/ui/ai-thinking';
import { ToastDemo } from '@/components/ui/toast-demo';
import { ElementTransition } from '@/components/ui/page-transition';
import ErrorBoundary from '@/components/ui/error-boundary';
import { useToast } from '@/hooks/use-toast';

/**
 * Agent component to demonstrate various UI feedback elements
 */
export default function FeedbackDemoAgent() {
  const [isLoading, setIsLoading] = useState(false);
  const [showError, setShowError] = useState(false);
  const { toast } = useToast();

  const simulateLoading = () => {
    setIsLoading(true);
    toast({
      title: 'Loading...',
      description: 'Simulating a loading state',
      variant: 'loading',
    });
    
    setTimeout(() => {
      setIsLoading(false);
      toast({
        title: 'Completed',
        description: 'Loading simulation finished',
        variant: 'success',
      });
    }, 3000);
  };

  const triggerError = () => {
    setShowError(true);
  };

  const resetError = () => {
    setShowError(false);
  };

  // Error simulation component
  const ErrorSimulator = () => {
    if (showError) {
      throw new Error('This is a simulated error for testing error boundaries');
    }
    return null;
  };

  return (
    <div className="h-full flex flex-col bg-background rounded-md overflow-hidden">
      <div className="px-4 py-3 bg-muted/30 border-b">
        <h2 className="text-lg font-medium">UI Feedback Elements</h2>
        <p className="text-sm text-muted-foreground">
          Explore loading states, toasts, transitions, and error handling
        </p>
      </div>

      <Tabs defaultValue="spinners" className="flex-1 overflow-auto">
        <TabsList className="w-full justify-start px-4 pt-2">
          <TabsTrigger value="spinners">Spinners</TabsTrigger>
          <TabsTrigger value="toast">Toasts</TabsTrigger>
          <TabsTrigger value="ai">AI Thinking</TabsTrigger>
          <TabsTrigger value="transitions">Transitions</TabsTrigger>
          <TabsTrigger value="errors">Error Handling</TabsTrigger>
        </TabsList>

        {/* Spinner Demos */}
        <TabsContent value="spinners" className="p-4 space-y-6">
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Spinner Variants</h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="flex flex-col items-center gap-2 p-4 bg-muted/20 rounded-md">
                <Spinner size="md" />
                <span className="text-xs">Default</span>
              </div>
              <div className="flex flex-col items-center gap-2 p-4 bg-muted/20 rounded-md">
                <Spinner variant="dots" size="md" />
                <span className="text-xs">Dots</span>
              </div>
              <div className="flex flex-col items-center gap-2 p-4 bg-muted/20 rounded-md">
                <Spinner variant="pulse" size="md" />
                <span className="text-xs">Pulse</span>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-medium">Spinner Sizes</h3>
            <div className="flex items-end gap-4 py-4">
              <div className="flex flex-col items-center gap-2">
                <Spinner size="xs" />
                <span className="text-xs">xs</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <Spinner size="sm" />
                <span className="text-xs">sm</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <Spinner size="md" />
                <span className="text-xs">md</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <Spinner size="lg" />
                <span className="text-xs">lg</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <Spinner size="xl" />
                <span className="text-xs">xl</span>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-medium">Loading Demo</h3>
            <div className="flex items-center gap-4">
              <Button onClick={simulateLoading} disabled={isLoading}>
                {isLoading ? <Spinner size="sm" className="mr-2" /> : null}
                Simulate Loading
              </Button>
              {isLoading && <span className="text-sm">Loading...</span>}
            </div>
          </div>
        </TabsContent>

        {/* Toast Demos */}
        <TabsContent value="toast" className="p-4">
          <ToastDemo />
        </TabsContent>

        {/* AI Thinking Demos */}
        <TabsContent value="ai" className="p-4 space-y-8">
          <div className="space-y-4">
            <h3 className="text-lg font-medium">AI Thinking Indicators</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="flex flex-col items-center gap-3 p-6 bg-muted/20 rounded-md">
                <AIThinking mode="minimal" message="Simple indicator" />
                <span className="text-xs mt-4">Minimal Mode</span>
              </div>
              
              <div className="flex flex-col items-center gap-3 p-6 bg-muted/20 rounded-md">
                <AIThinking mode="standard" message="Standard indicator with more visual presence" />
                <span className="text-xs mt-4">Standard Mode</span>
              </div>
              
              <div className="flex flex-col items-center gap-3 p-6 bg-muted/20 rounded-md">
                <AIThinking mode="detailed" message="Clara is analyzing your request..." />
                <span className="text-xs mt-4">Detailed Mode</span>
              </div>
            </div>
          </div>
          
          <div className="space-y-4">
            <h3 className="text-lg font-medium">AI Thinking Sizes</h3>
            <div className="flex flex-col md:flex-row items-start gap-6 py-4">
              <div className="flex flex-col items-center gap-2">
                <AIThinking size="sm" mode="detailed" message="Small" />
                <span className="text-xs">Small</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <AIThinking size="md" mode="detailed" message="Medium" />
                <span className="text-xs">Medium</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <AIThinking size="lg" mode="detailed" message="Large" />
                <span className="text-xs">Large</span>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Transitions Demo */}
        <TabsContent value="transitions" className="p-4 space-y-6">
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Element Transitions</h3>
            
            <div className="space-y-4">
              <div className="flex gap-4">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setIsLoading(!isLoading);
                    toast({
                      title: isLoading ? 'Hidden Element' : 'Showing Element',
                      description: 'The element has been ' + (isLoading ? 'hidden' : 'revealed'),
                    });
                  }}
                >
                  {isLoading ? 'Hide Element' : 'Show Element'}
                </Button>
              </div>
              
              <div className="h-40 border rounded-md p-4 flex items-center justify-center bg-muted/10">
                <ElementTransition 
                  show={isLoading} 
                  type="scale" 
                  duration={0.5}
                >
                  <div className="p-6 bg-primary/10 rounded-lg border border-primary/30 text-center">
                    <p className="text-lg">This element animates in and out</p>
                    <p className="text-sm text-muted-foreground">Using scale transition</p>
                  </div>
                </ElementTransition>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Error Handling Demo */}
        <TabsContent value="errors" className="p-4 space-y-6">
          <ErrorBoundary
            fallback={
              <div className="p-6 bg-red-500/10 rounded-lg border border-red-500/30 text-center">
                <h3 className="text-lg font-medium text-red-500 mb-2">Oops! Something went wrong</h3>
                <p className="text-sm mb-4">This is a controlled error for demonstration purposes.</p>
                <Button variant="destructive" onClick={resetError}>Reset Error</Button>
              </div>
            }
          >
            <ErrorSimulator />
            
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Error Boundaries</h3>
              <p className="text-sm text-muted-foreground">
                Error boundaries catch JavaScript errors anywhere in their child component tree,
                log those errors, and display a fallback UI instead of crashing the whole app.
              </p>
              
              <Button 
                variant="destructive" 
                onClick={triggerError}
                disabled={showError}
              >
                Trigger Error
              </Button>
            </div>
          </ErrorBoundary>
        </TabsContent>
      </Tabs>
    </div>
  );
}