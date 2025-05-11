import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Loader2, Upload, Image as ImageIcon, CheckCircle2, AlertCircle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Progress } from '@/components/ui/progress';

// Define types for the component
interface AgentAnalysis {
  agentId: string;
  analysis: string;
  confidence: number;
  focusAreas: string[];
  timestamp: string;
}

interface CollaborationInsight {
  type: 'observation' | 'contradiction' | 'enhancement' | 'question' | 'synthesis';
  content: string;
  sourceAgents: string[];
  confidence: number;
}

interface CollaborationSummary {
  mainFindings: string;
  consensusDescription: string;
  keyInsights: string[];
  uncertainties: string[];
  suggestedFollowups: string[];
}

interface VisualCollaborationResult {
  imageUrl: string;
  analysisId: string;
  sessionTimestamp: string;
  agentAnalyses: AgentAnalysis[];
  insights: CollaborationInsight[];
  summary: CollaborationSummary;
  conversationMode: string;
}

// Define conversation modes for the component
const conversationModes = [
  { value: 'casual', label: 'Casual', description: 'Everyday conversation with a friendly tone' },
  { value: 'deep', label: 'Deep', description: 'Thoughtful, philosophical exploration of topics' },
  { value: 'strategic', label: 'Strategic', description: 'Goal-oriented analysis with actionable insights' },
  { value: 'logical', label: 'Logical', description: 'Clear, structured, and objective reasoning' },
  { value: 'creative', label: 'Creative', description: 'Imaginative and innovative exploration' },
  { value: 'technical', label: 'Technical', description: 'Detailed technical analysis' },
  { value: 'educational', label: 'Educational', description: 'Learning-focused with clear explanations' }
];

// Define agent colors for the visualization
const agentColors: Record<string, string> = {
  object_detector: 'bg-blue-100 border-blue-400',
  context_analyzer: 'bg-green-100 border-green-400',
  text_extractor: 'bg-purple-100 border-purple-400',
  emotion_interpreter: 'bg-red-100 border-red-400',
  technical_analyzer: 'bg-amber-100 border-amber-400',
  content_moderator: 'bg-gray-100 border-gray-400',
  symbol_analyzer: 'bg-indigo-100 border-indigo-400'
};

// Helper function to get a readable agent name
const getAgentReadableName = (agentId: string): string => {
  const agentNames: Record<string, string> = {
    object_detector: 'Object Detector',
    context_analyzer: 'Context Analyzer',
    text_extractor: 'Text Extractor',
    emotion_interpreter: 'Emotion Interpreter',
    technical_analyzer: 'Technical Analyzer',
    content_moderator: 'Content Moderator',
    symbol_analyzer: 'Symbol Analyzer'
  };
  return agentNames[agentId] || agentId;
};

// Helper function to get a readable insight type
const getInsightTypeName = (type: string): string => {
  const types: Record<string, string> = {
    observation: 'Observation',
    contradiction: 'Contradiction',
    enhancement: 'Enhancement',
    question: 'Question',
    synthesis: 'Synthesis'
  };
  return types[type] || type;
};

