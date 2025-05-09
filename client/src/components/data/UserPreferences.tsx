import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Save, Check, Trash, History, RefreshCw } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface LocationPreference {
  name: string;
  state: string;
  city?: string;
  zipCode?: string;
  isDefault?: boolean;
}

interface CategoryPreference {
  name: string;
  isDefault?: boolean;
  subCategories?: string[];
}

interface VisualizationPreference {
  type: string;
  colorScheme: string;
  showLegend: boolean;
  defaultView: 'chart' | 'table' | 'map' | 'grid';
}

interface ExportPreference {
  format: string;
  fields: string[];
  options: Record<string, any>;
  name: string;
}

interface UserPreferencesProps {
  onLocationPreferenceChange?: (locations: LocationPreference[]) => void;
  onCategoryPreferenceChange?: (categories: CategoryPreference[]) => void;
  onVisualizationPreferenceChange?: (preferences: VisualizationPreference) => void;
  onExportPreferenceChange?: (preferences: ExportPreference[]) => void;
  availableLocations?: { state: string; cities: string[] }[];
  availableCategories?: { name: string; subCategories: string[] }[];
  initialPreferences?: {
    locations: LocationPreference[];
    categories: CategoryPreference[];
    visualization: VisualizationPreference;
    exports: ExportPreference[];
    general: {
      autoSaveResults: boolean;
      resultsPerPage: number;
      defaultOrderBy: string;
      defaultSortOrder: 'asc' | 'desc';
      dataCaching: boolean;
      notifications: boolean;
      colorMode: 'light' | 'dark' | 'system';
    };
  };
}

const DEFAULT_PREFERENCES = {
  locations: [],
  categories: [],
  visualization: {
    type: 'bar',
    colorScheme: 'default',
    showLegend: true,
    defaultView: 'chart'
  },
  exports: [],
  general: {
    autoSaveResults: true,
    resultsPerPage: 25,
    defaultOrderBy: 'name',
    defaultSortOrder: 'asc',
    dataCaching: true,
    notifications: true,
    colorMode: 'system',
  }
};

const COLOR_SCHEMES = [
  { id: 'default', name: 'Default', colors: ['#4f46e5', '#06b6d4', '#ec4899', '#fbbf24', '#22c55e'] },
  { id: 'pastels', name: 'Pastels', colors: ['#c4b5fd', '#a5f3fc', '#fbcfe8', '#fde68a', '#bbf7d0'] },
  { id: 'vibrant', name: 'Vibrant', colors: ['#4f46e5', '#06b6d4', '#ec4899', '#f59e0b', '#10b981'] },
  { id: 'monochrome', name: 'Monochrome', colors: ['#020617', '#1e293b', '#475569', '#94a3b8', '#e2e8f0'] },
  { id: 'gradient', name: 'Gradient', colors: ['#1e40af', '#3b82f6', '#93c5fd', '#dbeafe', '#eff6ff'] },
];

