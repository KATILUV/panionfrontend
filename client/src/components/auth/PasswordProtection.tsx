import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Lock } from 'lucide-react';

interface PasswordProtectionProps {
  children: React.ReactNode;
}

const PasswordProtection: React.FC<PasswordProtectionProps> = ({ children }) => {
  const { isAuthenticated, login } = useAuth();
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);
  const { toast } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (login(password)) {
      toast({
        title: "Success",
        description: "Access granted!",
        variant: "default",
      });
    } else {
      setError(true);
      setTimeout(() => setError(false), 500);
      toast({
        title: "Access Denied",
        description: "Incorrect password. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (isAuthenticated) {
    return <>{children}</>;
  }

  return (
    <div className="flex flex-col min-h-screen items-center justify-center bg-gradient-to-br from-purple-950 via-violet-900 to-purple-800 text-white">
      <div className="w-full max-w-md p-8 space-y-8 bg-black/20 backdrop-blur-lg rounded-lg border border-white/10 shadow-xl">
        <div className="text-center">
          <motion.div 
            className="w-20 h-20 mx-auto mb-6 rounded-full bg-purple-600/30 flex items-center justify-center"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            <Lock className="w-10 h-10 text-white" />
          </motion.div>
          <h1 className="text-2xl font-bold">Panion Access</h1>
          <p className="mt-2 text-white/70">Enter the password to continue</p>
        </div>
        
        <motion.form 
          className="mt-8 space-y-6"
          onSubmit={handleSubmit}
          animate={{ x: error ? [0, -10, 10, -5, 5, 0] : 0 }}
          transition={{ duration: 0.4 }}
        >
          <div>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`w-full px-4 py-3 border ${error ? 'border-red-500' : 'border-white/20'} bg-black/20 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200`}
              placeholder="Password"
              autoFocus
            />
          </div>
          
          <div>
            <Button
              type="submit"
              className="w-full py-3 px-4 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg transition-colors duration-200"
            >
              Enter System
            </Button>
          </div>
        </motion.form>
      </div>
      
      <div className="mt-8 text-center text-white/50 text-sm">
        © {new Date().getFullYear()} Panion System • Advanced AI Companion
      </div>
    </div>
  );
};

export default PasswordProtection;