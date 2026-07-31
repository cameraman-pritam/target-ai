import React from 'react';
import { Award, CheckCircle2, Layers, Cpu, Activity } from 'lucide-react';

export default function EvaluationResultsCard({ evaluationResult, questionText, answerText }) {
  if (!evaluationResult) {
    return (
      <div className="w-full bg-[#FBF8EF] border-2 border-[#1A1A1A] p-8 shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] text-center font-mono">
        <div className="inline-flex items-center justify-center p-4 bg-[#F2EFE9] border-2 border-[#1A1A1A] mb-3">
          <Award className="w-8 h-8 text-[#1A1A1A]" />
        </div>
        <h3 className="text-base font-bold text-[#1A1A1A] uppercase tracking-wider mb-1">
          AWAITING DUAL-SCRIPT EVALUATION
        </h3>
        <p className="text-xs text-[#4A4A4A] max-w-md mx-auto">
          Ingest Question and Answer scripts on the left, then click <strong>RUN DUAL-VISION EVALUATION</strong> to compute CBSE-Neural-Evaluator-v2 scores.
        </p>
      </div>
    );
  }

  const {
    raw_logit_score = 3.824,
    relevance_score = 0.9787,
    grade_percentage = 97,
    passed = true,
    isSimulated = false,
  } = evaluationResult;

  const relScoreFormatted = (relevance_score || 0).toFixed(4);
  const logitFormatted = (raw_logit_score >= 0 ? '+' : '') + (raw_logit_score || 0).toFixed(3);

  return (
    <div className="w-full bg-[#FBF8EF] border-2 border-[#1A1A1A] p-4 sm:p-6 shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] font-mono">
      {/* Section Header */}
      <div className="border-b-2 border-[#1A1A1A] pb-3 mb-5 flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-xl font-extrabold text-[#1A1A1A] uppercase tracking-wide flex items-center gap-2">
          <Award className="w-5 h-5" />
          <span>SECTION B: SEMANTIC DIAGNOSTIC RESULTS</span>
        </h2>
        <span className={`text-xs px-2.5 py-1 font-bold border-2 border-[#1A1A1A] text-white ${
          passed ? 'bg-[#2E6F40]' : 'bg-[#A83232]'
        }`}>
          {passed ? 'STATUS: PASSED (≥75%)' : 'STATUS: RE-EVALUATION REQUIRED (<75%)'}
        </span>
      </div>

      {/* Main Score & Relevance Score Banner */}
      <div className="mb-6 bg-[#FFFDF9] border-2 border-[#1A1A1A] p-5 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-center">
          {/* Grade Percentage */}
          <div>
            <span className="text-xs font-bold text-[#4A4A4A] uppercase tracking-wider block mb-1">
              FINAL EVALUATION MARKS PERCENTAGE:
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-5xl font-extrabold text-[#1A1A1A]">
                {grade_percentage}%
              </span>
              <span className="text-sm font-bold text-[#4A4A4A]">
                / 100%
              </span>
            </div>
            <p className="text-[11px] text-[#4A4A4A] mt-1 font-semibold">
              {passed ? '✓ Meets concept equivalence threshold (≥75%)' : '✗ Below passing conceptual threshold (<75%)'}
            </p>
          </div>

          {/* Sigmoid Relevance & Raw Logit Metrics */}
          <div className="bg-[#F2EFE9] border border-[#1A1A1A] p-4 text-center">
            <span className="text-[11px] font-bold text-[#1A1A1A] uppercase tracking-wider block mb-1">
              SIGMOID RELEVANCE S(x)
            </span>
            <span className="text-3xl font-extrabold text-[#2E6F40] block">
              {relScoreFormatted}
            </span>
            <div className="flex items-center justify-center gap-1 mt-1 text-[11px] font-bold text-[#4A4A4A]">
              <Activity className="w-3.5 h-3.5 text-[#8C6D23]" />
              <span>RAW LOGIT: {logitFormatted}</span>
            </div>
          </div>
        </div>

        {/* Progress Score Bar */}
        <div className="w-full bg-[#F2EFE9] border-2 border-[#1A1A1A] h-5 p-0.5 mt-5">
          <div
            className={`h-full transition-all duration-500 ${
              passed ? 'bg-[#2E6F40]' : 'bg-[#A83232]'
            }`}
            style={{ width: `${Math.min(100, Math.max(0, grade_percentage))}%` }}
          />
        </div>
      </div>

      {/* Notice if running in simulated mode */}
      {isSimulated && (
        <div className="mb-5 bg-[#F2EFE9] border border-[#1A1A1A] p-3 text-xs flex items-center gap-2">
          <Cpu className="w-4 h-4 text-[#8C6D23]" />
          <span>Active results running in client simulation mode until C++ server connects.</span>
        </div>
      )}

      {/* CBSE-Neural-Evaluator-v2 Model Metric Cards */}
      <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
        <div className="bg-[#F0F7F2] border-2 border-[#2E6F40] p-3.5">
          <span className="font-bold text-[#2E6F40] uppercase flex items-center gap-1.5 mb-1.5">
            <CheckCircle2 className="w-4 h-4" />
            CBSE-NEURAL-EVALUATOR-V2
          </span>
          <p className="text-[#2B2B2B] text-[11px] leading-relaxed">
            Neural network cross-encodes question and answer strings simultaneously to output raw logit {logitFormatted}.
          </p>
        </div>

        <div className="bg-[#FFFDF9] border-2 border-[#1A1A1A] p-3.5">
          <span className="font-bold text-[#1A1A1A] uppercase flex items-center gap-1.5 mb-1.5">
            <Layers className="w-4 h-4 text-[#8C6D23]" />
            SIGMOID NORMALIZATION S(x)
          </span>
          <p className="text-[#2B2B2B] text-[11px] leading-relaxed">
            Activation formula S(x) = 1/(1+e^-x) squashes logits to probability distribution {relScoreFormatted} ({grade_percentage}%).
          </p>
        </div>
      </div>

      {/* Comparative Script Inspection */}
      <div className="border-2 border-[#1A1A1A] bg-[#FFFDF9] p-4 text-xs">
        <span className="font-bold text-[#1A1A1A] uppercase block border-b border-[#D3CBBE] pb-2 mb-3">
          COMPARATIVE SCRIPT INSPECTION RECORD:
        </span>

        <div className="space-y-3">
          {/* Question Text */}
          <div>
            <span className="font-bold text-[#4A4A4A] text-[11px] uppercase block mb-1">
              QUESTION PAPER SCRIPT:
            </span>
            <div className="bg-[#F2EFE9] border border-[#1A1A1A] p-3 font-mono text-xs text-[#1A1A1A]">
              {questionText || 'No question text ingested.'}
            </div>
          </div>

          {/* Answer Text */}
          <div>
            <span className="font-bold text-[#4A4A4A] text-[11px] uppercase block mb-1">
              STUDENT ANSWER SCRIPT:
            </span>
            <div className="bg-[#F2EFE9] border border-[#1A1A1A] p-3 font-mono text-xs text-[#1A1A1A]">
              {answerText || 'No answer text ingested.'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