const UserPreferences: React.FC<UserPreferencesProps> = ({
  onLocationPreferenceChange,
  onCategoryPreferenceChange,
  onVisualizationPreferenceChange,
  onExportPreferenceChange,
  availableLocations = [],
  availableCategories = [],
  initialPreferences = DEFAULT_PREFERENCES
}) => {
  // State for all preferences
  const [preferences, setPreferences] = useState(initialPreferences);
  
  // State for new location form
  const [newLocation, setNewLocation] = useState<Partial<LocationPreference>>({});
  
  // State for new category form
  const [newCategory, setNewCategory] = useState<Partial<CategoryPreference>>({
    name: '',
    subCategories: [],
  });
  
  // State for new export preference form
  const [newExport, setNewExport] = useState<Partial<ExportPreference>>({
    name: '',
    format: 'csv',
    fields: [],
    options: {},
  });

  // History of changes
  const [preferencesHistory, setPreferencesHistory] = useState<typeof preferences[]>([initialPreferences]);
  const [historyIndex, setHistoryIndex] = useState(0);

  // Load preferences from localStorage on component mount
  useEffect(() => {
    const savedPreferences = localStorage.getItem('userPreferences');
    if (savedPreferences) {
      try {
        const parsed = JSON.parse(savedPreferences);
        setPreferences(parsed);
        // Also update history
        setPreferencesHistory([parsed]);
        setHistoryIndex(0);
      } catch (error) {
        console.error('Failed to parse saved preferences:', error);
      }
    }
  }, []);

  // Update the appropriate preference and trigger callbacks
  const updatePreference = (
    type: 'locations' | 'categories' | 'visualization' | 'exports' | 'general',
    newValue: any
  ) => {
    setPreferences(prev => {
      const updated = { ...prev, [type]: newValue };
      
      // Save to local storage
      localStorage.setItem('userPreferences', JSON.stringify(updated));
      
      // Add to history
      setPreferencesHistory(history => [...history.slice(0, historyIndex + 1), updated]);
      setHistoryIndex(prev => prev + 1);
      
      // Trigger callbacks
      if (type === 'locations' && onLocationPreferenceChange) {
        onLocationPreferenceChange(newValue);
      } else if (type === 'categories' && onCategoryPreferenceChange) {
        onCategoryPreferenceChange(newValue);
      } else if (type === 'visualization' && onVisualizationPreferenceChange) {
        onVisualizationPreferenceChange(newValue);
      } else if (type === 'exports' && onExportPreferenceChange) {
        onExportPreferenceChange(newValue);
      }
      
      return updated;
    });
  };

  // Add a new location preference
  const addLocationPreference = () => {
    if (!newLocation.name || !newLocation.state) {
      toast({
        title: "Incomplete location",
        description: "Please provide at least a name and state.",
        variant: "destructive"
      });
      return;
    }
    
    const locationToAdd = { ...newLocation } as LocationPreference;
    updatePreference('locations', [...preferences.locations, locationToAdd]);
    setNewLocation({});
    
    toast({
      title: "Location preference added",
      description: `Added ${locationToAdd.name} to your preferred locations.`
    });
  };

  // Remove a location preference
  const removeLocationPreference = (index: number) => {
    const updatedLocations = [...preferences.locations];
    updatedLocations.splice(index, 1);
    updatePreference('locations', updatedLocations);
    
    toast({
      title: "Location preference removed",
      description: "The location has been removed from your preferences."
    });
  };

  // Set a location as default
  const setDefaultLocation = (index: number) => {
    const updatedLocations = preferences.locations.map((loc, i) => ({
      ...loc,
      isDefault: i === index
    }));
    updatePreference('locations', updatedLocations);
    
    toast({
      title: "Default location updated",
      description: `${preferences.locations[index].name} is now your default location.`
    });
  };

  // Add a new category preference
  const addCategoryPreference = () => {
    if (!newCategory.name) {
      toast({
        title: "Missing category name",
        description: "Please provide a name for the category preference.",
        variant: "destructive"
      });
      return;
    }
    
    const categoryToAdd = { ...newCategory } as CategoryPreference;
    updatePreference('categories', [...preferences.categories, categoryToAdd]);
    setNewCategory({
      name: '',
      subCategories: [],
    });
    
    toast({
      title: "Category preference added",
      description: `Added ${categoryToAdd.name} to your preferred categories.`
    });
  };

  // Remove a category preference
  const removeCategoryPreference = (index: number) => {
    const updatedCategories = [...preferences.categories];
    updatedCategories.splice(index, 1);
    updatePreference('categories', updatedCategories);
    
    toast({
      title: "Category preference removed",
      description: "The category has been removed from your preferences."
    });
  };

  // Set a category as default
  const setDefaultCategory = (index: number) => {
    const updatedCategories = preferences.categories.map((cat, i) => ({
      ...cat,
      isDefault: i === index
    }));
    updatePreference('categories', updatedCategories);
    
    toast({
      title: "Default category updated",
      description: `${preferences.categories[index].name} is now your default category.`
    });
  };

  // Update visualization preferences
  const updateVisualizationPreference = (key: keyof VisualizationPreference, value: any) => {
    const updatedVisualization = {
      ...preferences.visualization,
      [key]: value
    };
    updatePreference('visualization', updatedVisualization);
  };

  // Add new export preference
  const addExportPreference = () => {
    if (!newExport.name || !newExport.format) {
      toast({
        title: "Incomplete export preference",
        description: "Please provide a name and format for the export preference.",
        variant: "destructive"
      });
      return;
    }
    
    const exportToAdd = { ...newExport } as ExportPreference;
    updatePreference('exports', [...preferences.exports, exportToAdd]);
    setNewExport({
      name: '',
      format: 'csv',
      fields: [],
      options: {},
    });
    
    toast({
      title: "Export preference added",
      description: `Added ${exportToAdd.name} to your export preferences.`
    });
  };

  // Remove an export preference
  const removeExportPreference = (index: number) => {
    const updatedExports = [...preferences.exports];
    updatedExports.splice(index, 1);
    updatePreference('exports', updatedExports);
    
    toast({
      title: "Export preference removed",
      description: "The export preference has been removed."
    });
  };

  // Update general preferences
  const updateGeneralPreference = (key: string, value: any) => {
    const updatedGeneral = {
      ...preferences.general,
      [key]: value
    };
    updatePreference('general', updatedGeneral);
  };

  // Undo preference change
  const undoChange = () => {
    if (historyIndex > 0) {
      const previousIndex = historyIndex - 1;
      const previousState = preferencesHistory[previousIndex];
      setPreferences(previousState);
      setHistoryIndex(previousIndex);
      localStorage.setItem('userPreferences', JSON.stringify(previousState));
      
      toast({
        title: "Changes undone",
        description: "Reverted to previous preference settings."
      });
    }
  };

  // Redo preference change
  const redoChange = () => {
    if (historyIndex < preferencesHistory.length - 1) {
      const nextIndex = historyIndex + 1;
      const nextState = preferencesHistory[nextIndex];
      setPreferences(nextState);
      setHistoryIndex(nextIndex);
      localStorage.setItem('userPreferences', JSON.stringify(nextState));
      
      toast({
        title: "Changes redone",
        description: "Restored previously undone changes."
      });
    }
  };

  // Reset all preferences to defaults
  const resetAllPreferences = () => {
    setPreferences(DEFAULT_PREFERENCES);
    localStorage.setItem('userPreferences', JSON.stringify(DEFAULT_PREFERENCES));
    setPreferencesHistory([DEFAULT_PREFERENCES]);
    setHistoryIndex(0);
    
    toast({
      title: "Preferences reset",
      description: "All settings have been reset to default values."
    });
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>User Preferences</CardTitle>
            <CardDescription>
              Customize your data exploration experience
            </CardDescription>
          </div>
          <div className="flex space-x-2">
            <Button 
              variant="outline" 
              size="icon" 
              onClick={undoChange} 
              disabled={historyIndex === 0}
              title="Undo"
            >
              <History className="h-4 w-4 rotate-90" />
            </Button>
            <Button 
              variant="outline" 
              size="icon" 
              onClick={redoChange} 
              disabled={historyIndex >= preferencesHistory.length - 1}
              title="Redo"
            >
              <History className="h-4 w-4 -rotate-90" />
            </Button>
            <Button 
              variant="outline" 
              size="icon" 
              onClick={resetAllPreferences}
              title="Reset All"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="locations" className="w-full">
          <TabsList className="grid grid-cols-5 mb-4">
            <TabsTrigger value="locations">Locations</TabsTrigger>
            <TabsTrigger value="categories">Categories</TabsTrigger>
            <TabsTrigger value="visualization">Visualization</TabsTrigger>
            <TabsTrigger value="exports">Export</TabsTrigger>
            <TabsTrigger value="general">General</TabsTrigger>
          </TabsList>

          {/* Locations Tab */}
          <TabsContent value="locations" className="space-y-6">
            <div>
              <h3 className="text-lg font-medium mb-4">Location Preferences</h3>
              <p className="text-sm text-muted-foreground mb-6">
                Manage your preferred locations for business searches. Setting a default location will pre-populate it in searches.
              </p>
              
              {/* Current Location Preferences */}
              {preferences.locations.length > 0 ? (
                <div className="space-y-4 mb-6">
                  <h4 className="text-sm font-medium">Saved Locations</h4>
                  <div className="border rounded-md divide-y">
                    {preferences.locations.map((location, index) => (
                      <div key={index} className="p-4 flex items-center justify-between">
                        <div>
                          <div className="font-medium flex items-center">
                            {location.name}
                            {location.isDefault && (
                              <Badge variant="secondary" className="ml-2">Default</Badge>
                            )}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {location.city ? `${location.city}, ` : ''}{location.state}
                            {location.zipCode ? ` ${location.zipCode}` : ''}
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          {!location.isDefault && (
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => setDefaultLocation(index)}
                            >
                              <Check className="h-4 w-4 mr-1" />
                              Set Default
                            </Button>
                          )}
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => removeLocationPreference(index)}
                          >
                            <Trash className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="bg-muted/30 rounded-lg p-6 mb-6 text-center">
                  <p className="text-muted-foreground mb-4">No location preferences saved yet</p>
                  <p className="text-sm">Add a location below to save it for future searches</p>
                </div>
              )}
              
              {/* Add New Location */}
              <Accordion type="single" collapsible className="border rounded-md">
                <AccordionItem value="add-location">
                  <AccordionTrigger className="px-4">Add New Location</AccordionTrigger>
                  <AccordionContent className="px-4 pb-4 pt-2">
                    <div className="grid gap-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="location-name">Location Name</Label>
                          <Input 
                            id="location-name"
                            value={newLocation.name || ''}
                            onChange={(e) => setNewLocation({...newLocation, name: e.target.value})}
                            placeholder="e.g., Home Office, West Coast Region"
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="location-state">State</Label>
                          <Select 
                            value={newLocation.state} 
                            onValueChange={(value) => setNewLocation({...newLocation, state: value})}
                          >
                            <SelectTrigger id="location-state">
                              <SelectValue placeholder="Select a state" />
                            </SelectTrigger>
                            <SelectContent>
                              {availableLocations.map((loc) => (
                                <SelectItem key={loc.state} value={loc.state}>
                                  {loc.state}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="location-city">City (Optional)</Label>
                          <Select 
                            value={newLocation.city} 
                            onValueChange={(value) => setNewLocation({...newLocation, city: value})}
                            disabled={!newLocation.state}
                          >
                            <SelectTrigger id="location-city">
                              <SelectValue placeholder="Select a city" />
                            </SelectTrigger>
                            <SelectContent>
                              {newLocation.state && availableLocations
                                .find(loc => loc.state === newLocation.state)?.cities
                                .map((city) => (
                                  <SelectItem key={city} value={city}>
                                    {city}
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="location-zip">Zip Code (Optional)</Label>
                          <Input 
                            id="location-zip"
                            value={newLocation.zipCode || ''}
                            onChange={(e) => setNewLocation({...newLocation, zipCode: e.target.value})}
                            placeholder="e.g., 90210"
                          />
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Checkbox 
                          id="default-location"
                          checked={newLocation.isDefault || false}
                          onCheckedChange={(checked) => 
                            setNewLocation({...newLocation, isDefault: !!checked})
                          }
                        />
                        <label
                          htmlFor="default-location"
                          className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          Set as default location
                        </label>
                      </div>
                      
                      <Button onClick={addLocationPreference} className="w-full">
                        <Save className="h-4 w-4 mr-2" />
                        Save Location
                      </Button>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
          </TabsContent>

          {/* Categories Tab */}
          <TabsContent value="categories" className="space-y-6">
            <div>
              <h3 className="text-lg font-medium mb-4">Business Category Preferences</h3>
              <p className="text-sm text-muted-foreground mb-6">
                Manage your preferred business categories. These will be highlighted in search results and dashboards.
              </p>
              
              {/* Current Category Preferences */}
              {preferences.categories.length > 0 ? (
                <div className="space-y-4 mb-6">
                  <h4 className="text-sm font-medium">Saved Categories</h4>
                  <div className="border rounded-md divide-y">
                    {preferences.categories.map((category, index) => (
                      <div key={index} className="p-4 flex items-center justify-between">
                        <div>
                          <div className="font-medium flex items-center">
                            {category.name}
                            {category.isDefault && (
                              <Badge variant="secondary" className="ml-2">Default</Badge>
                            )}
                          </div>
                          {category.subCategories && category.subCategories.length > 0 && (
                            <div className="text-sm text-muted-foreground mt-1 flex flex-wrap gap-1">
                              {category.subCategories.map((sub, i) => (
                                <Badge key={i} variant="outline" className="text-xs">
                                  {sub}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="flex space-x-2">
                          {!category.isDefault && (
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => setDefaultCategory(index)}
                            >
                              <Check className="h-4 w-4 mr-1" />
                              Set Default
                            </Button>
                          )}
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => removeCategoryPreference(index)}
                          >
                            <Trash className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="bg-muted/30 rounded-lg p-6 mb-6 text-center">
                  <p className="text-muted-foreground mb-4">No category preferences saved yet</p>
                  <p className="text-sm">Add a category below to prioritize it in searches</p>
                </div>
              )}
              
              {/* Add New Category */}
              <Accordion type="single" collapsible className="border rounded-md">
                <AccordionItem value="add-category">
                  <AccordionTrigger className="px-4">Add New Category</AccordionTrigger>
                  <AccordionContent className="px-4 pb-4 pt-2">
                    <div className="grid gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="category-name">Category Name</Label>
                        <Select 
                          value={newCategory.name} 
                          onValueChange={(value) => setNewCategory({
                            ...newCategory, 
                            name: value,
                            subCategories: []
                          })}
                        >
                          <SelectTrigger id="category-name">
                            <SelectValue placeholder="Select a category" />
                          </SelectTrigger>
                          <SelectContent>
                            {availableCategories.map((cat) => (
                              <SelectItem key={cat.name} value={cat.name}>
                                {cat.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      {newCategory.name && availableCategories.find(c => c.name === newCategory.name)?.subCategories.length > 0 && (
                        <div className="space-y-2">
                          <Label>Sub-Categories (Optional)</Label>
                          <div className="border rounded-md p-3 space-y-2">
                            {availableCategories
                              .find(c => c.name === newCategory.name)
                              ?.subCategories.map((subCat) => (
                                <div key={subCat} className="flex items-center space-x-2">
                                  <Checkbox 
                                    id={`sub-${subCat}`}
                                    checked={(newCategory.subCategories || []).includes(subCat)}
                                    onCheckedChange={(checked) => {
                                      const current = newCategory.subCategories || [];
                                      if (checked) {
                                        setNewCategory({
                                          ...newCategory,
                                          subCategories: [...current, subCat]
                                        });
                                      } else {
                                        setNewCategory({
                                          ...newCategory,
                                          subCategories: current.filter(c => c !== subCat)
                                        });
                                      }
                                    }}
                                  />
                                  <label
                                    htmlFor={`sub-${subCat}`}
                                    className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                  >
                                    {subCat}
                                  </label>
                                </div>
                              ))}
                          </div>
                        </div>
                      )}
                      
                      <div className="flex items-center space-x-2">
                        <Checkbox 
                          id="default-category"
                          checked={newCategory.isDefault || false}
                          onCheckedChange={(checked) => 
                            setNewCategory({...newCategory, isDefault: !!checked})
                          }
                        />
                        <label
                          htmlFor="default-category"
                          className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          Set as default category
                        </label>
                      </div>
                      
                      <Button 
                        onClick={addCategoryPreference} 
                        className="w-full"
                        disabled={!newCategory.name}
                      >
                        <Save className="h-4 w-4 mr-2" />
                        Save Category
                      </Button>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
          </TabsContent>

          {/* Visualization Tab */}
          <TabsContent value="visualization" className="space-y-6">
            <div>
              <h3 className="text-lg font-medium mb-4">Visualization Preferences</h3>
              <p className="text-sm text-muted-foreground mb-6">
                Customize how charts and visualizations are displayed throughout the application.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                {/* Chart Type */}
                <div className="space-y-4">
                  <h4 className="text-sm font-medium">Default Chart Type</h4>
                  <RadioGroup 
                    defaultValue={preferences.visualization.type}
                    onValueChange={(value) => updateVisualizationPreference('type', value)}
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="bar" id="chart-bar" />
                      <Label htmlFor="chart-bar">Bar Chart</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="pie" id="chart-pie" />
                      <Label htmlFor="chart-pie">Pie Chart</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="line" id="chart-line" />
                      <Label htmlFor="chart-line">Line Chart</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="scatter" id="chart-scatter" />
                      <Label htmlFor="chart-scatter">Scatter Plot</Label>
                    </div>
                  </RadioGroup>
                </div>
                
                {/* Default View */}
                <div className="space-y-4">
                  <h4 className="text-sm font-medium">Default Data View</h4>
                  <RadioGroup 
                    defaultValue={preferences.visualization.defaultView}
                    onValueChange={(value) => updateVisualizationPreference('defaultView', value as any)}
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="chart" id="view-chart" />
                      <Label htmlFor="view-chart">Charts View</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="table" id="view-table" />
                      <Label htmlFor="view-table">Table View</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="map" id="view-map" />
                      <Label htmlFor="view-map">Map View</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="grid" id="view-grid" />
                      <Label htmlFor="view-grid">Grid View</Label>
                    </div>
                  </RadioGroup>
                </div>
              </div>
              
              {/* Color Scheme Selection */}
              <div className="space-y-4 mb-6">
                <h4 className="text-sm font-medium">Color Scheme</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {COLOR_SCHEMES.map((scheme) => (
                    <div 
                      key={scheme.id}
                      className={`
                        border rounded-md p-3 cursor-pointer transition-all
                        ${preferences.visualization.colorScheme === scheme.id 
                          ? 'ring-2 ring-primary border-primary' 
                          : 'hover:border-gray-400'
                        }
                      `}
                      onClick={() => updateVisualizationPreference('colorScheme', scheme.id)}
                    >
                      <div className="font-medium text-sm mb-2">{scheme.name}</div>
                      <div className="flex space-x-1">
                        {scheme.colors.map((color, i) => (
                          <div 
                            key={i}
                            className="w-6 h-6 rounded-full"
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Additional Options */}
              <div className="space-y-4">
                <h4 className="text-sm font-medium">Additional Options</h4>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="show-legend">Show chart legends</Label>
                      <p className="text-xs text-muted-foreground">
                        Display legends in all chart visualizations
                      </p>
                    </div>
                    <Switch
                      id="show-legend"
                      checked={preferences.visualization.showLegend}
                      onCheckedChange={(checked) => 
                        updateVisualizationPreference('showLegend', checked)
                      }
                    />
                  </div>
                  
                  <Separator />
                  
                  <Button 
                    variant="outline" 
                    onClick={() => updatePreference('visualization', DEFAULT_PREFERENCES.visualization)}
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Reset Visualization Preferences
                  </Button>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Export Tab */}
          <TabsContent value="exports" className="space-y-6">
            <div>
              <h3 className="text-lg font-medium mb-4">Export Preferences</h3>
              <p className="text-sm text-muted-foreground mb-6">
                Configure default export settings for various data formats.
              </p>
              
              {/* Current Export Preferences */}
              {preferences.exports.length > 0 ? (
                <div className="space-y-4 mb-6">
                  <h4 className="text-sm font-medium">Saved Export Preferences</h4>
                  <div className="border rounded-md divide-y">
                    {preferences.exports.map((exp, index) => (
                      <div key={index} className="p-4 flex items-center justify-between">
                        <div>
                          <div className="font-medium">{exp.name}</div>
                          <div className="text-sm text-muted-foreground">
                            Format: {exp.format.toUpperCase()} • 
                            {exp.fields.length} fields selected
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => removeExportPreference(index)}
                          >
                            <Trash className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="bg-muted/30 rounded-lg p-6 mb-6 text-center">
                  <p className="text-muted-foreground mb-4">No export preferences saved yet</p>
                  <p className="text-sm">Add an export preference below to save it for future use</p>
                </div>
              )}
              
              {/* Add New Export Preference */}
              <Accordion type="single" collapsible className="border rounded-md">
                <AccordionItem value="add-export">
                  <AccordionTrigger className="px-4">Add New Export Preference</AccordionTrigger>
                  <AccordionContent className="px-4 pb-4 pt-2">
                    <div className="grid gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="export-name">Preference Name</Label>
                        <Input 
                          id="export-name"
                          value={newExport.name || ''}
                          onChange={(e) => setNewExport({...newExport, name: e.target.value})}
                          placeholder="e.g., Business Contact Export"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="export-format">Format</Label>
                        <Select 
                          value={newExport.format} 
                          onValueChange={(value) => setNewExport({...newExport, format: value})}
                        >
                          <SelectTrigger id="export-format">
                            <SelectValue placeholder="Select a format" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="csv">CSV</SelectItem>
                            <SelectItem value="json">JSON</SelectItem>
                            <SelectItem value="xlsx">Excel (XLSX)</SelectItem>
                            <SelectItem value="xml">XML</SelectItem>
                            <SelectItem value="txt">Plain Text</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <Button 
                        onClick={addExportPreference} 
                        className="w-full"
                        disabled={!newExport.name || !newExport.format}
                      >
                        <Save className="h-4 w-4 mr-2" />
                        Save Export Preference
                      </Button>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
          </TabsContent>

          {/* General Tab */}
          <TabsContent value="general" className="space-y-6">
            <div>
              <h3 className="text-lg font-medium mb-4">General Settings</h3>
              <p className="text-sm text-muted-foreground mb-6">
                Configure general application settings and behavior.
              </p>
              
              <div className="space-y-6">
                {/* Display Settings */}
                <div className="space-y-4">
                  <h4 className="text-sm font-medium">Display Settings</h4>
                  
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="color-mode">Color Mode</Label>
                        <p className="text-xs text-muted-foreground">
                          Choose your preferred theme
                        </p>
                      </div>
                      <Select 
                        value={preferences.general.colorMode}
                        onValueChange={(value) => 
                          updateGeneralPreference('colorMode', value as 'light' | 'dark' | 'system')
                        }
                      >
                        <SelectTrigger id="color-mode" className="w-[180px]">
                          <SelectValue placeholder="Select color mode" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="light">Light Mode</SelectItem>
                          <SelectItem value="dark">Dark Mode</SelectItem>
                          <SelectItem value="system">System Default</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="results-per-page">Results per Page</Label>
                        <p className="text-xs text-muted-foreground">
                          Number of results to show in tables and lists
                        </p>
                      </div>
                      <Select 
                        value={String(preferences.general.resultsPerPage)}
                        onValueChange={(value) => 
                          updateGeneralPreference('resultsPerPage', parseInt(value))
                        }
                      >
                        <SelectTrigger id="results-per-page" className="w-[180px]">
                          <SelectValue placeholder="Select page size" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="10">10 per page</SelectItem>
                          <SelectItem value="25">25 per page</SelectItem>
                          <SelectItem value="50">50 per page</SelectItem>
                          <SelectItem value="100">100 per page</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
                
                {/* Data Handling */}
                <div className="space-y-4">
                  <h4 className="text-sm font-medium">Data Handling</h4>
                  
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="auto-save">Auto-save Results</Label>
                        <p className="text-xs text-muted-foreground">
                          Automatically save search results for later access
                        </p>
                      </div>
                      <Switch
                        id="auto-save"
                        checked={preferences.general.autoSaveResults}
                        onCheckedChange={(checked) => 
                          updateGeneralPreference('autoSaveResults', checked)
                        }
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="data-caching">Enable Data Caching</Label>
                        <p className="text-xs text-muted-foreground">
                          Cache data for faster loading (uses local storage)
                        </p>
                      </div>
                      <Switch
                        id="data-caching"
                        checked={preferences.general.dataCaching}
                        onCheckedChange={(checked) => 
                          updateGeneralPreference('dataCaching', checked)
                        }
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="notifications">Enable Notifications</Label>
                        <p className="text-xs text-muted-foreground">
                          Show notifications for completed tasks and updates
                        </p>
                      </div>
                      <Switch
                        id="notifications"
                        checked={preferences.general.notifications}
                        onCheckedChange={(checked) => 
                          updateGeneralPreference('notifications', checked)
                        }
                      />
                    </div>
                  </div>
                </div>
                
                {/* Default Sorting */}
                <div className="space-y-4">
                  <h4 className="text-sm font-medium">Default Sorting</h4>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="default-orderby">Order By</Label>
                      <Select 
                        value={preferences.general.defaultOrderBy}
                        onValueChange={(value) => 
                          updateGeneralPreference('defaultOrderBy', value)
                        }
                      >
                        <SelectTrigger id="default-orderby">
                          <SelectValue placeholder="Select field" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="name">Name</SelectItem>
                          <SelectItem value="city">City</SelectItem>
                          <SelectItem value="state">State</SelectItem>
                          <SelectItem value="employeeCount">Employee Count</SelectItem>
                          <SelectItem value="yearEstablished">Year Established</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="default-sortorder">Sort Order</Label>
                      <Select 
                        value={preferences.general.defaultSortOrder}
                        onValueChange={(value) => 
                          updateGeneralPreference('defaultSortOrder', value as 'asc' | 'desc')
                        }
                      >
                        <SelectTrigger id="default-sortorder">
                          <SelectValue placeholder="Select order" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="asc">Ascending (A-Z, 0-9)</SelectItem>
                          <SelectItem value="desc">Descending (Z-A, 9-0)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
                
                <Separator />
                
                <Button 
                  variant="outline" 
                  onClick={() => updatePreference('general', DEFAULT_PREFERENCES.general)}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Reset General Preferences
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default UserPreferences;