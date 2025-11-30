
import React, { useState, useRef, useEffect } from 'react';
import { Upload, X, Check, Loader2, Image as ImageIcon } from 'lucide-react';
import { supabase } from '../services/supabase';

interface ImageUploadProps {
  onUploadComplete: (url: string) => void;
  folder?: string;
  className?: string;
  initialUrl?: string;
}

export const ImageUpload: React.FC<ImageUploadProps> = ({ 
  onUploadComplete, 
  folder = 'uploads', 
  className = '', 
  initialUrl 
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (initialUrl) {
      setPreviewUrl(initialUrl);
    }
  }, [initialUrl]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset state
    setError(null);
    setIsUploading(true);

    // Create local preview
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);

    try {
      // 1. Generate unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
      const filePath = `${folder}/${fileName}`;

      // 2. Upload to Supabase Storage
      const bucketName = 'black-rose-wwm'; 

      const { error: uploadError } = await supabase.storage
        .from(bucketName)
        .upload(filePath, file);

      if (uploadError) {
         // Specific handling for RLS errors to guide the user
         if (uploadError.message.includes('row-level security') || uploadError.message.includes('new row violates')) {
             throw new Error("Supabase Bucket Policy blocked upload. Please enable 'INSERT' permission for 'anon' role in your Supabase Storage settings.");
         }
         throw uploadError;
      }

      // 3. Get Public URL
      const { data } = supabase.storage
        .from(bucketName)
        .getPublicUrl(filePath);

      if (!data.publicUrl) throw new Error("Failed to get public URL");

      onUploadComplete(data.publicUrl);
      setIsUploading(false);

    } catch (err: any) {
      console.error("Upload failed:", err);
      setError(err.message || "Upload failed");
      setIsUploading(false);
      setPreviewUrl(null); // Clear preview on error
    }
  };

  const clearImage = () => {
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    onUploadComplete(''); // Clear URL in parent
  };

  return (
    <div className={`w-full ${className}`}>
      <input 
        type="file" 
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        className="hidden"
      />

      {previewUrl ? (
        <div className="relative rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 aspect-video group">
          <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
          
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
            {isUploading ? (
               <div className="flex flex-col items-center text-white">
                  <Loader2 className="animate-spin mb-2" />
                  <span className="text-xs font-medium">Uploading...</span>
               </div>
            ) : (
                <button 
                    type="button"
                    onClick={clearImage}
                    className="bg-red-600 hover:bg-red-700 text-white p-2 rounded-full transition-colors"
                >
                    <X size={20} />
                </button>
            )}
          </div>

          {!isUploading && !error && (
              <div className="absolute top-2 right-2 bg-green-500 text-white p-1 rounded-full shadow-lg">
                  <Check size={14} />
              </div>
          )}
        </div>
      ) : (
        <div 
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-zinc-300 dark:border-zinc-700 rounded-lg p-6 flex flex-col items-center justify-center cursor-pointer hover:border-rose-500 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-all group"
        >
            <div className="bg-zinc-100 dark:bg-zinc-800 p-3 rounded-full mb-3 group-hover:bg-rose-100 dark:group-hover:bg-rose-900/20 transition-colors">
                <Upload className="text-zinc-500 dark:text-zinc-400 group-hover:text-rose-600 dark:group-hover:text-rose-500" size={24} />
            </div>
            <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Click to upload image</p>
            <p className="text-xs text-zinc-400 mt-1">JPG, PNG, WebP (Max 5MB)</p>
        </div>
      )}

      {error && (
        <p className="text-xs text-red-500 mt-2 font-medium bg-red-50 dark:bg-red-900/10 p-2 rounded border border-red-100 dark:border-red-900/20">{error}</p>
      )}
    </div>
  );
};
