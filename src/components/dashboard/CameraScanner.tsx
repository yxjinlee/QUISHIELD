import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Camera, X, RefreshCw, AlertCircle } from 'lucide-react';
import { motion } from 'motion/react';

interface CameraScannerProps {
  onScan: (decodedText: string) => void;
  onClose: () => void;
}

export default function CameraScanner({ onScan, onClose }: CameraScannerProps) {
  const [error, setError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const qrReaderRef = useRef<Html5Qrcode | null>(null);
  const isProcessingRef = useRef(false);
  const isStartingRef = useRef(false);
  const scannerId = 'qr-camera-scanner';

  useEffect(() => {
    let isMounted = true;
    let scannerStarted = false;

    const startScanner = async () => {
      console.log("[SCANNER] Initializing...");
      
      // Safety delay to ensure DOM is fully ready
      await new Promise(resolve => setTimeout(resolve, 100));
      
      if (!isMounted) return;
      if (isStartingRef.current) return;
      isStartingRef.current = true;

      try {
        const container = document.getElementById(scannerId);
        if (!container) {
          throw new Error("Scanner container element not found");
        }

        console.log("[SCANNER] Creating instance...");
        qrReaderRef.current = new Html5Qrcode(scannerId);
        
        console.log("[SCANNER] Requesting camera stream...");
        await qrReaderRef.current.start(
          { facingMode: "environment" },
          {
            fps: 20,
            qrbox: (viewfinderWidth, viewfinderHeight) => {
              const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
              const qrboxSize = Math.floor(minEdge * 0.7);
              return { width: qrboxSize, height: qrboxSize };
            },
            aspectRatio: 1.0
          },
          (decodedText) => {
            console.log("[SCANNER] QR detected:", decodedText);
            if (!isProcessingRef.current && isMounted) {
              isProcessingRef.current = true;
              stopScanner().then(() => {
                onScan(decodedText);
              });
            }
          },
          () => {} // Silent scan success (not detected yet)
        );
        
        scannerStarted = true;
        console.log("[SCANNER] Started successfully.");
        if (isMounted) setIsInitializing(false);
      } catch (err: any) {
        if (isMounted) {
          console.error('[SCANNER] Initialization failed:', err);
          
          let userMessage = 'Could not access camera.';
          if (err?.name === 'NotAllowedError' || err === 'NotAllowedError') {
            userMessage = 'Camera permission denied. Please allow camera access in browser settings.';
          } else if (err?.name === 'NotFoundError') {
            userMessage = 'No camera found on this device.';
          }
          
          setError(userMessage);
          setIsInitializing(false);
        }
      } finally {
        isStartingRef.current = false;
      }
    };

    startScanner();

    return () => {
      console.log("[SCANNER] Unmounting...");
      isMounted = false;
      if (scannerStarted) {
        stopScanner();
      }
    };
  }, []);

  const stopScanner = async () => {
    if (qrReaderRef.current) {
      if (qrReaderRef.current.isScanning) {
        try {
          await qrReaderRef.current.stop();
        } catch (err) {
          console.warn('Failed to stop scanner cleanly:', err);
        }
      }
      try {
        qrReaderRef.current.clear();
      } catch (err) {
        // Already cleared or not needed
      }
      qrReaderRef.current = null;
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/90 backdrop-blur-xl"
    >
      <div className="relative w-full max-w-lg bg-[#0D0D0D] border border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#F27D26]/10 rounded-lg">
              <Camera className="w-5 h-5 text-[#F27D26]" />
            </div>
            <div>
              <h4 className="font-bold text-white tracking-tight">Live Camera Scan</h4>
              <p className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">Secure_Capture_Mode</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-white/5 rounded-xl transition-colors text-gray-400 hover:text-white"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Camera Stage */}
        <div className="relative aspect-square bg-black">
          <div id={scannerId} className="w-full h-full overflow-hidden"></div>
          
          {isInitializing && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0D0D0D] z-10">
              <RefreshCw className="w-8 h-8 text-[#F27D26] animate-spin mb-4" />
              <p className="text-gray-400 font-mono text-xs uppercase tracking-widest">Initializing Hardware...</p>
            </div>
          )}

          {error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0D0D0D] z-20 p-8 text-center">
              <div className="p-4 bg-red-500/10 rounded-2xl mb-4">
                <AlertCircle className="w-8 h-8 text-red-500" />
              </div>
              <p className="text-white font-bold mb-2">Camera Access Failed</p>
              <p className="text-gray-500 text-sm mb-6">{error}</p>
              <button 
                onClick={onClose}
                className="px-6 py-2.5 bg-white/5 text-white rounded-xl text-sm font-bold hover:bg-white/10 transition-all"
              >
                Go Back
              </button>
            </div>
          )}

          {/* Overlay Guide */}
          {!error && !isInitializing && (
            <div className="absolute inset-0 pointer-events-none z-10 border-[40px] border-black/40">
              <div className="absolute inset-0 border-2 border-[#F27D26]/30 rounded-lg"></div>
              <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-[#F27D26]"></div>
              <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-[#F27D26]"></div>
              <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-[#F27D26]"></div>
              <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-[#F27D26]"></div>
            </div>
          )}
        </div>

        {/* Footer Info */}
        <div className="p-6 bg-black/40">
          <div className="flex items-start gap-3 bg-[#F27D26]/5 p-4 rounded-2xl border border-[#F27D26]/10">
            <AlertCircle className="w-5 h-5 text-[#F27D26] shrink-0" />
            <div>
              <p className="text-xs font-bold text-white mb-1 uppercase tracking-wide">Privacy Notice</p>
              <p className="text-[11px] text-gray-500 leading-relaxed font-medium">
                Quishield analyzes frame data locally. No image data is saved to your device or uploaded to our servers during capture.
              </p>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
