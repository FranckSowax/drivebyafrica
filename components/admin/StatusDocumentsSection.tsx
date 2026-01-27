'use client';

import { useState, useRef, useCallback } from 'react';
import {
  Upload,
  FileText,
  Image as ImageIcon,
  Link2,
  X,
  Loader2,
  CheckCircle,
  AlertTriangle,
  Download,
  Trash2,
  ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { createClient } from '@/lib/supabase/client';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { authFetch } from '@/lib/supabase/auth-helpers';
import {
  getStatusDocumentConfig,
  getMissingDocuments,
  type DocumentRequirement,
  type UploadedStatusDocument,
} from '@/lib/order-documents-config';

interface StatusDocumentsSectionProps {
  orderId: string;
  orderNumber: string;
  currentStatus: string;
  uploadedDocuments: UploadedStatusDocument[];
  onDocumentsUpdated?: () => void;
  isAdmin?: boolean;
}

export function StatusDocumentsSection({
  orderId,
  orderNumber,
  currentStatus,
  uploadedDocuments,
  onDocumentsUpdated,
  isAdmin = true,
}: StatusDocumentsSectionProps) {
  const config = getStatusDocumentConfig(currentStatus);
  const missingDocs = getMissingDocuments(currentStatus, uploadedDocuments);
  const statusDocs = uploadedDocuments.filter(d => d.status === currentStatus);

  // Also show documents from other statuses
  const otherDocs = uploadedDocuments.filter(d => d.status !== currentStatus);

  const hasMissingDocs = missingDocs.length > 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-[var(--text-primary)]">
          Documents requis pour ce statut
        </h4>
      </div>

      {/* Warning for missing documents */}
      {config && config.requiredDocuments.length > 0 && hasMissingDocs && (
        <div className="flex items-start gap-3 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
          <AlertTriangle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-yellow-500">
              Documents manquants pour &quot;{config.label}&quot;
            </p>
            <p className="text-xs text-yellow-500/80 mt-1">
              {missingDocs.map(d => d.label).join(', ')}
            </p>
          </div>
        </div>
      )}

      {/* No documents required */}
      {(!config || config.requiredDocuments.length === 0) && (
        <div className="text-sm text-[var(--text-muted)] p-3 bg-[var(--surface)] rounded-lg">
          Aucun document requis pour le statut &quot;{currentStatus}&quot;
        </div>
      )}

      {/* Document requirements for current status */}
      {config && config.requiredDocuments.length > 0 && (
        <div className="space-y-3">
          {config.requiredDocuments.map((req) => (
            <DocumentRequirementCard
              key={req.id}
              requirement={req}
              orderId={orderId}
              currentStatus={currentStatus}
              uploadedDocs={statusDocs.filter(d => d.requirement_id === req.id)}
              onDocumentsUpdated={onDocumentsUpdated}
              isAdmin={isAdmin}
            />
          ))}
        </div>
      )}

      {/* Other documents (from other statuses) */}
      {otherDocs.length > 0 && (
        <div className="mt-6 pt-4 border-t border-[var(--card-border)]">
          <h4 className="text-sm font-medium text-[var(--text-muted)] mb-3">
            Autres documents ({otherDocs.length})
          </h4>
          <div className="space-y-2">
            {otherDocs.map((doc) => (
              <DocumentRow
                key={doc.id}
                document={doc}
                orderId={orderId}
                onDelete={isAdmin ? onDocumentsUpdated : undefined}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

interface DocumentRequirementCardProps {
  requirement: DocumentRequirement;
  orderId: string;
  currentStatus: string;
  uploadedDocs: UploadedStatusDocument[];
  onDocumentsUpdated?: () => void;
  isAdmin: boolean;
}

function DocumentRequirementCard({
  requirement,
  orderId,
  currentStatus,
  uploadedDocs,
  onDocumentsUpdated,
  isAdmin,
}: DocumentRequirementCardProps) {
  const [uploading, setUploading] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  const isComplete = uploadedDocs.length > 0;

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setUploading(true);
    setError(null);

    try {
      const uploadedDocs: { name: string; url: string; type: string; size: number }[] = [];

      for (const file of files) {
        // Upload to Supabase Storage
        const ext = file.name.split('.').pop();
        const fileName = `orders/${orderId}/${currentStatus}/${requirement.id}_${Date.now()}.${ext}`;
        const { data, error: uploadError } = await supabase.storage
          .from('documents')
          .upload(fileName, file);

        if (uploadError) {
          throw new Error(`Erreur: ${uploadError.message}`);
        }

        const { data: { publicUrl } } = supabase.storage
          .from('documents')
          .getPublicUrl(data.path);

        uploadedDocs.push({
          name: file.name,
          url: publicUrl,
          type: file.type,
          size: file.size,
        });
      }

      // Save to order
      const response = await authFetch('/api/admin/orders/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId,
          documents: uploadedDocs,
          requirementId: requirement.id,
          status: currentStatus,
          sendNotification: requirement.visibleToClient,
          sendWhatsApp: requirement.visibleToClient,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Erreur');
      }

      onDocumentsUpdated?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, [orderId, currentStatus, requirement, supabase.storage, onDocumentsUpdated]);

  const handleUrlSubmit = useCallback(async () => {
    if (!urlInput.trim()) return;

    setUploading(true);
    setError(null);

    try {
      const response = await authFetch('/api/admin/orders/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId,
          documents: [{
            name: 'Lien de suivi',
            url: urlInput.trim(),
            type: 'url',
            size: 0,
          }],
          requirementId: requirement.id,
          status: currentStatus,
          sendNotification: requirement.visibleToClient,
          sendWhatsApp: requirement.visibleToClient,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Erreur');
      }

      setUrlInput('');
      setShowUrlInput(false);
      onDocumentsUpdated?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setUploading(false);
    }
  }, [orderId, currentStatus, requirement, urlInput, onDocumentsUpdated]);

  const getIcon = () => {
    switch (requirement.type) {
      case 'image':
        return <ImageIcon className="w-4 h-4" />;
      case 'url':
        return <Link2 className="w-4 h-4" />;
      default:
        return <FileText className="w-4 h-4" />;
    }
  };

  return (
    <div className="border border-[var(--card-border)] rounded-lg p-3 bg-[var(--surface)]/50">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-start gap-2">
          <div className={`p-1.5 rounded ${isComplete ? 'bg-jewel/20 text-jewel' : 'bg-nobel/20 text-nobel'}`}>
            {isComplete ? <CheckCircle className="w-4 h-4" /> : getIcon()}
          </div>
          <div>
            <p className="text-sm font-medium text-[var(--text-primary)]">
              {requirement.label}
              {!requirement.visibleToClient && (
                <span className="ml-2 text-xs px-1.5 py-0.5 bg-nobel/20 text-nobel rounded">
                  Admin only
                </span>
              )}
              {requirement.autoGenerated && (
                <span className="ml-2 text-xs px-1.5 py-0.5 bg-royal-blue/20 text-royal-blue rounded">
                  Auto
                </span>
              )}
            </p>
            <p className="text-xs text-[var(--text-muted)]">{requirement.description}</p>
          </div>
        </div>

        {isComplete && (
          <span className="text-xs text-jewel flex items-center gap-1">
            <CheckCircle className="w-3 h-3" />
            {uploadedDocs.length}
          </span>
        )}
      </div>

      {/* Uploaded documents */}
      {uploadedDocs.length > 0 && (
        <div className="mt-3 space-y-2">
          {uploadedDocs.map((doc) => (
            <DocumentRow
              key={doc.id}
              document={doc}
              orderId={orderId}
              onDelete={isAdmin ? onDocumentsUpdated : undefined}
              compact
            />
          ))}
        </div>
      )}

      {/* Upload controls */}
      {(!isComplete || requirement.multiple) && !requirement.autoGenerated && (
        <div className="mt-3 flex flex-wrap gap-2">
          {requirement.type === 'url' ? (
            showUrlInput ? (
              <div className="flex items-center gap-2 w-full">
                <input
                  type="url"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  placeholder="https://..."
                  className="flex-1 px-3 py-1.5 text-sm bg-[var(--card-bg)] border border-[var(--card-border)] rounded focus:border-mandarin focus:outline-none text-[var(--text-primary)]"
                />
                <Button
                  size="sm"
                  onClick={handleUrlSubmit}
                  disabled={uploading || !urlInput.trim()}
                >
                  {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Ajouter'}
                </Button>
                <button
                  onClick={() => {
                    setShowUrlInput(false);
                    setUrlInput('');
                  }}
                  className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowUrlInput(true)}
                className="flex items-center gap-2 px-3 py-1.5 text-sm border border-dashed border-[var(--card-border)] rounded hover:border-mandarin hover:text-mandarin transition-colors text-[var(--text-muted)]"
              >
                <Link2 className="w-4 h-4" />
                Ajouter un lien
              </button>
            )
          ) : (
            <label className="flex items-center gap-2 px-3 py-1.5 text-sm border border-dashed border-[var(--card-border)] rounded hover:border-mandarin hover:text-mandarin transition-colors text-[var(--text-muted)] cursor-pointer">
              <input
                ref={fileInputRef}
                type="file"
                accept={requirement.type === 'image' ? 'image/*' : '.pdf,.doc,.docx,.jpg,.jpeg,.png'}
                multiple={requirement.multiple}
                onChange={handleFileSelect}
                disabled={uploading}
                className="hidden"
              />
              {uploading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Upload className="w-4 h-4" />
              )}
              {uploading ? 'Upload...' : 'Uploader'}
            </label>
          )}
        </div>
      )}

      {/* Error */}
      {error && (
        <p className="mt-2 text-xs text-red-500 flex items-center gap-1">
          <AlertTriangle className="w-3 h-3" />
          {error}
        </p>
      )}
    </div>
  );
}

interface DocumentRowProps {
  document: UploadedStatusDocument;
  orderId: string;
  onDelete?: () => void;
  compact?: boolean;
}

function DocumentRow({ document, orderId, onDelete, compact = false }: DocumentRowProps) {
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!confirm('Supprimer ce document ?')) return;

    setDeleting(true);
    try {
      const response = await fetch(
        `/api/admin/orders/documents?orderId=${orderId}&documentId=${document.id}`,
        { method: 'DELETE' }
      );

      if (response.ok) {
        onDelete?.();
      }
    } catch (err) {
      console.error('Delete error:', err);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className={`flex items-center justify-between gap-2 ${compact ? 'p-2' : 'p-3'} bg-[var(--card-bg)] rounded text-sm`}>
      <div className="flex items-center gap-2 min-w-0">
        {document.type === 'url' ? (
          <Link2 className="w-4 h-4 text-mandarin flex-shrink-0" />
        ) : document.type?.startsWith('image') ? (
          <ImageIcon className="w-4 h-4 text-mandarin flex-shrink-0" />
        ) : (
          <FileText className="w-4 h-4 text-mandarin flex-shrink-0" />
        )}
        <span className="truncate text-[var(--text-primary)]">{document.name}</span>
        {!document.visible_to_client && (
          <span className="text-xs px-1 py-0.5 bg-nobel/20 text-nobel rounded flex-shrink-0">
            Admin
          </span>
        )}
        {!compact && document.uploaded_at && (
          <span className="text-xs text-[var(--text-muted)] flex-shrink-0">
            {format(new Date(document.uploaded_at), "dd/MM 'à' HH:mm", { locale: fr })}
          </span>
        )}
      </div>
      <div className="flex items-center gap-1 flex-shrink-0">
        {document.type === 'url' ? (
          <a
            href={document.url}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1 hover:bg-[var(--surface)] rounded text-[var(--text-muted)] hover:text-mandarin transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
          </a>
        ) : (
          <a
            href={document.url}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1 hover:bg-[var(--surface)] rounded text-[var(--text-muted)] hover:text-mandarin transition-colors"
          >
            <Download className="w-4 h-4" />
          </a>
        )}
        {onDelete && (
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="p-1 hover:bg-red-500/20 rounded text-[var(--text-muted)] hover:text-red-500 transition-colors disabled:opacity-50"
          >
            {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
          </button>
        )}
      </div>
    </div>
  );
}

// Badge pour afficher dans la liste des commandes
interface MissingDocsBadgeProps {
  status: string;
  uploadedDocuments: UploadedStatusDocument[];
}

export function MissingDocsBadge({ status, uploadedDocuments }: MissingDocsBadgeProps) {
  const missingDocs = getMissingDocuments(status, uploadedDocuments);

  if (missingDocs.length === 0) return null;

  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-yellow-500/20 text-yellow-500 rounded-full">
      <AlertTriangle className="w-3 h-3" />
      {missingDocs.length} doc(s)
    </span>
  );
}
