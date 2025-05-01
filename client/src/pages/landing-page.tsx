import React from 'react';
import { motion } from 'framer-motion';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Cpu, Users, Layout, Sparkles, MessageSquare, Fingerprint, LucideProps, Brain } from 'lucide-react';
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
    <div className="flex flex-col min-h-screen">
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
                {/* Placeholder for screenshot/demo - replace with actual image later */}
                <div className="aspect-[16/9] bg-card flex items-center justify-center">
                  <div className="text-center p-12">
                    <Cpu className="w-16 h-16 text-muted-foreground/50 mx-auto mb-4" />
                    <p className="text-muted-foreground">Interactive demo coming soon</p>
                  </div>
                </div>
              </motion.div>
            </div>
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