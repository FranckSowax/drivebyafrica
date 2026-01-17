'use client';

import { FileText, Download, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { Json } from '@/types/database';

interface Document {
  name: string;
  url: string;
  type: string;
  size: number;
  uploaded_at: string;
}

interface OrderDocumentsProps {
  documents: Json;
  documentsSentAt: string | null;
}

export function OrderDocuments({ documents, documentsSentAt }: OrderDocumentsProps) {
  // Parse documents
  const docList: Document[] = Array.isArray(documents)
    ? (documents as unknown as Document[])
    : [];

  const formatFileSize = (bytes: number) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (docList.length === 0) {
    return (
      <div className="text-center py-6">
        <Clock className="w-10 h-10 mx-auto text-[var(--text-muted)] mb-3" />
        <p className="text-[var(--text-muted)]">
          Les documents seront disponibles ici une fois préparés.
        </p>
        <p className="text-xs text-[var(--text-muted)] mt-1">
          Vous recevrez une notification lorsqu&apos;ils seront prêts.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {documentsSentAt && (
        <p className="text-xs text-[var(--text-muted)]">
          Documents envoyés le {format(new Date(documentsSentAt), "d MMMM yyyy 'à' HH:mm", { locale: fr })}
        </p>
      )}

      {docList.map((doc, index) => (
        <a
          key={index}
          href={doc.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-between p-3 bg-[var(--surface)] rounded-lg hover:bg-mandarin/10 transition-colors group"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-500/10 rounded-lg group-hover:bg-red-500/20 transition-colors">
              <FileText className="w-5 h-5 text-red-500" />
            </div>
            <div>
              <p className="text-sm font-medium text-[var(--text-primary)] group-hover:text-mandarin transition-colors">
                {doc.name}
              </p>
              <p className="text-xs text-[var(--text-muted)]">
                PDF {doc.size ? `- ${formatFileSize(doc.size)}` : ''}
              </p>
            </div>
          </div>
          <Download className="w-5 h-5 text-[var(--text-muted)] group-hover:text-mandarin transition-colors" />
        </a>
      ))}
    </div>
  );
}
