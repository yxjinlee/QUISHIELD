import React, { useRef, useState, useEffect } from 'react';
import { Upload, Image as ImageIcon, X, Camera } from 'lucide-react';
import { ScanResult } from '../../types';
import CameraScanner from './CameraScanner';

interface ScannerProps {
  onScanStart: () => void;
  onScanComplete: (result: ScanResult) => void;
  onScanError: (error: string) => void;
  onCameraToggle?: (active: boolean) => void;
}

export default function Scanner({ onScanStart, onScanComplete, onScanError, onCameraToggle }: ScannerProps) {
  const [dragActive, setDragActive] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isTriggeredRef = useRef(false);

  useEffect(() => {
    onCameraToggle?.(showCamera);
  }, [showCamera, onCameraToggle]);

  const handleUrlAnalysis = async (url: string) => {
    if (isTriggeredRef.current) return;
    isTriggeredRef.current = true;

    onScanStart();
    try {
      const response = await fetch('/api/analyze-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });

      let data;
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        const text = await response.text();
        const status = response.status;
        console.error(`Non-JSON response (URL ${status}):`, text.substring(0, 500));
        const errorSnippet = text.substring(0, 150).replace(/<[^>]*>?/gm, '').trim();
        throw new Error(`[v1.6 Error ${status}] ${errorSnippet || 'Invalid format'}`);
      }

      if (response.ok) {
        onScanComplete(data);
      } else {
        isTriggeredRef.current = false;
        onScanError(data.error || 'Analysis failed. Please try again.');
      }
    } catch (err: any) {
      console.error('URL analysis error:', err);
      isTriggeredRef.current = false;
      onScanError(err.message || 'Network error. Please try again later.');
    }
  };

  const handleFile = async (file: File) => {
    if (isTriggeredRef.current) return;
    
    if (!file.type.startsWith('image/')) {
       onScanError('Please upload an image file (PNG, JPG, or WEBP).');
       return;
    }

    isTriggeredRef.current = true;
    setPreview(URL.createObjectURL(file));
    onScanStart();

    const formData = new FormData();
    formData.append('qrImage', file);

    try {
      const response = await fetch('/api/scan', {
        method: 'POST',
        body: formData,
      });

      let data;
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        const text = await response.text();
        const status = response.status;
        console.error(`Non-JSON response (File ${status}):`, text.substring(0, 500));
        const errorSnippet = text.substring(0, 150).replace(/<[^>]*>?/gm, '').trim();
        throw new Error(`[v1.6 Error ${status}] ${errorSnippet || 'Invalid format'}`);
      }

      if (response.ok) {
        onScanComplete(data);
      } else {
        isTriggeredRef.current = false;
        onScanError(data.error || 'Failed to scan image. Ensure the image contains a clear QR code.');
      }
    } catch (err: any) {
      console.error('Scan capture error:', err);
      isTriggeredRef.current = false;
      onScanError(err.message || 'Network error. Please try again later.');
    }
  };

  const onDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div 
        className={`relative border-2 border-dashed rounded-[2.5rem] p-12 transition-all group overflow-hidden shadow-2xl shadow-gray-200/40 dark:shadow-none
          ${dragActive ? 'border-[#F27D26] bg-[#F27D26]/5' : 'border-gray-200 dark:border-white/20 bg-white dark:bg-[#0D0D0D] hover:border-[#F27D26]/40 hover:dark:border-[#F27D26]/50'}
        `}
        onDragEnter={onDrag}
        onDragLeave={onDrag}
        onDragOver={onDrag}
        onDrop={onDrop}
      >
        <div className={`absolute inset-0 pointer-events-none transition-opacity ${dragActive ? 'opacity-20' : 'opacity-0 group-hover:opacity-10'}`}>
           <div className="absolute top-0 left-0 w-12 h-12 border-t-2 border-l-2 border-[#F27D26]"></div>
           <div className="absolute top-0 right-0 w-12 h-12 border-t-2 border-r-2 border-[#F27D26]"></div>
           <div className="absolute bottom-0 left-0 w-12 h-12 border-b-2 border-l-2 border-[#F27D26]"></div>
           <div className="absolute bottom-0 right-0 w-12 h-12 border-b-2 border-r-2 border-[#F27D26]"></div>
        </div>

        <div className="flex flex-col items-center relative z-10">
          <div className="w-24 h-24 rounded-3xl bg-gray-50/50 dark:bg-[#121212] border border-gray-100 dark:border-white/10 flex items-center justify-center mb-8 group-hover:scale-110 transition-transform shadow-inner">
             <Upload className={`w-10 h-10 ${dragActive ? 'text-[#F27D26]' : 'text-gray-400 dark:text-gray-300'}`} />
          </div>
          
          <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-50 mb-2 tracking-tight">Protect Your Access</h3>
          <p className="text-gray-500 dark:text-gray-400 mb-10 text-center max-w-sm font-medium">
            Drag and drop an image containing a QR code to verify its destination safely.
          </p>

          <input 
            ref={fileInputRef}
            type="file" 
            className="hidden" 
            accept="image/*"
            onChange={onChange}
          />
          
          <div className="flex flex-col sm:flex-row gap-4 w-full justify-center">
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="px-8 py-5 bg-white dark:bg-[#1A1A1A] text-gray-800 dark:text-white border border-gray-200 dark:border-white/10 rounded-2xl font-bold hover:bg-gray-50 dark:hover:bg-[#222] transition-all transform active:scale-95 shadow-sm flex items-center justify-center gap-3"
            >
              <ImageIcon className="w-5 h-5 text-[#F27D26]" />
              Upload Image
            </button>

            <button 
              onClick={() => setShowCamera(true)}
              className="px-10 py-5 bg-[#F27D26] text-white rounded-2xl font-bold hover:bg-[#d66a1e] transition-all transform active:scale-95 shadow-xl shadow-[#F27D26]/30 dark:shadow-[#F27D26]/20 flex items-center justify-center gap-3"
            >
              <Camera className="w-5 h-5" />
              Scan with Camera
            </button>
          </div>
          
          {showCamera && (
            <CameraScanner 
              onScan={(url) => {
                setShowCamera(false);
                handleUrlAnalysis(url);
              }}
              onClose={() => setShowCamera(false)}
            />
          )}

          <p className="mt-10 text-[10px] font-mono uppercase tracking-[0.2em] text-gray-400 dark:text-gray-500">
            SECURE_SCAN :: PNG, JPG, WEBP, CAMERA
          </p>
        </div>
      </div>

      <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { label: 'DECODE', desc: 'Hidden URL Extraction' },
          { label: 'TRACE', desc: 'Redirect Path Mapping' },
          { label: 'ANALYZE', desc: 'Phishing Pattern Detection' }
        ].map((item, i) => (
          <div key={i} className="p-6 border border-gray-100 dark:border-white/10 rounded-3xl bg-white dark:bg-[#0D0D0D] shadow-sm">
            <div className="text-[10px] font-bold text-[#F27D26] mb-1.5 tracking-widest uppercase">{item.label}</div>
            <div className="text-xs font-semibold text-gray-600 dark:text-gray-300">{item.desc}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
