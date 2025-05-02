import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion } from 'framer-motion';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { LockKeyhole, User, LayoutDashboard, ShieldCheck, Clock, Sparkles } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useThemeStore } from '@/state/themeStore';
import RotatingTagline from '@/components/RotatingTagline';

// Form validation schemas
const loginSchema = z.object({
  username: z.string().min(3, {
    message: "Username must be at least 3 characters.",
  }),
  password: z.string().min(6, {
    message: "Password must be at least 6 characters.",
  })
});

const registerSchema = z.object({
  username: z.string().min(3, {
    message: "Username must be at least 3 characters.",
  }),
  password: z.string().min(6, {
    message: "Password must be at least 6 characters.",
  }),
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type LoginFormValues = z.infer<typeof loginSchema>;
type RegisterFormValues = z.infer<typeof registerSchema>;

const AuthPage = () => {
  const [activeTab, setActiveTab] = useState<string>("login");
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const currentTheme = useThemeStore(state => state.getCurrentTheme());
  const accent = useThemeStore(state => state.accent);

  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: ""
    }
  });

  const registerForm = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: "",
      password: "",
      confirmPassword: ""
    }
  });

  const onLoginSubmit = (data: LoginFormValues) => {
    toast({
      title: "Login attempted",
      description: `Welcome back, ${data.username}!`,
    });
    
    setTimeout(() => {
      setLocation("/desktop");
    }, 1500);
  };

  const onRegisterSubmit = (data: RegisterFormValues) => {
    toast({
      title: "Account created",
      description: `Welcome to Panion, ${data.username}!`,
    });
    
    setTimeout(() => {
      setLocation("/desktop");
    }, 1500);
  };

  // Generate gradient classes based on current theme and accent
  const getGradient = () => {
    const isDark = currentTheme === 'dark';
    
    switch (accent) {
      case 'purple':
        return isDark 
          ? 'from-purple-950 via-[#1a1245] to-[#150d38]' 
          : 'from-purple-100 via-purple-50 to-white';
      case 'blue':
        return isDark 
          ? 'from-blue-950 via-[#0a1a2f] to-[#0c1827]' 
          : 'from-blue-100 via-blue-50 to-white';
      case 'green':
        return isDark 
          ? 'from-green-950 via-[#0f2922] to-[#0c211c]' 
          : 'from-green-100 via-green-50 to-white';
      case 'orange':
        return isDark 
          ? 'from-orange-950 via-[#261409] to-[#1f1107]' 
          : 'from-orange-100 via-orange-50 to-white';
      case 'pink':
        return isDark 
          ? 'from-pink-950 via-[#270d1a] to-[#1f0b16]' 
          : 'from-pink-100 via-pink-50 to-white';
      default:
        return isDark 
          ? 'from-purple-950 via-[#1a1245] to-[#150d38]' 
          : 'from-purple-100 via-purple-50 to-white';
    }
  };

  // Text colors based on theme
  const getTextColor = () => {
    return currentTheme === 'dark' ? 'text-white' : 'text-gray-900';
  };
  
  const getMutedTextColor = () => {
    return currentTheme === 'dark' ? 'text-white/80' : 'text-gray-600';
  };

  const getCardBgClasses = () => {
    return currentTheme === 'dark' 
      ? 'bg-black/40 border-purple-500/20' 
      : 'bg-white border-purple-200';
  };

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { 
        duration: 0.5,
        staggerChildren: 0.1
      }
    }
  };
  
  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.5 }
    }
  };

  // Custom orb background effect
  const getOrbColor = () => {
    switch (accent) {
      case 'purple': return currentTheme === 'dark' ? 'rgba(139, 92, 246, 0.15)' : 'rgba(139, 92, 246, 0.1)';
      case 'blue': return currentTheme === 'dark' ? 'rgba(59, 130, 246, 0.15)' : 'rgba(59, 130, 246, 0.1)';
      case 'green': return currentTheme === 'dark' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(16, 185, 129, 0.1)';
      case 'orange': return currentTheme === 'dark' ? 'rgba(249, 115, 22, 0.15)' : 'rgba(249, 115, 22, 0.1)';
      case 'pink': return currentTheme === 'dark' ? 'rgba(236, 72, 153, 0.15)' : 'rgba(236, 72, 153, 0.1)';
      default: return currentTheme === 'dark' ? 'rgba(139, 92, 246, 0.15)' : 'rgba(139, 92, 246, 0.1)';
    }
  };

  return (
    <div className={`min-h-screen w-full flex items-center justify-center overflow-hidden bg-gradient-to-br ${getGradient()}`}>
      {/* Background orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-20 w-96 h-96 rounded-full" 
          style={{ background: getOrbColor(), filter: 'blur(80px)' }} />
        <div className="absolute bottom-1/4 -right-20 w-80 h-80 rounded-full" 
          style={{ background: getOrbColor(), filter: 'blur(60px)' }} />
      </div>
      
      <motion.div 
        className="container relative z-10 flex flex-col lg:flex-row items-center justify-center gap-10 p-4"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Auth Form */}
        <motion.div variants={itemVariants}>
          <Card className={`w-full max-w-md border shadow-xl ${getCardBgClasses()} backdrop-blur-xl`}>
            <CardHeader className="space-y-2 text-center">
              <div className="flex justify-center mb-2">
                <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${
                  currentTheme === 'dark' ? 'bg-purple-900/40' : 'bg-purple-100'
                }`}>
                  <Sparkles className={`w-8 h-8 ${
                    currentTheme === 'dark' ? 'text-purple-300' : 'text-purple-600'
                  }`} />
                </div>
              </div>
              <CardTitle className={`text-3xl font-bold ${getTextColor()}`}>Welcome to Panion</CardTitle>
              <CardDescription className={getMutedTextColor()}>
                Enter your credentials to continue
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs 
                value={activeTab} 
                onValueChange={setActiveTab}
                className="w-full"
              >
                <TabsList className="grid w-full grid-cols-2 mb-6">
                  <TabsTrigger value="login">Login</TabsTrigger>
                  <TabsTrigger value="register">Register</TabsTrigger>
                </TabsList>
                
                <TabsContent value="login">
                  <Form {...loginForm}>
                    <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-4">
                      <FormField
                        control={loginForm.control}
                        name="username"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className={getTextColor()}>
                              <div className="flex items-center gap-2">
                                <User className="w-4 h-4" />
                                <span>Username</span>
                              </div>
                            </FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="Enter your username" 
                                {...field} 
                                className={currentTheme === 'dark' ? 'bg-black/30' : 'bg-white'}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={loginForm.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className={getTextColor()}>
                              <div className="flex items-center gap-2">
                                <LockKeyhole className="w-4 h-4" />
                                <span>Password</span>
                              </div>
                            </FormLabel>
                            <FormControl>
                              <Input 
                                type="password" 
                                placeholder="Enter your password" 
                                {...field} 
                                className={currentTheme === 'dark' ? 'bg-black/30' : 'bg-white'}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button type="submit" className="w-full mt-6">
                        <div className="flex items-center gap-2">
                          <LayoutDashboard className="w-4 h-4" />
                          <span>Login to Desktop</span>
                        </div>
                      </Button>
                    </form>
                  </Form>
                </TabsContent>
                
                <TabsContent value="register">
                  <Form {...registerForm}>
                    <form onSubmit={registerForm.handleSubmit(onRegisterSubmit)} className="space-y-4">
                      <FormField
                        control={registerForm.control}
                        name="username"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className={getTextColor()}>
                              <div className="flex items-center gap-2">
                                <User className="w-4 h-4" />
                                <span>Username</span>
                              </div>
                            </FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="Choose a username" 
                                {...field}
                                className={currentTheme === 'dark' ? 'bg-black/30' : 'bg-white'} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={registerForm.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className={getTextColor()}>
                              <div className="flex items-center gap-2">
                                <LockKeyhole className="w-4 h-4" />
                                <span>Password</span>
                              </div>
                            </FormLabel>
                            <FormControl>
                              <Input 
                                type="password" 
                                placeholder="Create a password" 
                                {...field} 
                                className={currentTheme === 'dark' ? 'bg-black/30' : 'bg-white'}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={registerForm.control}
                        name="confirmPassword"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className={getTextColor()}>
                              <div className="flex items-center gap-2">
                                <ShieldCheck className="w-4 h-4" />
                                <span>Confirm Password</span>
                              </div>
                            </FormLabel>
                            <FormControl>
                              <Input 
                                type="password" 
                                placeholder="Confirm your password" 
                                {...field} 
                                className={currentTheme === 'dark' ? 'bg-black/30' : 'bg-white'}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button type="submit" className="w-full mt-6">
                        <div className="flex items-center gap-2">
                          <LayoutDashboard className="w-4 h-4" />
                          <span>Create Account & Login</span>
                        </div>
                      </Button>
                    </form>
                  </Form>
                </TabsContent>
              </Tabs>
            </CardContent>
            <CardFooter>
              <p className={`text-xs text-center w-full ${getMutedTextColor()}`}>
                By continuing, you agree to our Terms of Service and Privacy Policy.
              </p>
            </CardFooter>
          </Card>
        </motion.div>

        {/* Hero Section */}
        <motion.div 
          className="w-full max-w-md text-center lg:text-left flex flex-col"
          variants={itemVariants}
        >
          <motion.h1 
            className={`text-4xl lg:text-5xl font-bold mb-4 ${getTextColor()}`}
            variants={itemVariants}
          >
            Panion
          </motion.h1>
          
          <RotatingTagline 
            phrases={[
              "The system that syncs with your system.",
              "Not an app. Not a tool. A new kind of presence.",
              "Dream deeper. Build smarter. Evolve together.",
              "Your thought partner in progress.",
              "One interface. Unlimited potential."
            ]}
            interval={5000}
            className={`text-xl font-light mb-4 ${getMutedTextColor()}`}
          />
          
          <motion.p 
            className={`mb-6 ${getMutedTextColor()}`}
            variants={itemVariants}
          >
            Panion brings together powerful AI agents in a desktop-like environment 
            designed for seamless interaction and productivity.
          </motion.p>
          
          <motion.div 
            className="space-y-4"
            variants={containerVariants}
          >
            <motion.div 
              className={`flex items-center gap-3 ${getTextColor()}`}
              variants={itemVariants}
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                currentTheme === 'dark' ? 'bg-purple-900/40' : 'bg-purple-100'
              }`}>
                <Sparkles className={currentTheme === 'dark' ? 'text-purple-300' : 'text-purple-600'} />
              </div>
              <div>
                <h3 className="font-medium">Multi-Agent Environment</h3>
                <p className={getMutedTextColor()}>Interact with different specialized AI agents in one workspace.</p>
              </div>
            </motion.div>
            
            <motion.div 
              className={`flex items-center gap-3 ${getTextColor()}`}
              variants={itemVariants}
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                currentTheme === 'dark' ? 'bg-blue-900/40' : 'bg-blue-100'
              }`}>
                <LayoutDashboard className={currentTheme === 'dark' ? 'text-blue-300' : 'text-blue-600'} />
              </div>
              <div>
                <h3 className="font-medium">Familiar Desktop Interface</h3>
                <p className={getMutedTextColor()}>Windows, taskbar, and command palette for intuitive navigation.</p>
              </div>
            </motion.div>
            
            <motion.div 
              className={`flex items-center gap-3 ${getTextColor()}`}
              variants={itemVariants}
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                currentTheme === 'dark' ? 'bg-green-900/40' : 'bg-green-100'
              }`}>
                <Clock className={currentTheme === 'dark' ? 'text-green-300' : 'text-green-600'} />
              </div>
              <div>
                <h3 className="font-medium">Real-time Processing</h3>
                <p className={getMutedTextColor()}>Fast responses with advanced AI models and intuitive interface.</p>
              </div>
            </motion.div>
          </motion.div>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default AuthPage;