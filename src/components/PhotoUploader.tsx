// components/PhotoUploader.tsx
"use client";
import { useState, forwardRef, useImperativeHandle } from 'react';
import { Image, Loader2 } from 'lucide-react';

const PhotoUploader = forwardRef(function PhotoUploader(
  { onUploadComplete }: { onUploadComplete: (urls: string[]) => void },
  ref
) {
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploadedUrls, setUploadedUrls] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  useImperativeHandle(ref, () => ({
    async uploadFiles() {
      if (!files.length) return uploadedUrls;
      setUploading(true);
      setError(null);
      const urls: string[] = [];
      try {
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          setProgress(Math.round(((i + 1) / files.length) * 100));
          const formData = new FormData();
          formData.append('file', file);
          const res = await fetch('/api/upload', {
            method: 'POST',
            body: formData,
          });
          if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || res.statusText);
          }
          const { url } = await res.json();
          urls.push(url);
        }
        setUploadedUrls(urls);
        onUploadComplete(urls);
        setFiles([]);
      } catch (err: any) {
        setError(err.message || 'Upload failed');
      } finally {
        setUploading(false);
      }
      return urls;
    },
    getUploadedUrls() {
      return uploadedUrls;
    },
    hasPendingFiles() {
      return files.length > 0;
    }
  }));

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) setFiles(Array.from(e.target.files));
  };

  const handleUpload = async () => {
    if (ref && typeof ref !== 'function' && ref?.current?.uploadFiles) {
      await ref.current.uploadFiles();
    }
  };

  return (
    <div className="flex flex-col gap-2 mt-2 animate-fade-in">
      <label className="font-medium flex items-center gap-2">
        <span className="relative flex items-center justify-center">
          <Image className="h-5 w-5 text-primary animate-bounce-slow" />
          <span className="absolute -top-1 -right-1 w-2 h-2 bg-blue-400 rounded-full animate-ping" />
        </span>
        Attach Photos
      </label>
      <input
        type="file"
        accept="image/*"
        multiple
        onChange={handleFileChange}
        className="file:mr-2 file:px-3 file:py-1 file:bg-primary file:text-white transition-all duration-200 ease-in-out focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 hover:scale-105 active:scale-95 hover:shadow-lg rounded-lg"
      />
      <button
        type="button"
        onClick={handleUpload}
        disabled={uploading || !files.length}
        className="px-4 py-2 bg-blue-700 text-white font-semibold rounded-xl shadow-md transition-all duration-200 ease-in-out hover:scale-105 active:scale-95 hover:shadow-xl focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 disabled:opacity-50"
      >
        {uploading ? (
          <span className="flex items-center gap-2 animate-pulse">
            <Loader2 className="animate-spin" /> Uploading {progress}%
          </span>
        ) : (
          'Upload Selected'
        )}
      </button>
      {error && <div className="text-red-500 text-sm animate-fade-in-fast">{error}</div>}
      <div className="flex flex-wrap gap-2 mt-2">
        {uploadedUrls.map((url) => (
          <img key={url} src={url} alt="" className="w-16 h-16 object-cover rounded border border-blue-300 shadow-md animate-fade-in" />
        ))}
      </div>
    </div>
  );
});

export default PhotoUploader;

// Tailwind custom animations (add to your global CSS if not present):
// .animate-fade-in { animation: fadeIn 0.6s ease; }
// .animate-fade-in-fast { animation: fadeIn 0.3s ease; }
// .animate-bounce-slow { animation: bounce 2s infinite; }
// @keyframes fadeIn { from { opacity: 0; transform: translateY(10px);} to { opacity: 1; transform: none; } }
// @keyframes bounce { 0%, 100% { transform: translateY(0);} 50% { transform: translateY(-6px);} }
