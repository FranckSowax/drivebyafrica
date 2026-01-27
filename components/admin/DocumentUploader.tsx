'use client';

import { useState, useRef } from 'react';
import {
  Upload,
  FileText,
  X,
  Loader2,
  CheckCircle,
  AlertCircle,
  Download,
  Trash2,
  Send,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { createClient } from '@/lib/supabase/client';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { authFetch } from '@/lib/supabase/auth-helpers';

interface UploadedDocument {
  name: string;
  url: string;
  type: string;
  size: number;
  uploaded_at: string;
  uploaded_by?: string;
}

interface DocumentUploaderProps {
  orderId: string;
  orderNumber: string;
  existingDocuments?: UploadedDocument[];
  onDocumentsUpdated?: (documents: UploadedDocument[]) => void;
}

export function DocumentUploader({
  orderId,
  orderNumber,
  existingDocuments = [],
  onDocumentsUpdated,
}: DocumentUploaderProps) {
  const [documents, setDocuments] = useState<UploadedDocument[]>(existingDocuments);
  const [uploading, setUploading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [sendWhatsApp, setSendWhatsApp] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const pdfFiles = files.filter(f => f.type === 'application/pdf');

    if (pdfFiles.length !== files.length) {
      setError('Seuls les fichiers PDF sont acceptés');
      return;
    }

    setSelectedFiles(prev => [...prev, ...pdfFiles]);
    setError(null);

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeSelectedFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const uploadFiles = async () => {
    if (selectedFiles.length === 0) return;

    setUploading(true);
    setError(null);
    setSuccess(null);

    try {
      const uploadedDocs: { name: string; url: string; type: string; size: number }[] = [];

      for (const file of selectedFiles) {
        // Upload to Supabase Storage
        const fileName = `orders/${orderId}/${Date.now()}_${file.name}`;
        const { data, error: uploadError } = await supabase.storage
          .from('documents')
          .upload(fileName, file);

        if (uploadError) {
          throw new Error(`Erreur lors de l'upload de ${file.name}: ${uploadError.message}`);
        }

        // Get public URL
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

      // Update order with new documents
      const response = await authFetch('/api/admin/orders/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId,
          documents: uploadedDocs,
          sendNotification: true,
          sendWhatsApp: sendWhatsApp,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Erreur lors de la mise à jour');
      }

      const result = await response.json();

      // Update local state
      const now = new Date().toISOString();
      const newDocs = uploadedDocs.map(doc => ({
        ...doc,
        uploaded_at: now,
      }));

      setDocuments(prev => [...prev, ...newDocs]);
      setSelectedFiles([]);
      setSuccess(
        `${uploadedDocs.length} document(s) uploadé(s) avec succès. ` +
        `Notification envoyée${result.whatsappSent ? ' + WhatsApp' : ''}.`
      );

      if (onDocumentsUpdated) {
        onDocumentsUpdated([...documents, ...newDocs]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de l\'upload');
    } finally {
      setUploading(false);
    }
  };

  const deleteDocument = async (documentUrl: string) => {
    if (!confirm('Supprimer ce document ?')) return;

    try {
      const response = await fetch(
        `/api/admin/orders/documents?orderId=${orderId}&documentUrl=${encodeURIComponent(documentUrl)}`,
        { method: 'DELETE' }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Erreur lors de la suppression');
      }

      setDocuments(prev => prev.filter(d => d.url !== documentUrl));
      setSuccess('Document supprimé');

      if (onDocumentsUpdated) {
        onDocumentsUpdated(documents.filter(d => d.url !== documentUrl));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la suppression');
    }
  };

  const sendDocumentsNotification = async () => {
    if (documents.length === 0) {
      setError('Aucun document à envoyer');
      return;
    }

    setSending(true);
    setError(null);

    try {
      const response = await authFetch('/api/admin/orders/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId,
          documents: [], // Empty = just send notification
          sendNotification: true,
          sendWhatsApp: true,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Erreur lors de l\'envoi');
      }

      setSuccess('Notification envoyée au client');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de l\'envoi');
    } finally {
      setSending(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-[var(--text-primary)]">
          Documents ({documents.length})
        </h4>
        {documents.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={sendDocumentsNotification}
            disabled={sending}
            className="text-green-500 border-green-500/30 hover:bg-green-500/10"
          >
            {sending ? (
              <Loader2 className="w-4 h-4 animate-spin mr-1" />
            ) : (
              <Send className="w-4 h-4 mr-1" />
            )}
            Renvoyer notification
          </Button>
        )}
      </div>

      {/* Existing Documents */}
      {documents.length > 0 && (
        <div className="space-y-2">
          {documents.map((doc, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-3 bg-[var(--surface)] rounded-lg"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-500/10 rounded-lg">
                  <FileText className="w-5 h-5 text-red-500" />
                </div>
                <div>
                  <p className="text-sm font-medium text-[var(--text-primary)]">{doc.name}</p>
                  <p className="text-xs text-[var(--text-muted)]">
                    {doc.size ? formatFileSize(doc.size) : ''}
                    {doc.uploaded_at && ` - ${format(new Date(doc.uploaded_at), "dd/MM/yyyy 'à' HH:mm", { locale: fr })}`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <a
                  href={doc.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 text-[var(--text-muted)] hover:text-mandarin transition-colors"
                  title="Télécharger"
                >
                  <Download className="w-4 h-4" />
                </a>
                <button
                  onClick={() => deleteDocument(doc.url)}
                  className="p-2 text-[var(--text-muted)] hover:text-red-500 transition-colors"
                  title="Supprimer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload Zone */}
      <div
        onClick={() => fileInputRef.current?.click()}
        className="border-2 border-dashed border-[var(--card-border)] rounded-xl p-6 text-center cursor-pointer hover:border-mandarin/50 transition-colors"
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf"
          multiple
          onChange={handleFileSelect}
          className="hidden"
        />
        <Upload className="w-8 h-8 mx-auto text-[var(--text-muted)] mb-2" />
        <p className="text-sm text-[var(--text-primary)]">
          Cliquez ou glissez des fichiers PDF
        </p>
        <p className="text-xs text-[var(--text-muted)] mt-1">
          Documents de la commande (facture, BL, certificat...)
        </p>
      </div>

      {/* Selected Files */}
      {selectedFiles.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-[var(--text-primary)]">
            Fichiers sélectionnés ({selectedFiles.length})
          </p>
          {selectedFiles.map((file, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-2 bg-mandarin/10 rounded-lg"
            >
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-mandarin" />
                <span className="text-sm text-[var(--text-primary)]">{file.name}</span>
                <span className="text-xs text-[var(--text-muted)]">
                  ({formatFileSize(file.size)})
                </span>
              </div>
              <button
                onClick={() => removeSelectedFile(index)}
                className="p-1 text-[var(--text-muted)] hover:text-red-500 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}

          {/* Upload Options */}
          <div className="flex items-center gap-3 pt-2">
            <label className="flex items-center gap-2 text-sm text-[var(--text-muted)] cursor-pointer">
              <input
                type="checkbox"
                checked={sendWhatsApp}
                onChange={(e) => setSendWhatsApp(e.target.checked)}
                className="w-4 h-4 rounded border-[var(--card-border)] text-mandarin focus:ring-mandarin"
              />
              Envoyer WhatsApp au client
            </label>
          </div>

          <Button
            onClick={uploadFiles}
            disabled={uploading}
            className="w-full bg-mandarin hover:bg-mandarin/90"
          >
            {uploading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Upload en cours...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                Uploader {selectedFiles.length} document(s)
              </>
            )}
          </Button>
        </div>
      )}

      {/* Messages */}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
          <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
          <p className="text-sm text-red-500">{error}</p>
        </div>
      )}

      {success && (
        <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
          <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
          <p className="text-sm text-green-500">{success}</p>
        </div>
      )}
    </div>
  );
}
