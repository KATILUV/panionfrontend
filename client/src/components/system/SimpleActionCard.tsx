import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useThemeStore, ThemeAccent } from '../../state/themeStore';

interface SimpleActionCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  onClick: () => void;
  color?: string;
  colorIndex?: number;
  shortcut?: string;
  badge?: string;
  badgeColor?: string;
}

const SimpleActionCard: React.FC<SimpleActionCardProps> = ({ 
  title, 
  description, 
  icon, 
  onClick, 
  color,
  colorIndex = 0, 
  shortcut,
  badge,
  badgeColor = "bg-primary" 
}) => {
  // IMPORTANT: Get theme accent directly in the component
  const accent = useThemeStore(state => state.accent);
  
  // If color is provided directly, use it, otherwise calculate based on accent theme
  const getColorGradient = () => {
    // If a specific color was provided, use it
    if (color) return color;
    
    // Otherwise, calculate color based on theme accent and index
    const variant = colorIndex % 3;
    
    switch (accent) {
      case 'purple':
        return variant === 0 
          ? 'from-purple-500 to-indigo-600' 
          : variant === 1 
            ? 'from-indigo-400 to-purple-700' 
            : 'from-violet-500 to-purple-600';
      case 'blue':
        return variant === 0 
          ? 'from-blue-500 to-cyan-600' 
          : variant === 1 
            ? 'from-cyan-400 to-blue-700' 
            : 'from-sky-500 to-blue-600';
      case 'green':
        return variant === 0 
          ? 'from-green-500 to-emerald-600' 
          : variant === 1 
            ? 'from-emerald-400 to-green-700' 
            : 'from-teal-500 to-green-600';
      case 'orange': // Dark theme
        return variant === 0 
          ? 'from-gray-800 to-black' 
          : variant === 1 
            ? 'from-zinc-800 to-gray-900' 
            : 'from-neutral-800 to-gray-950';
      case 'pink':
        return variant === 0 
          ? 'from-pink-500 to-rose-600' 
          : variant === 1 
            ? 'from-rose-400 to-pink-700' 
            : 'from-fuchsia-500 to-pink-600';
      default: // Default to purple
        return variant === 0 
          ? 'from-purple-500 to-indigo-600' 
          : variant === 1 
            ? 'from-indigo-400 to-purple-700' 
            : 'from-violet-500 to-purple-600';
    }
  };
  
  // Get the color gradient based on current theme
  const gradientColor = getColorGradient();
  
  return (
    <button 
      type="button"
      onClick={onClick}
      className={`w-full text-left rounded-xl bg-gradient-to-br ${gradientColor} p-[1.5px] shadow-md hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02] cursor-pointer border-0 focus:outline-none focus:ring-2 focus:ring-white/30 focus:ring-offset-1 focus:ring-offset-transparent`}
    >
      <Card className="bg-black/20 backdrop-blur-lg border-none h-full overflow-hidden relative rounded-xl">
        {badge && (
          <div className={`absolute top-2 right-2 ${badgeColor} text-white text-xs px-1.5 py-0.5 rounded-md font-medium`}>
            {badge}
          </div>
        )}
        <CardHeader className="p-4 pb-1">
          <div className="flex justify-between items-start">
            <CardTitle className="text-base font-medium flex items-center gap-3 text-white">
              <span className="w-7 h-7 flex items-center justify-center rounded-full bg-white/10 text-white p-1.5">{icon}</span>
              {title}
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-4 pt-2">
          <CardDescription className="text-sm text-white/80">{description}</CardDescription>
          {shortcut && (
            <div className="mt-3 flex items-center">
              <kbd className="px-1.5 py-0.5 text-xs font-semibold bg-white/10 rounded border border-white/20 text-white/70">
                {shortcut}
              </kbd>
            </div>
          )}
        </CardContent>
      </Card>
    </button>
  );
};

export default SimpleActionCard;