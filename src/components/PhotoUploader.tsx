// components/PhotoUploader.tsx
"use client";
import { useState, forwardRef, useImperativeHandle } from 'react';
import type { RefObject } from 'react';
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
    const uploadRef = ref as RefObject<{ uploadFiles: () => Promise<string[]> }>;
    if (uploadRef && uploadRef.current && uploadRef.current.uploadFiles) {
      await uploadRef.current.uploadFiles();
    }
  };

  return (
    <div className="flex flex-col gap-2 mt-2">
      <label className="font-medium flex items-center gap-2">
        <span className="relative flex items-center justify-center">
          <Image className="h-5 w-5 text-core-bright" />
        </span>
        Attach Photos
      </label>
      <input
        type="file"
        accept="image/*"
        multiple
        onChange={handleFileChange}
        className="file:mr-2 file:px-3 file:py-1 file:bg-core-bright file:text-core-white file:rounded-lg border border-neutral-light dark:bg-gray-700 dark:text-gray-100 focus:ring-2 focus:ring-core-corporate focus:ring-offset-2"
      />
      <button
        type="button"
        onClick={handleUpload}
        disabled={uploading || !files.length}
        className="px-4 py-2 bg-core-bright dark:bg-blue-700 text-core-white font-semibold rounded-xl border border-core-bright dark:border-blue-700 focus:outline-none focus:ring-2 focus:ring-core-corporate focus:ring-offset-2 disabled:opacity-50"
      >
        {uploading ? (
          <span className="flex items-center gap-2">
            <Loader2 className="animate-spin text-core-white" /> Uploading {progress}%
          </span>
        ) : (
          'Upload Selected'
        )}
      </button>
      {error && <div className="text-destructive text-sm">{error}</div>}
      <div className="flex flex-wrap gap-2 mt-2">
        {uploadedUrls.map((url) => (
          <img key={url} src={url} alt="" className="w-16 h-16 object-cover rounded border border-neutral-light" />
        ))}
      </div>
    </div>
  );
});

export default PhotoUploader;
