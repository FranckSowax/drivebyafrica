-- Enable pgvector extension for embeddings
CREATE EXTENSION IF NOT EXISTS vector;

-- Knowledge Documents table
CREATE TABLE IF NOT EXISTS knowledge_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('faq', 'process', 'pricing', 'policy', 'vehicle_info', 'shipping', 'general')),
  content TEXT NOT NULL,
  language TEXT DEFAULT 'fr',
  source TEXT DEFAULT 'manual' CHECK (source IN ('manual', 'conversation', 'admin', 'import')),
  is_active BOOLEAN DEFAULT true,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Knowledge Chunks with vector embeddings
CREATE TABLE IF NOT EXISTS knowledge_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES knowledge_documents(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  chunk_index INTEGER NOT NULL,
  embedding vector(1536),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- HNSW index for vector similarity search (works on empty tables unlike IVFFlat)
CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_embedding
  ON knowledge_chunks USING hnsw (embedding vector_cosine_ops);

CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_document_id
  ON knowledge_chunks (document_id);

CREATE INDEX IF NOT EXISTS idx_knowledge_documents_category
  ON knowledge_documents (category);

CREATE INDEX IF NOT EXISTS idx_knowledge_documents_active
  ON knowledge_documents (is_active);

-- Semantic search function
CREATE OR REPLACE FUNCTION match_knowledge_chunks(
  query_embedding vector(1536),
  match_threshold FLOAT DEFAULT 0.7,
  match_count INT DEFAULT 5,
  filter_category TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  content TEXT,
  similarity FLOAT,
  document_id UUID,
  document_title TEXT,
  category TEXT,
  metadata JSONB
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    kc.id,
    kc.content,
    (1 - (kc.embedding <=> query_embedding))::FLOAT AS similarity,
    kd.id AS document_id,
    kd.title AS document_title,
    kd.category,
    kc.metadata
  FROM knowledge_chunks kc
  JOIN knowledge_documents kd ON kd.id = kc.document_id
  WHERE kd.is_active = true
    AND (1 - (kc.embedding <=> query_embedding)) > match_threshold
    AND (filter_category IS NULL OR kd.category = filter_category)
  ORDER BY kc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- WhatsApp Conversations for chatbot state
CREATE TABLE IF NOT EXISTS whatsapp_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'escalated', 'closed')),
  context JSONB DEFAULT '{}',
  escalation_reason TEXT,
  last_message_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_conversations_phone
  ON whatsapp_conversations (phone);

CREATE INDEX IF NOT EXISTS idx_whatsapp_conversations_status
  ON whatsapp_conversations (status);

-- RLS Policies
ALTER TABLE knowledge_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on knowledge_documents"
  ON knowledge_documents FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access on knowledge_chunks"
  ON knowledge_chunks FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access on whatsapp_conversations"
  ON whatsapp_conversations FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Authenticated read active knowledge"
  ON knowledge_documents FOR SELECT
  USING (auth.role() = 'authenticated' AND is_active = true);

CREATE POLICY "Authenticated read knowledge chunks"
  ON knowledge_chunks FOR SELECT
  USING (auth.role() = 'authenticated');

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_knowledge_documents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_knowledge_documents_updated_at
  BEFORE UPDATE ON knowledge_documents
  FOR EACH ROW
  EXECUTE FUNCTION update_knowledge_documents_updated_at();
