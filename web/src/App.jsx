import React, { Suspense, lazy } from 'react';
import { useTargetEngine, DEFAULT_RUBRICS } from './hooks/useTargetEngine';
import Header from './components/Header';
import LoadingSkeleton from './components/LoadingSkeleton';
import CameraModal from './components/CameraModal';
import { ShieldCheck, Printer } from 'lucide-react';

// Lazy loading heavy broadsheet components with Suspense boundary
const AnswerEditor = lazy(() => import('./components/AnswerEditor'));
const KeywordHeatmap = lazy(() => import('./components/KeywordHeatmap'));

export default function App() {
  const engine = useTargetEngine();

  const handlePresetSampleLoad = (subjectKey) => {
    engine.setActiveRubricKey(subjectKey);
    const rub = DEFAULT_RUBRICS[subjectKey];
    if (rub) {
      engine.setExtractedText(rub.sampleText);
      engine.evaluateAnswer(rub.sampleText, rub.keywords);
    }
  };

  return (
    <div className="min-h-screen bg-[#FBF8EF] text-[#1A1A1A] px-3 sm:px-6 lg:px-10 py-4 flex flex-col font-sans">
      {/* Broadsheet Masthead Header */}
      <Header
        isBackendOnline={engine.isBackendOnline}
        isHealthChecking={engine.isHealthChecking}
        onRefreshHealth={engine.checkHealth}
      />

      {/* Main Split-Screen Broadsheet Layout */}
      <main className="flex-1 w-full max-w-7xl mx-auto my-2">
        <Suspense fallback={<LoadingSkeleton text="LOADING TARGET AI ENGINE..." subtitle="Initializing broadsheet OCR components & C++ NLP models..." />}>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Column: Script Ingestion & OCR Editor (Desktop 6 cols) */}
            <section className="lg:col-span-6 w-full">
              <AnswerEditor
                extractedText={engine.extractedText}
                setExtractedText={engine.setExtractedText}
                isPredicting={engine.isEvaluating}
                predictionError={engine.evaluationError}
                previewUrl={engine.previewUrl}
                pixelData={engine.pixelData}
                handleFileUpload={engine.handleFileUpload}
                openCamera={engine.openCamera}
                onLoadPresetSample={handlePresetSampleLoad}
                activeSubject={engine.activeRubricKey}
                onEvaluate={(text) => engine.evaluateAnswer(text)}
              />
            </section>

            {/* Right Column: Diagnostic Heatmap & NLP Evaluator (Desktop 6 cols) */}
            <section className="lg:col-span-6 w-full">
              <KeywordHeatmap
                extractedText={engine.extractedText}
                activeRubricKey={engine.activeRubricKey}
                setActiveRubricKey={engine.setActiveRubricKey}
                activeRubric={engine.activeRubric}
                apiResult={engine.apiResult}
                customKeywords={engine.customKeywords}
                setCustomKeywords={engine.setCustomKeywords}
              />
            </section>
          </div>
        </Suspense>
      </main>

      {/* Camera Viewfinder Modal */}
      <CameraModal
        isOpen={engine.isCameraOpen}
        stream={engine.cameraStream}
        cameraError={engine.cameraError}
        onClose={engine.closeCamera}
        onCapture={engine.captureCameraSnapshot}
      />

      {/* Broadsheet Footer */}
      <footer className="w-full max-w-7xl mx-auto mt-10 pt-4 border-t-2 border-[#1A1A1A] text-xs font-mono text-[#4A4A4A] pb-6">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#D3CBBE] pb-3 mb-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#2E6F40]" />
            <span className="font-bold text-[#1A1A1A] uppercase">TARGET AI BOARD EVALUATION SYSTEM</span>
          </div>
          <div className="flex items-center gap-4 text-[11px]">
            <span>C++ Crow NLP Endpoint: http://localhost:8080/api/nlp/evaluate</span>
            <span>•</span>
            <span>Resampling: 32x128 Grayscale Inverted</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between text-[11px] text-[#4A4A4A]">
          <p>© 2026 Target AI Division. Built with React.js, Vite, and C++ Crow REST Server.</p>
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
