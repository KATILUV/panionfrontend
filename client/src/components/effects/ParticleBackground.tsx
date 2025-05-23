import React, { useRef, useEffect, useState } from 'react';
import { useThemeStore } from '@/state/themeStore';

interface Particle {
  x: number;
  y: number;
  size: number;
  speedX: number;
  speedY: number;
  hue: number;
  opacity: number;
}

interface ParticleBackgroundProps {
  className?: string;
  particleCount?: number;
  particleOpacity?: number;
  particleSize?: number;
  particleSpeed?: number;
  interactive?: boolean;
}

const ParticleBackground: React.FC<ParticleBackgroundProps> = ({
  className = '',
  particleCount = 40,
  particleOpacity = 0.5,
  particleSize = 2,
  particleSpeed = 0.5,
  interactive = true
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>();
  const particlesRef = useRef<Particle[]>([]);
  const mouseRef = useRef({ x: -1000, y: -1000, radius: 100 });
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  
  // Get theme data
  const accent = useThemeStore(state => state.accent);
  
  // Function to get accent color in HSL format for particles based on theme
  const getAccentColor = (): { hue: number, saturation: number, lightness: number } => {
    switch (accent) {
      case 'blue':
        return { hue: 217, saturation: 91, lightness: 60 };
      case 'purple':
        return { hue: 265, saturation: 83, lightness: 65 };
      case 'pink':
        return { hue: 330, saturation: 80, lightness: 70 };
      case 'green':
        return { hue: 142, saturation: 76, lightness: 46 };
      case 'orange': // dark/black
        return { hue: 220, saturation: 13, lightness: 20 }; // subtle dark blue
      default:
        return { hue: 265, saturation: 83, lightness: 65 }; // Default purple
    }
  };
  
  // Get CSS variable value
  const getCssVariable = (name: string): string => {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  };
  
  // Initialize particles when dimensions change or component mounts
  useEffect(() => {
    // Only initialize if we have valid dimensions
    if (!canvasRef.current || dimensions.width === 0 || dimensions.height === 0) return;
    
    const accentColor = getAccentColor();
    const particles: Particle[] = [];
    
    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * dimensions.width,
        y: Math.random() * dimensions.height,
        size: Math.random() * particleSize + 0.5,
        speedX: (Math.random() - 0.5) * particleSpeed,
        speedY: (Math.random() - 0.5) * particleSpeed,
        hue: accentColor.hue + (Math.random() * 30 - 15), // Slight variation in hue
        opacity: Math.random() * particleOpacity
      });
    }
    
    particlesRef.current = particles;
  }, [dimensions.width, dimensions.height, accent, particleSize, particleSpeed, particleOpacity, particleCount]);
  
  // Handle mouse movement for interactive particles
  useEffect(() => {
    if (!interactive) return;
    
    const handleMouseMove = (e: MouseEvent) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      
      const rect = canvas.getBoundingClientRect();
      mouseRef.current.x = e.clientX - rect.left;
      mouseRef.current.y = e.clientY - rect.top;
    };
    
    const handleMouseLeave = () => {
      mouseRef.current.x = -1000;
      mouseRef.current.y = -1000;
    };
    
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseleave', handleMouseLeave);
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [interactive]);
  
  // Setup canvas and animation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const handleResize = () => {
      if (canvas) {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        setDimensions({ width: canvas.width, height: canvas.height });
      }
    };
    
    // Initial sizing
    handleResize();
    
    // Listen for resize events
    window.addEventListener('resize', handleResize);
    
    // Animation loop
    const animate = () => {
      if (!ctx || !canvas) return;
      
      // Clear canvas with transparency for trailing effect - use a darker, theme-matching color
      const accentColor = getAccentColor();
      const bgColor = `rgba(10, 10, 15, 0.05)`;
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Update and draw particles
      particlesRef.current.forEach((particle, index) => {
        // Update position
        particle.x += particle.speedX;
        particle.y += particle.speedY;
        
        // Wrap particles around edges
        if (particle.x < 0) particle.x = canvas.width;
        if (particle.x > canvas.width) particle.x = 0;
        if (particle.y < 0) particle.y = canvas.height;
        if (particle.y > canvas.height) particle.y = 0;
        
        // Interactive - affect particles near mouse
        if (interactive) {
          const dx = particle.x - mouseRef.current.x;
          const dy = particle.y - mouseRef.current.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          if (distance < mouseRef.current.radius) {
            const force = (mouseRef.current.radius - distance) / mouseRef.current.radius;
            const angle = Math.atan2(dy, dx);
            particle.x += Math.cos(angle) * force * 2;
            particle.y += Math.sin(angle) * force * 2;
            
            // Highlight particles near mouse
            particle.opacity = Math.min(1, particle.opacity + 0.02);
            particle.size = Math.min(particleSize * 2, particle.size + 0.1);
            particle.hue = accentColor.hue - 20 + (force * 40); // Shift hue based on proximity
          } else {
            // Return to normal state
            particle.opacity = Math.max(Math.random() * particleOpacity, particle.opacity - 0.01);
            particle.size = Math.max(Math.random() * particleSize + 0.5, particle.size - 0.05);
            particle.hue = accentColor.hue + (Math.random() * 30 - 15);
          }
        }
        
        // Draw the particle with more vibrancy
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        // Use theme-matched saturation and lightness
        ctx.fillStyle = `hsla(${particle.hue}, ${accentColor.saturation}%, ${accentColor.lightness}%, ${particle.opacity})`;
        ctx.fill();
        
        // Add subtle glow effect for larger particles
        if (particle.size > particleSize) {
          ctx.beginPath();
          ctx.arc(particle.x, particle.y, particle.size * 2, 0, Math.PI * 2);
          ctx.fillStyle = `hsla(${particle.hue}, ${accentColor.saturation}%, ${accentColor.lightness}%, ${particle.opacity * 0.2})`;
          ctx.fill();
        }
        
        // Random chance to draw connection lines between nearby particles
        if (Math.random() < 0.05) {
          for (let j = index + 1; j < particlesRef.current.length; j++) {
            const otherParticle = particlesRef.current[j];
            const dx = particle.x - otherParticle.x;
            const dy = particle.y - otherParticle.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < 100) {
              ctx.beginPath();
              ctx.moveTo(particle.x, particle.y);
              ctx.lineTo(otherParticle.x, otherParticle.y);
              // Make connection lines match the accent color theme better
              ctx.strokeStyle = `hsla(${accentColor.hue}, ${accentColor.saturation}%, ${accentColor.lightness}%, ${0.15 * (1 - distance / 100)})`;
              ctx.lineWidth = 0.5;
              ctx.stroke();
            }
          }
        }
      });
      
      requestRef.current = requestAnimationFrame(animate);
    };
    
    // Start animation
    requestRef.current = requestAnimationFrame(animate);
    
    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, [particleSize, particleOpacity, interactive, accent]);
  
  return (
    <canvas 
      ref={canvasRef}
      className={`fixed top-0 left-0 w-full h-full pointer-events-none ${className}`}
      style={{ zIndex: 0 }}
    />
  );
};

export default ParticleBackground;