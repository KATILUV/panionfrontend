/**
 * Verification Component
 * Metacognitive verification of results with self-correction capabilities
 */

import React, { useState } from 'react';
import { useVerification } from '@/hooks/useManus';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { 
  CheckCircle2, 
  AlertTriangle, 
  RefreshCw, 
  ShieldCheck,
  AlertCircle,
  Lightbulb,
  Copy
} from 'lucide-react';

interface VerificationProps {
  sessionId: string;
  onCorrection?: (correctedResult: string) => void;
  defaultQuery?: string;
  defaultResult?: string;
}

export function Verification({
  sessionId,
  onCorrection,
  defaultQuery = '',
  defaultResult = ''
}: VerificationProps) {
  const { toast } = useToast();
  const [originalQuery, setOriginalQuery] = useState(defaultQuery);
  const [result, setResult] = useState(defaultResult);
  
  const { 
    verifyResult, 
    isVerifying, 
    verification, 
    verificationError 
  } = useVerification();

  // Handle form submit
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!originalQuery.trim() || !result.trim()) {
      toast({
        title: "Missing information",
        description: "Please provide both the original query and the result to verify.",
        variant: "destructive"
      });
      return;
    }

    verifyResult({ originalQuery, result, sessionId });
  };

  // Handle using the corrected result
  const handleUseCorrectedResult = () => {
    if (verification?.correctedResult) {
      setResult(verification.correctedResult);
      
      if (onCorrection) {
        onCorrection(verification.correctedResult);
      }
      
      toast({
        title: "Correction applied",
        description: "The result has been updated with the correction."
      });
    }
  };

  // Handle copying the result
  const handleCopyResult = (textToCopy: string) => {
    navigator.clipboard.writeText(textToCopy).then(() => {
      toast({
        title: "Copied to clipboard",
        description: "The text has been copied to your clipboard."
      });
    }).catch(() => {
      toast({
        title: "Copy failed",
        description: "Failed to copy text to clipboard.",
        variant: "destructive"
      });
    });
  };
  
  return (
    <Card className="w-full h-full overflow-hidden">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center">
          <ShieldCheck className="h-5 w-5 mr-2 text-blue-500" />
          <span>Metacognitive Verification</span>
        </CardTitle>
        <CardDescription>
          Verify and improve results through "thinking about thinking"
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="originalQuery" className="text-sm font-medium">
              Original Query
            </label>
            <Textarea
              id="originalQuery"
              placeholder="Enter the original query or problem..."
              value={originalQuery}
              onChange={e => setOriginalQuery(e.target.value)}
              className="resize-none"
              rows={2}
            />
          </div>
          
          <div className="space-y-2">
            <label htmlFor="result" className="text-sm font-medium">
              Result to Verify
            </label>
            <Textarea
              id="result"
              placeholder="Enter the result that needs verification..."
              value={result}
              onChange={e => setResult(e.target.value)}
              className="resize-none"
              rows={4}
            />
          </div>
          
          <Button type="submit" disabled={isVerifying || !originalQuery.trim() || !result.trim()}>
            {isVerifying ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Verifying...
              </>
            ) : (
              <>
                <ShieldCheck className="h-4 w-4 mr-2" />
                Verify Result
              </>
            )}
          </Button>
        </form>
        
        {verification && (
          <div className="mt-6 space-y-4">
            <Alert variant={verification.isValid ? "default" : "destructive"}>
              <div className="flex items-start">
                {verification.isValid ? (
                  <CheckCircle2 className="h-5 w-5 mr-2 text-green-500 mt-0.5" />
                ) : (
                  <AlertCircle className="h-5 w-5 mr-2 text-red-500 mt-0.5" />
                )}
                <div>
                  <AlertTitle>
                    {verification.isValid 
                      ? "Verification passed" 
                      : "Verification failed"
                    }
                    <span className="ml-2 text-sm font-normal">
                      (Confidence: {Math.round(verification.confidence * 100)}%)
                    </span>
                  </AlertTitle>
                  <AlertDescription className="mt-1">
                    {verification.reasoning}
                  </AlertDescription>
                </div>
              </div>
            </Alert>
            
            {!verification.isValid && verification.correctedResult && (
              <div className="space-y-2">
                <div className="flex items-center">
                  <Lightbulb className="h-4 w-4 mr-2 text-amber-500" />
                  <span className="font-medium">Suggested correction:</span>
                </div>
                <Card className="bg-muted">
                  <CardContent className="p-3">
                    <div className="flex justify-between items-start mb-2">
                      <p className="whitespace-pre-wrap text-sm">{verification.correctedResult}</p>
                      <Button 
                        size="sm" 
                        variant="ghost"
                        onClick={() => handleCopyResult(verification.correctedResult || '')}
                        className="ml-2"
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                    <Button 
                      size="sm" 
                      onClick={handleUseCorrectedResult}
                      className="mt-2"
                    >
                      Apply Correction
                    </Button>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        )}
        
        {verificationError && (
          <Alert variant="destructive" className="mt-4">
            <AlertCircle className="h-4 w-4 mr-2" />
            <AlertTitle>Error during verification</AlertTitle>
            <AlertDescription>
              {verificationError.message}
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}

export default Verification;