'use client';

import { useState, useRef } from 'react';
import { uploadBrandingImage, removeBrandingImage } from '@/app/lib/branding-actions';

interface Props {
  initialImageUrl: string | null;
}

export default function BrandingUpload({ initialImageUrl }: Props) {
  const [imageUrl, setImageUrl] = useState<string | null>(initialImageUrl);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setError('');
    setSuccess('');

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    // Validate file size (max 4MB raw)
    if (file.size > 4 * 1024 * 1024) {
      setError('Image file must be under 4MB');
      return;
    }

    // Validate dimensions
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    
    img.onload = async () => {
      URL.revokeObjectURL(objectUrl);

      if (img.width > 4000 || img.height > 4000) {
        setError('Image dimensions must not exceed 4000×4000 pixels');
        return;
      }

      // Convert to data URL
      const reader = new FileReader();
      reader.onloadend = async () => {
        const dataUrl = reader.result as string;
        setLoading(true);

        const result = await uploadBrandingImage(dataUrl);
        if (!result.ok) {
          setError(result.error);
        } else {
          setImageUrl(dataUrl);
          setSuccess('Branding image uploaded successfully');
          setTimeout(() => setSuccess(''), 5000);
        }
        setLoading(false);
      };
      reader.readAsDataURL(file);
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      setError('Failed to load image');
    };

    img.src = objectUrl;
  }

  async function handleRemove() {
    if (!confirm('Remove the branding image from the login page?')) return;

    setError('');
    setLoading(true);

    const result = await removeBrandingImage();
    if (!result.ok) {
      setError(result.error);
    } else {
      setImageUrl(null);
      setSuccess('Branding image removed');
      setTimeout(() => setSuccess(''), 5000);
    }
    setLoading(false);
  }

  return (
    <div className="rounded-lg bg-white dark:bg-gray-900 p-6 shadow">
      <h2 className="text-lg font-medium leading-6 text-gray-900 dark:text-gray-100">Branding</h2>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
        Upload a logo or branding image for the login page. Max 4000×4000 pixels.
      </p>

      {error && (
        <div className="mt-3 p-2 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded text-red-700 dark:text-red-300 text-sm">
          {error}
        </div>
      )}
      {success && (
        <div className="mt-3 p-2 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700 rounded text-green-700 dark:text-green-300 text-sm">
          {success}
        </div>
      )}

      <div className="mt-4">
        {imageUrl ? (
          <div className="space-y-3">
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-800/50">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Current branding image:</p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imageUrl}
                alt="Branding"
                className="max-h-48 w-auto object-contain rounded"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={loading}
                className="rounded-md bg-green-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-green-500 disabled:opacity-50"
              >
                {loading ? 'Uploading...' : 'Replace Image'}
              </button>
              <button
                onClick={handleRemove}
                disabled={loading}
                className="rounded-md border border-red-300 dark:border-red-600 px-4 py-2 text-sm font-medium text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50"
              >
                Remove
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center">
              <p className="text-gray-500 dark:text-gray-400 text-sm">
                No branding image set. Upload an image to display on the login page.
              </p>
            </div>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={loading}
              className="rounded-md bg-green-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-green-500 disabled:opacity-50"
            >
              {loading ? 'Uploading...' : 'Upload Image'}
            </button>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
        />
      </div>
    </div>
  );
}
