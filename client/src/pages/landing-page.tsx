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



const LandingPage: React.FC = () => {
  const [_, setLocation] = useLocation();
  const [currentFeatureIndex, setCurrentFeatureIndex] = useState(0);
  const featuresRef = useRef<HTMLDivElement>(null);
  const autoScrollTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-scroll functionality for continuous scrolling
  useEffect(() => {
    // Clear any existing timer
    if (autoScrollTimerRef.current) {
      clearInterval(autoScrollTimerRef.current);
    }
    
    // Set up automatic scrolling every 3 seconds
    autoScrollTimerRef.current = setInterval(() => {
      setCurrentFeatureIndex((prev) => (prev + 1) % keyFeatures.length);
    }, 3000);
    
    // Clean up on unmount
    return () => {
      if (autoScrollTimerRef.current) {
        clearInterval(autoScrollTimerRef.current);
      }
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
      description: "Clara remembers context across all conversations, making each interaction more personalized and efficient than traditional chatbots.",
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
  
  // Use case examples
  const useCases = [
    {
      title: "Creative Studio Setup",
      description: "Graphic designer Sarah created a workspace with a mood board agent, visual reference collector, and color palette generator, all working in harmony.",
      user: "Sarah T., Graphic Designer",
      icon: PenTool,
      accent: "violet"
    },
    {
      title: "Research Dashboard",
      description: "Professor James built a research environment with automatic literature review, data analysis, and summary generation agents to accelerate his academic work.",
      user: "James L., Research Scientist",
      icon: FileText,
      accent: "indigo"
    },
    {
      title: "Data Analysis Hub",
      description: "Data scientist Mei configured data cleaning, visualization, and insight generation agents that work together to process large datasets efficiently.",
      user: "Mei W., Data Scientist",
      icon: Database,
      accent: "purple"
    },
    {
      title: "Product Development Suite",
      description: "Product manager Alex created a workspace with market research, feature prioritization, and roadmap planning agents to streamline product development.",
      user: "Alex R., Product Manager",
      icon: Layers,
      accent: "blue"
    },
    {
      title: "Marketing Campaign Center",
      description: "Marketer Jordan built a campaign management environment with content creation, audience analysis, and performance tracking agents in one place.",
      user: "Jordan K., Marketing Director",
      icon: Presentation,
      accent: "purple"
    },
    {
      title: "Developer Workspace",
      description: "Software engineer Miguel set up a coding environment with documentation, testing, and code review agents that collaborate on his projects.",
      user: "Miguel S., Software Engineer",
      icon: Code,
      accent: "indigo"
    }
  ];
  
  // Agents for the carousel
  const keyFeatures = [
    {
      icon: MessageSquare,
      title: "Clara AI Agent",
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
      quote: "Clara's memory capabilities are incredible. She remembers our previous conversations and builds upon them naturally.",
      author: "Leila Rodriguez",
      role: "Content Creator"
    }
  ];

  return (
    <div className="flex flex-col min-h-screen overflow-auto">
      {/* Hero Section - Twilight Purple-Blue */}
      <section className="relative py-28 md:py-40 bg-gradient-to-br from-[#1a1245] via-[#2d2468] to-[#33284b] text-white overflow-hidden">
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
              className="absolute h-[1px] bg-gradient-to-r from-transparent via-blue-400/20 to-transparent transform"
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
          <div className="absolute top-1/3 left-10 w-72 h-72 rounded-full bg-indigo-600/20 blur-3xl"></div>
          <div className="absolute bottom-1/4 right-10 w-80 h-80 rounded-full bg-purple-600/20 blur-3xl"></div>
          <div className="absolute top-3/4 left-1/3 w-64 h-64 rounded-full bg-violet-500/20 blur-3xl"></div>
        </div>
        
        {/* Floating window mockup in background */}
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
        
        {/* Main content */}
        <div className="container mx-auto px-4 relative z-30">
          <div className="flex flex-col items-center text-center max-w-3xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7 }}
              className="relative"
            >
              <motion.div 
                className="absolute -top-5 -left-10 w-20 h-20 bg-indigo-500/40 rounded-full blur-2xl"
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
              />
              <motion.div 
                className="absolute -top-5 -right-10 w-20 h-20 bg-violet-500/40 rounded-full blur-2xl"
                animate={{ scale: [1, 1.3, 1] }}
                transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
              />
              <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold mb-8 bg-clip-text text-transparent bg-gradient-to-r from-white to-purple-200 drop-shadow-sm relative z-30">
                <span className="absolute inset-0 blur-xl bg-black/20 -z-10 rounded-3xl"></span>
                This is <span className="text-violet-300">Panion</span>
              </h1>
            </motion.div>
            
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.2 }}
              className="text-xl md:text-2xl text-purple-200 mb-10 min-h-16 backdrop-blur-sm py-2 px-4 rounded-lg bg-white/5 border border-purple-500/20 w-full max-w-xl"
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
              className="flex flex-col sm:flex-row gap-6"
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
                  className="text-lg bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-6 rounded-xl shadow-lg hover:shadow-indigo-500/30 transition-all relative z-10"
                >
                  Get Started
                </Button>
              </div>
              <Button 
                size="lg" 
                variant="outline" 
                onClick={() => setLocation('/auth')}
                className="text-lg border-2 border-violet-400 text-purple-200 hover:bg-violet-600/30 px-8 py-6 rounded-xl"
              >
                Sign In
              </Button>
            </motion.div>
          </div>
        </div>
        
        {/* Bottom gradient overlay - smoother transition */}
        <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-white via-white/80 to-transparent z-10"></div>
      </section>
      
      {/* Use Cases Section */}
      <section className="pt-0 pb-20 md:pt-0 md:pb-32 bg-white text-gray-900">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center mb-16 mt-10">
            <h2 className="text-4xl md:text-6xl font-bold mb-6 text-gray-900 tracking-tight">
              One presence. <span className="text-indigo-600">Infinite agents.</span>
            </h2>
            <p className="text-xl text-gray-600 mt-4">
              See how people are using Panion to transform their work and creative processes
            </p>
          </div>
          
          {/* Visual Mockups for Use Cases */}
          <div className="w-full overflow-hidden rounded-xl shadow-xl mb-16 border border-gray-100">
            <div className="bg-gradient-to-br from-slate-900 to-indigo-950 aspect-[21/9] relative p-8 flex items-center overflow-hidden">
              {/* Desktop-like mockup with multiple windows */}
              <div className="absolute inset-0 bg-grid-white/5 bg-[length:20px_20px] opacity-20"></div>
              
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
                    <div className="h-16 rounded bg-indigo-600/20 p-2">
                      <div className="w-full h-full rounded bg-indigo-500/40"></div>
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
                    <div className="w-1/3 h-20 rounded bg-indigo-600/20 flex items-center justify-center">
                      <div className="w-8 h-8 rounded-full bg-indigo-500/40"></div>
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
              
              {/* Central orbiting connection */}
              <motion.div 
                className="absolute inset-0 flex items-center justify-center pointer-events-none"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 1.5, delay: 1 }}
              >
                <div className="relative w-16 h-16">
                  <motion.div 
                    className="absolute inset-0 rounded-full bg-indigo-500/40"
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                  />
                  <motion.div 
                    className="absolute inset-3 rounded-full bg-violet-500/60"
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
                    <div className="absolute top-1/4 right-0 w-2 h-2 bg-white rounded-full shadow-glow"></div>
                    <div className="absolute bottom-0 left-1/3 w-1.5 h-1.5 bg-white rounded-full shadow-glow"></div>
                  </motion.div>
                </div>
              </motion.div>
              
              {/* Connection lines */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none" xmlns="http://www.w3.org/2000/svg">
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
          
          {/* Use Case Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
            {useCases.map((useCase, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 * index }}
                className="bg-white border border-gray-100 rounded-xl p-7 flex flex-col shadow-md hover:shadow-xl transition-shadow duration-300 group"
                whileHover={{ y: -5 }}
              >
                <div className={`rounded-full p-3 ${
                  useCase.accent === 'violet' ? 'bg-violet-100' : 
                  useCase.accent === 'indigo' ? 'bg-indigo-100' : 
                  useCase.accent === 'purple' ? 'bg-purple-100' : 'bg-blue-100'
                } w-fit mb-5 group-hover:shadow-md transition-all duration-300`}>
                  <useCase.icon className={`w-7 h-7 ${
                    useCase.accent === 'violet' ? 'text-violet-600' : 
                    useCase.accent === 'indigo' ? 'text-indigo-600' : 
                    useCase.accent === 'purple' ? 'text-purple-600' : 'text-blue-600'
                  }`} />
                </div>
                <h3 className="text-xl font-bold mt-3 mb-3 text-gray-900 group-hover:text-indigo-600 transition-colors duration-300">{useCase.title}</h3>
                <div className={`w-12 h-1 ${
                  useCase.accent === 'violet' ? 'bg-violet-500' : 
                  useCase.accent === 'indigo' ? 'bg-indigo-500' : 
                  useCase.accent === 'purple' ? 'bg-purple-500' : 'bg-blue-500'
                } mb-4 rounded-full group-hover:w-16 transition-all duration-300`}></div>
                <p className="text-gray-600 text-base leading-relaxed">{useCase.description}</p>
                <span className="mt-auto pt-5 text-sm italic text-gray-500">{useCase.user}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
      
      {/* Agents Carousel Section */}
      <section className="py-10 md:py-16 bg-white text-gray-900 border-b border-gray-100">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center mb-8">
            <h2 className="text-2xl md:text-3xl font-bold mb-4 text-gray-900">
              Meet the <span className="text-indigo-600">Agents</span>
            </h2>
            <p className="text-lg text-gray-600">
              Specialized AI agents that work together to enhance your experience
            </p>
          </div>
          
          <div className="max-w-5xl mx-auto" ref={featuresRef}>
            
            {/* Continuous scrolling cards display */}
            <div className="overflow-hidden relative px-6 my-4">
              <div className="relative h-80">
                <div 
                  className="flex gap-8 absolute transition-all duration-1000 ease-in-out"
                  style={{ 
                    transform: `translateX(calc(-${(currentFeatureIndex * 25) % 100}% - ${Math.floor(currentFeatureIndex / 4) * 100}%))`,
                    width: "max-content" 
                  }}
                >
                  {/* Double the cards to create continuous scrolling effect */}
                  {[...keyFeatures, ...keyFeatures].map((feature, index) => (
                    <div key={index} className="w-[300px] flex-shrink-0">
                      <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-md hover:shadow-lg transition-all duration-300 h-80 flex flex-col hover:translate-y-[-5px]">
                        <div className="rounded-full p-5 bg-indigo-100 bg-gradient-to-br from-violet-50 to-indigo-200 w-fit mb-6 mx-auto">
                          <feature.icon className="w-10 h-10 text-indigo-600" />
                        </div>
                        <div className="text-center flex-1 flex flex-col">
                          <h3 className="text-xl font-bold mb-3 text-gray-900">{feature.title}</h3>
                          <div className="w-12 h-1 bg-indigo-500 rounded-full mx-auto mb-4"></div>
                          <p className="text-gray-600 flex-1">{feature.description}</p>
                          <div className="mt-4 pt-4 border-t border-gray-100">
                            <button className="text-indigo-600 text-sm font-medium hover:text-indigo-800 transition-colors">
                              Learn more
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            {/* Auto-scroll indicator */}
            <div className="flex justify-center mt-4">
              <div className="px-4 py-2 bg-indigo-100 rounded-full text-indigo-700 text-xs font-medium">
                Auto-scrolling cards
              </div>
            </div>
          </div>
        </div>
      </section>
      
      {/* Screenshot/Demo Section */}
      <section className="py-20 md:py-32 bg-gradient-to-b from-white to-blue-50 text-gray-900">
        <div className="container mx-auto px-4">
          <div className="flex flex-col lg:flex-row items-center gap-12">
            <div className="flex-1">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5 }}
              >
                <h2 className="text-3xl md:text-4xl font-bold mb-6 text-gray-900">Experience Next-Gen AI Interaction</h2>
                <p className="text-xl text-gray-600 mb-8">
                  Panion transforms how you interact with AI by providing a flexible, intuitive workspace for multiple agents.
                </p>
                <ul className="space-y-4 text-gray-800">
                  {[
                    "Customizable window layouts to fit your workflow",
                    "Seamless theme switching for day and night work",
                    "Command palette for keyboard-centric navigation",
                    "Built-in memory system for contextual conversations"
                  ].map((item, i) => (
                    <motion.li 
                      key={i}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3, delay: 0.1 * i }}
                      className="flex items-start"
                    >
                      <span className="text-indigo-600 mr-2">✓</span> {item}
                    </motion.li>
                  ))}
                </ul>
              </motion.div>
            </div>
            
            <div className="flex-1">
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
                className="bg-muted rounded-lg border border-border overflow-hidden shadow-xl"
              >
                {/* Animated demo windows showing Panion in action */}
                <div className="aspect-[16/9] bg-gradient-to-br from-black/40 to-black/60 flex items-center justify-center relative overflow-hidden p-4">
                  {/* Clara AI window mockup */}
                  <motion.div 
                    initial={{ x: -50, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ duration: 0.7, delay: 0.2 }}
                    className="absolute left-[5%] top-[10%] w-[50%] bg-black/80 rounded-lg overflow-hidden border border-white/10 shadow-2xl"
                  >
                    <div className="bg-black/80 h-7 border-b border-white/10 flex items-center px-3">
                      <div className="flex items-center space-x-1.5">
                        <div className="w-3 h-3 rounded-full bg-red-500"></div>
                        <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                        <div className="w-3 h-3 rounded-full bg-green-500"></div>
                      </div>
                      <div className="ml-4 text-xs text-white/70">Clara AI</div>
                    </div>
                    <div className="p-4 text-white">
                      <div className="flex items-start mb-4">
                        <div className="min-w-8 w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center mr-2">
                          <div className="w-4 h-4 rounded-full bg-primary"></div>
                        </div>
                        <div className="p-2 px-3 bg-white/10 rounded-lg text-xs max-w-[85%]">
                          How can I help you today? I can answer questions, brainstorm ideas, or help with your workflow.
                        </div>
                      </div>
                      <div className="flex items-start justify-end">
                        <div className="p-2 px-3 bg-primary/30 rounded-lg text-xs max-w-[85%]">
                          I need to organize my project research and create a presentation.
                        </div>
                        <div className="min-w-8 w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center ml-2">
                          <div className="w-4 h-4 rounded-full bg-primary"></div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                  
                  {/* Notes window mockup */}
                  <motion.div 
                    initial={{ x: 50, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ duration: 0.7, delay: 0.5 }}
                    className="absolute right-[5%] top-[25%] w-[40%] bg-black/80 rounded-lg overflow-hidden border border-white/10 shadow-2xl"
                  >
                    <div className="bg-black/80 h-7 border-b border-white/10 flex items-center px-3">
                      <div className="flex items-center space-x-1.5">
                        <div className="w-3 h-3 rounded-full bg-red-500"></div>
                        <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                        <div className="w-3 h-3 rounded-full bg-green-500"></div>
                      </div>
                      <div className="ml-4 text-xs text-white/70">Quick Notes</div>
                    </div>
                    <div className="p-3 text-white">
                      <div className="text-xs font-medium mb-2 text-primary">Project Research Notes</div>
                      <div className="text-xs text-white/80">
                        <p className="mb-1">• Review competitor analysis</p>
                        <p className="mb-1">• Create initial project timeline</p>
                        <p className="mb-1">• Gather requirements from stakeholders</p>
                        <p className="mb-1">• Prepare presentation outline</p>
                      </div>
                    </div>
                  </motion.div>
                  
                  {/* Command palette mockup */}
                  <motion.div 
                    initial={{ y: -20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.5, delay: 0.8 }}
                    className="absolute top-[50%] left-[50%] transform -translate-x-1/2 -translate-y-1/2 w-[60%] max-w-md bg-black/90 backdrop-blur-lg rounded-lg border border-white/20 shadow-2xl"
                  >
                    <div className="p-3 border-b border-white/10 flex items-center">
                      <Search className="w-4 h-4 text-white/50 mr-2" />
                      <div className="text-xs text-white/50">Command palette</div>
                    </div>
                    <div className="p-2">
                      <div className="p-2 bg-white/10 rounded mb-1 flex items-center text-xs text-white">
                        <LayoutGrid className="w-3 h-3 mr-2 text-blue-400" />
                        <span>Open Notes</span>
                      </div>
                      <div className="p-2 hover:bg-white/5 rounded mb-1 flex items-center text-xs text-white/70">
                        <MessageSquare className="w-3 h-3 mr-2 text-blue-400" />
                        <span>Chat with Clara</span>
                      </div>
                      <div className="p-2 hover:bg-white/5 rounded flex items-center text-xs text-white/70">
                        <Terminal className="w-3 h-3 mr-2 text-amber-400" />
                        <span>Show System Logs</span>
                      </div>
                    </div>
                  </motion.div>
                  
                  {/* Gradient overlay */}
                  <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-black/40 to-transparent"></div>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </section>
      
      {/* Testimonials */}
      <section className="py-20 md:py-32 bg-white text-gray-900">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-gray-900">What Users Say</h2>
            <p className="text-xl text-gray-600">Join the community of Panion users</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: 0.1 * index }}
                className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm"
              >
                <div className="flex flex-col">
                  <p className="text-gray-600 italic">{testimonial.quote}</p>
                  <div className="mt-4">
                    <p className="font-semibold text-gray-900">{testimonial.author}</p>
                    <p className="text-sm text-gray-600">{testimonial.role}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
      
      {/* CTA Section */}
      <section className="py-20 md:py-32 bg-gradient-to-t from-indigo-100 via-violet-50 to-white text-gray-900">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <motion.h2 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="text-3xl md:text-4xl font-bold mb-6 text-gray-900"
            >
              Ready to Transform Your AI Experience?
            </motion.h2>
            
            <motion.p 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-xl text-gray-600 mb-8"
            >
              Get started with Panion today and discover a new way to interact with AI assistants.
            </motion.p>
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <Button 
                size="lg" 
                onClick={() => setLocation('/desktop')}
                className="text-lg px-8 bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg hover:shadow-indigo-500/30"
              >
                Try Panion Now
              </Button>
            </motion.div>
          </div>
        </div>
      </section>
      
      {/* Footer */}
      <footer className="bg-gray-100 py-12 text-gray-900">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="mb-6 md:mb-0">
              <h3 className="text-2xl font-bold text-gray-900">Panion</h3>
              <p className="text-sm text-gray-600">© 2025 Panion. All rights reserved.</p>
            </div>
            
            <div className="flex gap-6">
              {['About', 'Features', 'Contact', 'Terms', 'Privacy'].map((item, i) => (
                <a key={i} href="#" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
                  {item}
                </a>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;