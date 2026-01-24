import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { initializeSupabase, initializeSupabaseAdmin } from './supabase-client.js';
import { registerDatabaseTools } from './tools/database.js';
import { registerAuthTools } from './tools/auth.js';
import { registerStorageTools } from './tools/storage.js';
import { registerRealtimeTools, cleanupRealtimeChannels } from './tools/realtime.js';

/**
 * Create and configure the MCP server
 */
export async function createMCPServer() {
  // Validate environment variables
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) {
    throw new Error('SUPABASE_URL environment variable is required');
  }

  if (!supabaseAnonKey && !supabaseServiceRoleKey) {
    throw new Error('Either SUPABASE_ANON_KEY or SUPABASE_SERVICE_ROLE_KEY environment variable is required');
  }

  // Initialize Supabase clients
  initializeSupabase({
    url: supabaseUrl,
    anonKey: supabaseAnonKey,
    serviceRoleKey: supabaseServiceRoleKey,
  });

  if (supabaseServiceRoleKey) {
    initializeSupabaseAdmin({
      url: supabaseUrl,
      serviceRoleKey: supabaseServiceRoleKey,
    });
    console.error('[Server] Admin client initialized');
  }

  // Create MCP server
  const server = new McpServer({
    name: 'supabase-mcp-server',
    version: '1.0.0',
  });

  // Register all tools using the modern registerTool API
  registerDatabaseTools(server);
  registerAuthTools(server);
  registerStorageTools(server);
  registerRealtimeTools(server);

  console.error('[Server] Supabase MCP server initialized');

  return server;
}

/**
 * Start the MCP server with stdio transport
 */
export async function startServer() {
  const server = await createMCPServer();
  const transport = new StdioServerTransport();

  // Handle cleanup on exit
  process.on('SIGINT', async () => {
    console.error('[Server] Shutting down...');
    await cleanupRealtimeChannels();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    console.error('[Server] Shutting down...');
    await cleanupRealtimeChannels();
    process.exit(0);
  });

  await server.connect(transport);
  console.error('[Server] Supabase MCP server running on stdio');
}
