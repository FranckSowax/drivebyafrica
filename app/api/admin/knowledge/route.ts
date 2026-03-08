import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/admin-check';
import { supabaseAdmin } from '@/lib/supabase/admin';
import {
  addDocument,
  updateDocument,
  deleteDocument,
  listDocuments,
  getDocumentStats,
  type KnowledgeCategory,
  type KnowledgeSource,
} from '@/lib/rag/knowledge-base';

/**
 * GET /api/admin/knowledge
 * List documents with optional filtering
 */
export async function GET(request: Request) {
  const adminCheck = await requireAdmin();
  if (!adminCheck.isAdmin) return adminCheck.response;

  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category') as KnowledgeCategory | null;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = (page - 1) * limit;

    const [result, stats] = await Promise.all([
      listDocuments({ category: category || undefined, limit, offset }),
      getDocumentStats(),
    ]);

    return NextResponse.json({
      documents: result.documents,
      total: result.total,
      stats,
      pagination: { page, limit, total: result.total, totalPages: Math.ceil(result.total / limit) },
    });
  } catch (error) {
    console.error('Knowledge list error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

/**
 * POST /api/admin/knowledge
 * Create a new knowledge document
 */
export async function POST(request: Request) {
  const adminCheck = await requireAdmin();
  if (!adminCheck.isAdmin) return adminCheck.response;

  try {
    const body = await request.json();
    const { title, content, category, language, source } = body;

    if (!title || !content || !category) {
      return NextResponse.json({ error: 'Titre, contenu et catégorie requis' }, { status: 400 });
    }

    const doc = await addDocument(title, content, category as KnowledgeCategory, {
      language: language || 'fr',
      source: (source || 'admin') as KnowledgeSource,
    });

    return NextResponse.json({ success: true, document: doc });
  } catch (error) {
    console.error('Knowledge create error:', error);
    const msg = error instanceof Error ? error.message : 'Erreur serveur';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/**
 * PUT /api/admin/knowledge
 * Update an existing document
 */
export async function PUT(request: Request) {
  const adminCheck = await requireAdmin();
  if (!adminCheck.isAdmin) return adminCheck.response;

  try {
    const body = await request.json();
    const { id, title, content, category, is_active } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID requis' }, { status: 400 });
    }

    const updates: Record<string, unknown> = {};
    if (title !== undefined) updates.title = title;
    if (content !== undefined) updates.content = content;
    if (category !== undefined) updates.category = category;
    if (is_active !== undefined) updates.is_active = is_active;

    const doc = await updateDocument(id, updates);

    return NextResponse.json({ success: true, document: doc });
  } catch (error) {
    console.error('Knowledge update error:', error);
    const msg = error instanceof Error ? error.message : 'Erreur serveur';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/knowledge
 * Delete a document
 */
export async function DELETE(request: Request) {
  const adminCheck = await requireAdmin();
  if (!adminCheck.isAdmin) return adminCheck.response;

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID requis' }, { status: 400 });
    }

    await deleteDocument(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Knowledge delete error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

/**
 * PATCH /api/admin/knowledge
 * Search knowledge base (for testing)
 */
export async function PATCH(request: Request) {
  const adminCheck = await requireAdmin();
  if (!adminCheck.isAdmin) return adminCheck.response;

  try {
    const body = await request.json();
    const { action, query, category } = body;

    if (action === 'search') {
      const { searchKnowledge } = await import('@/lib/rag/knowledge-base');
      const results = await searchKnowledge(query, { category, limit: 5 });
      return NextResponse.json({ results });
    }

    if (action === 'seed') {
      const { seedKnowledgeBase } = await import('@/lib/rag/seed-knowledge');
      await seedKnowledgeBase();
      return NextResponse.json({ success: true, message: 'Base de connaissance initialisée' });
    }

    return NextResponse.json({ error: 'Action inconnue' }, { status: 400 });
  } catch (error) {
    console.error('Knowledge action error:', error);
    const msg = error instanceof Error ? error.message : 'Erreur serveur';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
