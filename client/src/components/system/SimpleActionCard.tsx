import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface SimpleActionCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  onClick: () => void;
  color: string;
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
  shortcut,
  badge,
  badgeColor = "bg-purple-600" 
}) => {
  return (
    <button 
      type="button"
      onClick={onClick}
      className={`w-full text-left rounded-xl bg-gradient-to-br ${color} p-[1px] shadow-lg cursor-pointer border-0 focus:outline-none focus:ring-2 focus:ring-purple-500/40 focus:ring-offset-2 focus:ring-offset-background`}
    >
      <Card className="bg-card/50 backdrop-blur-sm border-none h-full overflow-hidden relative">
        {badge && (
          <div className={`absolute top-2 right-2 ${badgeColor} text-white text-xs px-1.5 py-0.5 rounded-sm font-medium`}>
            {badge}
          </div>
        )}
        <CardHeader className="pb-2">
          <div className="flex justify-between items-start">
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <span className="text-foreground/80">{icon}</span>
              {title}
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <CardDescription className="text-sm text-foreground/70">{description}</CardDescription>
          {shortcut && (
            <div className="mt-2 flex items-center">
              <kbd className="px-2 py-1 text-xs font-semibold bg-black/10 dark:bg-white/10 rounded border border-gray-200 dark:border-gray-700">
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