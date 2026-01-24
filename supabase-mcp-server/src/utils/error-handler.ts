import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';

/**
 * Handle Supabase errors and convert them to MCP-compatible error responses
 */
export function handleSupabaseError(error: any): { isError: true; content: Array<{ type: 'text'; text: string }> } {
  let errorMessage = 'An unexpected error occurred';
  let suggestion = '';

  if (error?.message) {
    errorMessage = error.message;

    // Provide helpful suggestions based on error type
    if (errorMessage.includes('JWT')) {
      suggestion = ' Check your authentication token and ensure it is valid.';
    } else if (errorMessage.includes('permission')) {
      suggestion = ' Verify that you have the necessary permissions for this operation.';
    } else if (errorMessage.includes('not found')) {
      suggestion = ' Check that the resource exists and you have access to it.';
    } else if (errorMessage.includes('unique constraint')) {
      suggestion = ' A record with these values already exists. Try updating instead of inserting.';
    } else if (errorMessage.includes('foreign key')) {
      suggestion = ' Ensure all referenced records exist before creating this relationship.';
    } else if (errorMessage.includes('invalid input')) {
      suggestion = ' Check that all required fields are provided with valid values.';
    }
  }

  return {
    isError: true,
    content: [{
      type: 'text',
      text: `Error: ${errorMessage}${suggestion}`
    }]
  };
}

/**
 * Validate required parameters
 */
export function validateRequired(params: Record<string, any>, required: string[]): void {
  const missing = required.filter(key => params[key] === undefined || params[key] === null);

  if (missing.length > 0) {
    throw new Error(`Missing required parameters: ${missing.join(', ')}`);
  }
}

/**
 * Create a standardized error response
 */
export function createErrorResponse(message: string): { isError: true; content: Array<{ type: 'text'; text: string }> } {
  return {
    isError: true,
    content: [{
      type: 'text',
      text: `Error: ${message}`
    }]
  };
}
