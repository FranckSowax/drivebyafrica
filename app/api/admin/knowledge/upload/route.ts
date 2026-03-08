import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/admin-check';
import { addDocument, type KnowledgeCategory } from '@/lib/rag/knowledge-base';

/**
 * POST /api/admin/knowledge/upload
 * Upload a document file (.txt, .md, .csv) and ingest into knowledge base.
 * The file content is extracted, chunked, and embedded automatically.
 */
export async function POST(request: Request) {
  const adminCheck = await requireAdmin();
  if (!adminCheck.isAdmin) return adminCheck.response;

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const category = (formData.get('category') as string) || 'general';
    const title = formData.get('title') as string | null;

    if (!file) {
      return NextResponse.json({ error: 'Fichier requis' }, { status: 400 });
    }

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'Fichier trop volumineux (max 5 Mo)' }, { status: 400 });
    }

    // Extract text content based on file type
    const fileName = file.name.toLowerCase();
    let content: string;

    if (fileName.endsWith('.txt') || fileName.endsWith('.md') || fileName.endsWith('.csv')) {
      content = await file.text();
    } else if (fileName.endsWith('.json')) {
      const raw = await file.text();
      // Pretty-print JSON for better chunking
      try {
        content = JSON.stringify(JSON.parse(raw), null, 2);
      } catch {
        content = raw;
      }
    } else {
      return NextResponse.json(
        { error: 'Format non supporté. Formats acceptés: .txt, .md, .csv, .json' },
        { status: 400 }
      );
    }

    if (!content.trim()) {
      return NextResponse.json({ error: 'Le fichier est vide' }, { status: 400 });
    }

    // Use filename as title if not provided
    const docTitle = title || file.name.replace(/\.[^.]+$/, '');

    const doc = await addDocument(docTitle, content, category as KnowledgeCategory, {
      language: 'fr',
      source: 'file_upload',
      metadata: {
        original_filename: file.name,
        file_size: file.size,
        uploaded_at: new Date().toISOString(),
      },
    });

    return NextResponse.json({
      success: true,
      document: doc,
      message: `Document "${docTitle}" importé avec succès`,
    });
  } catch (error) {
    console.error('Knowledge upload error:', error);
    const msg = error instanceof Error ? error.message : 'Erreur serveur';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
