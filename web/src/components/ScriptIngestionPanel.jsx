import React, { useRef } from 'react';
import { Upload, Camera, FileText, Sparkles } from 'lucide-react';
import LoadingSkeleton from './LoadingSkeleton';
import { DEFAULT_SUBJECT_PRESETS } from '../hooks/useTargetEngine';

export default function ScriptIngestionPanel({
  questionText,
  setQuestionText,
  questionPreviewUrl,
  answerText,
  setAnswerText,
  answerPreviewUrl,
  isEvaluating,
  evaluationError,
  handleFileUpload,
  openCamera,
  onLoadPresetSample,
  activeSubjectKey,
  onEvaluate,
}) {
  const qFileInputRef = useRef(null);
  const aFileInputRef = useRef(null);

  const handleQFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) handleFileUpload(file, 'question');
  };

  const handleAFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) handleFileUpload(file, 'answer');
  };

  return (
    <div className="w-full bg-[#FBF8EF] border-2 border-[#1A1A1A] p-4 sm:p-6 shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] font-mono">
      {/* Panel Header */}
      <div className="border-b-2 border-[#1A1A1A] pb-3 mb-5 flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-xl font-extrabold text-[#1A1A1A] uppercase tracking-wide flex items-center gap-2">
            <FileText className="w-5 h-5 text-[#1A1A1A]" />
            <span>SECTION A: DUAL-SCRIPT INGESTION</span>
          </h2>
          <p className="text-xs text-[#4A4A4A] mt-0.5">
            Ingest Question Paper Script & Student Answer Script via Image, Camera, or Typing
          </p>
        </div>
        <span className="text-xs bg-[#F2EFE9] border border-[#1A1A1A] px-2.5 py-1 font-bold">
          DUAL-VISION MODALITY
        </span>
      </div>

      {/* Preset Subject Loaders */}
      <div className="mb-6 p-3 bg-[#F2EFE9] border border-[#D3CBBE]">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-[#1A1A1A] uppercase flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-[#8C6D23]" />
            LOAD PRESET BOARD EXAMINATION QUESTION & ANSWER SCRIPT:
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          {Object.keys(DEFAULT_SUBJECT_PRESETS).map((key) => {
            const preset = DEFAULT_SUBJECT_PRESETS[key];
            const isActive = activeSubjectKey === key;
            return (
              <button
                key={key}
                onClick={() => onLoadPresetSample(key)}
                className={`px-3 py-1.5 border border-[#1A1A1A] text-xs font-bold press-btn ${
                  isActive ? 'bg-[#1A1A1A] text-white' : 'bg-[#FBF8EF] hover:bg-[#E6E0D4] text-[#1A1A1A]'
                }`}
              >
                {preset.id.toUpperCase()} SCRIPT
              </button>
            );
          })}
        </div>
      </div>

      {/* Dual Column Input Ingestion Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* QUESTION SCRIPT INGESTION CARD */}
        <div className="border-2 border-[#1A1A1A] bg-[#FFFDF9] p-4 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-[#D3CBBE] pb-2 mb-3">
              <span className="text-xs font-bold text-[#1A1A1A] uppercase">
                1. QUESTION PAPER SCRIPT
              </span>
              <span className="text-[10px] bg-[#1A1A1A] text-white px-2 py-0.5 font-bold">
                QUESTION
              </span>
            </div>

            {/* Question File Dropzone & Camera Button */}
            <div className="grid grid-cols-2 gap-2 mb-3">
              <div
                onClick={() => qFileInputRef.current?.click()}
                className="border-2 border-dashed border-[#1A1A1A] bg-[#F2EFE9] hover:bg-[#E6E0D4] p-3 text-center cursor-pointer transition-colors flex flex-col items-center justify-center press-btn"
              >
                <input
                  ref={qFileInputRef}
                  type="file"
                  accept="image/png, image/jpeg, image/jpg"
                  onChange={handleQFileChange}
                  className="hidden"
                />
                <Upload className="w-5 h-5 text-[#1A1A1A] mb-1" />
                <span className="text-[11px] font-bold text-[#1A1A1A] uppercase">
                  UPLOAD IMAGE
                </span>
              </div>

              <div
                onClick={() => openCamera('question')}
                className="border-2 border-[#1A1A1A] bg-[#2E6F40] hover:bg-[#255933] text-white p-3 text-center cursor-pointer transition-colors flex flex-col items-center justify-center press-btn shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
              >
                <Camera className="w-5 h-5 text-white mb-1" />
                <span className="text-[11px] font-bold uppercase">
                  TAKE SNAPSHOT
                </span>
              </div>
            </div>

            {/* Question Preview Image if uploaded */}
            {questionPreviewUrl && (
              <div className="mb-3 p-2 bg-[#F2EFE9] border border-[#1A1A1A] flex items-center gap-3">
                <img
                  src={questionPreviewUrl}
                  alt="Question Script Preview"
                  className="w-16 h-12 object-cover border border-[#1A1A1A]"
                />
                <span className="text-[11px] text-[#2E6F40] font-bold">✓ Question Image Enqueued</span>
              </div>
            )}

            {/* Editable Question Textarea */}
            <div>
              <label className="text-[11px] font-bold text-[#4A4A4A] uppercase block mb-1">
                EDITABLE QUESTION TEXT:
              </label>
              <textarea
                value={questionText}
                onChange={(e) => setQuestionText(e.target.value)}
                rows={4}
                placeholder="Enter or scan question paper text..."
                className="w-full bg-[#FBF8EF] border border-[#1A1A1A] p-2.5 text-xs text-[#1A1A1A] focus:outline-none focus:ring-1 focus:ring-[#2E6F40] resize-y"
              />
            </div>
          </div>
        </div>

        {/* STUDENT ANSWER SCRIPT INGESTION CARD */}
        <div className="border-2 border-[#1A1A1A] bg-[#FFFDF9] p-4 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-[#D3CBBE] pb-2 mb-3">
              <span className="text-xs font-bold text-[#1A1A1A] uppercase">
                2. STUDENT ANSWER SCRIPT
              </span>
              <span className="text-[10px] bg-[#1A1A1A] text-white px-2 py-0.5 font-bold">
                ANSWER
              </span>
            </div>

            {/* Answer File Dropzone & Camera Button */}
            <div className="grid grid-cols-2 gap-2 mb-3">
              <div
                onClick={() => aFileInputRef.current?.click()}
                className="border-2 border-dashed border-[#1A1A1A] bg-[#F2EFE9] hover:bg-[#E6E0D4] p-3 text-center cursor-pointer transition-colors flex flex-col items-center justify-center press-btn"
              >
                <input
                  ref={aFileInputRef}
                  type="file"
                  accept="image/png, image/jpeg, image/jpg"
                  onChange={handleAFileChange}
                  className="hidden"
                />
                <Upload className="w-5 h-5 text-[#1A1A1A] mb-1" />
                <span className="text-[11px] font-bold text-[#1A1A1A] uppercase">
                  UPLOAD IMAGE
                </span>
              </div>

              <div
                onClick={() => openCamera('answer')}
                className="border-2 border-[#1A1A1A] bg-[#2E6F40] hover:bg-[#255933] text-white p-3 text-center cursor-pointer transition-colors flex flex-col items-center justify-center press-btn shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
              >
                <Camera className="w-5 h-5 text-white mb-1" />
                <span className="text-[11px] font-bold uppercase">
                  TAKE SNAPSHOT
                </span>
              </div>
            </div>

            {/* Answer Preview Image if uploaded */}
            {answerPreviewUrl && (
              <div className="mb-3 p-2 bg-[#F2EFE9] border border-[#1A1A1A] flex items-center gap-3">
                <img
                  src={answerPreviewUrl}
                  alt="Answer Script Preview"
                  className="w-16 h-12 object-cover border border-[#1A1A1A]"
                />
                <span className="text-[11px] text-[#2E6F40] font-bold">✓ Answer Image Enqueued</span>
              </div>
            )}

            {/* Editable Answer Textarea */}
            <div>
              <label className="text-[11px] font-bold text-[#4A4A4A] uppercase block mb-1">
                EDITABLE STUDENT ANSWER SCRIPT:
              </label>
              <textarea
                value={answerText}
                onChange={(e) => setAnswerText(e.target.value)}
                rows={4}
                placeholder="Enter or scan student handwritten answer script..."
                className="w-full bg-[#FBF8EF] border border-[#1A1A1A] p-2.5 text-xs text-[#1A1A1A] focus:outline-none focus:ring-1 focus:ring-[#2E6F40] resize-y"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Processing Loader or Action Trigger Button */}
      {isEvaluating ? (
        <LoadingSkeleton text="DUAL-VISION SEMANTIC VECTOR EVALUATION IN PROGRESS..." subtitle="Computing 384-dimensional cosine vector embeddings..." />
      ) : (
        <div>
          {evaluationError && (
            <div className="bg-[#FDF2F2] border border-[#A83232] p-2.5 text-xs text-[#A83232] mb-3">
              Notice: {evaluationError}
            </div>
          )}

          <button
            onClick={() => onEvaluate && onEvaluate()}
            disabled={isEvaluating}
            className="w-full py-3.5 px-6 bg-[#2E6F40] hover:bg-[#255933] text-white font-bold text-sm uppercase tracking-wider border-2 border-[#1A1A1A] shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] press-btn flex items-center justify-center gap-2"
          >
            <Sparkles className="w-5 h-5" />
            <span>RUN DUAL-VISION EVALUATION</span>
          </button>
        </div>
      )}
    </div>
  );
}
