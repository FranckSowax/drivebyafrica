import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { getSupabaseClient } from '../supabase-client.js';
import { formatResponse } from '../utils/formatters.js';
import {
  SelectSchema,
  InsertSchema,
  UpdateSchema,
  DeleteSchema,
  UpsertSchema,
  RpcSchema,
  CountSchema,
} from '../schemas/tool-schemas.js';

/**
 * Register database-related tools
 */
export function registerDatabaseTools(server: McpServer) {
  //supabase_select - Query data from tables
  server.registerTool(
    'supabase_select',
    {
      title: 'Query Supabase Table',
      description: 'Query data from a Supabase table with filters, ordering, and pagination',
      inputSchema: SelectSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (args) => {
      try {
        const supabase = getSupabaseClient();
        let query = supabase.from(args.table).select(args.columns || '*');

        if (args.filters) {
          for (const [column, value] of Object.entries(args.filters)) {
            query = query.eq(column, value);
          }
        }

        if (args.order_by) {
          const descending = args.order_by.startsWith('-');
          const column = descending ? args.order_by.slice(1) : args.order_by;
          query = query.order(column, { ascending: !descending });
        }

        if (args.offset !== undefined) {
          query = query.range(args.offset, args.offset + (args.limit || 50) - 1);
        } else if (args.limit !== undefined) {
          query = query.limit(args.limit);
        }

        const { data, error } = await query;

        if (error) throw error;

        return {
          content: [{ type: 'text', text: formatResponse(data, args.response_format) }],
        };
      } catch (error: any) {
        return {
          content: [{ type: 'text', text: `Error: ${error.message}` }],
          isError: true,
        };
      }
    }
  );

  // supabase_insert - Insert new records
  server.registerTool(
    'supabase_insert',
    {
      title: 'Insert Records',
      description: 'Insert new records into a Supabase table',
      inputSchema: InsertSchema,
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
        const { data, error } = await supabase
          .from(args.table)
          .insert(args.data)
          .select();

        if (error) throw error;

        return {
          content: [{
            type: 'text',
            text: formatResponse(data, args.response_format)
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

  // supabase_update - Update existing records
  server.registerTool(
    'supabase_update',
    {
      title: 'Update Records',
      description: 'Update existing records in a Supabase table',
      inputSchema: UpdateSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (args) => {
      try {
        const supabase = getSupabaseClient();
        let query = supabase.from(args.table).update(args.data);

        for (const [column, value] of Object.entries(args.filters)) {
          query = query.eq(column, value);
        }

        const { data, error } = await query.select();

        if (error) throw error;

        return {
          content: [{
            type: 'text',
            text: formatResponse(data, args.response_format)
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

  // supabase_delete - Delete records
  server.registerTool(
    'supabase_delete',
    {
      title: 'Delete Records',
      description: 'Delete records from a Supabase table',
      inputSchema: DeleteSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (args) => {
      try {
        const supabase = getSupabaseClient();
        let query = supabase.from(args.table).delete();

        for (const [column, value] of Object.entries(args.filters)) {
          query = query.eq(column, value);
        }

        const { data, error } = await query.select();

        if (error) throw error;

        return {
          content: [{
            type: 'text',
            text: formatResponse(data, args.response_format)
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

  // supabase_upsert - Insert or update records
  server.registerTool(
    'supabase_upsert',
    {
      title: 'Upsert Records',
      description: 'Insert new records or update existing ones in a Supabase table',
      inputSchema: UpsertSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (args) => {
      try {
        const supabase = getSupabaseClient();
        const { data, error } = await supabase
          .from(args.table)
          .upsert(args.data, { onConflict: args.on_conflict })
          .select();

        if (error) throw error;

        return {
          content: [{
            type: 'text',
            text: formatResponse(data, args.response_format)
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

  // supabase_rpc - Call Postgres functions
  server.registerTool(
    'supabase_rpc',
    {
      title: 'Call Postgres Function',
      description: 'Call a Postgres function via RPC',
      inputSchema: RpcSchema,
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
        const { data, error } = await supabase.rpc(args.function_name, args.params || {});

        if (error) throw error;

        return {
          content: [{ type: 'text', text: formatResponse(data, args.response_format) }],
        };
      } catch (error: any) {
        return {
          content: [{ type: 'text', text: `Error: ${error.message}` }],
          isError: true,
        };
      }
    }
  );

  // supabase_count - Count records
  server.registerTool(
    'supabase_count',
    {
      title: 'Count Records',
      description: 'Count records in a table with optional filters',
      inputSchema: CountSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (args) => {
      try {
        const supabase = getSupabaseClient();
        let query = supabase.from(args.table).select('*', { count: 'exact', head: true });

        if (args.filters) {
          for (const [column, value] of Object.entries(args.filters)) {
            query = query.eq(column, value);
          }
        }

        const { count, error } = await query;

        if (error) throw error;

        return {
          content: [{ type: 'text', text: `Total count: ${count}` }],
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
