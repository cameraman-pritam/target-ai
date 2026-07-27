import React from 'react';
import { Cpu } from 'lucide-react';

export default function LoadingSkeleton({ text = "C++ CROW OCR PREDICTING...", subtitle = "Resampling 32x128 pixels into 4,096 float values..." }) {
  return (
    <div className="w-full bg-[#F2EFE9] border-2 border-[#1A1A1A] p-8 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] text-center my-4 font-mono">
      <div className="inline-flex items-center justify-center p-3 bg-[#FBF8EF] border-2 border-[#1A1A1A] mb-4 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
        <Cpu className="w-8 h-8 text-[#1A1A1A] animate-pulse" />
      </div>

      <h4 className="text-base font-bold text-[#1A1A1A] tracking-wider uppercase mb-1 flex items-center justify-center gap-2">
        <span>{text}</span>
        <span className="w-2 h-4 bg-[#1A1A1A] inline-block animate-typewriter-cursor"></span>
      </h4>

      <p className="text-xs text-[#4A4A4A] mb-6">
        {subtitle}
      </p>

      {/* Broadsheet Press Loading Bar */}
      <div className="max-w-md mx-auto border-2 border-[#1A1A1A] bg-[#FBF8EF] h-4 p-0.5 overflow-hidden">
        <div className="bg-[#1A1A1A] h-full w-full animate-[pulse_1s_infinite]"></div>
      </div>
    </div>
  );
}
