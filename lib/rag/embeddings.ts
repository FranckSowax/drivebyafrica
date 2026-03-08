/**
 * OpenAI Embeddings module for RAG knowledge base
 * Uses text-embedding-3-small (1536 dimensions)
 */

const EMBEDDING_MODEL = 'text-embedding-3-small';
const MAX_TOKENS_PER_CHUNK = 500;
const OVERLAP_TOKENS = 50;

/**
 * Generate embedding vector for a text string
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY not configured');
  }

  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      input: text.trim(),
      model: EMBEDDING_MODEL,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(`OpenAI Embeddings API error: ${error.error?.message || response.statusText}`);
  }

  const data = await response.json();
  return data.data[0].embedding;
}

/**
 * Generate embeddings for multiple texts in batch
 */
export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY not configured');
  }

  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      input: texts.map(t => t.trim()),
      model: EMBEDDING_MODEL,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(`OpenAI Embeddings API error: ${error.error?.message || response.statusText}`);
  }

  const data = await response.json();
  return data.data
    .sort((a: { index: number }, b: { index: number }) => a.index - b.index)
    .map((item: { embedding: number[] }) => item.embedding);
}

/**
 * Split text into chunks with overlap for better retrieval
 * Uses approximate word-based splitting (1 token ≈ 0.75 words)
 */
export function chunkText(
  text: string,
  maxTokens: number = MAX_TOKENS_PER_CHUNK,
  overlapTokens: number = OVERLAP_TOKENS
): string[] {
  // Approximate: 1 token ≈ 4 characters for French/English
  const maxChars = maxTokens * 4;
  const overlapChars = overlapTokens * 4;

  if (text.length <= maxChars) {
    return [text.trim()];
  }

  const chunks: string[] = [];

  // Split by paragraphs first for natural boundaries
  const paragraphs = text.split(/\n\n+/);
  let currentChunk = '';

  for (const paragraph of paragraphs) {
    const trimmed = paragraph.trim();
    if (!trimmed) continue;

    // If adding this paragraph would exceed max, save current chunk
    if (currentChunk && (currentChunk.length + trimmed.length + 2) > maxChars) {
      chunks.push(currentChunk.trim());

      // Start new chunk with overlap from end of previous
      const overlapStart = Math.max(0, currentChunk.length - overlapChars);
      currentChunk = currentChunk.substring(overlapStart).trim() + '\n\n' + trimmed;
    } else {
      currentChunk = currentChunk ? currentChunk + '\n\n' + trimmed : trimmed;
    }
  }

  // Don't forget the last chunk
  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }

  // If we still have chunks that are too long, split them by sentences
  const finalChunks: string[] = [];
  for (const chunk of chunks) {
    if (chunk.length <= maxChars) {
      finalChunks.push(chunk);
    } else {
      // Split by sentences
      const sentences = chunk.split(/(?<=[.!?])\s+/);
      let sentenceChunk = '';

      for (const sentence of sentences) {
        if (sentenceChunk && (sentenceChunk.length + sentence.length + 1) > maxChars) {
          finalChunks.push(sentenceChunk.trim());
          const overlapStart = Math.max(0, sentenceChunk.length - overlapChars);
          sentenceChunk = sentenceChunk.substring(overlapStart).trim() + ' ' + sentence;
        } else {
          sentenceChunk = sentenceChunk ? sentenceChunk + ' ' + sentence : sentence;
        }
      }

      if (sentenceChunk.trim()) {
        finalChunks.push(sentenceChunk.trim());
      }
    }
  }

  return finalChunks.filter(c => c.length > 0);
}
