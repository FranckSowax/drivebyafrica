import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { getSupabaseClient } from '../supabase-client.js';
import { formatResponse } from '../utils/formatters.js';
import {
  UploadFileSchema,
  DownloadFileSchema,
  DeleteFileSchema,
  ListFilesSchema,
  GetPublicUrlSchema,
  CreateSignedUrlSchema,
} from '../schemas/tool-schemas.js';

/**
 * Register storage-related tools
 */
export function registerStorageTools(server: McpServer) {
  // supabase_storage_list_buckets - List all storage buckets
  server.registerTool(
    'supabase_storage_list_buckets',
    {
      title: 'List Storage Buckets',
      description: 'List all storage buckets in the Supabase project',
      inputSchema: z.object({}),
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async () => {
      try {
        const supabase = getSupabaseClient();
        const { data, error } = await supabase.storage.listBuckets();

        if (error) throw error;

        return {
          content: [{ type: 'text', text: formatResponse(data, 'markdown') }],
        };
      } catch (error: any) {
        return {
          content: [{ type: 'text', text: `Error: ${error.message}` }],
          isError: true,
        };
      }
    }
  );

  // supabase_storage_upload - Upload file to bucket
  server.registerTool(
    'supabase_storage_upload',
    {
      title: 'Upload File',
      description: 'Upload a file to a storage bucket',
      inputSchema: UploadFileSchema,
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
        const fileBuffer = Buffer.from(args.file_data, 'base64');

        const { data, error } = await supabase.storage
          .from(args.bucket)
          .upload(args.path, fileBuffer, {
            contentType: args.content_type,
            upsert: args.upsert,
          });

        if (error) throw error;

        return {
          content: [{
            type: 'text',
            text: formatResponse({
              ...data,
              message: 'File uploaded successfully',
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

  // supabase_storage_list_files - List files in bucket
  server.registerTool(
    'supabase_storage_list_files',
    {
      title: 'List Files',
      description: 'List files in a storage bucket',
      inputSchema: ListFilesSchema,
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
        const { data, error } = await supabase.storage
          .from(args.bucket)
          .list(args.path, {
            limit: args.limit,
            offset: args.offset,
          });

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

  // supabase_storage_get_public_url - Get public URL for file
  server.registerTool(
    'supabase_storage_get_public_url',
    {
      title: 'Get Public URL',
      description: 'Get the public URL for a file in a public bucket',
      inputSchema: GetPublicUrlSchema,
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
        const { data } = supabase.storage
          .from(args.bucket)
          .getPublicUrl(args.path);

        return {
          content: [{
            type: 'text',
            text: formatResponse({
              publicUrl: data.publicUrl,
              path: args.path,
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

  // supabase_storage_create_signed_url - Create signed URL for private file
  server.registerTool(
    'supabase_storage_create_signed_url',
    {
      title: 'Create Signed URL',
      description: 'Create a signed URL for temporary access to a private file',
      inputSchema: CreateSignedUrlSchema,
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
        const { data, error } = await supabase.storage
          .from(args.bucket)
          .createSignedUrl(args.path, args.expires_in);

        if (error) throw error;

        return {
          content: [{
            type: 'text',
            text: formatResponse({
              signedUrl: data.signedUrl,
              path: args.path,
              expiresIn: args.expires_in,
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
