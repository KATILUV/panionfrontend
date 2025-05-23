import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { 
  Cpu, Users, Layout, Sparkles, MessageSquare, Fingerprint, LucideProps, Brain,
  LayoutGrid, Search, Terminal, Check, X, ChevronLeft, ChevronRight,
  PenTool, FileText, Database, Layers, Code, Presentation, Pause
} from 'lucide-react';
import RotatingTagline from '@/components/RotatingTagline';
import { useThemeStore } from '@/state/themeStore';
import PasswordProtection from '@/components/auth/PasswordProtection';



const LandingPage = () => {
  const [_, setLocation] = useLocation();
  const [currentFeatureIndex, setCurrentFeatureIndex] = useState(0);
  const featuresRef = useRef<HTMLDivElement>(null);
  const autoScrollTimerRef = useRef<NodeJS.Timeout | null>(null);
  const currentTheme = useThemeStore(state => state.getCurrentTheme());
  const accent = useThemeStore(state => state.accent);
  
  // CSS classes for feature cards
  const featureIconClass = `rounded-full p-5 ${
    currentTheme === 'dark' 
      ? 'bg-gradient-to-br from-purple-950 to-violet-900' 
      : 'bg-gradient-to-br from-purple-50 to-violet-200'
  } w-fit mb-6 mx-auto`;

  // This useEffect is no longer needed as we'll use CSS animations instead
  useEffect(() => {
    // Just for mount/unmount events and debugging
    console.log("Marquee carousel mounted");
    
    return () => {
      console.log("Marquee carousel unmounted");
    };
  }, []);
  
  // Tagline phrases
  const taglinePhrases = [
    "The system that syncs with your system.",
    "Not an app. Not a tool. A new kind of presence.",
    "One presence. Infinite agents.",
    "The future isn't artificial — it's intentional.",
    "Dream deeper. Build smarter. Evolve together."
  ];
  
  // Features data
  const features = [
    {
      title: "AI Agent Ecosystem",
      description: "Orchestrate multiple specialized AI assistants in your workspace, each with unique capabilities tailored to specific tasks.",
      icon: Users
    },
    {
      title: "Dynamic Window Management",
      description: "Create your ideal layout with intuitive controls—drag, resize, and snap windows exactly where you need them for maximum productivity.",
      icon: Layout
    },
    {
      title: "Intelligent Assistant",
      description: "Panion remembers context across all conversations, making each interaction more personalized and efficient than traditional chatbots.",
      icon: MessageSquare
    },
    {
      title: "Command-First Navigation",
      description: "Work faster with keyboard-driven commands and instant access to all features through a powerful searchable command palette.",
      icon: Sparkles
    },
    {
      title: "Visual Customization",
      description: "Transform your workspace with beautiful themes and accent colors that adapt to your preferences and reduce eye strain.",
      icon: Fingerprint
    },
    {
      title: "Contextual Memory System",
      description: "Experience AI that truly understands you with advanced memory systems that learn from every interaction and anticipate your needs.",
      icon: Brain
    }
  ];
  
  // Use case examples - removed individual cards as requested
  const useCases: {
    title: string;
    description: string;
    user: string;
    icon: any;
    accent: string;
  }[] = [];
  
  // Agents for the carousel
  const keyFeatures = [
    {
      icon: MessageSquare,
      title: "Panion AI Agent",
      description: "Your primary AI companion for natural conversations and problem-solving"
    },
    {
      icon: Search,
      title: "Research Explorer",
      description: "Organizes information and retrieves relevant context for complex topics"
    },
    {
      icon: Database,
      title: "Data Analyst",
      description: "Creates visualizations and helps interpret complex data patterns"
    },
    {
      icon: FileText,
      title: "Notes Agent",
      description: "Captures important information and organizes it for future reference"
    },
    {
      icon: Terminal,
      title: "System Monitor",
      description: "Provides insights about agent activities and system status"
    },
    {
      icon: Layout,
      title: "Workflow Orchestrator",
      description: "Coordinates multiple agents to work together on complex tasks"
    }
  ];
  
  // Testimonials data (placeholder)
  const testimonials = [
    {
      quote: "Panion has completely changed how I interact with AI. Being able to run multiple agents simultaneously has boosted my productivity dramatically.",
      author: "Sarah Johnson",
      role: "Product Designer"
    },
    {
      quote: "The window management system is so intuitive. It feels like I'm using a real operating system, not just a web app.",
      author: "Michael Chen",
      role: "Software Engineer"
    },
    {
      quote: "Panion's memory capabilities are incredible. It remembers our previous conversations and builds upon them naturally.",
      author: "Leila Rodriguez",
      role: "Content Creator"
    }
  ];
  
  // Generate hero section gradient based on current theme
  const getHeroGradient = () => {
    const isDark = currentTheme === 'dark';
    
    // Always use our twilight purple-blue theme
    let gradientClasses = '';
    
    if (!isDark) {
      // Light mode twilight gradient
      gradientClasses = 'from-purple-700 via-violet-600 to-purple-800';
    } else {
      // Dark mode twilight gradient
      gradientClasses = 'from-[#1a1245] via-[#2d2468] to-[#33284b]';
    }
    
    return gradientClasses;
  };
  
  // Function to generate feature card for consistent card display
  const renderFeatureCard = (feature: any, key: string | number) => {
    return (
      <div key={key} className="w-[330px] flex-shrink-0 px-4">
        <div className={`${currentTheme === 'dark' ? 'bg-card border-gray-800' : 'bg-white border-gray-100'} border rounded-xl p-5 shadow-md hover:shadow-lg transition-all duration-300 h-80 flex flex-col hover:translate-y-[-5px]`}>
          <div className={featureIconClass}>
            <feature.icon className="w-10 h-10 text-purple-600" />
          </div>
          <div className="text-center flex-1 flex flex-col">
            <h3 className={`text-xl font-bold mb-3 ${currentTheme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{feature.title}</h3>
            <div className="w-12 h-1 bg-purple-600 rounded-full mx-auto mb-4"></div>
            <p className={`${currentTheme === 'dark' ? 'text-gray-300' : 'text-gray-600'} flex-1`}>{feature.description}</p>
            <div className={`mt-4 pt-4 ${currentTheme === 'dark' ? 'border-gray-800' : 'border-gray-100'} border-t`}>
              <button className="text-purple-600 text-sm font-medium hover:text-purple-400 transition-colors">
                Learn more
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Text colors based on theme
  const getTextColor = () => {
    return currentTheme === 'dark' ? 'text-white' : 'text-gray-900';
  };
  
  const getMutedTextColor = () => {
    return currentTheme === 'dark' ? 'text-white/80' : 'text-gray-700';
  };

  return (
    <PasswordProtection>
      <div className="flex flex-col min-h-screen overflow-auto">
        {/* Hero Section with Dynamic Theme */}
      <section className={`relative py-16 sm:py-24 md:py-40 bg-gradient-to-br ${getHeroGradient()} ${currentTheme === 'dark' ? 'text-white' : 'text-white'} overflow-hidden`}>
        {/* Particle effect background */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
          {/* Animated particles */}
          {Array.from({ length: 30 }).map((_, i) => (
            <motion.div
              key={i}
              className="absolute rounded-full bg-white/10"
              initial={{
                width: Math.random() * 12 + 2,
                height: Math.random() * 12 + 2,
                x: Math.random() * 100,
                y: Math.random() * 100,
                opacity: Math.random() * 0.5 + 0.1
              }}
              animate={{
                x: `calc(${Math.random() * 100}% + ${(Math.random() - 0.5) * 150}px)`,
                y: `calc(${Math.random() * 100}% + ${(Math.random() - 0.5) * 150}px)`,
                opacity: [0.1, 0.3, 0.1],
                scale: [1, Math.random() * 0.3 + 1.1, 1]
              }}
              transition={{
                duration: Math.random() * 20 + 15,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            />
          ))}
          
          {/* Digital connections/lines */}
          {Array.from({ length: 5 }).map((_, i) => (
            <motion.div
              key={`line-${i}`}
              className="absolute h-[1px] bg-gradient-to-r from-transparent via-purple-400/20 to-transparent transform"
              style={{
                top: `${15 + i * 20}%`,
                left: 0,
                right: 0,
                transformOrigin: 'center'
              }}
              initial={{ scaleX: 0, opacity: 0 }}
              animate={{ 
                scaleX: 1, 
                opacity: [0, 0.5, 0],
                y: [0, Math.random() * 50 - 25, 0]
              }}
              transition={{
                duration: Math.random() * 8 + 10,
                repeat: Infinity,
                repeatType: 'loop',
                ease: "easeInOut",
                delay: i * 2
              }}
            />
          ))}
          <div className="absolute top-1/3 left-10 w-72 h-72 rounded-full bg-purple-600/20 blur-3xl"></div>
          <div className="absolute bottom-1/4 right-10 w-80 h-80 rounded-full bg-violet-600/20 blur-3xl"></div>
          <div className="absolute top-3/4 left-1/3 w-64 h-64 rounded-full bg-purple-500/20 blur-3xl"></div>
        </div>
        
        {/* Floating window mockup in background - desktop version */}
        <motion.div 
          className="absolute hidden md:block right-10 lg:right-20 top-20 w-56 lg:w-72 bg-black/40 backdrop-blur-md rounded-lg overflow-hidden border border-white/20 shadow-2xl opacity-60 z-20"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 0.6 }}
          transition={{ duration: 1, delay: 0.8 }}
        >
          <div className="bg-black/40 h-6 border-b border-white/10 flex items-center px-3">
            <div className="flex items-center space-x-1.5">
              <div className="w-2 h-2 rounded-full bg-red-500"></div>
              <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
            </div>
            <div className="ml-3 text-xs text-white/70">Window</div>
          </div>
          <div className="h-32 bg-black/20"></div>
        </motion.div>
        
        <motion.div 
          className="absolute hidden md:block left-20 bottom-20 w-48 lg:w-64 bg-black/40 backdrop-blur-md rounded-lg overflow-hidden border border-white/20 shadow-2xl opacity-60 z-20 rotate-3"
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 0.6 }}
          transition={{ duration: 1, delay: 1.2 }}
        >
          <div className="bg-black/40 h-6 border-b border-white/10 flex items-center px-3">
            <div className="flex items-center space-x-1.5">
              <div className="w-2 h-2 rounded-full bg-red-500"></div>
              <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
            </div>
            <div className="ml-3 text-xs text-white/70">Agent</div>
          </div>
          <div className="h-28 bg-black/20"></div>
        </motion.div>
        
        {/* Floating window mockups for mobile version */}
        <motion.div 
          className="absolute block md:hidden right-3 top-24 w-32 bg-black/40 backdrop-blur-md rounded-lg overflow-hidden border border-white/20 shadow-2xl opacity-70 z-20 -rotate-2"
          initial={{ x: 20, opacity: 0 }}
          animate={{ x: 0, opacity: 0.7 }}
          transition={{ duration: 1, delay: 0.5 }}
        >
          <div className="bg-black/40 h-5 border-b border-white/10 flex items-center px-2">
            <div className="flex items-center space-x-1">
              <div className="w-1.5 h-1.5 rounded-full bg-red-500"></div>
              <div className="w-1.5 h-1.5 rounded-full bg-yellow-500"></div>
              <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
            </div>
            <div className="ml-2 text-[10px] text-white/70">Agent</div>
          </div>
          <div className="h-20 bg-black/20 p-2">
            <div className="w-full h-full rounded bg-purple-600/20 flex items-center justify-center">
              <div className="w-5 h-5 rounded-full bg-purple-500/40"></div>
            </div>
          </div>
        </motion.div>
        
        <motion.div 
          className="absolute block md:hidden left-4 bottom-36 w-28 bg-black/40 backdrop-blur-md rounded-lg overflow-hidden border border-white/20 shadow-2xl opacity-70 z-20 rotate-2"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 0.7 }}
          transition={{ duration: 1, delay: 0.7 }}
        >
          <div className="bg-black/40 h-5 border-b border-white/10 flex items-center px-2">
            <div className="flex items-center space-x-1">
              <div className="w-1.5 h-1.5 rounded-full bg-red-500"></div>
              <div className="w-1.5 h-1.5 rounded-full bg-yellow-500"></div>
              <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
            </div>
            <div className="ml-2 text-[10px] text-white/70">Chat</div>
          </div>
          <div className="h-16 bg-black/20 flex flex-col p-2 space-y-1">
            <div className="h-2 w-3/4 ml-auto bg-purple-500/40 rounded-full"></div>
            <div className="h-2 w-1/2 bg-white/20 rounded-full"></div>
            <div className="h-2 w-2/3 ml-auto bg-purple-500/40 rounded-full"></div>
          </div>
        </motion.div>
        
        <motion.div 
          className="absolute block md:hidden left-12 top-24 w-28 bg-black/40 backdrop-blur-md rounded-lg overflow-hidden border border-white/20 shadow-2xl opacity-70 z-20 rotate-2"
          initial={{ x: -10, opacity: 0 }}
          animate={{ x: 0, opacity: 0.7 }}
          transition={{ duration: 1, delay: 0.9 }}
        >
          <div className="bg-black/40 h-5 border-b border-white/10 flex items-center px-2">
            <div className="flex items-center space-x-1">
              <div className="w-1.5 h-1.5 rounded-full bg-red-500"></div>
              <div className="w-1.5 h-1.5 rounded-full bg-yellow-500"></div>
              <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
            </div>
            <div className="ml-2 text-[10px] text-white/70">Data</div>
          </div>
          <div className="h-14 bg-black/20 p-2">
            <div className="h-5 rounded bg-purple-600/20 flex items-end justify-center pb-1">
              <div className="w-1/5 h-2/5 rounded-t bg-purple-500/70 mx-[1px]"></div>
              <div className="w-1/5 h-4/5 rounded-t bg-purple-500/70 mx-[1px]"></div>
              <div className="w-1/5 h-3/5 rounded-t bg-purple-500/70 mx-[1px]"></div>
              <div className="w-1/5 h-full rounded-t bg-purple-500/70 mx-[1px]"></div>
              <div className="w-1/5 h-1/5 rounded-t bg-purple-500/70 mx-[1px]"></div>
            </div>
            <div className="h-1.5 bg-white/10 rounded-full mt-2 mx-1 w-2/3"></div>
          </div>
        </motion.div>
        
        {/* Main content */}
        <div className="container mx-auto px-4 relative z-30">
          <div className="flex flex-col items-center text-center max-w-3xl mx-auto px-2 sm:px-4">
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7 }}
              className="relative"
            >
              <motion.div 
                className="absolute -top-5 -left-10 w-20 h-20 bg-purple-500/40 rounded-full blur-2xl"
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
              />
              <motion.div 
                className="absolute -top-5 -right-10 w-20 h-20 bg-violet-500/40 rounded-full blur-2xl"
                animate={{ scale: [1, 1.3, 1] }}
                transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
              />
              <h1 className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl font-bold mb-4 md:mb-8 bg-clip-text text-transparent bg-gradient-to-r from-white to-purple-200 drop-shadow-sm relative z-30 px-2">
                <span className="absolute inset-0 blur-xl bg-black/20 -z-10 rounded-3xl"></span>
                This is <span className="text-violet-300">Panion</span>
              </h1>
            </motion.div>
            
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.2 }}
              className="hidden sm:block text-base sm:text-xl md:text-2xl text-purple-200 mb-6 sm:mb-10 min-h-[80px] sm:min-h-16 backdrop-blur-sm py-2 px-2 sm:px-4 rounded-lg bg-white/5 border border-purple-500/20 w-full max-w-xl"
            >
              <RotatingTagline 
                phrases={taglinePhrases} 
                interval={8000}
                className="text-xl md:text-2xl text-purple-100 font-medium leading-normal"
              />
            </motion.div>
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="flex flex-row gap-4 mt-2 sm:mt-0"
            >
              <div className="relative">
                <motion.div
                  className="absolute inset-0 rounded-xl bg-violet-500/50 blur-md z-0"
                  animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.8, 0.5] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                />
                <Button 
                  size="lg" 
                  onClick={() => setLocation('/desktop')}
                  className="text-base sm:text-lg bg-purple-600 hover:bg-purple-500 text-white px-4 sm:px-8 py-4 sm:py-6 rounded-xl shadow-lg hover:shadow-purple-500/30 transition-all relative z-10 flex-1 sm:flex-none"
                >
                  Get Started
                </Button>
              </div>
              <Button 
                size="lg" 
                variant="outline" 
                onClick={() => setLocation('/auth')}
                className="text-base sm:text-lg border-2 border-violet-400 text-purple-200 hover:bg-violet-600/30 px-4 sm:px-8 py-4 sm:py-6 rounded-xl flex-1 sm:flex-none"
              >
                Sign In
              </Button>
            </motion.div>
          </div>
        </div>
        
        {/* Bottom gradient overlay - smoother transition */}
        <div className={`absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t ${currentTheme === 'dark' ? 'from-background via-background/80' : 'from-white via-white/80'} to-transparent z-10`}></div>
      </section>
      
      {/* Use Cases Section */}
      <section className={`pt-0 pb-12 md:pt-0 md:pb-16 ${currentTheme === 'dark' ? 'bg-background text-foreground' : 'bg-white text-gray-900'}`}>
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center mb-8 mt-6">
            <h2 className={`text-4xl md:text-6xl font-bold mb-6 ${currentTheme === 'dark' ? 'text-white' : 'text-gray-900'} tracking-tight`}>
              One presence. <span className="text-purple-600">Infinite agents.</span>
            </h2>
            <p className={`text-xl ${currentTheme === 'dark' ? 'text-gray-300' : 'text-gray-600'} mt-4`}>
              See how people are using Panion to transform their work and creative processes
            </p>
          </div>
          
          {/* Visual Mockups for Use Cases */}
          <div className="w-full overflow-hidden rounded-xl shadow-xl mb-8 border border-gray-100">
            <div className="bg-gradient-to-br from-slate-900 to-purple-950 aspect-[16/9] md:aspect-[21/9] relative p-4 md:p-8 flex items-center overflow-hidden">
              {/* Desktop-like mockup with multiple windows */}
              <div className="absolute inset-0 bg-grid-white/5 bg-[length:20px_20px] opacity-20"></div>
              
              {/* Desktop Layout */}
              <div className="hidden md:block w-full h-full relative">
                {/* Window 1: Creative Studio */}
                <motion.div
                  initial={{ x: -40, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ duration: 0.8, delay: 0.3 }}
                  className="absolute left-[10%] top-[15%] w-[30%] bg-black/80 rounded-lg overflow-hidden border border-white/10 shadow-2xl"
                >
                  <div className="bg-black/70 h-7 border-b border-white/10 flex items-center px-3">
                    <div className="flex items-center space-x-1.5">
                      <div className="w-3 h-3 rounded-full bg-red-500"></div>
                      <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                      <div className="w-3 h-3 rounded-full bg-green-500"></div>
                    </div>
                    <div className="ml-4 text-xs text-white/70">Design Assistant</div>
                  </div>
                  <div className="p-3 overflow-hidden">
                    <div className="grid grid-cols-3 gap-2">
                      <div className="h-16 rounded bg-violet-600/20 p-2">
                        <div className="w-full h-full rounded bg-violet-500/40"></div>
                      </div>
                      <div className="h-16 rounded bg-violet-600/20 p-2">
                        <div className="w-full h-full rounded bg-violet-500/40"></div>
                      </div>
                      <div className="h-16 rounded bg-purple-600/20 p-2">
                        <div className="w-full h-full rounded bg-purple-500/40"></div>
                      </div>
                    </div>
                    <div className="h-2 bg-white/20 rounded-full mt-3 mx-1"></div>
                    <div className="h-2 bg-white/10 rounded-full mt-2 mx-1 w-3/4"></div>
                  </div>
                </motion.div>
                
                {/* Window 2: Research Dashboard */}
                <motion.div
                  initial={{ y: 40, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.8, delay: 0.5 }}
                  className="absolute right-[10%] top-[25%] w-[35%] bg-black/80 rounded-lg overflow-hidden border border-white/10 shadow-2xl"
                >
                  <div className="bg-black/70 h-7 border-b border-white/10 flex items-center px-3">
                    <div className="flex items-center space-x-1.5">
                      <div className="w-3 h-3 rounded-full bg-red-500"></div>
                      <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                      <div className="w-3 h-3 rounded-full bg-green-500"></div>
                    </div>
                    <div className="ml-4 text-xs text-white/70">Research Explorer</div>
                  </div>
                  <div className="p-3 overflow-hidden">
                    <div className="flex space-x-2">
                      <div className="w-2/3">
                        <div className="h-3 bg-white/20 rounded-full mb-2"></div>
                        <div className="h-3 bg-white/10 rounded-full mb-2 w-4/5"></div>
                        <div className="h-3 bg-white/10 rounded-full mb-2"></div>
                        <div className="h-3 bg-white/10 rounded-full mb-2 w-3/4"></div>
                        <div className="h-3 bg-white/10 rounded-full mb-2 w-5/6"></div>
                      </div>
                      <div className="w-1/3 h-20 rounded bg-purple-600/20 flex items-center justify-center">
                        <div className="w-8 h-8 rounded-full bg-purple-500/40"></div>
                      </div>
                    </div>
                  </div>
                </motion.div>
                
                {/* Window 3: Data Analysis */}
                <motion.div
                  initial={{ x: 40, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ duration: 0.8, delay: 0.7 }}
                  className="absolute left-[25%] bottom-[15%] w-[28%] bg-black/80 rounded-lg overflow-hidden border border-white/10 shadow-2xl"
                >
                  <div className="bg-black/70 h-7 border-b border-white/10 flex items-center px-3">
                    <div className="flex items-center space-x-1.5">
                      <div className="w-3 h-3 rounded-full bg-red-500"></div>
                      <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                      <div className="w-3 h-3 rounded-full bg-green-500"></div>
                    </div>
                    <div className="ml-4 text-xs text-white/70">Data Insights</div>
                  </div>
                  <div className="p-3 overflow-hidden">
                    <div className="h-10 rounded bg-purple-600/20 flex items-end justify-center pb-1">
                      <div className="w-1/6 h-3/6 rounded-t bg-purple-500/70 mx-[2px]"></div>
                      <div className="w-1/6 h-5/6 rounded-t bg-purple-500/70 mx-[2px]"></div>
                      <div className="w-1/6 h-4/6 rounded-t bg-purple-500/70 mx-[2px]"></div>
                      <div className="w-1/6 h-full rounded-t bg-purple-500/70 mx-[2px]"></div>
                      <div className="w-1/6 h-2/6 rounded-t bg-purple-500/70 mx-[2px]"></div>
                      <div className="w-1/6 h-3/6 rounded-t bg-purple-500/70 mx-[2px]"></div>
                    </div>
                    <div className="h-2 bg-white/20 rounded-full mt-3 mx-1"></div>
                    <div className="h-2 bg-white/10 rounded-full mt-2 mx-1 w-1/2"></div>
                  </div>
                </motion.div>
              </div>
              
              {/* Mobile Layout - completely different arrangement */}
              <div className="md:hidden w-full h-full relative">
                {/* Mobile Window 1: Creative Studio */}
                <motion.div
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ duration: 0.8, delay: 0.3 }}
                  className="absolute left-[5%] top-[10%] w-[40%] bg-black/80 rounded-lg overflow-hidden border border-white/10 shadow-2xl"
                >
                  <div className="bg-black/70 h-5 border-b border-white/10 flex items-center px-2">
                    <div className="flex items-center space-x-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-red-500"></div>
                      <div className="w-1.5 h-1.5 rounded-full bg-yellow-500"></div>
                      <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                    </div>
                    <div className="ml-2 text-[8px] text-white/70">Design</div>
                  </div>
                  <div className="p-2 overflow-hidden">
                    <div className="grid grid-cols-2 gap-1">
                      <div className="h-8 rounded bg-violet-600/20 p-1">
                        <div className="w-full h-full rounded bg-violet-500/40"></div>
                      </div>
                      <div className="h-8 rounded bg-purple-600/20 p-1">
                        <div className="w-full h-full rounded bg-purple-500/40"></div>
                      </div>
                    </div>
                    <div className="h-1.5 bg-white/20 rounded-full mt-2 mx-1"></div>
                    <div className="h-1.5 bg-white/10 rounded-full mt-1 mx-1 w-3/4"></div>
                  </div>
                </motion.div>
                
                {/* Mobile Window 2: Chat Interface */}
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.8, delay: 0.5 }}
                  className="absolute right-[5%] top-[20%] w-[35%] bg-black/80 rounded-lg overflow-hidden border border-white/10 shadow-2xl"
                >
                  <div className="bg-black/70 h-5 border-b border-white/10 flex items-center px-2">
                    <div className="flex items-center space-x-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-red-500"></div>
                      <div className="w-1.5 h-1.5 rounded-full bg-yellow-500"></div>
                      <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                    </div>
                    <div className="ml-2 text-[8px] text-white/70">Chat</div>
                  </div>
                  <div className="p-2 overflow-hidden">
                    <div className="flex flex-col space-y-1">
                      <div className="h-1.5 bg-white/20 rounded-full w-3/4 ml-auto"></div>
                      <div className="h-1.5 bg-purple-500/40 rounded-full w-4/5"></div>
                      <div className="h-1.5 bg-white/20 rounded-full w-2/3 ml-auto"></div>
                    </div>
                    <div className="h-3 mt-2 bg-black/40 rounded-full w-full flex items-center px-1">
                      <div className="h-1.5 bg-white/10 rounded-full w-3/4"></div>
                    </div>
                  </div>
                </motion.div>
                
                {/* Mobile Window 3: Data Analysis */}
                <motion.div
                  initial={{ x: 20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ duration: 0.8, delay: 0.7 }}
                  className="absolute left-[15%] bottom-[15%] w-[35%] bg-black/80 rounded-lg overflow-hidden border border-white/10 shadow-2xl rotate-2"
                >
                  <div className="bg-black/70 h-5 border-b border-white/10 flex items-center px-2">
                    <div className="flex items-center space-x-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-red-500"></div>
                      <div className="w-1.5 h-1.5 rounded-full bg-yellow-500"></div>
                      <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                    </div>
                    <div className="ml-2 text-[8px] text-white/70">Data</div>
                  </div>
                  <div className="p-2 overflow-hidden">
                    <div className="h-8 rounded bg-purple-600/20 flex items-end justify-center pb-1">
                      <div className="w-1/6 h-3/6 rounded-t bg-purple-500/70 mx-[1px]"></div>
                      <div className="w-1/6 h-5/6 rounded-t bg-purple-500/70 mx-[1px]"></div>
                      <div className="w-1/6 h-4/6 rounded-t bg-purple-500/70 mx-[1px]"></div>
                      <div className="w-1/6 h-full rounded-t bg-purple-500/70 mx-[1px]"></div>
                      <div className="w-1/6 h-2/6 rounded-t bg-purple-500/70 mx-[1px]"></div>
                    </div>
                  </div>
                </motion.div>
                
                {/* Mobile Window 4: AI Assistant */}
                <motion.div
                  initial={{ y: -10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.8, delay: 0.9 }}
                  className="absolute right-[12%] bottom-[25%] w-[25%] bg-black/80 rounded-lg overflow-hidden border border-white/10 shadow-2xl -rotate-2"
                >
                  <div className="bg-black/70 h-5 border-b border-white/10 flex items-center px-2">
                    <div className="flex items-center space-x-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-red-500"></div>
                      <div className="w-1.5 h-1.5 rounded-full bg-yellow-500"></div>
                      <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                    </div>
                    <div className="ml-2 text-[8px] text-white/70">AI</div>
                  </div>
                  <div className="h-10 bg-black/20 flex items-center justify-center">
                    <div className="w-5 h-5 rounded-full bg-purple-500/40 animate-pulse"></div>
                  </div>
                </motion.div>
              </div>
              
              {/* Central orbiting connection - visible on both mobile and desktop */}
              <motion.div 
                className="absolute inset-0 flex items-center justify-center pointer-events-none"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 1.5, delay: 1 }}
              >
                <div className="relative w-10 h-10 md:w-16 md:h-16">
                  <motion.div 
                    className="absolute inset-0 rounded-full bg-purple-500/40"
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                  />
                  <motion.div 
                    className="absolute inset-2 md:inset-3 rounded-full bg-violet-500/60"
                    animate={{ scale: [1.2, 1, 1.2] }}
                    transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                  />
                  
                  {/* Orbiting connections */}
                  <motion.div
                    className="absolute w-full h-full"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                  >
                    <div className="absolute top-0 left-1/2 w-1 h-1 bg-white rounded-full shadow-glow"></div>
                    <div className="absolute top-1/4 right-0 w-1.5 h-1.5 md:w-2 md:h-2 bg-white rounded-full shadow-glow"></div>
                    <div className="absolute bottom-0 left-1/3 w-1 h-1 md:w-1.5 md:h-1.5 bg-white rounded-full shadow-glow"></div>
                  </motion.div>
                </div>
              </motion.div>
              
              {/* Connection lines - hidden on mobile */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none hidden md:block" xmlns="http://www.w3.org/2000/svg">
                <motion.path 
                  d="M 200,100 C 250,150 300,180 400,200" 
                  stroke="rgba(255,255,255,0.1)" 
                  strokeWidth="1" 
                  fill="none"
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 0.5 }}
                  transition={{ duration: 1.5, delay: 1.2 }}
                />
                <motion.path 
                  d="M 600,150 C 550,200 450,200 400,200" 
                  stroke="rgba(255,255,255,0.1)" 
                  strokeWidth="1" 
                  fill="none"
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 0.5 }}
                  transition={{ duration: 1.5, delay: 1.4 }}
                />
                <motion.path 
                  d="M 300,250 C 350,230 380,220 400,200" 
                  stroke="rgba(255,255,255,0.1)" 
                  strokeWidth="1" 
                  fill="none"
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 0.5 }}
                  transition={{ duration: 1.5, delay: 1.6 }}
                />
              </svg>
            </div>
          </div>
          
          {/* Use Case Cards - Removed as requested */}
        </div>
      </section>
      
      {/* Agents Carousel Section */}
      <section className={`py-6 md:py-10 ${currentTheme === 'dark' ? 'bg-background text-foreground border-gray-800' : 'bg-white text-gray-900 border-gray-100'} border-b`}>
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center mb-8">
            <h2 className={`text-2xl md:text-3xl font-bold mb-4 ${currentTheme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              Meet the <span className="text-purple-600">Agents</span>
            </h2>
            <p className={`text-lg ${currentTheme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
              Specialized AI agents that work together to enhance your experience
            </p>
          </div>
          
          <div className="max-w-5xl mx-auto" ref={featuresRef}>
            
            {/* Marquee-style continuous scrolling with pause on hover - showing 3 at a time */}
            <div className="overflow-hidden relative px-6 my-4 pause-on-hover">
              <div className="relative h-80">
                {/* Visible container - limits to show only 3 cards */}
                <div className="mx-auto max-w-[990px] overflow-hidden">
                  <div className="flex animate-marquee">
                    {/* First set of cards */}
                    {keyFeatures.map((feature, index) => renderFeatureCard(feature, index))}
                    
                    {/* Duplicate set for seamless looping */}
                    {keyFeatures.map((feature, index) => renderFeatureCard(feature, `dup-${index}`))}
                  </div>
                </div>
              </div>
            </div>
            
            {/* Removed auto-scroll indicator banner */}
          </div>
        </div>
      </section>
      
      {/* Screenshot/Demo Section - Removed as requested */}
      
      {/* Testimonials - Removed as requested */}
      
      {/* CTA Section - Removed as requested */}
      
{/* Footer removed as requested */}
    </div>
    </PasswordProtection>
  );
};

export default LandingPage;