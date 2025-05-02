import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useLocation } from 'wouter';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LockKeyhole, Mail, UserCheck, Users } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useThemeStore } from '@/state/themeStore';

// Login form schema
const loginSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});
type LoginFormValues = z.infer<typeof loginSchema>;

// Register form schema
const registerSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string().min(6, "Confirm password must be at least 6 characters"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});
type RegisterFormValues = z.infer<typeof registerSchema>;

const AuthPage: React.FC = () => {
  const [_, setLocation] = useLocation();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<string>("login");
  const currentTheme = useThemeStore(state => state.getCurrentTheme());
  const accent = useThemeStore(state => state.accent);
  
  // Form definitions
  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });
  
  const registerForm = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });
  
  // Form submission handlers
  const onLoginSubmit = (data: LoginFormValues) => {
    // In a real app, you would call an API endpoint here
    console.log("Login data:", data);
    toast({
      title: "Login successful",
      description: "Welcome back to Panion!",
    });
    
    // Redirect to desktop
    setTimeout(() => {
      setLocation('/desktop');
    }, 1000);
  };
  
  const onRegisterSubmit = (data: RegisterFormValues) => {
    // In a real app, you would call an API endpoint here
    console.log("Register data:", data);
    toast({
      title: "Registration successful",
      description: "Welcome to Panion! Your account has been created.",
    });
    
    // Redirect to desktop
    setTimeout(() => {
      setLocation('/desktop');
    }, 1000);
  };
  
  // Generate gradient classes based on current theme and accent color
  const getGradient = () => {
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
          ? 'from-gray-950 via-gray-900 to-background' 
          : 'from-gray-100 via-gray-50 to-background';
      case 'pink':
        return isDark 
          ? 'from-pink-950 via-background to-background' 
          : 'from-pink-100 via-pink-50 to-background';
      case 'dark':
        return isDark 
          ? 'from-gray-950 via-background to-background' 
          : 'from-gray-200 via-gray-100 to-background';
      case 'light':
        return isDark 
          ? 'from-gray-800 via-background to-background' 
          : 'from-white via-gray-50 to-background';
      default:
        return isDark 
          ? 'from-purple-950 via-background to-background' 
          : 'from-purple-100 via-purple-50 to-background';
    }
  };

  return (
    <div className={`min-h-screen overflow-auto flex flex-col md:flex-row bg-gradient-to-br ${getGradient()}`}>
      {/* Left side: Auth forms */}
      <div className="w-full md:w-1/2 flex items-center justify-center p-8">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          <Card className="border-border/50 shadow-lg bg-card/80 backdrop-blur-sm">
            <CardHeader className="space-y-1">
              <CardTitle className="text-2xl font-bold text-center">
                {activeTab === "login" ? "Welcome back" : "Create an account"}
              </CardTitle>
              <CardDescription className="text-center">
                {activeTab === "login" 
                  ? "Sign in to your account to continue" 
                  : "Sign up for a new account to get started"
                }
              </CardDescription>
            </CardHeader>
            
            <CardContent>
              <Tabs 
                defaultValue="login" 
                value={activeTab}
                onValueChange={setActiveTab}
                className="w-full"
              >
                <TabsList className="grid w-full grid-cols-2 mb-6">
                  <TabsTrigger value="login">Login</TabsTrigger>
                  <TabsTrigger value="register">Register</TabsTrigger>
                </TabsList>
                
                {/* Login Form */}
                <TabsContent value="login">
                  <Form {...loginForm}>
                    <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-4">
                      <FormField
                        control={loginForm.control}
                        name="username"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Username</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <span className="absolute left-3 top-2.5 text-muted-foreground">
                                  <UserCheck className="h-5 w-5" />
                                </span>
                                <Input 
                                  placeholder="Enter your username" 
                                  className="pl-10" 
                                  {...field} 
                                />
                              </div>
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
                            <FormLabel>Password</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <span className="absolute left-3 top-2.5 text-muted-foreground">
                                  <LockKeyhole className="h-5 w-5" />
                                </span>
                                <Input 
                                  type="password" 
                                  placeholder="Enter your password" 
                                  className="pl-10" 
                                  {...field} 
                                />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <Button type="submit" className="w-full">
                        Sign In
                      </Button>
                    </form>
                  </Form>
                </TabsContent>
                
                {/* Register Form */}
                <TabsContent value="register">
                  <Form {...registerForm}>
                    <form onSubmit={registerForm.handleSubmit(onRegisterSubmit)} className="space-y-4">
                      <FormField
                        control={registerForm.control}
                        name="username"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Username</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <span className="absolute left-3 top-2.5 text-muted-foreground">
                                  <UserCheck className="h-5 w-5" />
                                </span>
                                <Input 
                                  placeholder="Choose a username" 
                                  className="pl-10" 
                                  {...field} 
                                />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={registerForm.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <span className="absolute left-3 top-2.5 text-muted-foreground">
                                  <Mail className="h-5 w-5" />
                                </span>
                                <Input 
                                  type="email" 
                                  placeholder="Enter your email" 
                                  className="pl-10" 
                                  {...field} 
                                />
                              </div>
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
                            <FormLabel>Password</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <span className="absolute left-3 top-2.5 text-muted-foreground">
                                  <LockKeyhole className="h-5 w-5" />
                                </span>
                                <Input 
                                  type="password" 
                                  placeholder="Create a password" 
                                  className="pl-10" 
                                  {...field} 
                                />
                              </div>
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
                            <FormLabel>Confirm Password</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <span className="absolute left-3 top-2.5 text-muted-foreground">
                                  <LockKeyhole className="h-5 w-5" />
                                </span>
                                <Input 
                                  type="password" 
                                  placeholder="Confirm your password" 
                                  className="pl-10" 
                                  {...field} 
                                />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <Button type="submit" className="w-full">
                        Create Account
                      </Button>
                    </form>
                  </Form>
                </TabsContent>
              </Tabs>
              
              <div className="mt-6 text-center text-sm">
                <a onClick={() => setLocation('/')} className="text-primary cursor-pointer">
                  Return to home page
                </a>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
      
      {/* Right side: Fancy graphic/information */}
      <div className="w-full md:w-1/2 p-8 flex items-center justify-center">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="max-w-lg"
        >
          <div className="text-center md:text-left mb-6">
            <h1 className="text-4xl font-bold mb-4">
              Join Panion Today
            </h1>
            <p className="text-xl text-muted-foreground">
              Experience the next generation of AI interaction with a seamless multi-agent desktop environment.
            </p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
            <Card className="bg-primary/10 border-primary/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center">
                  <Users className="h-5 w-5 mr-2 text-primary" />
                  Multiple Agents
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Run several specialized AI agents simultaneously in your workspace.
                </CardDescription>
              </CardContent>
            </Card>
            
            <Card className="bg-primary/10 border-primary/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center">
                  <LockKeyhole className="h-5 w-5 mr-2 text-primary" />
                  Secure & Private
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Your conversations and data are securely stored and private.
                </CardDescription>
              </CardContent>
            </Card>
          </div>
          
          <div className="relative">
            <div className="absolute -inset-1 rounded-lg bg-gradient-to-r from-primary/50 via-primary to-primary/50 opacity-30 blur-lg"></div>
            <Card className="relative border-primary/20">
              <CardHeader className="pb-2">
                <CardTitle>Ready to elevate your AI experience?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">
                  Create your free account today and discover a new way to interact with AI.
                </p>
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => setActiveTab("register")}
                >
                  Get Started
                </Button>
              </CardContent>
            </Card>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default AuthPage;