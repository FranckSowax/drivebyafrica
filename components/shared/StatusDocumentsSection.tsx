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
import { zhCN } from 'date-fns/locale';
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
  locale?: 'en' | 'zh' | 'fr';
}

export function StatusDocumentsSection({
  orderId,
  orderNumber,
  currentStatus,
  uploadedDocuments,
  onDocumentsUpdated,
  isAdmin = true,
  locale = 'fr',
}: StatusDocumentsSectionProps) {
  const config = getStatusDocumentConfig(currentStatus);
  const missingDocs = getMissingDocuments(currentStatus, uploadedDocuments);
  const statusDocs = uploadedDocuments.filter(d => d.status === currentStatus);

  // Also show documents from other statuses
  const otherDocs = uploadedDocuments.filter(d => d.status !== currentStatus);

  const hasMissingDocs = missingDocs.length > 0;

  const translations = {
    fr: {
      requiredDocs: 'Documents requis pour ce statut',
      missingDocs: 'Documents manquants pour',
      noDocs: 'Aucun document requis pour le statut',
      otherDocs: 'Autres documents',
    },
    en: {
      requiredDocs: 'Required documents for this status',
      missingDocs: 'Missing documents for',
      noDocs: 'No documents required for status',
      otherDocs: 'Other documents',
    },
    zh: {
      requiredDocs: '此状态所需文件',
      missingDocs: '缺少文件',
      noDocs: '此状态不需要文件',
      otherDocs: '其他文件',
    },
  };

  const t = translations[locale];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-[var(--text-primary)]">
          {t.requiredDocs}
        </h4>
      </div>

      {/* Warning for missing documents */}
      {config && config.requiredDocuments.length > 0 && hasMissingDocs && (
        <div className="flex items-start gap-3 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
          <AlertTriangle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-yellow-500">
              {t.missingDocs} &quot;{locale === 'zh' ? config.labelZh : config.label}&quot;
            </p>
            <p className="text-xs text-yellow-500/80 mt-1">
              {missingDocs.map(d => locale === 'zh' ? d.labelZh : d.label).join(', ')}
            </p>
          </div>
        </div>
      )}

      {/* No documents required */}
      {(!config || config.requiredDocuments.length === 0) && (
        <div className="text-sm text-[var(--text-muted)] p-3 bg-[var(--surface)] rounded-lg">
          {t.noDocs} &quot;{currentStatus}&quot;
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
              locale={locale}
            />
          ))}
        </div>
      )}

      {/* Other documents (from other statuses) */}
      {otherDocs.length > 0 && (
        <div className="mt-6 pt-4 border-t border-[var(--card-border)]">
          <h4 className="text-sm font-medium text-[var(--text-muted)] mb-3">
            {t.otherDocs} ({otherDocs.length})
          </h4>
          <div className="space-y-2">
            {otherDocs.map((doc) => (
              <DocumentRow
                key={doc.id}
                document={doc}
                orderId={orderId}
                onDelete={isAdmin ? onDocumentsUpdated : undefined}
                isAdmin={isAdmin}
                locale={locale}
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
  locale: 'en' | 'zh' | 'fr';
}

function DocumentRequirementCard({
  requirement,
  orderId,
  currentStatus,
  uploadedDocs,
  onDocumentsUpdated,
  isAdmin,
  locale,
}: DocumentRequirementCardProps) {
  const [uploading, setUploading] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  const isComplete = uploadedDocs.length > 0;

  // Determine API endpoint based on isAdmin
  const apiEndpoint = isAdmin ? '/api/admin/orders/documents' : '/api/collaborator/orders/documents';

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
          throw new Error(`Error: ${uploadError.message}`);
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
      const response = await fetch(apiEndpoint, {
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
        throw new Error(data.error || 'Error');
      }

      onDocumentsUpdated?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, [orderId, currentStatus, requirement, supabase.storage, onDocumentsUpdated, apiEndpoint]);

  const handleUrlSubmit = useCallback(async () => {
    if (!urlInput.trim()) return;

    setUploading(true);
    setError(null);

    try {
      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId,
          documents: [{
            name: locale === 'zh' ? '跟踪链接' : locale === 'en' ? 'Tracking link' : 'Lien de suivi',
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
        throw new Error(data.error || 'Error');
      }

      setUrlInput('');
      setShowUrlInput(false);
      onDocumentsUpdated?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
    } finally {
      setUploading(false);
    }
  }, [orderId, currentStatus, requirement, urlInput, onDocumentsUpdated, apiEndpoint, locale]);

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

  const translations = {
    fr: { adminOnly: 'Admin only', auto: 'Auto', addLink: 'Ajouter un lien', upload: 'Uploader', uploading: 'Upload...', add: 'Ajouter' },
    en: { adminOnly: 'Admin only', auto: 'Auto', addLink: 'Add link', upload: 'Upload', uploading: 'Uploading...', add: 'Add' },
    zh: { adminOnly: '仅管理员', auto: '自动', addLink: '添加链接', upload: '上传', uploading: '上传中...', add: '添加' },
  };

  const t = translations[locale];

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
              {locale === 'zh' ? requirement.labelZh : requirement.label}
              {!requirement.visibleToClient && (
                <span className="ml-2 text-xs px-1.5 py-0.5 bg-nobel/20 text-nobel rounded">
                  {t.adminOnly}
                </span>
              )}
              {requirement.autoGenerated && (
                <span className="ml-2 text-xs px-1.5 py-0.5 bg-royal-blue/20 text-royal-blue rounded">
                  {t.auto}
                </span>
              )}
            </p>
            <p className="text-xs text-[var(--text-muted)]">
              {locale === 'zh' ? requirement.descriptionZh : requirement.description}
            </p>
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
              isAdmin={isAdmin}
              locale={locale}
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
                  {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : t.add}
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
                {t.addLink}
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
              {uploading ? t.uploading : t.upload}
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
  isAdmin: boolean;
  locale: 'en' | 'zh' | 'fr';
  compact?: boolean;
}

function DocumentRow({ document, orderId, onDelete, isAdmin, locale, compact = false }: DocumentRowProps) {
  const [deleting, setDeleting] = useState(false);

  // Determine API endpoint based on isAdmin
  const apiEndpoint = isAdmin ? '/api/admin/orders/documents' : '/api/collaborator/orders/documents';

  const handleDelete = async () => {
    const confirmMsg = locale === 'zh' ? '删除此文件？' : locale === 'en' ? 'Delete this document?' : 'Supprimer ce document ?';
    if (!confirm(confirmMsg)) return;

    setDeleting(true);
    try {
      const response = await fetch(
        `${apiEndpoint}?orderId=${orderId}&documentId=${document.id}`,
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

  const dateLocale = locale === 'zh' ? zhCN : fr;

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
            {format(new Date(document.uploaded_at), locale === 'zh' ? 'MM/dd HH:mm' : "dd/MM 'à' HH:mm", { locale: dateLocale })}
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
  locale?: 'en' | 'zh' | 'fr';
}

export function MissingDocsBadge({ status, uploadedDocuments, locale = 'fr' }: MissingDocsBadgeProps) {
  const missingDocs = getMissingDocuments(status, uploadedDocuments);

  if (missingDocs.length === 0) return null;

  const label = locale === 'zh' ? '份文件' : locale === 'en' ? 'doc(s)' : 'doc(s)';

  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-yellow-500/20 text-yellow-500 rounded-full">
      <AlertTriangle className="w-3 h-3" />
      {missingDocs.length} {label}
    </span>
  );
}
