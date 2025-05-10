import React, { useState } from 'react';
import { ManusContainer } from '@/components/manus/ManusContainer';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { BrainCircuit, Lightbulb, MessagesSquare, Sparkles } from 'lucide-react';

export default function ManusDashboard() {
  const [sessionId, setSessionId] = useState<string>('default-session');
  const [customSessionId, setCustomSessionId] = useState<string>('');
  
  const handleSessionChange = () => {
    if (customSessionId.trim()) {
      setSessionId(customSessionId.trim());
    }
  };
  
  return (
    <div className="container mx-auto py-8">
      <div className="flex flex-col md:flex-row items-start gap-6 mb-8">
        <div className="flex-1">
          <h1 className="text-3xl font-bold tracking-tight mb-2 flex items-center">
            <BrainCircuit className="h-8 w-8 mr-2 text-purple-500" />
            Manus Intelligence Dashboard
          </h1>
          <p className="text-muted-foreground">
            Advanced reasoning, planning, and intelligent analysis capabilities
          </p>
        </div>
        
        <Card className="w-full md:w-80">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Session ID</CardTitle>
            <CardDescription>
              Change the active session ID
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex space-x-2">
              <Input 
                placeholder="Enter session ID..." 
                value={customSessionId}
                onChange={(e) => setCustomSessionId(e.target.value)}
              />
              <Button onClick={handleSessionChange}>Set</Button>
            </div>
          </CardContent>
          <CardFooter className="pt-0 text-xs text-muted-foreground">
            Current: <span className="font-mono ml-1">{sessionId}</span>
          </CardFooter>
        </Card>
      </div>
      
      <div className="grid grid-cols-1 gap-8">
        <Card>
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-2xl font-bold">Manus Capabilities</CardTitle>
              <CardDescription>
                Explore Manus-like autonomous capabilities
              </CardDescription>
            </div>
            <div className="flex h-5 items-center space-x-4 text-sm">
              <div className="flex items-center">
                <div className="h-3 w-3 rounded-full bg-blue-500 mr-1"></div>
                <span className="text-muted-foreground">Active Session: {sessionId}</span>
              </div>
            </div>
          </CardHeader>
          <Separator />
          <CardContent className="pt-6">
            <div className="flex flex-col space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <Card className="bg-purple-50">
                  <CardContent className="p-4 flex items-center">
                    <Sparkles className="h-8 w-8 mr-3 text-purple-500" />
                    <div>
                      <h3 className="font-medium">Proactive</h3>
                      <p className="text-sm text-muted-foreground">
                        Generates insights without prompting
                      </p>
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-amber-50">
                  <CardContent className="p-4 flex items-center">
                    <Lightbulb className="h-8 w-8 mr-3 text-amber-500" />
                    <div>
                      <h3 className="font-medium">Multi-approach</h3>
                      <p className="text-sm text-muted-foreground">
                        Considers multiple reasoning paths
                      </p>
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-green-50">
                  <CardContent className="p-4 flex items-center">
                    <MessagesSquare className="h-8 w-8 mr-3 text-green-500" />
                    <div>
                      <h3 className="font-medium">Autonomous</h3>
                      <p className="text-sm text-muted-foreground">
                        Self-corrects and improves results
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
              
              {/* Manus Container */}
              <div className="h-[800px]">
                <ManusContainer sessionId={sessionId} maxHeight="700px" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}