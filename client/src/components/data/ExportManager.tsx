import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Download, File, FileText, Table, DatabaseIcon, Copy, Settings, Check } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import { toast } from '@/hooks/use-toast';

// Define available export formats
type ExportFormat = 'csv' | 'json' | 'xlsx' | 'xml' | 'txt';

interface ExportField {
  key: string;
  label: string;
  required?: boolean;
  selected: boolean;
}

interface ExportPreset {
  id: string;
  name: string;
  format: ExportFormat;
  fields: string[];
  description?: string;
}

interface ExportManagerProps {
  data: any[];
  fields: ExportField[];
  onExport: (format: ExportFormat, data: any[], fields: string[], options: Record<string, any>) => Promise<string>;
  presets?: ExportPreset[];
  onSavePreset?: (preset: Omit<ExportPreset, 'id'>) => void;
}

const FormatIcon = ({ format }: { format: ExportFormat }) => {
  switch (format) {
    case 'csv':
      return <Table className="h-5 w-5 text-green-500" />;
    case 'json':
      return <DatabaseIcon className="h-5 w-5 text-blue-500" />;
    case 'xlsx':
      return <Table className="h-5 w-5 text-emerald-500" />;
    case 'xml':
      return <FileText className="h-5 w-5 text-orange-500" />;
    case 'txt':
      return <File className="h-5 w-5 text-gray-500" />;
    default:
      return <File className="h-5 w-5" />;
  }
};

