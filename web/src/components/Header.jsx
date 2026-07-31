import React from 'react';
import { Cpu, RefreshCw } from 'lucide-react';

export default function Header({ isBackendOnline, isHealthChecking, onRefreshHealth }) {
  const currentDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).toUpperCase();

  return (
    <header className="w-full bg-[#FBF8EF] border-b-2 border-[#1A1A1A] pb-3 mb-6">
      {/* Top Banner Meta Bar */}
      <div className="flex flex-wrap items-center justify-between border-b border-[#D3CBBE] py-1.5 px-4 text-xs font-mono text-[#2B2B2B]">
        <div className="flex items-center gap-3">
          <span className="font-bold tracking-widest uppercase">ESTD. 2026</span>
          <span className="text-[#D3CBBE]">|</span>
          <span>VOL. CXXIV NO. 42</span>
          <span className="hidden sm:inline text-[#D3CBBE]">|</span>
          <span className="hidden sm:inline">DUAL-VISION EVALUATION DIVISION</span>
        </div>
        <div className="flex items-center gap-2">
          <span>{currentDate}</span>
        </div>
      </div>

      {/* Main Broadsheet Masthead */}
      <div className="text-center pt-5 pb-3 px-4 relative">
        <div className="inline-block relative">
          <h1 className="font-mono text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight text-[#1A1A1A] uppercase border-b-4 border-[#1A1A1A] pb-1 px-4">
            TARGET AI
          </h1>
          <p className="font-mono text-xs sm:text-sm tracking-widest text-[#4A4A4A] mt-1 font-semibold uppercase">
            Automated Board Exam Dual-Script Evaluator & Semantic AI Diagnostics
          </p>
        </div>

        {/* Clean Engine Status Badge */}
        <div className="mt-4 sm:absolute sm:top-6 sm:right-6 flex items-center justify-center">
          <div className={`flex items-center gap-2 px-3 py-1.5 border-2 border-[#1A1A1A] font-mono text-xs font-bold ${
            isBackendOnline 
              ? 'bg-[#2E6F40] text-white shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]' 
              : 'bg-[#A83232] text-white shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]'
          }`}>
            <Cpu className="w-4 h-4" />
            <span>
              {isBackendOnline ? 'ENGINE: ONLINE' : 'ENGINE: OFFLINE'}
            </span>
            <button 
              onClick={onRefreshHealth}
              disabled={isHealthChecking}
              title="Re-check Backend Engine Connection"
              className="ml-1 p-0.5 hover:bg-black/20 rounded transition-colors"
            >
              <RefreshCw className={`w-3 h-3 ${isHealthChecking ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Broadsheet Sub-bar rule */}
      <div className="broadsheet-double-border mx-4 my-1 py-1 flex justify-between items-center text-[11px] font-mono uppercase tracking-wider text-[#4A4A4A]">
        <span>NATIONAL BOARD EVALUATION</span>
        <span className="hidden md:inline">QUESTION & ANSWER DUAL-VISION INGESTION • SEMANTIC VECTOR ALIGNMENT</span>
        <span>FINAL MARKS RECORD</span>
      </div>
    </header>
  );
}
