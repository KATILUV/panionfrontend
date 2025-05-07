import React from 'react';
import { UIDensity, useThemeStore } from '@/state/themeStore';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { 
  AlignJustify, 
  AlignLeft, 
  AlignCenter
} from 'lucide-react';

interface DensitySelectorProps {
  className?: string;
}

export function DensitySelector({ className }: DensitySelectorProps) {
  const { density, setDensity } = useThemeStore();

  const handleDensityChange = (value: string) => {
    setDensity(value as UIDensity);
  };

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium">Interface Density</h4>
      </div>
      
      <RadioGroup 
        defaultValue={density} 
        onValueChange={handleDensityChange}
        className="flex items-center justify-between gap-2"
      >
        <div className="flex flex-col items-center gap-1">
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="compact" id="density-compact" />
            <Label htmlFor="density-compact" className="cursor-pointer">Compact</Label>
          </div>
          <Button
            variant="ghost" 
            size="sm" 
            className={`h-9 w-9 rounded-md p-0 ${density === 'compact' ? 'bg-muted' : ''}`}
            onClick={() => setDensity('compact')}
          >
            <AlignLeft className="h-4 w-4" />
            <span className="sr-only">Compact</span>
          </Button>
        </div>
        
        <div className="flex flex-col items-center gap-1">
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="normal" id="density-normal" />
            <Label htmlFor="density-normal" className="cursor-pointer">Normal</Label>
          </div>
          <Button
            variant="ghost" 
            size="sm" 
            className={`h-9 w-9 rounded-md p-0 ${density === 'normal' ? 'bg-muted' : ''}`}
            onClick={() => setDensity('normal')}
          >
            <AlignCenter className="h-4 w-4" />
            <span className="sr-only">Normal</span>
          </Button>
        </div>
        
        <div className="flex flex-col items-center gap-1">
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="spacious" id="density-spacious" />
            <Label htmlFor="density-spacious" className="cursor-pointer">Spacious</Label>
          </div>
          <Button
            variant="ghost" 
            size="sm" 
            className={`h-9 w-9 rounded-md p-0 ${density === 'spacious' ? 'bg-muted' : ''}`}
            onClick={() => setDensity('spacious')}
          >
            <AlignJustify className="h-4 w-4" />
            <span className="sr-only">Spacious</span>
          </Button>
        </div>
      </RadioGroup>
      
      <div className="text-xs text-muted-foreground mt-1">
        {density === 'compact' && "Compact mode uses less space for UI elements."}
        {density === 'normal' && "Normal spacing for balanced user interface."}
        {density === 'spacious' && "More space between elements for easier reading."}
      </div>
    </div>
  );
}