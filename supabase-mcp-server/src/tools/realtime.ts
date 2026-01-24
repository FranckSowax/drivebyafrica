import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { RealtimeChannel } from '@supabase/supabase-js';
import { getSupabaseClient } from '../supabase-client.js';
import { formatResponse } from '../utils/formatters.js';
import {
  SubscribeSchema,
  BroadcastSchema,
} from '../schemas/tool-schemas.js';

// Store active channels
const activeChannels: Map<string, RealtimeChannel> = new Map();

/**
 * Register realtime-related tools
 */
export function registerRealtimeTools(server: McpServer) {
  // supabase_realtime_subscribe - Subscribe to table changes
  server.registerTool(
    'supabase_realtime_subscribe',
    {
      title: 'Subscribe to Realtime',
      description: 'Subscribe to realtime changes on a table or channel',
      inputSchema: SubscribeSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async (args) => {
      try {
        if (activeChannels.has(args.channel)) {
          throw new Error(`Channel '${args.channel}' is already subscribed`);
        }

        const supabase = getSupabaseClient();
        const channel = supabase.channel(args.channel);

        if (args.table) {
          const event = args.event || '*';
          const config: any = {
            event,
            schema: 'public',
            table: args.table,
          };

          if (args.filter) {
            config.filter = args.filter;
          }

          channel.on('postgres_changes', config, (payload) => {
            console.error(`[Realtime Event] ${args.channel}:`, JSON.stringify(payload, null, 2));
          });
        }

        channel.subscribe((status) => {
          console.error(`[Realtime] Channel '${args.channel}' status: ${status}`);
        });

        activeChannels.set(args.channel, channel);

        return {
          content: [{
            type: 'text',
            text: formatResponse({
              channel: args.channel,
              table: args.table,
              event: args.event || '*',
              message: 'Subscribed successfully',
            }, 'markdown')
          }],
        };
      } catch (error: any) {
        return {
          content: [{ type: 'text', text: `Error: ${error.message}` }],
          isError: true,
        };
      }
    }
  );

  // supabase_realtime_unsubscribe - Unsubscribe from channel
  server.registerTool(
    'supabase_realtime_unsubscribe',
    {
      title: 'Unsubscribe from Realtime',
      description: 'Unsubscribe from a realtime channel',
      inputSchema: z.object({
        channel: z.string().describe('Channel name to unsubscribe from'),
      }),
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (args) => {
      try {
        if (!activeChannels.has(args.channel)) {
          throw new Error(`Channel '${args.channel}' is not subscribed`);
        }

        const supabase = getSupabaseClient();
        const channel = activeChannels.get(args.channel)!;
        await supabase.removeChannel(channel);
        activeChannels.delete(args.channel);

        return {
          content: [{ type: 'text', text: `Unsubscribed from channel '${args.channel}' successfully` }],
        };
      } catch (error: any) {
        return {
          content: [{ type: 'text', text: `Error: ${error.message}` }],
          isError: true,
        };
      }
    }
  );

  // supabase_realtime_broadcast - Broadcast message to channel
  server.registerTool(
    'supabase_realtime_broadcast',
    {
      title: 'Broadcast to Realtime',
      description: 'Broadcast a message to a realtime channel',
      inputSchema: BroadcastSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async (args) => {
      try {
        const supabase = getSupabaseClient();
        let channel = activeChannels.get(args.channel);

        if (!channel) {
          channel = supabase.channel(args.channel);
          await channel.subscribe();
          activeChannels.set(args.channel, channel);
        }

        await channel.send({
          type: 'broadcast',
          event: args.event,
          payload: args.payload,
        });

        return {
          content: [{
            type: 'text',
            text: formatResponse({
              channel: args.channel,
              event: args.event,
              message: 'Message broadcasted successfully',
            }, 'markdown')
          }],
        };
      } catch (error: any) {
        return {
          content: [{ type: 'text', text: `Error: ${error.message}` }],
          isError: true,
        };
      }
    }
  );
}

/**
 * Cleanup all active channels
 */
export async function cleanupRealtimeChannels() {
  for (const [name, channel] of activeChannels.entries()) {
    try {
      const supabase = getSupabaseClient();
      await supabase.removeChannel(channel);
      console.error(`[Realtime] Cleaned up channel: ${name}`);
    } catch (error) {
      console.error(`[Realtime] Error cleaning up channel ${name}:`, error);
    }
  }
  activeChannels.clear();
}
