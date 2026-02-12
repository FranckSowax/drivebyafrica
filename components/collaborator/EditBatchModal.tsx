'use client';

import { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Upload, X, Star } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useCollaboratorLocale } from '@/components/collaborator/CollaboratorLocaleProvider';
import type { VehicleBatch } from '@/types/vehicle-batch';

interface EditBatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  batch: VehicleBatch | null;
  /** API endpoint to use for the PUT request */
  apiEndpoint?: string;
}

export function EditBatchModal({ isOpen, onClose, onSuccess, batch, apiEndpoint = '/api/collaborator/batches' }: EditBatchModalProps) {
  const { t } = useCollaboratorLocale();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [uploadingImages, setUploadingImages] = useState(false);

  // Form state
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [sourceCountry, setSourceCountry] = useState<'china' | 'korea' | 'dubai'>('china');
  const [pricePerUnit, setPricePerUnit] = useState('');
  const [totalQuantity, setTotalQuantity] = useState('');
  const [minOrderQuantity, setMinOrderQuantity] = useState('');
  const [mileage, setMileage] = useState('');
  const [fuelType, setFuelType] = useState('');
  const [transmission, setTransmission] = useState('');
  const [driveType, setDriveType] = useState('');
  const [engineSize, setEngineSize] = useState('');
  const [bodyType, setBodyType] = useState('');
  const [color, setColor] = useState('');
  const [condition, setCondition] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [collaboratorNotes, setCollaboratorNotes] = useState('');

  // Populate form when batch changes
  useEffect(() => {
    if (batch) {
      setMake(batch.make || '');
      setModel(batch.model || '');
      setYear(batch.year?.toString() || '');
      setTitle(batch.title || '');
      setDescription(batch.description || '');
      setSourceCountry(batch.source_country || 'china');
      setPricePerUnit(batch.price_per_unit_usd?.toString() || '');
      setTotalQuantity(batch.total_quantity?.toString() || '');
      setMinOrderQuantity(batch.minimum_order_quantity?.toString() || '');
      setMileage(batch.mileage?.toString() || '');
      setFuelType(batch.fuel_type || '');
      setTransmission(batch.transmission || '');
      setDriveType(batch.drive_type || '');
      setEngineSize(batch.engine_size || '');
      setBodyType(batch.body_type || '');
      setColor(batch.color || '');
      setCondition(batch.condition || '');
      setImages(batch.images || []);
      setCollaboratorNotes(batch.collaborator_notes || '');
      setError('');
    }
  }, [batch]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadingImages(true);
    setError('');

    try {
      const supabase = createClient();
      const uploadedUrls: string[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
        const filePath = `batch-images/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('batch-images')
          .upload(filePath, file);

        if (uploadError) {
          throw uploadError;
        }

        const { data: { publicUrl } } = supabase.storage
          .from('batch-images')
          .getPublicUrl(filePath);

        uploadedUrls.push(publicUrl);
      }

      setImages([...images, ...uploadedUrls]);
    } catch (err) {
      console.error('Error uploading images:', err);
      setError('Failed to upload images');
    } finally {
      setUploadingImages(false);
    }
  };

  const removeImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
  };

  const setAsThumbnail = (index: number) => {
    if (index === 0) return;
    const newImages = [...images];
    const [selectedImage] = newImages.splice(index, 1);
    newImages.unshift(selectedImage);
    setImages(newImages);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!batch) return;

    setLoading(true);
    setError('');

    const qty = parseInt(totalQuantity);
    const minQty = parseInt(minOrderQuantity);

    if (qty < minQty) {
      setError('Total quantity must be greater than or equal to minimum order quantity');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(apiEndpoint, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          batchId: batch.id,
          make,
          model,
          year: parseInt(year),
          title,
          description: description || undefined,
          source_country: sourceCountry,
          price_per_unit_usd: parseFloat(pricePerUnit),
          total_quantity: qty,
          minimum_order_quantity: minQty,
          mileage: mileage ? parseInt(mileage) : undefined,
          fuel_type: fuelType || undefined,
          transmission: transmission || undefined,
          drive_type: driveType || undefined,
          engine_size: engineSize || undefined,
          body_type: bodyType || undefined,
          color: color || undefined,
          condition: condition || undefined,
          images,
          thumbnail_url: images[0] || undefined,
          collaborator_notes: collaboratorNotes || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.error_zh || 'Failed to update batch');
      }

      onSuccess?.();
      onClose();
    } catch (err) {
      console.error('Error updating batch:', err);
      setError(err instanceof Error ? err.message : 'Failed to update batch');
    } finally {
      setLoading(false);
    }
  };

  if (!batch) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('collaborator.editBatch') || 'Edit Batch'}
      description={`${batch.year} ${batch.make} ${batch.model}`}
      size="xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        {/* Basic Info */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">
              {t('collaborator.batchForm.make')} <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={make}
              onChange={(e) => setMake(e.target.value)}
              required
              className="w-full px-3 py-2 bg-white border border-nobel/20 rounded-lg text-gray-900 placeholder:text-nobel focus:outline-none focus:border-alto-orange"
              placeholder="Toyota, BMW, etc."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">
              {t('collaborator.batchForm.model')} <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              required
              className="w-full px-3 py-2 bg-white border border-nobel/20 rounded-lg text-gray-900 placeholder:text-nobel focus:outline-none focus:border-alto-orange"
              placeholder="Camry, X5, etc."
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">
              {t('collaborator.batchForm.year')} <span className="text-red-400">*</span>
            </label>
            <input
              type="number"
              value={year}
              onChange={(e) => setYear(e.target.value)}
              required
              min="1900"
              max={new Date().getFullYear() + 1}
              className="w-full px-3 py-2 bg-white border border-nobel/20 rounded-lg text-gray-900 placeholder:text-nobel focus:outline-none focus:border-alto-orange"
              placeholder="2023"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">
              {t('collaborator.batchForm.sourceCountry')} <span className="text-red-400">*</span>
            </label>
            <select
              value={sourceCountry}
              onChange={(e) => setSourceCountry(e.target.value as 'china' | 'korea' | 'dubai')}
              required
              className="w-full px-3 py-2 bg-white border border-nobel/20 rounded-lg text-gray-900 placeholder:text-nobel focus:outline-none focus:border-alto-orange"
            >
              <option value="china">China</option>
              <option value="korea">Korea</option>
              <option value="dubai">Dubai</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-900 mb-1">
            {t('collaborator.batchForm.title')} <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className="w-full px-3 py-2 bg-white border border-nobel/20 rounded-lg text-gray-900 placeholder:text-nobel focus:outline-none focus:border-alto-orange"
            placeholder="2023 Toyota Camry - Wholesale Lot"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-900 mb-1">
            {t('collaborator.batchForm.description')}
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 bg-white border border-nobel/20 rounded-lg text-gray-900 placeholder:text-nobel focus:outline-none focus:border-alto-orange resize-none"
            placeholder="Batch description..."
          />
        </div>

        {/* Batch Specific */}
        <div className="p-4 bg-nobel/10 rounded-lg border border-nobel/20">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">{t('collaborator.batchForm.batchInfo')}</h3>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">
                {t('collaborator.batchForm.pricePerUnit')} <span className="text-red-400">*</span>
              </label>
              <input
                type="number"
                value={pricePerUnit}
                onChange={(e) => setPricePerUnit(e.target.value)}
                required
                min="0"
                step="0.01"
                className="w-full px-3 py-2 bg-white border border-nobel/20 rounded-lg text-gray-900 placeholder:text-nobel focus:outline-none focus:border-alto-orange"
                placeholder="15000"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">
                {t('collaborator.batchForm.totalQuantity')} <span className="text-red-400">*</span>
              </label>
              <input
                type="number"
                value={totalQuantity}
                onChange={(e) => setTotalQuantity(e.target.value)}
                required
                min="1"
                className="w-full px-3 py-2 bg-white border border-nobel/20 rounded-lg text-gray-900 placeholder:text-nobel focus:outline-none focus:border-alto-orange"
                placeholder="50"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">
                {t('collaborator.batchForm.minOrderQuantity')} <span className="text-red-400">*</span>
              </label>
              <input
                type="number"
                value={minOrderQuantity}
                onChange={(e) => setMinOrderQuantity(e.target.value)}
                required
                min="1"
                className="w-full px-3 py-2 bg-white border border-nobel/20 rounded-lg text-gray-900 placeholder:text-nobel focus:outline-none focus:border-alto-orange"
                placeholder="5"
              />
            </div>
          </div>

          {totalQuantity && minOrderQuantity && (
            <p className="mt-2 text-xs text-gray-600">
              Total value: ${(parseFloat(pricePerUnit || '0') * parseInt(totalQuantity)).toLocaleString()} USD
            </p>
          )}
        </div>

        {/* Vehicle Details */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">
              {t('collaborator.batchForm.mileage')}
            </label>
            <input
              type="number"
              value={mileage}
              onChange={(e) => setMileage(e.target.value)}
              min="0"
              className="w-full px-3 py-2 bg-white border border-nobel/20 rounded-lg text-gray-900 placeholder:text-nobel focus:outline-none focus:border-alto-orange"
              placeholder="50000"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">
              {t('collaborator.batchForm.fuelType')}
            </label>
            <select
              value={fuelType}
              onChange={(e) => setFuelType(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-nobel/20 rounded-lg text-gray-900 placeholder:text-nobel focus:outline-none focus:border-alto-orange"
            >
              <option value="">Select...</option>
              <option value="Gasoline">Gasoline</option>
              <option value="Diesel">Diesel</option>
              <option value="Electric">Electric</option>
              <option value="Hybrid">Hybrid</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">
              {t('collaborator.batchForm.transmission')}
            </label>
            <select
              value={transmission}
              onChange={(e) => setTransmission(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-nobel/20 rounded-lg text-gray-900 placeholder:text-nobel focus:outline-none focus:border-alto-orange"
            >
              <option value="">Select...</option>
              <option value="Automatic">Automatic</option>
              <option value="Manual">Manual</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">
              {t('collaborator.batchForm.driveType')}
            </label>
            <select
              value={driveType}
              onChange={(e) => setDriveType(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-nobel/20 rounded-lg text-gray-900 placeholder:text-nobel focus:outline-none focus:border-alto-orange"
            >
              <option value="">Select...</option>
              <option value="FWD">FWD</option>
              <option value="RWD">RWD</option>
              <option value="AWD">AWD</option>
              <option value="4WD">4WD</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">
              {t('collaborator.batchForm.engineSize')}
            </label>
            <input
              type="text"
              value={engineSize}
              onChange={(e) => setEngineSize(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-nobel/20 rounded-lg text-gray-900 placeholder:text-nobel focus:outline-none focus:border-alto-orange"
              placeholder="2000cc"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">
              {t('collaborator.batchForm.bodyType')}
            </label>
            <input
              type="text"
              value={bodyType}
              onChange={(e) => setBodyType(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-nobel/20 rounded-lg text-gray-900 placeholder:text-nobel focus:outline-none focus:border-alto-orange"
              placeholder="Sedan, SUV, etc."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">
              {t('collaborator.batchForm.color')}
            </label>
            <input
              type="text"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-nobel/20 rounded-lg text-gray-900 placeholder:text-nobel focus:outline-none focus:border-alto-orange"
              placeholder="Black, White, etc."
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-900 mb-1">
            {t('collaborator.batchForm.condition')}
          </label>
          <select
            value={condition}
            onChange={(e) => setCondition(e.target.value)}
            className="w-full px-3 py-2 bg-white border border-nobel/20 rounded-lg text-gray-900 placeholder:text-nobel focus:outline-none focus:border-alto-orange"
          >
            <option value="">Select...</option>
            <option value="New">New</option>
            <option value="Used">Used</option>
            <option value="Certified Pre-Owned">Certified Pre-Owned</option>
          </select>
        </div>

        {/* Images */}
        <div>
          <label className="block text-sm font-medium text-gray-900 mb-2">
            {t('imageUpload.vehicleImages')}
          </label>
          {images.length > 0 && (
            <p className="text-xs text-gray-600 mb-2">
              {t('imageUpload.thumbnailHelper')}
            </p>
          )}

          <div className="grid grid-cols-4 gap-4 mb-4">
            {images.map((url, index) => (
              <div key={index} className="relative group">
                <img
                  src={url}
                  alt={`Batch ${index + 1}`}
                  className={`w-full h-24 object-cover rounded-lg ${
                    index === 0 ? 'ring-2 ring-alto-orange' : ''
                  }`}
                />

                {index === 0 && (
                  <div className="absolute top-1 left-1 px-2 py-0.5 bg-alto-orange text-white text-xs font-semibold rounded flex items-center gap-1">
                    <Star className="w-3 h-3 fill-current" />
                    {t('imageUpload.main')}
                  </div>
                )}

                {index !== 0 && (
                  <button
                    type="button"
                    onClick={() => setAsThumbnail(index)}
                    className="absolute bottom-1 left-1 px-2 py-1 bg-surface/90 hover:bg-alto-orange text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1"
                    title={t('imageUpload.setAsMainTitle')}
                  >
                    <Star className="w-3 h-3" />
                    {t('imageUpload.setAsMain')}
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => removeImage(index)}
                  className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>

          <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-nobel/20 rounded-lg cursor-pointer hover:border-alto-orange/50 transition-colors">
            <div className="flex flex-col items-center justify-center pt-5 pb-6">
              {uploadingImages ? (
                <div className="text-sm text-gray-900">{t('imageUpload.uploading')}</div>
              ) : (
                <>
                  <Upload className="w-8 h-8 text-gray-600 mb-2" />
                  <p className="text-sm text-gray-900">
                    {t('imageUpload.clickToUpload')}
                  </p>
                </>
              )}
            </div>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handleImageUpload}
              className="hidden"
              disabled={uploadingImages}
            />
          </label>
        </div>

        {/* Collaborator Notes */}
        <div>
          <label className="block text-sm font-medium text-gray-900 mb-1">
            {t('collaborator.batchForm.collaboratorNotes')}
          </label>
          <textarea
            value={collaboratorNotes}
            onChange={(e) => setCollaboratorNotes(e.target.value)}
            rows={2}
            className="w-full px-3 py-2 bg-white border border-nobel/20 rounded-lg text-gray-900 placeholder:text-nobel focus:outline-none focus:border-alto-orange resize-none"
            placeholder="Any additional notes for the admin..."
          />
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-4 border-t border-nobel/20 sticky bottom-0 bg-cod-gray">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="flex-1 px-4 py-2 bg-surface border border-nobel/20 text-white rounded-lg hover:bg-surface-hover transition-colors disabled:opacity-50"
          >
            {t('common.cancel')}
          </button>
          <button
            type="submit"
            disabled={loading || uploadingImages}
            className="flex-1 px-4 py-2 bg-alto-orange text-gray-900 font-semibold rounded-lg hover:bg-alto-orange/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
