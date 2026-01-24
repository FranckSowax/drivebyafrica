'use client';

import { useState, useCallback } from 'react';
import {
  Upload,
  FileText,
  Image as ImageIcon,
  Link2,
  AlertTriangle,
  Check,
  X,
  Loader2,
  ExternalLink,
  Download,
  Trash2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  getStatusDocumentConfig,
  getMissingDocuments,
  getDocumentsForStatus,
  type DocumentRequirement,
  type UploadedStatusDocument,
} from '@/lib/order-documents-config';

interface StatusDocumentUploaderProps {
  orderId: string;
  currentStatus: string;
  uploadedDocuments: UploadedStatusDocument[];
  onUpload: (file: File, requirementId: string, status: string) => Promise<void>;
  onAddUrl: (url: string, requirementId: string, status: string) => Promise<void>;
  onDelete?: (documentId: string) => Promise<void>;
  locale?: 'en' | 'zh';
  isAdmin?: boolean;
  className?: string;
}

export function StatusDocumentUploader({
  orderId,
  currentStatus,
  uploadedDocuments,
  onUpload,
  onAddUrl,
  onDelete,
  locale = 'en',
  isAdmin = false,
  className,
}: StatusDocumentUploaderProps) {
  const config = getStatusDocumentConfig(currentStatus);
  const missingDocs = getMissingDocuments(currentStatus, uploadedDocuments);
  const statusDocs = getDocumentsForStatus(currentStatus, uploadedDocuments);

  if (!config || config.requiredDocuments.length === 0) {
    return null;
  }

  const hasMissingDocs = missingDocs.length > 0;
  const t = locale === 'zh' ? zhTranslations : enTranslations;

  return (
    <div className={cn('space-y-4', className)}>
      {/* Warning banner for missing documents */}
      {hasMissingDocs && (
        <div className="flex items-start gap-3 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
          <AlertTriangle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-yellow-500">
              {t.missingDocuments}
            </p>
            <p className="text-xs text-yellow-500/80 mt-1">
              {missingDocs.map(d => locale === 'zh' ? d.labelZh : d.label).join(', ')}
            </p>
          </div>
        </div>
      )}

      {/* Document requirements */}
      <div className="space-y-3">
        {config.requiredDocuments.map((req) => (
          <DocumentRequirementRow
            key={req.id}
            requirement={req}
            uploadedDocs={statusDocs.filter(d => d.requirement_id === req.id)}
            onUpload={(file) => onUpload(file, req.id, currentStatus)}
            onAddUrl={(url) => onAddUrl(url, req.id, currentStatus)}
            onDelete={onDelete}
            locale={locale}
            isAdmin={isAdmin}
          />
        ))}
      </div>
    </div>
  );
}

interface DocumentRequirementRowProps {
  requirement: DocumentRequirement;
  uploadedDocs: UploadedStatusDocument[];
  onUpload: (file: File) => Promise<void>;
  onAddUrl: (url: string) => Promise<void>;
  onDelete?: (documentId: string) => Promise<void>;
  locale: 'en' | 'zh';
  isAdmin: boolean;
}

