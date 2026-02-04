# Supabase MCP Server

A comprehensive Model Context Protocol (MCP) server for Supabase, providing LLMs with tools to interact with Supabase databases, authentication, storage, and realtime features.

## Features

### 🗄️ Database Operations (11 tools)
- Query data with filters, ordering, and pagination
- Insert, update, delete, and upsert records
- Call Postgres functions (RPC)
- Count records with filters
- List tables and describe schema (admin)
- Execute raw SQL (admin)

### 🔐 Authentication (6 tools)
- Sign up new users
- Sign in/out users
- Get user information
- Update user details
- Reset passwords

### 📦 Storage (7 tools)
- List storage buckets
- Upload/download files
- Delete files
- List files in buckets
- Generate public URLs
- Create signed URLs for private files

### ⚡ Realtime (3 tools)
- Subscribe to table changes
- Unsubscribe from channels
- Broadcast messages to channels

## Installation

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Copy `.env.example` to `.env` and fill in your Supabase credentials:

```bash
cp .env.example .env
```

Edit `.env`:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key  # Optional, for admin operations
```

### 3. Build the Server

```bash
npm run build
```

## Usage

### Running Locally

```bash
npm run dev
```

### Testing with MCP Inspector

```bash
npm run inspector
```

### Using with Claude Desktop

Add to your Claude Desktop configuration (`~/Library/Application Support/Claude/claude_desktop_config.json` on macOS):

```json
{
  "mcpServers": {
    "supabase": {
      "command": "node",
      "args": ["/path/to/supabase-mcp-server/dist/index.js"],
      "env": {
        "SUPABASE_URL": "https://your-project.supabase.co",
        "SUPABASE_ANON_KEY": "your-anon-key",
        "SUPABASE_SERVICE_ROLE_KEY": "your-service-role-key"
      }
    }
  }
}
```

## Tools Reference

### Database Tools

#### `supabase_select`
Query data from a table with filters, ordering, and pagination.

**Parameters:**
- `table` (required): Table name
- `columns` (optional): Comma-separated column names
- `filters` (optional): Filter conditions as key-value pairs
- `order_by` (optional): Column to order by (prefix with `-` for descending)
- `offset` (optional): Number of records to skip
- `limit` (optional): Maximum records to return (max 1000)
- `response_format` (optional): `json` or `markdown`

**Example:**
```json
{
  "table": "vehicles",
  "columns": "id,make,model,year",
  "filters": { "make": "Toyota" },
  "order_by": "-year",
  "limit": 10
}
```

#### `supabase_insert`
Insert new records into a table.

**Parameters:**
- `table` (required): Table name
- `data` (required): Object or array of objects to insert
- `return_data` (optional): Return inserted data (default: true)
- `response_format` (optional): `json` or `markdown`

#### `supabase_update`
Update existing records in a table.

**Parameters:**
- `table` (required): Table name
- `filters` (required): Filter conditions to identify records
- `data` (required): New values
- `return_data` (optional): Return updated data (default: true)
- `response_format` (optional): `json` or `markdown`

#### `supabase_delete`
Delete records from a table.

**Parameters:**
- `table` (required): Table name
- `filters` (required): Filter conditions to identify records
- `return_data` (optional): Return deleted data (default: false)
- `response_format` (optional): `json` or `markdown`

#### `supabase_upsert`
Insert new records or update existing ones.

**Parameters:**
- `table` (required): Table name
- `data` (required): Object or array of objects to upsert
- `on_conflict` (optional): Columns for conflict resolution
- `return_data` (optional): Return upserted data (default: true)
- `response_format` (optional): `json` or `markdown`

#### `supabase_rpc`
Call a Postgres function.

**Parameters:**
- `function_name` (required): Name of the function
- `params` (optional): Parameters to pass to the function
- `response_format` (optional): `json` or `markdown`

#### `supabase_count`
Count records in a table with optional filters.

**Parameters:**
- `table` (required): Table name
- `filters` (optional): Filter conditions
- `response_format` (optional): `json` or `markdown`

#### `supabase_list_tables` (Admin only)
List all tables in the public schema.

#### `supabase_describe_table` (Admin only)
Get the structure and columns of a table.

**Parameters:**
- `table` (required): Table name
- `response_format` (optional): `json` or `markdown`

#### `supabase_execute_sql` (Admin only)
Execute raw SQL query.

**Parameters:**
- `query` (required): SQL query
- `response_format` (optional): `json` or `markdown`

#### `supabase_get_schema` (Admin only)
Get the complete database schema.

### Authentication Tools

#### `supabase_auth_sign_up`
Create a new user account.

**Parameters:**
- `email` (required): User email
- `password` (required): Password (min 6 characters)
- `metadata` (optional): Additional user metadata

#### `supabase_auth_sign_in`
Sign in a user.

**Parameters:**
- `email` (required): User email
- `password` (required): Password

#### `supabase_auth_sign_out`
Sign out the current user.

#### `supabase_auth_get_user`
Get the currently authenticated user information.

#### `supabase_auth_update_user`
Update user email, password, or metadata.

**Parameters:**
- `email` (optional): New email
- `password` (optional): New password
- `metadata` (optional): Metadata to update

#### `supabase_auth_reset_password`
Send a password reset email.

**Parameters:**
- `email` (required): User email

### Storage Tools

#### `supabase_storage_list_buckets`
List all storage buckets.

#### `supabase_storage_upload`
Upload a file to a bucket.

**Parameters:**
- `bucket` (required): Bucket name
- `path` (required): File path in bucket
- `file_data` (required): Base64-encoded file data
- `content_type` (optional): MIME type
- `upsert` (optional): Overwrite if exists

#### `supabase_storage_download`
Download a file from a bucket.

**Parameters:**
- `bucket` (required): Bucket name
- `path` (required): File path in bucket

#### `supabase_storage_delete`
Delete files from a bucket.

**Parameters:**
- `bucket` (required): Bucket name
- `paths` (required): Array of file paths

#### `supabase_storage_list_files`
List files in a bucket.

**Parameters:**
- `bucket` (required): Bucket name
- `path` (optional): Folder path
- `offset` (optional): Skip files
- `limit` (optional): Max files to return
- `response_format` (optional): `json` or `markdown`

#### `supabase_storage_get_public_url`
Get the public URL for a file.

**Parameters:**
- `bucket` (required): Bucket name
- `path` (required): File path

#### `supabase_storage_create_signed_url`
Create a signed URL for temporary access.

**Parameters:**
- `bucket` (required): Bucket name
- `path` (required): File path
- `expires_in` (optional): Seconds until expiration (default: 3600)

### Realtime Tools

#### `supabase_realtime_subscribe`
Subscribe to realtime changes on a table.

**Parameters:**
- `channel` (required): Channel name
- `table` (optional): Table to listen to
- `event` (optional): Event type (`INSERT`, `UPDATE`, `DELETE`, `*`)
- `filter` (optional): Filter expression

#### `supabase_realtime_unsubscribe`
Unsubscribe from a channel.

**Parameters:**
- `channel` (required): Channel name

#### `supabase_realtime_broadcast`
Broadcast a message to a channel.

**Parameters:**
- `channel` (required): Channel name
- `event` (required): Event name
- `payload` (required): Data to broadcast

## Security Considerations

### Service Role Key
The `SUPABASE_SERVICE_ROLE_KEY` provides full database access, bypassing Row Level Security (RLS) policies. Only use it when necessary and keep it secure.

**Admin-only tools:**
- `supabase_list_tables`
- `supabase_describe_table`
- `supabase_execute_sql`
- `supabase_get_schema`

### Row Level Security
When using the `SUPABASE_ANON_KEY`, all database operations respect RLS policies. Ensure your Supabase policies are properly configured.

## Development

### Project Structure

```
supabase-mcp-server/
├── src/
│   ├── index.ts              # Entry point
│   ├── server.ts             # MCP server setup
│   ├── supabase-client.ts    # Supabase client wrapper
│   ├── tools/
│   │   ├── database.ts       # Database tools
│   │   ├── auth.ts           # Auth tools
│   │   ├── storage.ts        # Storage tools
│   │   └── realtime.ts       # Realtime tools
│   ├── schemas/
│   │   └── tool-schemas.ts   # Zod validation schemas
│   └── utils/
│       ├── error-handler.ts  # Error handling
│       └── formatters.ts     # Response formatting
├── package.json
├── tsconfig.json
└── README.md
```

### Building

```bash
npm run build
```

### Watch Mode

```bash
npm run watch
```

## License

MIT

## Contributing

Contributions are welcome! Please ensure all tools follow MCP best practices:
- Clear, descriptive names with `supabase_` prefix
- Comprehensive input validation using Zod
- Proper error handling with helpful messages
- Support for both JSON and Markdown response formats
- Appropriate tool annotations
