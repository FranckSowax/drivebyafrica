import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { getSupabaseClient } from '../supabase-client.js';
import { formatResponse } from '../utils/formatters.js';
import {
  SignUpSchema,
  SignInSchema,
  UpdateUserSchema,
  ResetPasswordSchema,
} from '../schemas/tool-schemas.js';

/**
 * Register authentication-related tools
 */
export function registerAuthTools(server: McpServer) {
  // supabase_auth_sign_up - Create new user
  server.registerTool(
    'supabase_auth_sign_up',
    {
      title: 'Sign Up User',
      description: 'Create a new user account with email and password',
      inputSchema: SignUpSchema,
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
        const { data, error } = await supabase.auth.signUp({
          email: args.email,
          password: args.password,
          options: {
            data: args.metadata,
          },
        });

        if (error) throw error;

        return {
          content: [{
            type: 'text',
            text: formatResponse({
              user: data.user,
              message: 'User created successfully',
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

  // supabase_auth_sign_in - Sign in user
  server.registerTool(
    'supabase_auth_sign_in',
    {
      title: 'Sign In User',
      description: 'Sign in a user with email and password',
      inputSchema: SignInSchema,
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
        const { data, error } = await supabase.auth.signInWithPassword({
          email: args.email,
          password: args.password,
        });

        if (error) throw error;

        return {
          content: [{
            type: 'text',
            text: formatResponse({
              user: data.user,
              message: 'User signed in successfully',
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

  // supabase_auth_sign_out - Sign out user
  server.registerTool(
    'supabase_auth_sign_out',
    {
      title: 'Sign Out User',
      description: 'Sign out the current user',
      inputSchema: z.object({}),
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async () => {
      try {
        const supabase = getSupabaseClient();
        const { error } = await supabase.auth.signOut();

        if (error) throw error;

        return {
          content: [{ type: 'text', text: 'User signed out successfully' }],
        };
      } catch (error: any) {
        return {
          content: [{ type: 'text', text: `Error: ${error.message}` }],
          isError: true,
        };
      }
    }
  );

  // supabase_auth_get_user - Get current user info
  server.registerTool(
    'supabase_auth_get_user',
    {
      title: 'Get Current User',
      description: 'Get the currently authenticated user information',
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
        const { data, error } = await supabase.auth.getUser();

        if (error) throw error;

        return {
          content: [{ type: 'text', text: formatResponse(data.user, 'markdown') }],
        };
      } catch (error: any) {
        return {
          content: [{ type: 'text', text: `Error: ${error.message}` }],
          isError: true,
        };
      }
    }
  );

  // supabase_auth_update_user - Update user metadata
  server.registerTool(
    'supabase_auth_update_user',
    {
      title: 'Update User',
      description: 'Update user email, password, or metadata',
      inputSchema: UpdateUserSchema,
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

        const updateData: any = {};
        if (args.email) updateData.email = args.email;
        if (args.password) updateData.password = args.password;
        if (args.metadata) updateData.data = args.metadata;

        const { data, error } = await supabase.auth.updateUser(updateData);

        if (error) throw error;

        return {
          content: [{
            type: 'text',
            text: formatResponse({
              user: data.user,
              message: 'User updated successfully',
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

  // supabase_auth_reset_password - Request password reset
  server.registerTool(
    'supabase_auth_reset_password',
    {
      title: 'Reset Password',
      description: 'Send a password reset email to the user',
      inputSchema: ResetPasswordSchema,
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
        const { error } = await supabase.auth.resetPasswordForEmail(args.email);

        if (error) throw error;

        return {
          content: [{ type: 'text', text: 'Password reset email sent successfully' }],
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
