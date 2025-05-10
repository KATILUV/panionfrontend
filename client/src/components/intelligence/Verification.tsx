/**
 * Verification Component
 * Verifies results against original queries and provides corrections
 */

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  CardFooter,
  CardDescription
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { 
  ShieldCheck, 
  AlertTriangle, 
  CheckCircle, 
  ArrowRightLeft,
  InfoIcon
} from 'lucide-react';
import { useVerification, type Verification as VerificationType } from '@/hooks/usePanionIntelligence';
import { Progress } from '@/components/ui/progress';

interface VerificationProps {
  sessionId: string;
  onCorrectedResult?: (result: string) => void;
}

export function Verification({ sessionId, onCorrectedResult }: VerificationProps) {
  const [originalQuery, setOriginalQuery] = useState<string>('');
  const [result, setResult] = useState<string>('');
  const { verification, isVerifying, verifyResult } = useVerification();
  
  const handleVerify = () => {
    if (originalQuery.trim() && result.trim()) {
      verifyResult({ originalQuery, result, sessionId });
    }
  };
  
  const handleApplyCorrection = () => {
    if (verification && verification.correctedResult && onCorrectedResult) {
      onCorrectedResult(verification.correctedResult);
      // Also update the local state
      setResult(verification.correctedResult);
    }
  };
  
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-medium mb-2">Result Verification</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Verify if a result correctly addresses the original query
        </p>
        
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-1.5 block">Original Query</label>
            <Textarea
              placeholder="Enter the original question or request..."
              value={originalQuery}
              onChange={(e) => setOriginalQuery(e.target.value)}
              className="min-h-[80px]"
            />
          </div>
          
          <div>
            <label className="text-sm font-medium mb-1.5 block">Result to Verify</label>
            <Textarea
              placeholder="Enter the result or response to verify..."
              value={result}
              onChange={(e) => setResult(e.target.value)}
              className="min-h-[120px]"
            />
          </div>
          
          <Button 
            onClick={handleVerify} 
            disabled={isVerifying || !originalQuery.trim() || !result.trim()}
          >
            {isVerifying ? (
              <>
                <ShieldCheck className="h-4 w-4 mr-2 animate-pulse" />
                Verifying...
              </>
            ) : (
              <>
                <ShieldCheck className="h-4 w-4 mr-2" />
                Verify Result
              </>
            )}
          </Button>
        </div>
      </div>
      
      {isVerifying && !verification && (
        <Card className="mt-6">
          <CardHeader className="pb-2">
            <Skeleton className="h-6 w-1/2" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          </CardContent>
          <CardFooter>
            <Skeleton className="h-9 w-40" />
          </CardFooter>
        </Card>
      )}
      
      {verification && (
        <Card className={`mt-6 border-2 ${verification.isValid ? 'border-green-200' : 'border-amber-200'}`}>
          <CardHeader className="pb-2">
            <div className="flex justify-between items-start">
              <CardTitle className="flex items-center">
                {verification.isValid ? (
                  <>
                    <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                    Result is Valid
                  </>
                ) : (
                  <>
                    <AlertTriangle className="h-5 w-5 text-amber-500 mr-2" />
                    Result Needs Improvement
                  </>
                )}
              </CardTitle>
              <Badge variant="outline" className="ml-2">
                {Math.round(verification.confidence * 100)}% confidence
              </Badge>
            </div>
            <CardDescription>
              <div className="mt-1">
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <InfoIcon className="h-3.5 w-3.5" />
                  Confidence score
                </div>
                <Progress 
                  value={verification.confidence * 100} 
                  className="h-2 mt-1" 
                />
              </div>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-medium mb-1">Analysis</h4>
                <p className="text-sm">{verification.reasoning}</p>
              </div>
              
              {verification.correctedResult && (
                <div className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-md">
                  <h4 className="text-sm font-medium mb-2 flex items-center">
                    <ArrowRightLeft className="h-4 w-4 text-amber-500 mr-1" />
                    Suggested Improvement
                  </h4>
                  <p className="text-sm whitespace-pre-line">{verification.correctedResult}</p>
                </div>
              )}
            </div>
          </CardContent>
          
          {verification.correctedResult && onCorrectedResult && (
            <CardFooter>
              <Button variant="outline" onClick={handleApplyCorrection}>
                Apply Suggested Improvement
              </Button>
            </CardFooter>
          )}
        </Card>
      )}
    </div>
  );
}

export default Verification;