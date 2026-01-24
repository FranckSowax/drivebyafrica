#!/usr/bin/env node

import { config } from 'dotenv';
import { startServer } from './server.js';

// Load environment variables from .env file
config();

/**
 * Main entry point for the Supabase MCP server
 */
async function main() {
  try {
    await startServer();
  } catch (error) {
    console.error('[Error] Failed to start server:', error);
    process.exit(1);
  }
}

main();
