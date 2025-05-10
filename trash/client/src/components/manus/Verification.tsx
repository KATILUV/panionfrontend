/**
 * Verification Component
 * Verifies if a given result correctly addresses an original query
 */

import React, { useState } from 'react';
import { useVerification, type Verification as VerificationType } from '@/hooks/useManus';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { 
  ShieldCheck, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  RefreshCw, 
  ArrowRightLeft,
  Book 
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface VerificationProps {
  sessionId: string;
  maxHeight?: string;
}

export function Verification({
  sessionId,
  maxHeight = '700px'
}: VerificationProps) {
  const [originalQuery, setOriginalQuery] = useState<string>('');
  const [result, setResult] = useState<string>('');
  const [activeTab, setActiveTab] = useState<string>('original');
  
  const {
    verification,
    isVerifying,
    verificationError,
    verifyResult
  } = useVerification();
  
  const handleVerify = () => {
    if (!originalQuery.trim() || !result.trim()) return;
    
    verifyResult({
      originalQuery,
      result,
      sessionId
    });
  };
  
  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-500';
    if (confidence >= 0.5) return 'text-amber-500';
    return 'text-red-500';
  };
  
  return (
    <Card className="w-full h-full overflow-hidden">
      <CardHeader>
        <CardTitle className="flex items-center">
          <ShieldCheck className="h-5 w-5 mr-2 text-green-500" />
          <span>Verification</span>
        </CardTitle>
        <CardDescription>
          Verify if a result correctly addresses the original query
        </CardDescription>
      </CardHeader>
      
      <CardContent className="px-4 pb-2">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full mb-4">
            <TabsTrigger value="original" className="flex-1">Original Query</TabsTrigger>
            <TabsTrigger value="result" className="flex-1">Result to Verify</TabsTrigger>
            {verification && (
              <TabsTrigger value="verification" className="flex-1">Verification</TabsTrigger>
            )}
          </TabsList>
          
          <TabsContent value="original" className="mt-0">
            <Textarea
              placeholder="Enter the original query or question..."
              value={originalQuery}
              onChange={(e) => setOriginalQuery(e.target.value)}
              className="resize-none min-h-[200px]"
              disabled={isVerifying}
            />
          </TabsContent>
          
          <TabsContent value="result" className="mt-0">
            <Textarea
              placeholder="Enter the result to verify..."
              value={result}
              onChange={(e) => setResult(e.target.value)}
              className="resize-none min-h-[200px]"
              disabled={isVerifying}
            />
          </TabsContent>
          
          {verification && (
            <TabsContent value="verification" className="mt-0">
              <ScrollArea style={{ maxHeight: `calc(${maxHeight} - 200px)` }}>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      {verification.isValid ? (
                        <CheckCircle2 className="h-5 w-5 mr-2 text-green-500" />
                      ) : (
                        <XCircle className="h-5 w-5 mr-2 text-red-500" />
                      )}
                      <span className="font-medium">
                        {verification.isValid ? 'Valid Result' : 'Invalid Result'}
                      </span>
                    </div>
                    <Badge 
                      variant={verification.isValid ? 'success' : 'destructive'}
                      className="ml-2"
                    >
                      {verification.isValid ? 'Valid' : 'Invalid'}
                    </Badge>
                  </div>
                  
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm font-medium">Confidence</span>
                      <span className={`text-sm font-medium ${getConfidenceColor(verification.confidence)}`}>
                        {Math.round(verification.confidence * 100)}%
                      </span>
                    </div>
                    <div className={`h-2 rounded-full w-full overflow-hidden ${
                        verification.confidence >= 0.8 ? 'bg-green-100' : 
                        verification.confidence >= 0.5 ? 'bg-amber-100' : 'bg-red-100'
                      }`}>
                      <div 
                        className={`h-full ${
                          verification.confidence >= 0.8 ? 'bg-green-500' : 
                          verification.confidence >= 0.5 ? 'bg-amber-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${verification.confidence * 100}%` }}
                      ></div>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-medium mb-1">Reasoning</h4>
                    <div className="text-sm text-muted-foreground p-3 bg-muted/30 rounded-md">
                      {verification.reasoning}
                    </div>
                  </div>
                  
                  {verification.correctedResult && (
                    <div>
                      <h4 className="text-sm font-medium mb-1 flex items-center">
                        <Book className="h-4 w-4 mr-1 text-blue-500" />
                        Corrected Result
                      </h4>
                      <div className="text-sm p-3 bg-blue-50 text-blue-800 rounded-md">
                        {verification.correctedResult}
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>
          )}
        </Tabs>
      </CardContent>
      
      <CardContent className="px-4 pt-0 pb-4">
        <Button
          className="w-full mt-4"
          onClick={handleVerify}
          disabled={!originalQuery.trim() || !result.trim() || isVerifying}
        >
          {isVerifying ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Verifying...
            </>
          ) : (
            <>
              <ArrowRightLeft className="h-4 w-4 mr-2" />
              Verify Result
            </>
          )}
        </Button>
      </CardContent>
      
      {verificationError && (
        <CardFooter className="pt-0 pb-4 px-4">
          <div className="w-full p-2 bg-red-50 text-red-800 rounded-md flex items-center">
            <AlertTriangle className="h-4 w-4 mr-2 text-red-500" />
            <span className="text-sm">
              {verificationError instanceof Error 
                ? verificationError.message 
                : 'Error verifying result'
              }
            </span>
          </div>
        </CardFooter>
      )}
    </Card>
  );
}

export default Verification;