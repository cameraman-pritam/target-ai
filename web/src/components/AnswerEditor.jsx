import React, { useRef } from 'react';
import { Upload, Camera, FileText, Image as ImageIcon, Sparkles } from 'lucide-react';
import LoadingSkeleton from './LoadingSkeleton';

export default function AnswerEditor({
  extractedText,
  setExtractedText,
  isPredicting,
  predictionError,
  previewUrl,
  _pixelData,
  handleFileUpload,
  openCamera,
  onLoadPresetSample,
  activeSubject,
}) {
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  return (
    <div className="w-full bg-[#FBF8EF] border-2 border-[#1A1A1A] p-5 shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] font-mono">
      {/* Panel Header */}
      <div className="border-b-2 border-[#1A1A1A] pb-3 mb-5 flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-xl font-extrabold text-[#1A1A1A] uppercase tracking-wide flex items-center gap-2">
            <FileText className="w-5 h-5" />
            <span>SECTION A: SCRIPT INGESTION & OCR</span>
          </h2>
          <p className="text-xs text-[#4A4A4A] mt-0.5">
            Ingest student handwritten line scripts via Image or Live Camera Stream
          </p>
        </div>
        <span className="text-xs bg-[#F2EFE9] border border-[#1A1A1A] px-2 py-1 font-bold">
          PAYLOAD: 4,096 FLOATS
        </span>
      </div>

      {/* Dual Ingestion Triggers: File Dropzone & Camera Viewfinder */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
        {/* File Dropzone */}
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-[#1A1A1A] bg-[#F2EFE9] hover:bg-[#E6E0D4] p-5 text-center cursor-pointer transition-colors flex flex-col items-center justify-center min-h-[130px] press-btn"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png, image/jpeg, image/jpg"
            onChange={handleFileChange}
            className="hidden"
          />
          <Upload className="w-6 h-6 text-[#1A1A1A] mb-2" />
          <span className="text-xs font-bold text-[#1A1A1A] uppercase">
            DROP IMAGE FILE HERE
          </span>
          <span className="text-[11px] text-[#4A4A4A] mt-1">
            or click to browse (.PNG, .JPG)
          </span>
        </div>

        {/* Live Camera Viewfinder Trigger */}
        <div
          onClick={openCamera}
          className="border-2 border-[#1A1A1A] bg-[#2E6F40] hover:bg-[#255933] text-white p-5 text-center cursor-pointer transition-colors shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] flex flex-col items-center justify-center min-h-[130px] press-btn"
        >
          <Camera className="w-6 h-6 text-white mb-2" />
          <span className="text-xs font-bold uppercase tracking-wider">
            OPEN CAMERA VIEWFINDER
          </span>
          <span className="text-[11px] text-emerald-100 mt-1">
            Live WebRTC alignment & snapshot
          </span>
        </div>
      </div>

      {/* Preset Sample Script Buttons */}
      <div className="mb-5 p-3 bg-[#F2EFE9] border border-[#D3CBBE]">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-[#1A1A1A] uppercase flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-[#8C6D23]" />
            LOAD PRESET BOARD EXAMINATION ANSWER SCRIPT:
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => onLoadPresetSample('physics')}
            className={`px-3 py-1.5 border border-[#1A1A1A] text-xs font-bold press-btn ${
              activeSubject === 'physics' ? 'bg-[#1A1A1A] text-white' : 'bg-[#FBF8EF] hover:bg-[#E6E0D4] text-[#1A1A1A]'
            }`}
          >
            PHYSICS SCRIPT
          </button>
          <button
            onClick={() => onLoadPresetSample('chemistry')}
            className={`px-3 py-1.5 border border-[#1A1A1A] text-xs font-bold press-btn ${
              activeSubject === 'chemistry' ? 'bg-[#1A1A1A] text-white' : 'bg-[#FBF8EF] hover:bg-[#E6E0D4] text-[#1A1A1A]'
            }`}
          >
            CHEMISTRY SCRIPT
          </button>
          <button
            onClick={() => onLoadPresetSample('biology')}
            className={`px-3 py-1.5 border border-[#1A1A1A] text-xs font-bold press-btn ${
              activeSubject === 'biology' ? 'bg-[#1A1A1A] text-white' : 'bg-[#FBF8EF] hover:bg-[#E6E0D4] text-[#1A1A1A]'
            }`}
          >
            BIOLOGY SCRIPT
          </button>
          <button
            onClick={() => onLoadPresetSample('cs')}
            className={`px-3 py-1.5 border border-[#1A1A1A] text-xs font-bold press-btn ${
              activeSubject === 'cs' ? 'bg-[#1A1A1A] text-white' : 'bg-[#FBF8EF] hover:bg-[#E6E0D4] text-[#1A1A1A]'
            }`}
          >
            CS STACK SCRIPT
          </button>
        </div>
      </div>

      {/* 32x128 Live Canvas Downsampling Preview */}
      <div className="mb-5 border-2 border-[#1A1A1A] bg-[#F2EFE9] p-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-[#1A1A1A] uppercase flex items-center gap-1.5">
            <ImageIcon className="w-4 h-4" />
            32x128 CANVAS DOWNSAMPLED PIXEL MATRIX (4,096 FLOATS)
          </span>
          <span className="text-[10px] bg-[#1A1A1A] text-white px-2 py-0.5">
            0.0 = WHITE PAPER | 1.0 = INK
          </span>
        </div>

        {previewUrl ? (
          <div className="flex flex-col sm:flex-row items-center gap-4 bg-white p-3 border border-[#1A1A1A]">
            <div className="border-2 border-[#1A1A1A] p-1 bg-[#1A1A1A]">
              <img
                src={previewUrl}
                alt="32x128 Resampled Matrix"
                className="w-[256px] h-[64px] image-rendering-pixelated object-contain border border-white"
                style={{ imageRendering: 'pixelated' }}
              />
            </div>
            <div className="text-xs text-[#2B2B2B] flex-1">
              <p className="font-bold mb-1 text-[#2E6F40]">✓ Pixel Array Processed</p>
              <p className="text-[11px] text-[#4A4A4A]">
                Dimension: 128 (width) x 32 (height) = 4,096 Float Values.
                Normalized luminance matrix ready for Crow POST request.
              </p>
            </div>
          </div>
        ) : (
          <div className="bg-[#FFFDF9] border border-dashed border-[#D3CBBE] p-4 text-center text-xs text-[#4A4A4A]">
            No script processed yet. Select a file, capture from camera, or click a sample script above to generate 32x128 pixel vector.
          </div>
        )}
      </div>

      {/* OCR Processing Loader or Editable Textarea */}
      {isPredicting ? (
        <LoadingSkeleton />
      ) : (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-[#1A1A1A] uppercase flex items-center gap-1">
              EXTRACTED OCR TEXT (EDITABLE BY EVALUATOR):
            </label>
            <span className="text-[11px] text-[#4A4A4A]">
              {extractedText ? `${extractedText.length} characters` : 'Empty'}
            </span>
          </div>

          {predictionError && (
            <div className="bg-[#FDF2F2] border border-[#A83232] p-2 text-xs text-[#A83232]">
              Notice: {predictionError}. Using local fallback prediction text.
            </div>
          )}

          <textarea
            value={extractedText}
            onChange={(e) => setExtractedText(e.target.value)}
            rows={5}
            placeholder="Recognized handwritten script text will appear here..."
            className="w-full bg-[#FFFDF9] border-2 border-[#1A1A1A] p-3 font-mono text-sm text-[#1A1A1A] focus:outline-none focus:ring-2 focus:ring-[#2E6F40] shadow-[inset_2px_2px_0px_0px_rgba(0,0,0,0.1)] resize-y"
          />

          <div className="flex justify-between items-center text-[11px] text-[#4A4A4A] pt-1">
            <span>Evaluators can refine OCR recognized text directly in the box above.</span>
            <span className="font-bold text-[#2E6F40]">REALTIME SYNCED TO HEATMAP →</span>
          </div>
        </div>
      )}
    </div>
  );
}
