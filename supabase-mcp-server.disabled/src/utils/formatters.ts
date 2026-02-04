/**
 * Format response data as JSON or Markdown
 */
export function formatResponse(
  data: any,
  format: 'json' | 'markdown' = 'markdown'
): string {
  if (format === 'json') {
    return JSON.stringify(data, null, 2);
  }

  return formatAsMarkdown(data);
}

/**
 * Format data as Markdown for human readability
 */
function formatAsMarkdown(data: any): string {
  if (data === null || data === undefined) {
    return '*No data*';
  }

  if (Array.isArray(data)) {
    if (data.length === 0) {
      return '*No results found*';
    }

    return formatArrayAsMarkdown(data);
  }

  if (typeof data === 'object') {
    return formatObjectAsMarkdown(data);
  }

  return String(data);
}

/**
 * Format array as Markdown table or list
 */
function formatArrayAsMarkdown(array: any[]): string {
  if (array.length === 0) {
    return '*Empty array*';
  }

  const first = array[0];

  if (typeof first === 'object' && first !== null) {
    return formatTableAsMarkdown(array);
  }

  return array.map((item, i) => `${i + 1}. ${item}`).join('\n');
}

/**
 * Format array of objects as Markdown table
 */
function formatTableAsMarkdown(data: any[]): string {
  if (data.length === 0) {
    return '*No data*';
  }

  const keys = Array.from(
    new Set(data.flatMap(obj => Object.keys(obj)))
  );

  const header = `| ${keys.join(' | ')} |`;
  const separator = `| ${keys.map(() => '---').join(' | ')} |`;
  const rows = data.map(obj => {
    const values = keys.map(key => {
      const value = obj[key];
      if (value === null || value === undefined) return '';
      if (typeof value === 'object') return JSON.stringify(value);
      return String(value);
    });
    return `| ${values.join(' | ')} |`;
  });

  return [header, separator, ...rows].join('\n');
}

/**
 * Format single object as Markdown key-value pairs
 */
function formatObjectAsMarkdown(obj: any): string {
  const entries = Object.entries(obj);

  if (entries.length === 0) {
    return '*Empty object*';
  }

  return entries
    .map(([key, value]) => {
      let formattedValue: string;

      if (value === null || value === undefined) {
        formattedValue = '*null*';
      } else if (typeof value === 'object') {
        formattedValue = JSON.stringify(value, null, 2);
      } else {
        formattedValue = String(value);
      }

      return `**${key}**: ${formattedValue}`;
    })
    .join('\n');
}

/**
 * Format pagination metadata
 */
export function formatPaginationInfo(
  count: number,
  offset: number,
  limit: number,
  total?: number
): string {
  const start = offset + 1;
  const end = Math.min(offset + count, offset + limit);

  if (total !== undefined) {
    return `\n\n---\n*Showing ${start}-${end} of ${total} results*`;
  }

  return `\n\n---\n*Showing ${count} results (offset: ${offset}, limit: ${limit})*`;
}
