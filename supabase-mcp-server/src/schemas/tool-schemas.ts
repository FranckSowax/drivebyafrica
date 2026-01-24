import { z } from 'zod';

// Common schemas
export const ResponseFormatSchema = z.enum(['json', 'markdown']).default('markdown');

export const PaginationSchema = z.object({
  offset: z.number().int().min(0).default(0).describe('Number of records to skip'),
  limit: z.number().int().min(1).max(1000).default(50).describe('Maximum number of records to return'),
});

// Database operation schemas
export const SelectSchema = z.object({
  table: z.string().describe('Name of the table to query'),
  columns: z.string().optional().describe('Comma-separated list of columns to select (default: all columns)'),
  filters: z.record(z.string(), z.any()).optional().describe('Object with column names as keys and filter values'),
  order_by: z.string().optional().describe('Column name to order by (prefix with - for descending)'),
  offset: z.number().int().min(0).optional().describe('Number of records to skip'),
  limit: z.number().int().min(1).max(1000).optional().describe('Maximum number of records to return'),
  response_format: ResponseFormatSchema.optional(),
});

export const InsertSchema = z.object({
  table: z.string().describe('Name of the table to insert into'),
  data: z.union([z.record(z.string(), z.any()), z.array(z.record(z.string(), z.any()))]).describe('Object or array of objects to insert'),
  return_data: z.boolean().default(true).describe('Whether to return the inserted data'),
  response_format: ResponseFormatSchema.optional(),
});

export const UpdateSchema = z.object({
  table: z.string().describe('Name of the table to update'),
  filters: z.record(z.string(), z.any()).describe('Object with column names as keys to identify records to update'),
  data: z.record(z.string(), z.any()).describe('Object with column names and new values'),
  return_data: z.boolean().default(true).describe('Whether to return the updated data'),
  response_format: ResponseFormatSchema.optional(),
});

export const DeleteSchema = z.object({
  table: z.string().describe('Name of the table to delete from'),
  filters: z.record(z.string(), z.any()).describe('Object with column names as keys to identify records to delete'),
  return_data: z.boolean().default(false).describe('Whether to return the deleted data'),
  response_format: ResponseFormatSchema.optional(),
});

export const UpsertSchema = z.object({
  table: z.string().describe('Name of the table to upsert into'),
  data: z.union([z.record(z.string(), z.any()), z.array(z.record(z.string(), z.any()))]).describe('Object or array of objects to upsert'),
  on_conflict: z.string().optional().describe('Comma-separated list of columns that should be used to resolve conflicts'),
  return_data: z.boolean().default(true).describe('Whether to return the upserted data'),
  response_format: ResponseFormatSchema.optional(),
});

export const RpcSchema = z.object({
  function_name: z.string().describe('Name of the Postgres function to call'),
  params: z.record(z.string(), z.any()).optional().describe('Parameters to pass to the function'),
  response_format: ResponseFormatSchema.optional(),
});

export const CountSchema = z.object({
  table: z.string().describe('Name of the table to count records in'),
  filters: z.record(z.string(), z.any()).optional().describe('Object with column names as keys and filter values'),
  response_format: ResponseFormatSchema.optional(),
});

export const DescribeTableSchema = z.object({
  table: z.string().describe('Name of the table to describe'),
  response_format: ResponseFormatSchema.optional(),
});

export const ExecuteSqlSchema = z.object({
  query: z.string().describe('SQL query to execute (admin only)'),
  response_format: ResponseFormatSchema.optional(),
});

// Auth schemas
export const SignUpSchema = z.object({
  email: z.string().email().describe('User email address'),
  password: z.string().min(6).describe('User password (minimum 6 characters)'),
  metadata: z.record(z.string(), z.any()).optional().describe('Additional user metadata'),
});

export const SignInSchema = z.object({
  email: z.string().email().describe('User email address'),
  password: z.string().describe('User password'),
});

export const UpdateUserSchema = z.object({
  email: z.string().email().optional().describe('New email address'),
  password: z.string().min(6).optional().describe('New password'),
  metadata: z.record(z.string(), z.any()).optional().describe('User metadata to update'),
});

export const ResetPasswordSchema = z.object({
  email: z.string().email().describe('User email address'),
});

// Storage schemas
export const UploadFileSchema = z.object({
  bucket: z.string().describe('Name of the storage bucket'),
  path: z.string().describe('File path within the bucket'),
  file_data: z.string().describe('Base64-encoded file data or file content'),
  content_type: z.string().optional().describe('MIME type of the file'),
  upsert: z.boolean().default(false).describe('Whether to overwrite existing file'),
});

export const DownloadFileSchema = z.object({
  bucket: z.string().describe('Name of the storage bucket'),
  path: z.string().describe('File path within the bucket'),
});

export const DeleteFileSchema = z.object({
  bucket: z.string().describe('Name of the storage bucket'),
  paths: z.array(z.string()).describe('Array of file paths to delete'),
});

export const ListFilesSchema = z.object({
  bucket: z.string().describe('Name of the storage bucket'),
  path: z.string().optional().describe('Folder path to list files from'),
  offset: z.number().int().min(0).optional().describe('Number of files to skip'),
  limit: z.number().int().min(1).max(1000).optional().describe('Maximum number of files to return'),
  response_format: ResponseFormatSchema.optional(),
});

export const GetPublicUrlSchema = z.object({
  bucket: z.string().describe('Name of the storage bucket'),
  path: z.string().describe('File path within the bucket'),
});

export const CreateSignedUrlSchema = z.object({
  bucket: z.string().describe('Name of the storage bucket'),
  path: z.string().describe('File path within the bucket'),
  expires_in: z.number().int().min(1).default(3600).describe('Time in seconds until the URL expires'),
});

// Realtime schemas
export const SubscribeSchema = z.object({
  channel: z.string().describe('Channel name to subscribe to'),
  table: z.string().optional().describe('Table name to listen for changes'),
  event: z.enum(['INSERT', 'UPDATE', 'DELETE', '*']).optional().describe('Type of database event to listen for'),
  filter: z.string().optional().describe('Filter expression (e.g., "id=eq.123")'),
});

export const BroadcastSchema = z.object({
  channel: z.string().describe('Channel name to broadcast to'),
  event: z.string().describe('Event name'),
  payload: z.record(z.string(), z.any()).describe('Data to broadcast'),
});
