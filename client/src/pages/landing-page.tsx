import React from 'react';
import { motion } from 'framer-motion';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { 
  Cpu, Users, Layout, Sparkles, MessageSquare, Fingerprint, LucideProps, Brain,
  LayoutGrid, Search, Terminal, Check, X
} from 'lucide-react';
import { useThemeStore } from '@/state/themeStore';

// Feature icon with customizable color
const FeatureIcon: React.FC<{ icon: React.ElementType<LucideProps>, className?: string }> = ({ 
  icon: Icon, 
  className = "" 
}) => {
  return (
    <div className={`rounded-full p-2 bg-primary/10 ${className}`}>
      <Icon className="w-6 h-6 text-primary" />
    </div>
  );
};

// Feature card component
const FeatureCard: React.FC<{ 
  title: string; 
  description: string; 
  icon: React.ElementType<LucideProps>;
  delay?: number;
}> = ({ title, description, icon, delay = 0 }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      className="bg-card border border-border rounded-xl p-6 flex flex-col"
    >
      <FeatureIcon icon={icon} />
      <h3 className="text-xl font-bold mt-4">{title}</h3>
      <p className="text-muted-foreground mt-2">{description}</p>
    </motion.div>
  );
};

// Testimonial card component
const TestimonialCard: React.FC<{
  quote: string;
  author: string;
  role: string;
  delay?: number;
}> = ({ quote, author, role, delay = 0 }) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, delay }}
      className="bg-card border border-border rounded-xl p-6"
    >
      <div className="flex flex-col">
        <p className="text-muted-foreground italic">{quote}</p>
        <div className="mt-4">
          <p className="font-semibold">{author}</p>
          <p className="text-sm text-muted-foreground">{role}</p>
        </div>
      </div>
    </motion.div>
  );
};