function DocumentRequirementRow({
  requirement,
  uploadedDocs,
  onUpload,
  onAddUrl,
  onDelete,
  locale,
  isAdmin,
}: DocumentRequirementRowProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const label = locale === 'zh' ? requirement.labelZh : requirement.label;
  const description = locale === 'zh' ? requirement.descriptionZh : requirement.description;
  const hasUploads = uploadedDocs.length > 0;
  const isComplete = hasUploads;
  const t = locale === 'zh' ? zhTranslations : enTranslations;

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setError(null);

    try {
      await onUpload(file);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.uploadError);
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  }, [onUpload, t.uploadError]);

  const handleUrlSubmit = useCallback(async () => {
    if (!urlInput.trim()) return;

    setIsUploading(true);
    setError(null);

    try {
      await onAddUrl(urlInput.trim());
      setUrlInput('');
      setShowUrlInput(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.urlError);
    } finally {
      setIsUploading(false);
    }
  }, [urlInput, onAddUrl, t.urlError]);

  const handleDelete = useCallback(async (docId: string) => {
    if (!onDelete) return;
    try {
      await onDelete(docId);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.deleteError);
    }
  }, [onDelete, t.deleteError]);

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
    <div className="border border-nobel/20 rounded-lg p-3 bg-surface/30">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-start gap-2">
          <div className={cn(
            'p-1.5 rounded',
            isComplete ? 'bg-jewel/20 text-jewel' : 'bg-nobel/20 text-nobel'
          )}>
            {isComplete ? <Check className="w-4 h-4" /> : getIcon()}
          </div>
          <div>
            <p className="text-sm font-medium text-[var(--text-primary)]">
              {label}
              {!requirement.visibleToClient && (
                <span className="ml-2 text-xs px-1.5 py-0.5 bg-nobel/20 text-nobel rounded">
                  {t.adminOnly}
                </span>
              )}
              {requirement.autoGenerated && (
                <span className="ml-2 text-xs px-1.5 py-0.5 bg-royal-blue/20 text-royal-blue rounded">
                  {t.autoGenerated}
                </span>
              )}
            </p>
            <p className="text-xs text-[var(--text-muted)]">{description}</p>
          </div>
        </div>

        {/* Status indicator */}
        {isComplete && (
          <span className="text-xs text-jewel flex items-center gap-1">
            <Check className="w-3 h-3" />
            {uploadedDocs.length} {t.uploaded}
          </span>
        )}
      </div>

      {/* Uploaded documents */}
      {uploadedDocs.length > 0 && (
        <div className="mt-3 space-y-2">
          {uploadedDocs.map((doc) => (
            <div
              key={doc.id}
              className="flex items-center justify-between gap-2 p-2 bg-surface rounded text-sm"
            >
              <div className="flex items-center gap-2 min-w-0">
                {doc.type === 'url' ? (
                  <Link2 className="w-4 h-4 text-mandarin flex-shrink-0" />
                ) : doc.type.startsWith('image') ? (
                  <ImageIcon className="w-4 h-4 text-mandarin flex-shrink-0" />
                ) : (
                  <FileText className="w-4 h-4 text-mandarin flex-shrink-0" />
                )}
                <span className="truncate text-[var(--text-primary)]">{doc.name}</span>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                {doc.type === 'url' ? (
                  <a
                    href={doc.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1 hover:bg-nobel/20 rounded text-nobel hover:text-mandarin transition-colors"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                ) : (
                  <a
                    href={doc.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1 hover:bg-nobel/20 rounded text-nobel hover:text-mandarin transition-colors"
                  >
                    <Download className="w-4 h-4" />
                  </a>
                )}
                {onDelete && isAdmin && (
                  <button
                    onClick={() => handleDelete(doc.id)}
                    className="p-1 hover:bg-red-500/20 rounded text-nobel hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
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
                  placeholder={t.enterUrl}
                  className="flex-1 px-3 py-1.5 text-sm bg-surface border border-nobel/30 rounded focus:border-mandarin focus:outline-none text-[var(--text-primary)]"
                />
                <button
                  onClick={handleUrlSubmit}
                  disabled={isUploading || !urlInput.trim()}
                  className="px-3 py-1.5 bg-mandarin text-white text-sm rounded hover:bg-mandarin/90 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : t.add}
                </button>
                <button
                  onClick={() => {
                    setShowUrlInput(false);
                    setUrlInput('');
                  }}
                  className="p-1.5 text-nobel hover:text-[var(--text-primary)] transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowUrlInput(true)}
                className="flex items-center gap-2 px-3 py-1.5 text-sm border border-dashed border-nobel/50 rounded hover:border-mandarin hover:text-mandarin transition-colors text-nobel"
              >
                <Link2 className="w-4 h-4" />
                {t.addUrl}
              </button>
            )
          ) : (
            <label className="flex items-center gap-2 px-3 py-1.5 text-sm border border-dashed border-nobel/50 rounded hover:border-mandarin hover:text-mandarin transition-colors text-nobel cursor-pointer">
              <input
                type="file"
                accept={requirement.type === 'image' ? 'image/*' : '.pdf,.doc,.docx,.jpg,.jpeg,.png'}
                onChange={handleFileChange}
                disabled={isUploading}
                className="hidden"
              />
              {isUploading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Upload className="w-4 h-4" />
              )}
              {isUploading ? t.uploading : t.uploadFile}
            </label>
          )}
        </div>
      )}

      {/* Error message */}
      {error && (
        <p className="mt-2 text-xs text-red-500 flex items-center gap-1">
          <AlertTriangle className="w-3 h-3" />
          {error}
        </p>
      )}
    </div>
  );
}

// Composant pour afficher l'avertissement de documents manquants dans la liste des commandes
interface MissingDocumentsBadgeProps {
  status: string;
  uploadedDocuments: UploadedStatusDocument[];
  locale?: 'en' | 'zh';
}

export function MissingDocumentsBadge({
  status,
  uploadedDocuments,
  locale = 'en',
}: MissingDocumentsBadgeProps) {
  const missingDocs = getMissingDocuments(status, uploadedDocuments);

  if (missingDocs.length === 0) return null;

  const t = locale === 'zh' ? zhTranslations : enTranslations;

  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-yellow-500/20 text-yellow-500 rounded-full">
      <AlertTriangle className="w-3 h-3" />
      {missingDocs.length} {t.docsMissing}
    </span>
  );
}

// Translations
const enTranslations = {
  missingDocuments: 'Documents required for this status',
  adminOnly: 'Admin only',
  autoGenerated: 'Auto-generated',
  uploaded: 'file(s)',
  enterUrl: 'Enter URL...',
  add: 'Add',
  addUrl: 'Add URL',
  uploadFile: 'Upload file',
  uploading: 'Uploading...',
  uploadError: 'Upload failed',
  urlError: 'Failed to add URL',
  deleteError: 'Failed to delete',
  docsMissing: 'doc(s) missing',
};

const zhTranslations = {
  missingDocuments: '此状态需要以下文件',
  adminOnly: '仅管理员',
  autoGenerated: '自动生成',
  uploaded: '个文件',
  enterUrl: '输入链接...',
  add: '添加',
  addUrl: '添加链接',
  uploadFile: '上传文件',
  uploading: '上传中...',
  uploadError: '上传失败',
  urlError: '添加链接失败',
  deleteError: '删除失败',
  docsMissing: '个文件缺失',
};
