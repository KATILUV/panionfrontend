import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

// Configure Neon to use the ws package for WebSocket connections
neonConfig.webSocketConstructor = ws;

// Define database connection options with timeouts and connection limits
const DB_CONNECTION_OPTIONS = {
  connectionString: process.env.DATABASE_URL,
  max: 20,                   // Maximum number of clients in the pool
  idleTimeoutMillis: 30000,  // How long a client is allowed to remain idle before being closed (30 seconds)
  connectionTimeoutMillis: 5000, // How long to wait for a connection to become available (5 seconds)
  maxUses: 7500,             // Maximum number of times a client can be used before being recycled
};

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Create the connection pool
export const pool = new Pool(DB_CONNECTION_OPTIONS);

// Set up error handling for the pool
pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  // Don't crash the server, but log the error for monitoring
});

// Set up connection pool monitoring (optional)
if (process.env.NODE_ENV === 'development') {
  setInterval(() => {
    const poolStatus = {
      totalCount: pool.totalCount,
      idleCount: pool.idleCount,
      waitingCount: pool.waitingCount,
    };
    console.debug('[DB Pool Status]', poolStatus);
  }, 60000); // Log every minute in development mode
}

// Create drizzle instance with the pool and schema
export const db = drizzle({ client: pool, schema });

// Handle process termination - clean up connections
process.on('exit', () => {
  console.log('Closing database pool on process exit');
  pool.end();
});

// Handle SIGINT (Ctrl+C) to clean up connections
process.on('SIGINT', () => {
  console.log('Received SIGINT. Closing database pool...');
  pool.end().then(() => {
    console.log('Database pool has been closed');
    process.exit(0);
  });
});