const LandingPage: React.FC = () => {
  const [_, setLocation] = useLocation();
  const currentTheme = useThemeStore(state => state.getCurrentTheme());
  const accent = useThemeStore(state => state.accent);
  
  // Generate gradient classes based on current theme and accent color
  const getHeroGradient = () => {
    const isDark = currentTheme === 'dark';
    
    switch (accent) {
      case 'purple':
        return isDark 
          ? 'from-purple-950 via-background to-background' 
          : 'from-purple-100 via-purple-50 to-background';
      case 'blue':
        return isDark 
          ? 'from-blue-950 via-background to-background' 
          : 'from-blue-100 via-blue-50 to-background';
      case 'green':
        return isDark 
          ? 'from-green-950 via-background to-background' 
          : 'from-green-100 via-green-50 to-background';
      case 'orange':
        return isDark 
          ? 'from-orange-950 via-background to-background' 
          : 'from-orange-100 via-orange-50 to-background';
      case 'pink':
        return isDark 
          ? 'from-pink-950 via-background to-background' 
          : 'from-pink-100 via-pink-50 to-background';
      default:
        return isDark 
          ? 'from-purple-950 via-background to-background' 
          : 'from-purple-100 via-purple-50 to-background';
    }
  };
  
  const getSecondaryGradient = () => {
    const isDark = currentTheme === 'dark';
    
    switch (accent) {
      case 'purple':
        return isDark 
          ? 'from-background via-background to-purple-950' 
          : 'from-background via-purple-50 to-purple-100';
      case 'blue':
        return isDark 
          ? 'from-background via-background to-blue-950' 
          : 'from-background via-blue-50 to-blue-100';
      case 'green':
        return isDark 
          ? 'from-background via-background to-green-950' 
          : 'from-background via-green-50 to-green-100';
      case 'orange':
        return isDark 
          ? 'from-background via-background to-orange-950' 
          : 'from-background via-orange-50 to-orange-100';
      case 'pink':
        return isDark 
          ? 'from-background via-background to-pink-950' 
          : 'from-background via-pink-50 to-pink-100';
      default:
        return isDark 
          ? 'from-background via-background to-purple-950' 
          : 'from-background via-purple-50 to-purple-100';
    }
  };
  
  // Features data
  const features = [
    {
      title: "Multi-Agent Environment",
      description: "Run multiple AI agents in flexible windows, each specialized for different tasks.",
      icon: Users
    },
    {
      title: "Window Management",
      description: "Resize, move, and arrange your agent windows just like in a desktop operating system.",
      icon: Layout
    },
    {
      title: "Clara AI Assistant",
      description: "Your personal AI assistant with advanced memory and context awareness.",
      icon: MessageSquare
    },
    {
      title: "Command Palette",
      description: "Quick access to all features and actions with a simple keyboard shortcut.",
      icon: Sparkles
    },
    {
      title: "Customizable Themes",
      description: "Choose from multiple themes and accent colors to personalize your experience.",
      icon: Fingerprint
    },
    {
      title: "Context Awareness",
      description: "Agents understand your conversation history and can reference past interactions.",
      icon: Brain
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
      {/* Hero Section */}
      <section className={`relative py-20 md:py-32 bg-gradient-to-b ${getHeroGradient()}`}>
        <div className="container mx-auto px-4 relative z-10">
          <div className="flex flex-col items-center text-center max-w-3xl mx-auto">
            <motion.h1 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="text-4xl md:text-6xl font-bold mb-6"
            >
              Welcome to <span className="text-primary">Panion</span>
            </motion.h1>
            
            <motion.p 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-xl md:text-2xl text-muted-foreground mb-8"
            >
              Your AI desktop environment with multi-agent capabilities
            </motion.p>
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="flex flex-col sm:flex-row gap-4"
            >
              <Button 
                size="lg" 
                onClick={() => setLocation('/desktop')}
                className="text-lg"
              >
                Get Started
              </Button>
              <Button 
                size="lg" 
                variant="outline" 
                onClick={() => setLocation('/auth')}
                className="text-lg"
              >
                Sign In
              </Button>
            </motion.div>
          </div>
        </div>
        
        {/* Decorative elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-5 -left-5 w-24 h-24 lg:w-72 lg:h-72 rounded-full bg-primary/10 blur-3xl"></div>
          <div className="absolute -top-5 -right-5 w-24 h-24 lg:w-72 lg:h-72 rounded-full bg-primary/10 blur-3xl"></div>
        </div>
      </section>
      
      {/* Features Section */}
      <section className="py-20 md:py-32">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Key Features</h2>
            <p className="text-xl text-muted-foreground">Discover what makes Panion a revolutionary AI environment</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <FeatureCard 
                key={index}
                title={feature.title}
                description={feature.description}
                icon={feature.icon}
                delay={0.1 * index}
              />
            ))}
          </div>
        </div>
      </section>
      
      {/* Screenshot/Demo Section */}
      <section className={`py-20 md:py-32 bg-gradient-to-b ${getSecondaryGradient()}`}>
        <div className="container mx-auto px-4">
          <div className="flex flex-col lg:flex-row items-center gap-12">
            <div className="flex-1">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5 }}
              >
                <h2 className="text-3xl md:text-4xl font-bold mb-6">Experience Next-Gen AI Interaction</h2>
                <p className="text-xl text-muted-foreground mb-8">
                  Panion transforms how you interact with AI by providing a flexible, intuitive workspace for multiple agents.
                </p>
                <ul className="space-y-4">
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
                      <span className="text-primary mr-2">✓</span> {item}
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
                        <MessageSquare className="w-3 h-3 mr-2 text-purple-400" />
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
      
      {/* Comparison Section */}
      <section className="py-20 md:py-32 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center mb-16">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              viewport={{ once: true }}
            >
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Why Choose Panion?</h2>
              <p className="text-xl text-muted-foreground">See how Panion compares to traditional AI assistants</p>
            </motion.div>
          </div>
          
          <motion.div 
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 0.7 }}
            viewport={{ once: true }}
            className="overflow-x-auto"
          >
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="text-left p-4 border-b border-border"></th>
                  <th className="p-4 border-b border-border">
                    <div className="bg-primary/10 rounded-lg p-3 text-center">
                      <h3 className="text-xl font-bold text-primary">Panion</h3>
                      <p className="text-sm text-muted-foreground">AI Desktop Environment</p>
                    </div>
                  </th>
                  <th className="p-4 border-b border-border">
                    <div className="bg-muted rounded-lg p-3 text-center">
                      <h3 className="text-lg font-medium">Traditional Chatbots</h3>
                      <p className="text-sm text-muted-foreground">Single-Agent AI</p>
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="p-4 border-b border-border font-medium">Multiple AI Agents</td>
                  <td className="p-4 border-b border-border text-center">
                    <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-green-100 dark:bg-green-900">
                      <Check className="w-5 h-5 text-green-600 dark:text-green-400" />
                    </div>
                  </td>
                  <td className="p-4 border-b border-border text-center">
                    <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-red-100 dark:bg-red-900">
                      <X className="w-5 h-5 text-red-600 dark:text-red-400" />
                    </div>
                  </td>
                </tr>
                <tr>
                  <td className="p-4 border-b border-border font-medium">Window Management</td>
                  <td className="p-4 border-b border-border text-center">
                    <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-green-100 dark:bg-green-900">
                      <Check className="w-5 h-5 text-green-600 dark:text-green-400" />
                    </div>
                  </td>
                  <td className="p-4 border-b border-border text-center">
                    <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-red-100 dark:bg-red-900">
                      <X className="w-5 h-5 text-red-600 dark:text-red-400" />
                    </div>
                  </td>
                </tr>
                <tr>
                  <td className="p-4 border-b border-border font-medium">Context Awareness</td>
                  <td className="p-4 border-b border-border text-center">
                    <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-green-100 dark:bg-green-900">
                      <Check className="w-5 h-5 text-green-600 dark:text-green-400" />
                    </div>
                  </td>
                  <td className="p-4 border-b border-border text-center">
                    <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-green-100 dark:bg-green-900 opacity-50">
                      <Check className="w-5 h-5 text-green-600 dark:text-green-400" />
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">Limited</div>
                  </td>
                </tr>
                <tr>
                  <td className="p-4 border-b border-border font-medium">Command Palette</td>
                  <td className="p-4 border-b border-border text-center">
                    <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-green-100 dark:bg-green-900">
                      <Check className="w-5 h-5 text-green-600 dark:text-green-400" />
                    </div>
                  </td>
                  <td className="p-4 border-b border-border text-center">
                    <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-red-100 dark:bg-red-900">
                      <X className="w-5 h-5 text-red-600 dark:text-red-400" />
                    </div>
                  </td>
                </tr>
                <tr>
                  <td className="p-4 border-b border-border font-medium">Customizable Themes</td>
                  <td className="p-4 border-b border-border text-center">
                    <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-green-100 dark:bg-green-900">
                      <Check className="w-5 h-5 text-green-600 dark:text-green-400" />
                    </div>
                  </td>
                  <td className="p-4 border-b border-border text-center">
                    <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-green-100 dark:bg-green-900 opacity-50">
                      <Check className="w-5 h-5 text-green-600 dark:text-green-400" />
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">Basic</div>
                  </td>
                </tr>
              </tbody>
            </table>
          </motion.div>
          
          <div className="mt-8 text-center">
            <Button 
              variant="outline" 
              onClick={() => setLocation('/desktop')}
              className="mt-4"
            >
              Experience the Difference
            </Button>
          </div>
        </div>
      </section>
      
      {/* Testimonials */}
      <section className="py-20 md:py-32">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">What Users Say</h2>
            <p className="text-xl text-muted-foreground">Join the community of Panion users</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <TestimonialCard 
                key={index}
                quote={testimonial.quote}
                author={testimonial.author}
                role={testimonial.role}
                delay={0.1 * index}
              />
            ))}
          </div>
        </div>
      </section>
      
      {/* CTA Section */}
      <section className={`py-20 md:py-32 bg-gradient-to-t ${getHeroGradient()}`}>
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <motion.h2 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="text-3xl md:text-4xl font-bold mb-6"
            >
              Ready to Transform Your AI Experience?
            </motion.h2>
            
            <motion.p 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-xl text-muted-foreground mb-8"
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
                className="text-lg px-8"
              >
                Try Panion Now
              </Button>
            </motion.div>
          </div>
        </div>
      </section>
      
      {/* Footer */}
      <footer className="bg-muted py-12">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="mb-6 md:mb-0">
              <h3 className="text-2xl font-bold">Panion</h3>
              <p className="text-sm text-muted-foreground">© 2025 Panion. All rights reserved.</p>
            </div>
            
            <div className="flex gap-6">
              {['About', 'Features', 'Contact', 'Terms', 'Privacy'].map((item, i) => (
                <a key={i} href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
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