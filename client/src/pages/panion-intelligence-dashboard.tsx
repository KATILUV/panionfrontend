import React, { useState } from 'react';
import { PanionIntelligenceContainer } from '@/components/intelligence/PanionIntelligenceContainer';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { BrainCircuit, Lightbulb, MessagesSquare, Sparkles } from 'lucide-react';

export function PanionIntelligenceDashboard() {
  const [sessionId, setSessionId] = useState<string>('default-session');
  
  return (
    <div className="container mx-auto py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Panion Intelligence</h1>
          <p className="text-muted-foreground">
            Advanced cognitive capabilities with autonomous reasoning and strategic planning
          </p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Session Settings</CardTitle>
              <CardDescription>
                Configure the intelligence session and personalization
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Session ID</label>
                  <Input 
                    value={sessionId}
                    onChange={(e) => setSessionId(e.target.value)}
                    placeholder="Enter session identifier"
                  />
                  <p className="text-xs text-muted-foreground">
                    A unique identifier for this intelligence session. Use different IDs to manage separate contexts.
                  </p>
                </div>
                
                <Separator />
                
                <div>
                  <h3 className="font-medium mb-2">Capabilities</h3>
                  <div className="grid gap-3">
                    <Card className="bg-blue-50 dark:bg-blue-950/30">
                      <CardContent className="p-4 flex items-center">
                        <BrainCircuit className="h-8 w-8 mr-3 text-blue-500" />
                        <div>
                          <h3 className="font-medium">Proactive</h3>
                          <p className="text-sm text-muted-foreground">
                            Generates insights without prompting
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="bg-amber-50 dark:bg-amber-950/30">
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
                    <Card className="bg-green-50 dark:bg-green-950/30">
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
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        <div className="col-span-1 md:col-span-2">
          <Card className="h-full">
            <CardHeader>
              <CardTitle>Intelligence Dashboard</CardTitle>
              <CardDescription>
                Advanced reasoning, verification, and autonomous task management
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[800px]">
                <PanionIntelligenceContainer sessionId={sessionId} maxHeight="700px" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default PanionIntelligenceDashboard;