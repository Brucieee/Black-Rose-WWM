
import React, { useState, useRef } from 'react';
import { Upload, X, Check, Loader2, Music } from 'lucide-react';
import { supabase } from '../services/supabase';

interface AudioUploadProps {
  onUploadComplete: (url: string, fileName: string) => void;
  folder?: string;
  className?: string;
}

export const AudioUpload: React.FC<AudioUploadProps> = ({ 
  onUploadComplete, 
  folder = 'audio', 
  className = '' 
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('audio/')) {
        setError("Please upload an audio file (MP3, WAV).");
        return;
    }

    // Reset state
    setError(null);
    setIsUploading(true);
    setFileName(file.name);

    try {
      // 1. Generate unique filename
      const fileExt = file.name.split('.').pop();
      const uniqueName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
      const filePath = `${folder}/${uniqueName}`;

      // 2. Upload to Supabase Storage
      const bucketName = 'black-rose-wwm'; 

      const { error: uploadError } = await supabase.storage
        .from(bucketName)
        .upload(filePath, file);

      if (uploadError) {
         throw uploadError;
      }

      // 3. Get Public URL
      const { data } = supabase.storage
        .from(bucketName)
        .getPublicUrl(filePath);

      if (!data.publicUrl) throw new Error("Failed to get public URL");

      onUploadComplete(data.publicUrl, file.name);
      setIsUploading(false);

    } catch (err: any) {
      console.error("Upload failed:", err);
      setError(err.message || "Upload failed");
      setIsUploading(false);
      setFileName(null);
    }
  };

  return (
    <div className={`w-full ${className}`}>
      <input 
        type="file" 
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="audio/*"
        className="hidden"
      />

      <div 
        onClick={() => !isUploading && fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center transition-all group ${
            isUploading ? 'cursor-default border-zinc-300 dark:border-zinc-700' : 'cursor-pointer border-zinc-300 dark:border-zinc-700 hover:border-rose-500 hover:bg-zinc-50 dark:hover:bg-zinc-800/50'
        }`}
      >
        {isUploading ? (
            <div className="flex flex-col items-center text-zinc-500">
                <Loader2 className="animate-spin mb-2" size={24} />
                <span className="text-xs font-medium">Uploading {fileName}...</span>
            </div>
        ) : fileName && !error ? (
            <div className="flex flex-col items-center text-green-600 dark:text-green-500">
                <div className="p-3 rounded-full bg-green-100 dark:bg-green-900/20 mb-3">
                    <Check size={24} />
                </div>
                <p className="text-sm font-medium text-center">{fileName}</p>
                <p className="text-xs mt-1">Click to replace</p>
            </div>
        ) : (
            <>
                <div className="bg-zinc-100 dark:bg-zinc-800 p-3 rounded-full mb-3 group-hover:bg-rose-100 dark:group-hover:bg-rose-900/20 transition-colors">
                    <Music className="text-zinc-500 dark:text-zinc-400 group-hover:text-rose-600 dark:group-hover:text-rose-500" size={24} />
                </div>
                <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Upload MP3</p>
                <p className="text-xs text-zinc-400 mt-1">Max 5MB</p>
            </>
        )}
      </div>

      {error && (
        <p className="text-xs text-red-500 mt-2 font-medium bg-red-50 dark:bg-red-900/10 p-2 rounded border border-red-100 dark:border-red-900/20">{error}</p>
      )}
    </div>
  );
};
