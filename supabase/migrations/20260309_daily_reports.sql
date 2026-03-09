-- Daily AI-generated reports analyzing WhatsApp conversations
CREATE TABLE IF NOT EXISTS daily_reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  report_date DATE NOT NULL UNIQUE,
  content TEXT NOT NULL,
  summary TEXT,
  insights JSONB DEFAULT '{}',
  conversations_analyzed INT DEFAULT 0,
  added_to_knowledge_base BOOLEAN DEFAULT false,
  knowledge_document_id UUID REFERENCES knowledge_documents(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE daily_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access to daily_reports"
  ON daily_reports FOR ALL
  USING (true)
  WITH CHECK (true);

-- Index
CREATE INDEX IF NOT EXISTS idx_daily_reports_date ON daily_reports(report_date DESC);