// Main component for visual collaboration
const VisualCollaboration: React.FC = () => {
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [selectedConversationMode, setSelectedConversationMode] = useState<string>('casual');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [collaborationResult, setCollaborationResult] = useState<VisualCollaborationResult | null>(null);
  const [activeTab, setActiveTab] = useState<string>('upload');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle file selection
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      
      // Check file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: 'File too large',
          description: 'Please select an image less than 5MB',
          variant: 'destructive'
        });
        return;
      }
      
      // Check file type
      if (!file.type.startsWith('image/')) {
        toast({
          title: 'Invalid file type',
          description: 'Please select an image file',
          variant: 'destructive'
        });
        return;
      }
      
      setSelectedImage(file);
      
      // Create preview URL
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle file drop
  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    
    if (event.dataTransfer.files && event.dataTransfer.files[0]) {
      const file = event.dataTransfer.files[0];
      
      // Check file type and size
      if (!file.type.startsWith('image/')) {
        toast({
          title: 'Invalid file type',
          description: 'Please drop an image file',
          variant: 'destructive'
        });
        return;
      }
      
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: 'File too large',
          description: 'Please select an image less than 5MB',
          variant: 'destructive'
        });
        return;
      }
      
      setSelectedImage(file);
      
      // Create preview URL
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle collaboration mode change
  const handleModeChange = (value: string) => {
    setSelectedConversationMode(value);
  };

  // Clear the selected image
  const handleClearImage = () => {
    setSelectedImage(null);
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Prevent default behavior for drag events
  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
  };

  // Upload the image for collaborative analysis
  const handleCollaboration = async () => {
    if (!selectedImage) {
      toast({
        title: 'No image selected',
        description: 'Please select an image for analysis',
        variant: 'destructive'
      });
      return;
    }

    try {
      setIsUploading(true);
      setUploadProgress(10);
      
      const formData = new FormData();
      formData.append('image', selectedImage);
      formData.append('conversationMode', selectedConversationMode);
      
      // Simulate progress for better UX
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 500);
      
      // Send request to the server
      const response = await fetch('/api/visual-collaboration', {
        method: 'POST',
        body: formData
      });
      
      clearInterval(progressInterval);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to analyze image collaboratively');
      }
      
      const result = await response.json();
      setUploadProgress(100);
      
      // Set the result and switch to the results tab
      setCollaborationResult(result.result);
      setActiveTab('results');
      
      toast({
        title: 'Collaboration Complete',
        description: 'Multiple AI agents have analyzed your image',
      });
      
    } catch (error) {
      console.error('Error during collaborative analysis:', error);
      toast({
        title: 'Analysis Failed',
        description: error instanceof Error ? error.message : 'An unexpected error occurred',
        variant: 'destructive'
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="upload">Upload Image</TabsTrigger>
          <TabsTrigger value="results" disabled={!collaborationResult}>Analysis Results</TabsTrigger>
        </TabsList>
        
        <TabsContent value="upload" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Multi-Agent Visual Collaboration</CardTitle>
              <CardDescription>
                Upload an image to be analyzed by multiple specialized AI agents working together
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Image upload area */}
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:bg-slate-50 transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  className="hidden"
                  accept="image/*"
                />
                
                {previewUrl ? (
                  <div className="space-y-4">
                    <img 
                      src={previewUrl} 
                      alt="Selected" 
                      className="max-h-64 mx-auto rounded-md"
                    />
                    <Button variant="outline" size="sm" onClick={(e) => {
                      e.stopPropagation();
                      handleClearImage();
                    }}>
                      Change Image
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="mx-auto rounded-full w-12 h-12 flex items-center justify-center bg-slate-100">
                      <Upload className="h-6 w-6 text-slate-500" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Click to upload or drag and drop</p>
                      <p className="text-xs text-gray-500 mt-1">SVG, PNG, JPG or GIF (max. 5MB)</p>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Conversation mode selector */}
              <div className="mt-6">
                <label className="block text-sm font-medium mb-2">Analysis Mode</label>
                <Select value={selectedConversationMode} onValueChange={handleModeChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a conversation mode" />
                  </SelectTrigger>
                  <SelectContent>
                    {conversationModes.map(mode => (
                      <SelectItem key={mode.value} value={mode.value}>
                        <div>
                          <div className="font-medium">{mode.label}</div>
                          <div className="text-xs text-gray-500">{mode.description}</div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {isUploading && (
                <div className="mt-6 space-y-2">
                  <div className="flex justify-between text-xs">
                    <span>Analyzing with multiple agents...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <Progress value={uploadProgress} />
                </div>
              )}
            </CardContent>
            <CardFooter className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={handleClearImage}
                disabled={!selectedImage || isUploading}
              >
                Clear
              </Button>
              <Button
                onClick={handleCollaboration}
                disabled={!selectedImage || isUploading}
              >
                {isUploading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <ImageIcon className="mr-2 h-4 w-4" />
                    Analyze Collaboratively
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        <TabsContent value="results" className="mt-4">
          {collaborationResult && (
            <Card>
              <CardHeader>
                <CardTitle>Multi-Agent Analysis Results</CardTitle>
                <CardDescription>
                  Combined analysis from {collaborationResult.agentAnalyses.length} specialized AI agents
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex flex-col md:flex-row gap-6">
                  {/* Image preview */}
                  <div className="md:w-1/3">
                    <img 
                      src={collaborationResult.imageUrl} 
                      alt="Analyzed" 
                      className="rounded-md w-full"
                    />
                    <div className="mt-2 text-sm">
                      <div><strong>Analysis ID:</strong> {collaborationResult.analysisId.substring(0, 8)}...</div>
                      <div><strong>Mode:</strong> {conversationModes.find(m => m.value === collaborationResult.conversationMode)?.label || collaborationResult.conversationMode}</div>
                    </div>
                  </div>
                  
                  {/* Summary */}
                  <div className="md:w-2/3">
                    <h3 className="text-lg font-medium mb-2">Summary</h3>
                    <p className="text-sm mb-4">{collaborationResult.summary.mainFindings}</p>
                    
                    <h4 className="text-sm font-medium mb-1">Key Insights</h4>
                    <ul className="text-sm mb-4 pl-5 list-disc">
                      {collaborationResult.summary.keyInsights.map((insight, idx) => (
                        <li key={idx}>{insight}</li>
                      ))}
                    </ul>
                    
                    {collaborationResult.summary.uncertainties.length > 0 && (
                      <>
                        <h4 className="text-sm font-medium mb-1">Uncertainties</h4>
                        <ul className="text-sm mb-4 pl-5 list-disc">
                          {collaborationResult.summary.uncertainties.map((uncertainty, idx) => (
                            <li key={idx}>{uncertainty}</li>
                          ))}
                        </ul>
                      </>
                    )}
                    
                    {collaborationResult.summary.suggestedFollowups.length > 0 && (
                      <>
                        <h4 className="text-sm font-medium mb-1">Suggested Follow-ups</h4>
                        <ul className="text-sm pl-5 list-disc">
                          {collaborationResult.summary.suggestedFollowups.map((followup, idx) => (
                            <li key={idx}>{followup}</li>
                          ))}
                        </ul>
                      </>
                    )}
                  </div>
                </div>
                
                <Separator />
                
                {/* Insights from Collaboration */}
                <div>
                  <h3 className="text-lg font-medium mb-3">Collaborative Insights</h3>
                  <div className="grid gap-3">
                    {collaborationResult.insights.map((insight, idx) => (
                      <div key={idx} className="border rounded-md p-3">
                        <div className="flex items-center justify-between mb-2">
                          <div className="font-medium flex items-center">
                            {insight.type === 'contradiction' ? (
                              <AlertCircle className="h-4 w-4 text-amber-500 mr-1" />
                            ) : (
                              <CheckCircle2 className="h-4 w-4 text-green-500 mr-1" />
                            )}
                            {getInsightTypeName(insight.type)}
                          </div>
                          <div className="text-xs bg-slate-100 px-2 py-1 rounded">
                            Confidence: {(insight.confidence * 100).toFixed(0)}%
                          </div>
                        </div>
                        <p className="text-sm mb-2">{insight.content}</p>
                        <div className="flex flex-wrap gap-1 text-xs">
                          {insight.sourceAgents.map(agentId => (
                            <span key={agentId} className={`px-2 py-0.5 rounded-full border ${agentColors[agentId] || 'bg-gray-100 border-gray-300'}`}>
                              {getAgentReadableName(agentId)}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                
                <Separator />
                
                {/* Individual Agent Analyses */}
                <div>
                  <h3 className="text-lg font-medium mb-3">Individual Agent Analyses</h3>
                  <Accordion type="single" collapsible className="w-full">
                    {collaborationResult.agentAnalyses.map((analysis) => (
                      <AccordionItem key={analysis.agentId} value={analysis.agentId}>
                        <AccordionTrigger>
                          <div className="flex items-center justify-between w-full pr-4">
                            <div className="font-medium">{getAgentReadableName(analysis.agentId)}</div>
                            <div className="text-xs bg-slate-100 px-2 py-1 rounded">
                              Confidence: {(analysis.confidence * 100).toFixed(0)}%
                            </div>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="p-2 space-y-2">
                            <p className="text-sm whitespace-pre-line">{analysis.analysis}</p>
                            <div className="flex flex-wrap gap-1 mt-2">
                              {analysis.focusAreas.map((area, idx) => (
                                <span key={idx} className="text-xs px-2 py-0.5 bg-slate-100 rounded-full">
                                  {area}
                                </span>
                              ))}
                            </div>
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </div>
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button variant="outline" onClick={() => setActiveTab('upload')}>
                  Upload Another Image
                </Button>
                <Button onClick={() => window.print()}>
                  Export Results
                </Button>
              </CardFooter>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default VisualCollaboration;