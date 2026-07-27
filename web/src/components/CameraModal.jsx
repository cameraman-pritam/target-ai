import React, { useRef, useEffect } from 'react';
import { Camera, X, AlertCircle } from 'lucide-react';

export default function CameraModal({ isOpen, stream, cameraError, onClose, onCapture }) {
  const videoRef = useRef(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  if (!isOpen) return null;

  const handleTakeSnapshot = () => {
    if (videoRef.current) {
      onCapture(videoRef.current);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
      <div className="relative w-full max-w-2xl bg-[#FBF8EF] border-2 border-[#1A1A1A] shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] p-5">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b-2 border-[#1A1A1A] pb-3 mb-4">
          <div className="flex items-center gap-2">
            <Camera className="w-5 h-5 text-[#1A1A1A]" />
            <h3 className="font-mono text-lg font-bold text-[#1A1A1A] uppercase tracking-wide">
              LIVE OPTICAL VIEWFINDER
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-[#F2EFE9] border border-[#1A1A1A] press-btn"
          >
            <X className="w-5 h-5 text-[#1A1A1A]" />
          </button>
        </div>

        {/* Camera Feed Container */}
        {cameraError ? (
          <div className="bg-[#FDF2F2] border-2 border-[#A83232] p-4 text-[#A83232] font-mono text-sm mb-4">
            <div className="flex items-center gap-2 font-bold mb-1">
              <AlertCircle className="w-5 h-5" />
              <span>Camera Error</span>
            </div>
            <p>{cameraError}</p>
          </div>
        ) : (
          <div className="relative bg-black border-2 border-[#1A1A1A] overflow-hidden aspect-[4/3] flex items-center justify-center mb-4">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-contain"
            />

            {/* Alignment Crosshairs Overlay */}
            <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-6">
              {/* Corner Brackets */}
              <div className="flex justify-between">
                <div className="w-8 h-8 border-t-2 border-l-2 border-emerald-400"></div>
                <div className="w-8 h-8 border-t-2 border-r-2 border-emerald-400"></div>
              </div>
              
              {/* Center Crosshair */}
              <div className="self-center flex flex-col items-center">
                <div className="w-48 h-12 border-2 border-dashed border-emerald-400/80 bg-emerald-500/10 flex items-center justify-center">
                  <span className="font-mono text-[10px] text-emerald-300 font-semibold uppercase tracking-wider">
                    ALIGN ANSWER LINE HERE (128x32)
                  </span>
                </div>
              </div>

              <div className="flex justify-between">
                <div className="w-8 h-8 border-b-2 border-l-2 border-emerald-400"></div>
                <div className="w-8 h-8 border-b-2 border-r-2 border-emerald-400"></div>
              </div>
            </div>
          </div>
        )}

        {/* Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 font-mono text-xs">
          <p className="text-[#4A4A4A]">
            Ensure handwriting is clearly lit and centered in crosshairs.
          </p>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 border-2 border-[#1A1A1A] bg-[#F2EFE9] font-bold text-[#1A1A1A] hover:bg-[#E6E0D4] press-btn"
            >
              CANCEL
            </button>
            <button
              onClick={handleTakeSnapshot}
              disabled={!stream || !!cameraError}
              className="px-5 py-2 border-2 border-[#1A1A1A] bg-[#2E6F40] text-white font-bold hover:bg-[#255933] shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] disabled:opacity-50 press-btn flex items-center gap-2"
            >
              <Camera className="w-4 h-4" />
              TAKE SNAPSHOT
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
