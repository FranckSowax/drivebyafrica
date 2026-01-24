'use client';

import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Upload, X, Plus } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface AddVehicleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function AddVehicleModal({ isOpen, onClose, onSuccess }: AddVehicleModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [uploadingImages, setUploadingImages] = useState(false);

  // Form state
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [mileage, setMileage] = useState('');
  const [fuelType, setFuelType] = useState('');
  const [transmission, setTransmission] = useState('');
  const [driveType, setDriveType] = useState('');
  const [engineSize, setEngineSize] = useState('');
  const [bodyType, setBodyType] = useState('');
  const [color, setColor] = useState('');
  const [condition, setCondition] = useState('');
  const [images, setImages] = useState<string[]>([]);

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
        const filePath = `vehicle-images/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('vehicles')
          .upload(filePath, file);

        if (uploadError) {
          throw uploadError;
        }

        const { data: { publicUrl } } = supabase.storage
          .from('vehicles')
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/collaborator/vehicles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          make,
          model,
          year: parseInt(year),
          title,
          description,
          price: parseFloat(price),
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
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to add vehicle');
      }

      // Reset form
      setMake('');
      setModel('');
      setYear('');
      setTitle('');
      setDescription('');
      setPrice('');
      setMileage('');
      setFuelType('');
      setTransmission('');
      setDriveType('');
      setEngineSize('');
      setBodyType('');
      setColor('');
      setCondition('');
      setImages([]);

      onSuccess?.();
      onClose();
    } catch (err) {
      console.error('Error adding vehicle:', err);
      setError(err instanceof Error ? err.message : 'Failed to add vehicle');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Add Vehicle"
      description="Add a vehicle to your listings"
      size="xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        {/* Basic Info */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-nobel mb-1">
              Make <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={make}
              onChange={(e) => setMake(e.target.value)}
              required
              className="w-full px-3 py-2 bg-surface border border-nobel/20 rounded-lg text-white focus:outline-none focus:border-alto-orange"
              placeholder="Toyota, BMW, etc."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-nobel mb-1">
              Model <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              required
              className="w-full px-3 py-2 bg-surface border border-nobel/20 rounded-lg text-white focus:outline-none focus:border-alto-orange"
              placeholder="Camry, X5, etc."
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-nobel mb-1">
              Year <span className="text-red-400">*</span>
            </label>
            <input
              type="number"
              value={year}
              onChange={(e) => setYear(e.target.value)}
              required
              min="1900"
              max={new Date().getFullYear() + 1}
              className="w-full px-3 py-2 bg-surface border border-nobel/20 rounded-lg text-white focus:outline-none focus:border-alto-orange"
              placeholder="2023"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-nobel mb-1">
              Price (USD) <span className="text-red-400">*</span>
            </label>
            <input
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              required
              min="0"
              step="0.01"
              className="w-full px-3 py-2 bg-surface border border-nobel/20 rounded-lg text-white focus:outline-none focus:border-alto-orange"
              placeholder="15000"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-nobel mb-1">
            Title <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className="w-full px-3 py-2 bg-surface border border-nobel/20 rounded-lg text-white focus:outline-none focus:border-alto-orange"
            placeholder="2023 Toyota Camry - Low Mileage"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-nobel mb-1">
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 bg-surface border border-nobel/20 rounded-lg text-white focus:outline-none focus:border-alto-orange resize-none"
            placeholder="Vehicle description..."
          />
        </div>

        {/* Additional Details */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-nobel mb-1">
              Mileage (km)
            </label>
            <input
              type="number"
              value={mileage}
              onChange={(e) => setMileage(e.target.value)}
              min="0"
              className="w-full px-3 py-2 bg-surface border border-nobel/20 rounded-lg text-white focus:outline-none focus:border-alto-orange"
              placeholder="50000"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-nobel mb-1">
              Fuel Type
            </label>
            <select
              value={fuelType}
              onChange={(e) => setFuelType(e.target.value)}
              className="w-full px-3 py-2 bg-surface border border-nobel/20 rounded-lg text-white focus:outline-none focus:border-alto-orange"
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
            <label className="block text-sm font-medium text-nobel mb-1">
              Transmission
            </label>
            <select
              value={transmission}
              onChange={(e) => setTransmission(e.target.value)}
              className="w-full px-3 py-2 bg-surface border border-nobel/20 rounded-lg text-white focus:outline-none focus:border-alto-orange"
            >
              <option value="">Select...</option>
              <option value="Automatic">Automatic</option>
              <option value="Manual">Manual</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-nobel mb-1">
              Drive Type
            </label>
            <select
              value={driveType}
              onChange={(e) => setDriveType(e.target.value)}
              className="w-full px-3 py-2 bg-surface border border-nobel/20 rounded-lg text-white focus:outline-none focus:border-alto-orange"
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
            <label className="block text-sm font-medium text-nobel mb-1">
              Engine Size
            </label>
            <input
              type="text"
              value={engineSize}
              onChange={(e) => setEngineSize(e.target.value)}
              className="w-full px-3 py-2 bg-surface border border-nobel/20 rounded-lg text-white focus:outline-none focus:border-alto-orange"
              placeholder="2.0L"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-nobel mb-1">
              Body Type
            </label>
            <input
              type="text"
              value={bodyType}
              onChange={(e) => setBodyType(e.target.value)}
              className="w-full px-3 py-2 bg-surface border border-nobel/20 rounded-lg text-white focus:outline-none focus:border-alto-orange"
              placeholder="Sedan, SUV, etc."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-nobel mb-1">
              Color
            </label>
            <input
              type="text"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="w-full px-3 py-2 bg-surface border border-nobel/20 rounded-lg text-white focus:outline-none focus:border-alto-orange"
              placeholder="Black, White, etc."
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-nobel mb-1">
            Condition
          </label>
          <select
            value={condition}
            onChange={(e) => setCondition(e.target.value)}
            className="w-full px-3 py-2 bg-surface border border-nobel/20 rounded-lg text-white focus:outline-none focus:border-alto-orange"
          >
            <option value="">Select...</option>
            <option value="New">New</option>
            <option value="Used">Used</option>
            <option value="Certified Pre-Owned">Certified Pre-Owned</option>
          </select>
        </div>

        {/* Images */}
        <div>
          <label className="block text-sm font-medium text-nobel mb-2">
            Vehicle Images
          </label>

          <div className="grid grid-cols-4 gap-4 mb-4">
            {images.map((url, index) => (
              <div key={index} className="relative group">
                <img
                  src={url}
                  alt={`Vehicle ${index + 1}`}
                  className="w-full h-24 object-cover rounded-lg"
                />
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
                <div className="text-sm text-nobel">Uploading...</div>
              ) : (
                <>
                  <Upload className="w-8 h-8 text-nobel mb-2" />
                  <p className="text-sm text-nobel">
                    Click to upload images
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

        {/* Actions */}
        <div className="flex gap-3 pt-4 border-t border-nobel/20">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="flex-1 px-4 py-2 bg-surface border border-nobel/20 text-white rounded-lg hover:bg-surface-hover transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading || uploadingImages}
            className="flex-1 px-4 py-2 bg-alto-orange text-white rounded-lg hover:bg-alto-orange/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Adding...' : 'Add Vehicle'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
