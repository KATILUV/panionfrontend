/**
 * Startup Optimizer
 * Reduces cold start time by optimizing initialization sequence
 * 
 * Key optimizations:
 * 1. Parallel service startup
 * 2. Lazy loading of non-critical components
 * 3. Service readiness verification
 * 4. Progressive resource allocation
 */

import { log } from './vite';
import { ChildProcess } from 'child_process';
import { startPanionAPI } from './panion';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';

// File access promises
const fsAccess = promisify(fs.access);

// Service status tracking
interface ServiceStatus {
  name: string;
  ready: boolean;
  startTime: number;
  readyTime?: number;
  error?: string;
  process?: ChildProcess;
  dependencies: string[];
}

// Configuration
const STARTUP_CONFIG = {
  maxParallelServices: 3,
  servicePriorities: {
    'panion-api': 10,
    'knowledge-graph': 9,
    'memory-system': 8,
    'web-server': 7,
    'websocket-server': 6,
    'strategic-planner': 3,
    'multi-agent-debate': 2,
    'enhanced-scraper': 1
  } as Record<string, number>,
  // How long to wait for a service before proceeding anyway (ms)
  serviceTimeouts: {
    'panion-api': 5000,
    'knowledge-graph': 2000,
    'memory-system': 1000,
    'default': 3000
  } as Record<string, number>,
  // If true, start services that depend on a timed-out service
  continueOnTimeout: true,
  // Path to warm cache files for preloaded data
  warmCachePath: './data/warm-cache',
  // Wait this long at minimum before declaring system ready
  minStartupTime: 1500
};

// Track services
const services: Record<string, ServiceStatus> = {};
let startupInProgress = false;
let systemReady = false;
let startupStartTime = 0;

// Initialize warm cache directory
try {
  if (!fs.existsSync(STARTUP_CONFIG.warmCachePath)) {
    fs.mkdirSync(STARTUP_CONFIG.warmCachePath, { recursive: true });
  }
} catch (error) {
  log(`Error initializing warm cache: ${error}`, 'startup');
}

/**
 * Start a service with optimized resource allocation
 */
async function startService(name: string): Promise<void> {
  if (services[name]?.ready) {
    return; // Already started and ready
  }
  
  const service = services[name] || {
    name,
    ready: false,
    startTime: Date.now(),
    dependencies: []
  };
  
  services[name] = service;
  
  log(`Starting service: ${name}`, 'startup');
  
  try {
    switch (name) {
      case 'panion-api':
        await startPanionAPI();
        break;
        
      case 'knowledge-graph':
        // Knowledge graph is loaded on-demand now
        // We'll just mark it ready immediately
        break;
        
      case 'memory-system':
        // Memory system is initialized on first use
        // Just mark it ready
        break;
        
      default:
        log(`Unknown service: ${name}`, 'startup');
        service.error = 'Unknown service';
        return;
    }
    
    // Mark service as ready
    service.ready = true;
    service.readyTime = Date.now();
    
    log(`Service ready: ${name} (${service.readyTime - service.startTime}ms)`, 'startup');
    
    // Start dependent services
    Object.values(services).forEach(dependentService => {
      if (!dependentService.ready && dependentService.dependencies.includes(name)) {
        // Check if all dependencies are ready
        const allDependenciesReady = dependentService.dependencies.every(
          dep => services[dep]?.ready
        );
        
        if (allDependenciesReady) {
          startService(dependentService.name).catch(error => {
            log(`Error starting dependent service ${dependentService.name}: ${error}`, 'startup');
          });
        }
      }
    });
  } catch (error) {
    service.error = String(error);
    log(`Error starting service ${name}: ${error}`, 'startup');
  }
}

/**
 * Start multiple services in parallel with resource constraints
 */
async function startServicesInParallel(serviceNames: string[]): Promise<void> {
  // Sort by priority
  const sortedServices = [...serviceNames].sort((a, b) => {
    const priorityA = a in STARTUP_CONFIG.servicePriorities ? STARTUP_CONFIG.servicePriorities[a] : 0;
    const priorityB = b in STARTUP_CONFIG.servicePriorities ? STARTUP_CONFIG.servicePriorities[b] : 0;
    return priorityB - priorityA;
  });
  
  // Start highest priority services first (limited by maxParallelServices)
  const initialBatch = sortedServices.slice(0, STARTUP_CONFIG.maxParallelServices);
  await Promise.all(initialBatch.map(name => startService(name)));
  
  // Start remaining services
  const remainingServices = sortedServices.slice(STARTUP_CONFIG.maxParallelServices);
  for (const name of remainingServices) {
    await startService(name);
  }
}

