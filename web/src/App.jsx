import React, { Suspense, lazy } from 'react';
import { useTargetEngine } from './hooks/useTargetEngine';
import Header from './components/Header';
import LoadingSkeleton from './components/LoadingSkeleton';
import CameraModal from './components/CameraModal';
import { ShieldCheck, Printer } from 'lucide-react';

// Lazy loading heavy broadsheet components with Suspense boundary
const ScriptIngestionPanel = lazy(() => import('./components/ScriptIngestionPanel'));
const EvaluationResultsCard = lazy(() => import('./components/EvaluationResultsCard'));

export default function App() {
  const engine = useTargetEngine();

  const handlePresetSampleLoad = (subjectKey) => {
    engine.handleLoadPreset(subjectKey);
  };

  return (
    <div className="min-h-screen bg-[#FBF8EF] text-[#1A1A1A] px-3 sm:px-6 lg:px-8 2xl:px-12 py-4 flex flex-col font-sans">
      {/* Broadsheet Masthead Header */}
      <Header
        isBackendOnline={engine.isBackendOnline}
        isHealthChecking={engine.isHealthChecking}
        onRefreshHealth={engine.checkHealth}
      />

      {/* Main Responsive Split-Screen / Stacked Layout */}
      <main className="flex-1 w-full max-w-7xl 2xl:max-w-7xl mx-auto my-2">
        <Suspense fallback={<LoadingSkeleton text="LOADING TARGET AI DUAL-VISION ENGINE..." subtitle="Initializing broadsheet OCR components & 384D vector models..." />}>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
            {/* Left Column: Dual-Script Ingestion Panel (6 cols) */}
            <section className="lg:col-span-6 w-full">
              <ScriptIngestionPanel
                questionText={engine.questionText}
                setQuestionText={engine.setQuestionText}
                questionPreviewUrl={engine.questionPreviewUrl}
                answerText={engine.answerText}
                setAnswerText={engine.setAnswerText}
                answerPreviewUrl={engine.answerPreviewUrl}
                isEvaluating={engine.isEvaluating}
                evaluationError={engine.evaluationError}
                handleFileUpload={engine.handleFileUpload}
                openCamera={engine.openCamera}
                onLoadPresetSample={handlePresetSampleLoad}
                activeSubjectKey={engine.activeSubjectKey}
                onEvaluate={() => engine.evaluateDualScripts()}
              />
            </section>

            {/* Right Column: Diagnostic Results & Vector Alignment (6 cols) */}
            <section className="lg:col-span-6 w-full">
              <EvaluationResultsCard
                evaluationResult={engine.evaluationResult}
                questionText={engine.questionText}
                answerText={engine.answerText}
              />
            </section>
          </div>
        </Suspense>
      </main>

      {/* Camera Viewfinder Modal */}
      <CameraModal
        isOpen={engine.isCameraOpen}
        target={engine.cameraTarget}
        stream={engine.cameraStream}
        cameraError={engine.cameraError}
        onClose={engine.closeCamera}
        onCapture={engine.captureCameraSnapshot}
      />

      {/* Broadsheet Footer */}
      <footer className="w-full max-w-7xl 2xl:max-w-7xl mx-auto mt-10 pt-4 border-t-2 border-[#1A1A1A] text-xs font-mono text-[#4A4A4A] pb-6">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#D3CBBE] pb-3 mb-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#2E6F40]" />
            <span className="font-bold text-[#1A1A1A] uppercase">TARGET AI BOARD EVALUATION SYSTEM</span>
          </div>
          <div className="flex items-center gap-4 text-[11px]">
            <span>Dual-Vision Ingestion: Question & Answer Scripts</span>
            <span>•</span>
            <span>Cosine Similarity: 384D Vector Embeddings</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between text-[11px] text-[#4A4A4A]">
          <p>© 2026 Target AI Division. All rights reserved.</p>
          <div className="flex gap-3">
            <button onClick={() => window.print()} className="hover:underline flex items-center gap-1 font-bold text-[#1A1A1A]">
              <Printer className="w-3.5 h-3.5" /> PRINT MARKSHEET REPORT
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
