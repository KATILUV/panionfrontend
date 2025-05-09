import React from 'react';

// Define layout template props type
export interface LayoutTemplateProps {
  title: string;
  description: string;
  type: 'centered' | 'split' | 'triple' | 'grid' | 'stack';
  onClick: () => void;
}

const LayoutTemplateCard: React.FC<LayoutTemplateProps> = ({ title, description, type, onClick }) => {
  // Generate simple SVG representation of the layout type
  const renderLayoutIcon = () => {
    switch (type) {
      case 'centered':
        return (
          <svg width="64" height="36" viewBox="0 0 64 36" fill="none" xmlns="http://www.w3.org/2000/svg" className="mb-2">
            <rect x="8" y="4" width="48" height="28" rx="2" stroke="currentColor" strokeWidth="1.5" />
          </svg>
        );
      case 'split':
        return (
          <svg width="64" height="36" viewBox="0 0 64 36" fill="none" xmlns="http://www.w3.org/2000/svg" className="mb-2">
            <rect x="4" y="4" width="26" height="28" rx="2" stroke="currentColor" strokeWidth="1.5" />
            <rect x="34" y="4" width="26" height="28" rx="2" stroke="currentColor" strokeWidth="1.5" />
          </svg>
        );
      case 'triple':
        return (
          <svg width="64" height="36" viewBox="0 0 64 36" fill="none" xmlns="http://www.w3.org/2000/svg" className="mb-2">
            <rect x="4" y="4" width="16" height="28" rx="2" stroke="currentColor" strokeWidth="1.5" />
            <rect x="24" y="4" width="16" height="28" rx="2" stroke="currentColor" strokeWidth="1.5" />
            <rect x="44" y="4" width="16" height="28" rx="2" stroke="currentColor" strokeWidth="1.5" />
          </svg>
        );
      case 'grid':
        return (
          <svg width="64" height="36" viewBox="0 0 64 36" fill="none" xmlns="http://www.w3.org/2000/svg" className="mb-2">
            <rect x="4" y="4" width="26" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" />
            <rect x="34" y="4" width="26" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" />
            <rect x="4" y="20" width="26" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" />
            <rect x="34" y="20" width="26" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" />
          </svg>
        );
      case 'stack':
        return (
          <svg width="64" height="36" viewBox="0 0 64 36" fill="none" xmlns="http://www.w3.org/2000/svg" className="mb-2">
            <rect x="4" y="4" width="48" height="20" rx="2" stroke="currentColor" strokeWidth="1.5" />
            <rect x="12" y="12" width="48" height="20" rx="2" stroke="currentColor" strokeWidth="1.5" strokeDasharray="2 2" />
          </svg>
        );
      default:
        return null;
    }
  };

  return (
    <div
      onClick={onClick}
      className="p-4 bg-black/10 dark:bg-white/5 rounded-lg border border-white/10 dark:border-white/5 hover:bg-black/20 dark:hover:bg-white/10 cursor-pointer transition-colors duration-200 flex flex-col items-center w-full border-0 focus:outline-none focus:ring-2 focus:ring-primary/40 pointer-events-auto"
    >
      {renderLayoutIcon()}
      <h3 className="font-medium text-sm text-center">{title}</h3>
      <p className="text-xs text-center text-muted-foreground mt-1">{description}</p>
    </div>
  );
};

export default LayoutTemplateCard;