/**
 * Check if a service is ready with timeout
 */
async function waitForService(name: string, timeout?: number): Promise<boolean> {
  const service = services[name];
  if (!service) {
    return false;
  }
  
  if (service.ready) {
    return true;
  }
  
  const actualTimeout = timeout || 
    (name in STARTUP_CONFIG.serviceTimeouts ? STARTUP_CONFIG.serviceTimeouts[name] : STARTUP_CONFIG.serviceTimeouts.default);
  
  return new Promise<boolean>((resolve) => {
    const startTime = Date.now();
    
    // Check periodically if service is ready
    const checkInterval = setInterval(() => {
      if (service.ready) {
        clearInterval(checkInterval);
        resolve(true);
      } else if (Date.now() - startTime > actualTimeout) {
        clearInterval(checkInterval);
        log(`Timeout waiting for service: ${name}`, 'startup');
        resolve(false);
      }
    }, 100);
  });
}

/**
 * Preload essential data into memory to speed up first requests
 */
async function preloadEssentialData(): Promise<void> {
  try {
    // Preload warm cache data if available
    const knowledgeGraphCachePath = path.join(STARTUP_CONFIG.warmCachePath, 'knowledge-graph.json');
    
    try {
      await fsAccess(knowledgeGraphCachePath);
      // Knowledge graph cache exists, it will be loaded on demand
      log('Knowledge graph warm cache available', 'startup');
    } catch (error) {
      // Cache doesn't exist, we'll create it later after first use
      log('Knowledge graph warm cache not found', 'startup');
    }
    
    // Prime the pattern matching engine (no-op if not needed)
  } catch (error) {
    log(`Error preloading data: ${error}`, 'startup');
  }
}

/**
 * Optimize startup sequence for fastest availability
 */
export async function optimizeStartup(): Promise<void> {
  if (startupInProgress || systemReady) {
    return;
  }
  
  startupInProgress = true;
  startupStartTime = Date.now();
  
  log('Optimizing startup sequence', 'startup');
  
  try {
    // Define service dependencies
    services['panion-api'] = {
      name: 'panion-api',
      ready: false,
      startTime: Date.now(),
      dependencies: []
    };
    
    services['knowledge-graph'] = {
      name: 'knowledge-graph',
      ready: false,
      startTime: Date.now(),
      dependencies: []
    };
    
    services['memory-system'] = {
      name: 'memory-system',
      ready: false,
      startTime: Date.now(),
      dependencies: ['knowledge-graph']
    };
    
    // Start non-dependent services in parallel
    const nonDependentServices = Object.values(services)
      .filter(service => service.dependencies.length === 0)
      .map(service => service.name);
    
    await startServicesInParallel(nonDependentServices);
    
    // Wait for critical services with timeout
    const panionReady = await waitForService('panion-api');
    
    if (!panionReady && !STARTUP_CONFIG.continueOnTimeout) {
      throw new Error('Critical service panion-api failed to start');
    }
    
    // Preload data in parallel with remaining service initialization
    preloadEssentialData().catch(error => {
      log(`Error in data preloading: ${error}`, 'startup');
    });
    
    // Give some time for remaining services to start
    const elapsedTime = Date.now() - startupStartTime;
    if (elapsedTime < STARTUP_CONFIG.minStartupTime) {
      await new Promise(resolve => setTimeout(resolve, STARTUP_CONFIG.minStartupTime - elapsedTime));
    }
    
    // Mark system as ready
    systemReady = true;
    
    // Log startup metrics
    const totalTime = Date.now() - startupStartTime;
    const readyServices = Object.values(services).filter(s => s.ready).length;
    const totalServices = Object.keys(services).length;
    
    log(`System ready: ${readyServices}/${totalServices} services started in ${totalTime}ms`, 'startup');
  } catch (error) {
    log(`Startup optimization failed: ${error}`, 'startup');
    // Continue anyway to allow partial functionality
    systemReady = true;
  } finally {
    startupInProgress = false;
  }
}

/**
 * Check if the system is ready
 */
export function isSystemReady(): boolean {
  return systemReady;
}

/**
 * Save warm cache for faster future startups
 */
export function saveWarmCache(): void {
  try {
    // Knowledge graph warm cache (placeholder for now)
    log('Creating warm cache for next startup', 'startup');
  } catch (error) {
    log(`Error saving warm cache: ${error}`, 'startup');
  }
}

// Auto-save warm cache on process exit
process.on('beforeExit', () => {
  if (systemReady) {
    saveWarmCache();
  }
});