const ExportManager: React.FC<ExportManagerProps> = ({
  data,
  fields,
  onExport,
  presets = [],
  onSavePreset
}) => {
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('csv');
  const [selectedFields, setSelectedFields] = useState<ExportField[]>(fields);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [lastDownloadUrl, setLastDownloadUrl] = useState<string | null>(null);
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [newPresetName, setNewPresetName] = useState('');
  const [newPresetDescription, setNewPresetDescription] = useState('');
  const [exportOptions, setExportOptions] = useState({
    includeHeaders: true,
    prettify: true,
    delimiter: ',',
    quoteValues: true,
    dateFormat: 'YYYY-MM-DD',
    zipOutput: false
  });

  // Toggle field selection
  const toggleField = (key: string) => {
    setSelectedFields(prevFields =>
      prevFields.map(field =>
        field.key === key && !field.required
          ? { ...field, selected: !field.selected }
          : field
      )
    );
  };

  // Toggle all fields
  const toggleAllFields = (selected: boolean) => {
    setSelectedFields(prevFields =>
      prevFields.map(field =>
        field.required ? field : { ...field, selected }
      )
    );
  };

  // Apply a preset
  const applyPreset = (presetId: string) => {
    const preset = presets.find(p => p.id === presetId);
    if (!preset) return;

    setSelectedFormat(preset.format);
    setSelectedFields(prevFields =>
      prevFields.map(field => ({
        ...field,
        selected: field.required || preset.fields.includes(field.key)
      }))
    );
    setSelectedPreset(presetId);
  };

  // Save current configuration as a preset
  const saveAsPreset = () => {
    if (!onSavePreset || !newPresetName) return;

    const newPreset = {
      name: newPresetName,
      format: selectedFormat,
      fields: selectedFields.filter(f => f.selected).map(f => f.key),
      description: newPresetDescription || undefined
    };

    onSavePreset(newPreset);
    setNewPresetName('');
    setNewPresetDescription('');
    toast({
      title: "Export preset saved",
      description: `Preset "${newPresetName}" has been saved for future use.`
    });
  };

  // Handle the export process
  const handleExport = async () => {
    try {
      setIsExporting(true);
      setExportProgress(10);

      // Get only the selected fields
      const selectedFieldKeys = selectedFields
        .filter(field => field.selected)
        .map(field => field.key);

      // Progress simulation
      const progressInterval = setInterval(() => {
        setExportProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      // Perform the export
      const downloadUrl = await onExport(
        selectedFormat, 
        data, 
        selectedFieldKeys, 
        exportOptions
      );

      clearInterval(progressInterval);
      setExportProgress(100);
      setLastDownloadUrl(downloadUrl);

      // Auto download
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.setAttribute('download', `export-${new Date().toISOString().slice(0, 10)}.${selectedFormat}`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: "Export complete",
        description: `Your data has been exported as ${selectedFormat.toUpperCase()}.`
      });
    } catch (error) {
      console.error('Export failed:', error);
      toast({
        title: "Export failed",
        description: "There was an error exporting your data. Please try again.",
        variant: "destructive"
      });
    } finally {
      setTimeout(() => {
        setIsExporting(false);
        setExportProgress(0);
      }, 1000);
    }
  };

  // Count selected fields
  const selectedFieldCount = selectedFields.filter(f => f.selected).length;

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Export Data</CardTitle>
        <CardDescription>
          Export your data in various formats with customizable options
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="format" className="w-full">
          <TabsList className="grid grid-cols-3 mb-4">
            <TabsTrigger value="format">Format</TabsTrigger>
            <TabsTrigger value="fields">Fields</TabsTrigger>
            <TabsTrigger value="options">Options</TabsTrigger>
          </TabsList>

          {/* Format Selection Tab */}
          <TabsContent value="format" className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {(['csv', 'json', 'xlsx', 'xml', 'txt'] as ExportFormat[]).map(format => (
                <div
                  key={format}
                  className={`border rounded-lg p-4 cursor-pointer hover:border-primary transition-colors ${
                    selectedFormat === format ? 'bg-primary/10 border-primary' : ''
                  }`}
                  onClick={() => setSelectedFormat(format)}
                >
                  <div className="flex flex-col items-center text-center">
                    <FormatIcon format={format} />
                    <h3 className="mt-2 font-medium">{format.toUpperCase()}</h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      {format === 'csv' && 'Comma-separated values'}
                      {format === 'json' && 'JavaScript Object Notation'}
                      {format === 'xlsx' && 'Excel Spreadsheet'}
                      {format === 'xml' && 'Extensible Markup Language'}
                      {format === 'txt' && 'Plain Text'}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {presets.length > 0 && (
              <div className="mt-6">
                <h3 className="text-sm font-medium mb-2">Saved Presets</h3>
                <div className="border rounded-md">
                  <ScrollArea className="h-[160px]">
                    {presets.map(preset => (
                      <div 
                        key={preset.id}
                        className={`p-3 flex items-center justify-between border-b last:border-b-0 cursor-pointer hover:bg-muted/50 ${
                          selectedPreset === preset.id ? 'bg-primary/10' : ''
                        }`}
                        onClick={() => applyPreset(preset.id)}
                      >
                        <div className="flex items-center">
                          <FormatIcon format={preset.format} />
                          <div className="ml-3">
                            <h4 className="text-sm font-medium">{preset.name}</h4>
                            <p className="text-xs text-muted-foreground">{preset.description || `${preset.format.toUpperCase()} with ${preset.fields.length} fields`}</p>
                          </div>
                        </div>
                        <div>
                          {selectedPreset === preset.id && (
                            <Check className="w-4 h-4 text-primary" />
                          )}
                        </div>
                      </div>
                    ))}
                  </ScrollArea>
                </div>
              </div>
            )}
          </TabsContent>

          {/* Fields Selection Tab */}
          <TabsContent value="fields" className="space-y-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium">
                Select Fields ({selectedFieldCount} of {fields.length} selected)
              </h3>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => toggleAllFields(true)}
                >
                  Select All
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => toggleAllFields(false)}
                >
                  Deselect All
                </Button>
              </div>
            </div>

            <div className="border rounded-md overflow-hidden">
              <ScrollArea className="h-[300px]">
                <div className="divide-y">
                  {selectedFields.map(field => (
                    <div key={field.key} className="flex items-center space-x-2 p-3">
                      <Checkbox 
                        id={`field-${field.key}`}
                        checked={field.selected}
                        onCheckedChange={() => toggleField(field.key)}
                        disabled={field.required}
                      />
                      <Label 
                        htmlFor={`field-${field.key}`}
                        className={`flex-1 ${field.required ? 'font-medium' : ''}`}
                      >
                        {field.label}
                        {field.required && (
                          <span className="ml-1 text-xs text-muted-foreground">(Required)</span>
                        )}
                      </Label>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>

            {onSavePreset && (
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" className="mt-4">
                    <Settings className="mr-2 h-4 w-4" />
                    Save as Preset
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader>
                    <DialogTitle>Save Export Preset</DialogTitle>
                    <DialogDescription>
                      Create a reusable preset with your current export settings.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="preset-name">Preset Name</Label>
                      <Input
                        id="preset-name"
                        value={newPresetName}
                        onChange={(e) => setNewPresetName(e.target.value)}
                        placeholder="e.g., Business Contact Export"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="preset-description">Description (optional)</Label>
                      <Input
                        id="preset-description"
                        value={newPresetDescription}
                        onChange={(e) => setNewPresetDescription(e.target.value)}
                        placeholder="e.g., Export of business contacts with addresses"
                      />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Format: <span className="font-medium">{selectedFormat.toUpperCase()}</span> • 
                        Fields: <span className="font-medium">{selectedFieldCount}</span>
                      </p>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button onClick={saveAsPreset} disabled={!newPresetName}>
                      Save Preset
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </TabsContent>

          {/* Options Tab */}
          <TabsContent value="options" className="space-y-6">
            <div className="space-y-4">
              {/* Common Options */}
              <div>
                <h3 className="text-sm font-medium mb-3">General Options</h3>
                <div className="flex flex-col gap-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="include-headers"
                      checked={exportOptions.includeHeaders}
                      onCheckedChange={(checked) => 
                        setExportOptions({...exportOptions, includeHeaders: !!checked})
                      }
                    />
                    <Label htmlFor="include-headers">Include Headers/Column Names</Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="prettify"
                      checked={exportOptions.prettify}
                      onCheckedChange={(checked) => 
                        setExportOptions({...exportOptions, prettify: !!checked})
                      }
                    />
                    <Label htmlFor="prettify">Prettify/Format Output</Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="zip-output"
                      checked={exportOptions.zipOutput}
                      onCheckedChange={(checked) => 
                        setExportOptions({...exportOptions, zipOutput: !!checked})
                      }
                    />
                    <Label htmlFor="zip-output">Compress Output (ZIP)</Label>
                  </div>
                </div>
              </div>
              
              <Separator />
              
              {/* Format-specific options */}
              {selectedFormat === 'csv' && (
                <div>
                  <h3 className="text-sm font-medium mb-3">CSV Options</h3>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="delimiter">Delimiter</Label>
                        <RadioGroup 
                          defaultValue={exportOptions.delimiter}
                          onValueChange={(value) => 
                            setExportOptions({...exportOptions, delimiter: value})
                          }
                        >
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="," id="comma" />
                            <Label htmlFor="comma">Comma (,)</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value=";" id="semicolon" />
                            <Label htmlFor="semicolon">Semicolon (;)</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="\t" id="tab" />
                            <Label htmlFor="tab">Tab</Label>
                          </div>
                        </RadioGroup>
                      </div>
                      
                      <div className="space-y-2">
                        <Label>Additional Options</Label>
                        <div className="flex items-center space-x-2">
                          <Checkbox 
                            id="quote-values"
                            checked={exportOptions.quoteValues}
                            onCheckedChange={(checked) => 
                              setExportOptions({...exportOptions, quoteValues: !!checked})
                            }
                          />
                          <Label htmlFor="quote-values">Quote Values</Label>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {selectedFormat === 'json' && (
                <div>
                  <h3 className="text-sm font-medium mb-3">JSON Options</h3>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="prettify-json"
                        checked={exportOptions.prettify}
                        onCheckedChange={(checked) => 
                          setExportOptions({...exportOptions, prettify: !!checked})
                        }
                      />
                      <Label htmlFor="prettify-json">Prettify JSON with Indentation</Label>
                    </div>
                  </div>
                </div>
              )}
              
              {(selectedFormat === 'xlsx' || selectedFormat === 'csv') && (
                <div>
                  <h3 className="text-sm font-medium mb-3">Date Format</h3>
                  <RadioGroup 
                    defaultValue={exportOptions.dateFormat}
                    onValueChange={(value) => 
                      setExportOptions({...exportOptions, dateFormat: value})
                    }
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="YYYY-MM-DD" id="iso" />
                      <Label htmlFor="iso">ISO (YYYY-MM-DD)</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="MM/DD/YYYY" id="us" />
                      <Label htmlFor="us">US (MM/DD/YYYY)</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="DD/MM/YYYY" id="eu" />
                      <Label htmlFor="eu">EU (DD/MM/YYYY)</Label>
                    </div>
                  </RadioGroup>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>

        <div className="mt-6 space-y-4">
          {isExporting && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Exporting data...</span>
                <span>{exportProgress}%</span>
              </div>
              <Progress value={exportProgress} className="w-full" />
            </div>
          )}
          
          {lastDownloadUrl && !isExporting && (
            <div className="flex justify-between items-center p-3 bg-muted/30 rounded-md">
              <div className="text-sm">
                Last export ready for download
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex items-center gap-1"
                  onClick={() => {
                    const link = document.createElement('a');
                    link.href = lastDownloadUrl;
                    link.setAttribute('download', `export-${new Date().toISOString().slice(0, 10)}.${selectedFormat}`);
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                  }}
                >
                  <Download className="h-3 w-3" /> Download
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex items-center gap-1"
                  onClick={() => {
                    navigator.clipboard.writeText(lastDownloadUrl);
                    toast({
                      title: "Link copied",
                      description: "Download link copied to clipboard"
                    });
                  }}
                >
                  <Copy className="h-3 w-3" /> Copy Link
                </Button>
              </div>
            </div>
          )}
          
          <div className="flex justify-between">
            <div className="text-sm text-muted-foreground">
              {data.length} records • {selectedFieldCount} fields • {selectedFormat.toUpperCase()}
            </div>
            <Button
              onClick={handleExport}
              disabled={isExporting || selectedFieldCount === 0}
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Export Data
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ExportManager;