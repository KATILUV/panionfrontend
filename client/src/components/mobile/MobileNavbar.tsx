/**
 * MobileNavbar Component
 * A responsive navigation bar for mobile devices
 */

import React, { useState } from 'react';
import { Menu, X, Settings, MessageSquare, Grid, Home, User } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAgentStore } from '@/state/agentStore';
import { useThemeStore } from '@/state/themeStore';
import log from '@/utils/logger';

/**
 * MobileNavbar renders a mobile-optimized navigation menu
 */
const MobileNavbar: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { accent } = useThemeStore();
  const openAgent = useAgentStore(state => state.openAgent);
  const minimizeAllAgents = useAgentStore(state => state.minimizeAllAgents);
  
  // Menu animation variants
  const menuVariants = {
    closed: {
      opacity: 0,
      y: -20,
      scale: 0.95,
      transition: { duration: 0.2 }
    },
    open: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: { duration: 0.3, delay: 0.1 }
    }
  };
  
  // Toggle menu open/closed
  const toggleMenu = () => {
    setIsOpen(!isOpen);
    log.debug(`Mobile menu ${!isOpen ? 'opened' : 'closed'}`);
  };
  
  // Handle opening an agent and closing the menu
  const handleOpenAgent = (agentId: string) => {
    openAgent(agentId as any);
    setIsOpen(false);
    log.debug(`Opening agent from mobile menu: ${agentId}`);
  };
  
  // Navigation items with icons and handlers
  const navItems = [
    { 
      id: 'home', 
      label: 'Home', 
      icon: <Home size={20} />, 
      action: () => {
        minimizeAllAgents();
        setIsOpen(false);
      }
    },
    { 
      id: 'panion', 
      label: 'Panion Assistant', 
      icon: <MessageSquare size={20} />, 
      action: () => handleOpenAgent('panion')
    },
    { 
      id: 'marketplace', 
      label: 'Marketplace', 
      icon: <Grid size={20} />, 
      action: () => handleOpenAgent('marketplace')
    },
    { 
      id: 'settings', 
      label: 'Settings', 
      icon: <Settings size={20} />, 
      action: () => handleOpenAgent('settings')
    },
    { 
      id: 'profile', 
      label: 'Profile', 
      icon: <User size={20} />, 
      action: () => handleOpenAgent('profile')
    }
  ];

  return (
    <>
      {/* Mobile navbar fixed at top of screen */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-background border-b border-border h-12 px-3 flex items-center justify-between shadow-sm">
        <button 
          onClick={toggleMenu}
          className="mobile-menu-toggle p-2 rounded-md text-muted-foreground hover:text-foreground focus:outline-none focus:ring-2 focus:ring-primary-300"
          aria-label={isOpen ? "Close menu" : "Open menu"}
        >
          {isOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
        
        <div className="app-title text-base font-semibold">
          Panion AI
        </div>
        
        <div className="app-status w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center">
          <div 
            className="status-indicator w-3 h-3 rounded-full animate-pulse" 
            style={{ backgroundColor: accent }}
          />
        </div>
      </div>
      
      {/* Dropdown menu overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            className="fixed top-12 left-0 right-0 z-40 bg-popover/95 shadow-lg border-b border-border"
            variants={menuVariants}
            initial="closed"
            animate="open"
            exit="closed"
          >
            <nav className="mobile-nav py-2">
              <ul className="menu-items">
                {navItems.map(item => (
                  <li key={item.id}>
                    <button
                      onClick={item.action}
                      className="w-full flex items-center px-4 py-3 text-sm text-foreground hover:bg-accent/10 active:bg-accent/20"
                    >
                      <span className="icon-container mr-3 text-primary">
                        {item.icon}
                      </span>
                      <span>{item.label}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Overlay to close menu when clicking outside */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-30 bg-background/50" 
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}
    </>
  );
};

export default MobileNavbar;