/**
 * Knowledge Base module for RAG
 * CRUD operations on knowledge documents with automatic chunking and embedding
 */

import { createClient } from '@supabase/supabase-js';
import { generateEmbedding, generateEmbeddings, chunkText } from './embeddings';

// Untyped admin client for new tables not yet in generated types
function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export type KnowledgeCategory = 'faq' | 'process' | 'pricing' | 'policy' | 'vehicle_info' | 'shipping' | 'general';
export type KnowledgeSource = 'manual' | 'conversation' | 'admin' | 'import' | 'file_upload';

export interface KnowledgeDocument {
  id: string;
  title: string;
  category: KnowledgeCategory;
  content: string;
  language: string;
  source: KnowledgeSource;
  is_active: boolean;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface SearchResult {
  id: string;
  content: string;
  similarity: number;
  document_id: string;
  document_title: string;
  category: string;
  metadata: Record<string, unknown>;
}

/**
 * Search the knowledge base using semantic similarity
 */
export async function searchKnowledge(
  query: string,
  options: {
    threshold?: number;
    limit?: number;
    category?: KnowledgeCategory;
  } = {}
): Promise<SearchResult[]> {
  const { threshold = 0.7, limit = 5, category } = options;

  const queryEmbedding = await generateEmbedding(query);

  const { data, error } = await getAdmin().rpc('match_knowledge_chunks', {
    query_embedding: JSON.stringify(queryEmbedding),
    match_threshold: threshold,
    match_count: limit,
    filter_category: category || null,
  });

  if (error) {
    console.error('Knowledge search error:', error);
    throw error;
  }

  return (data || []) as SearchResult[];
}

/**
 * Add a new document to the knowledge base
 * Automatically chunks and generates embeddings
 */
export async function addDocument(
  title: string,
  content: string,
  category: KnowledgeCategory,
  options: {
    language?: string;
    source?: KnowledgeSource;
    metadata?: Record<string, unknown>;
  } = {}
): Promise<KnowledgeDocument> {
  const { language = 'fr', source = 'manual', metadata = {} } = options;

  // 1. Insert document
  const { data: doc, error: docError } = await getAdmin()
    .from('knowledge_documents')
    .insert({
      title,
      content,
      category,
      language,
      source,
      metadata,
    })
    .select()
    .single();

  if (docError) throw docError;

  // 2. Chunk and embed
  await chunkAndEmbed(doc.id, content);

  return doc as KnowledgeDocument;
}

/**
 * Update an existing document (re-chunks and re-embeds)
 */
export async function updateDocument(
  id: string,
  updates: {
    title?: string;
    content?: string;
    category?: KnowledgeCategory;
    is_active?: boolean;
    metadata?: Record<string, unknown>;
  }
): Promise<KnowledgeDocument> {
  const { data: doc, error } = await getAdmin()
    .from('knowledge_documents')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;

  // Re-chunk and re-embed if content changed
  if (updates.content) {
    // Delete old chunks
    await getAdmin()
      .from('knowledge_chunks')
      .delete()
      .eq('document_id', id);

    // Create new chunks
    await chunkAndEmbed(id, updates.content);
  }

  return doc as KnowledgeDocument;
}

/**
 * Delete a document and its chunks
 */
export async function deleteDocument(id: string): Promise<void> {
  const { error } = await getAdmin()
    .from('knowledge_documents')
    .delete()
    .eq('id', id);

  if (error) throw error;
  // Chunks are deleted by ON DELETE CASCADE
}

/**
 * Get all documents, optionally filtered
 */
export async function listDocuments(options: {
  category?: KnowledgeCategory;
  activeOnly?: boolean;
  limit?: number;
  offset?: number;
} = {}): Promise<{ documents: KnowledgeDocument[]; total: number }> {
  const { category, activeOnly = false, limit = 50, offset = 0 } = options;

  let query = getAdmin()
    .from('knowledge_documents')
    .select('*', { count: 'exact' })
    .order('updated_at', { ascending: false });

  if (category) query = query.eq('category', category);
  if (activeOnly) query = query.eq('is_active', true);
  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) throw error;

  return {
    documents: (data || []) as KnowledgeDocument[],
    total: count || 0,
  };
}

/**
 * Get a single document by ID
 */
export async function getDocument(id: string): Promise<KnowledgeDocument | null> {
  const { data, error } = await getAdmin()
    .from('knowledge_documents')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }

  return data as KnowledgeDocument;
}

/**
 * Internal: chunk text and generate embeddings for a document
 */
async function chunkAndEmbed(documentId: string, content: string): Promise<void> {
  const chunks = chunkText(content);

  if (chunks.length === 0) return;

  // Generate embeddings in batch
  const embeddings = await generateEmbeddings(chunks);

  // Insert chunks with embeddings
  const chunkRows = chunks.map((chunk, index) => ({
    document_id: documentId,
    content: chunk,
    chunk_index: index,
    embedding: JSON.stringify(embeddings[index]),
    metadata: { char_count: chunk.length },
  }));

  const { error } = await getAdmin()
    .from('knowledge_chunks')
    .insert(chunkRows);

  if (error) {
    console.error('Error inserting knowledge chunks:', error);
    throw error;
  }
}

/**
 * Get document count by category
 */
export async function getDocumentStats(): Promise<Record<string, number>> {
  const { data, error } = await getAdmin()
    .from('knowledge_documents')
    .select('category');

  if (error) throw error;

  const stats: Record<string, number> = {};
  for (const doc of data || []) {
    stats[doc.category] = (stats[doc.category] || 0) + 1;
  }
  return stats;
}
