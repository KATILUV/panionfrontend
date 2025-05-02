import React from 'react';
import { useSystemLogStore, LogType } from '../../state/systemLogStore';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Brain, 
  Database, 
  PlayCircle, 
  AlertCircle, 
  Info, 
  X,
  MinusCircle,
  Maximize2,
  Minimize2
} from 'lucide-react';
import { useThemeStore } from '../../state/themeStore';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface ClaraSystemLogProps {
  className?: string;
}

const ClaraSystemLog: React.FC<ClaraSystemLogProps> = ({ className = '' }) => {
  const { logs, isVisible, toggleVisibility, clearLogs } = useSystemLogStore();
  const [isMinimized, setIsMinimized] = React.useState(false);
  const accent = useThemeStore(state => state.accent);
  const getCurrentTheme = useThemeStore(state => state.getCurrentTheme);

  // Get icon based on log type
  const getLogIcon = (type: LogType) => {
    const isDark = getCurrentTheme() === 'dark';
    
    switch (type) {
      case 'thinking':
        return <Brain className={`h-4 w-4 ${isDark ? 'text-purple-400' : 'text-purple-600'}`} />;
      case 'memory':
        return <Database className={`h-4 w-4 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />;
      case 'action':
        return <PlayCircle className={`h-4 w-4 ${isDark ? 'text-green-400' : 'text-green-600'}`} />;
      case 'error':
        return <AlertCircle className={`h-4 w-4 ${isDark ? 'text-red-400' : 'text-red-600'}`} />;
      case 'info':
      default:
        return <Info className={`h-4 w-4 ${isDark ? 'text-amber-400' : 'text-amber-600'}`} />;
    }
  };

  // Get emoji based on log type
  const getLogEmoji = (type: LogType) => {
    switch (type) {
      case 'thinking': return '🧠';
      case 'memory': return '📂';
      case 'action': return '⚙️';
      case 'error': return '❌';
      case 'info':
      default: return 'ℹ️';
    }
  };

  // Get text color based on log type
  const getLogTextColor = (type: LogType) => {
    const isDark = getCurrentTheme() === 'dark';
    
    switch (type) {
      case 'thinking': return isDark ? 'text-purple-300' : 'text-purple-600';
      case 'memory': return isDark ? 'text-blue-300' : 'text-blue-600';
      case 'action': return isDark ? 'text-green-300' : 'text-green-600';
      case 'error': return isDark ? 'text-red-300' : 'text-red-600';
      case 'info':
      default: return isDark ? 'text-amber-300' : 'text-amber-600';
    }
  };

  // Format timestamp
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  // Toggle minimize state
  const toggleMinimize = () => {
    setIsMinimized(!isMinimized);
  };

  if (!isVisible) return null;

  return (
    <motion.div
      className={`fixed right-4 bottom-16 w-80 max-h-[70vh] backdrop-blur-lg rounded-lg overflow-hidden z-50 ${
        getCurrentTheme() === 'dark' 
          ? 'bg-black/40 border border-purple-500/30' 
          : (accent === 'light'
              ? 'bg-white/30 border border-gray-200/50 shadow-md'
              : 'bg-white/30 border border-purple-200/30 shadow-md')
      } ${className}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      transition={{ duration: 0.2 }}
    >
      {/* Header */}
      <div className={`flex items-center justify-between px-3 py-2 ${
        getCurrentTheme() === 'dark' 
          ? 'bg-black/20 border-b border-purple-500/20 text-white' 
          : (accent === 'light'
              ? 'bg-white/30 border-b border-gray-200/50 text-gray-800'
              : 'bg-white/30 border-b border-purple-200/30 text-gray-800')
      }`}>
        <div className="flex items-center space-x-2">
          <Database className={`h-4 w-4 ${
            getCurrentTheme() === 'dark' ? 'text-purple-500' : 'text-purple-600'
          }`} />
          <span className="text-sm font-medium">Clara's System Log</span>
        </div>
        <div className="flex space-x-1">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  variant="ghost"
                  className={`h-6 w-6 rounded-full ${
                    getCurrentTheme() === 'dark' 
                      ? 'hover:bg-white/10' 
                      : 'hover:bg-purple-100'
                  }`}
                  onClick={clearLogs}
                >
                  <MinusCircle className={`h-4 w-4 ${
                    getCurrentTheme() === 'dark' 
                      ? 'text-white/70' 
                      : 'text-purple-500'
                  }`} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Clear Logs</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  variant="ghost"
                  className={`h-6 w-6 rounded-full ${
                    getCurrentTheme() === 'dark' 
                      ? 'hover:bg-white/10' 
                      : 'hover:bg-purple-100'
                  }`}
                  onClick={toggleMinimize}
                >
                  {isMinimized ? 
                    <Maximize2 className={`h-4 w-4 ${
                      getCurrentTheme() === 'dark' 
                        ? 'text-white/70' 
                        : 'text-purple-500'
                    }`} /> : 
                    <Minimize2 className={`h-4 w-4 ${
                      getCurrentTheme() === 'dark' 
                        ? 'text-white/70' 
                        : 'text-purple-500'
                    }`} />
                  }
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{isMinimized ? 'Expand' : 'Minimize'}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  variant="ghost"
                  className={`h-6 w-6 rounded-full ${
                    getCurrentTheme() === 'dark' 
                      ? 'hover:bg-white/10' 
                      : 'hover:bg-purple-100'
                  }`}
                  onClick={toggleVisibility}
                >
                  <X className={`h-4 w-4 ${
                    getCurrentTheme() === 'dark' 
                      ? 'text-white/70' 
                      : 'text-purple-500'
                  }`} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Close</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {/* Log Content */}
      {!isMinimized && (
        <div className={`max-h-[50vh] overflow-y-auto p-2 space-y-2 ${
          getCurrentTheme() === 'dark' 
            ? 'bg-black/10' 
            : 'bg-white/20'
        }`}>
          <AnimatePresence initial={false}>
            {logs.length === 0 ? (
              <div className={`text-center py-6 text-sm ${
                getCurrentTheme() === 'dark' 
                  ? 'text-white/50' 
                  : 'text-gray-400'
              }`}>
                No system logs yet
              </div>
            ) : (
              logs.map((log) => (
                <motion.div
                  key={log.id}
                  className={`flex p-2 rounded-md text-xs ${
                    getCurrentTheme() === 'dark' 
                      ? 'bg-black/20 backdrop-blur-sm' 
                      : 'bg-white/40 backdrop-blur-sm border border-gray-100/50 shadow-sm'
                  }`}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="mr-2 mt-0.5">
                    {getLogIcon(log.type)}
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between mb-1">
                      <span className={`${getLogTextColor(log.type)} font-medium`}>
                        {getLogEmoji(log.type)} {log.type.charAt(0).toUpperCase() + log.type.slice(1)}
                      </span>
                      <span className={`${
                        getCurrentTheme() === 'dark' 
                          ? 'text-white/40' 
                          : 'text-gray-400'
                      }`}>
                        {formatTime(log.timestamp)}
                      </span>
                    </div>
                    <p className={`leading-snug ${
                      getCurrentTheme() === 'dark' 
                        ? 'text-white/90' 
                        : 'text-gray-700'
                    }`}>
                      {log.message}
                    </p>
                  </div>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>
      )}
    </motion.div>
  );
};

export default ClaraSystemLog;