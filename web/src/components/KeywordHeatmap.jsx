import React, { useState } from 'react';
import { Award, CheckCircle2, XCircle, Plus, Trash2, BookOpen, Cpu } from 'lucide-react';
import { DEFAULT_RUBRICS } from '../hooks/useTargetEngine';

export default function KeywordHeatmap({
  extractedText,
  activeRubricKey,
  setActiveRubricKey,
  activeRubric,
  apiResult,
  customKeywords,
  setCustomKeywords,
}) {
  const [newKeyword, setNewKeyword] = useState('');

  const handleAddKeyword = (e) => {
    e.preventDefault();
    if (!newKeyword.trim()) return;

    if (!customKeywords.includes(newKeyword.trim().toLowerCase())) {
      setCustomKeywords([...customKeywords, newKeyword.trim().toLowerCase()]);
    }
    setNewKeyword('');
  };

  const handleRemoveCustomKeyword = (index) => {
    const updated = [...customKeywords];
    updated.splice(index, 1);
    setCustomKeywords(updated);
  };

  // Derive matched and missing keywords from backend API result or rubric list
  const matchedKeywords = apiResult?.matched_keywords || [];
  const missingKeywords = apiResult?.missing_keywords || [];
  const scorePercentage = apiResult?.score_percentage ?? 0;

  // Render Highlighted Text Engine (Green pills for matched, text display)
  const renderHighlightedText = () => {
    if (!extractedText) {
      return (
        <p className="text-xs text-[#4A4A4A] italic">
          No extracted text available to evaluate.
        </p>
      );
    }

    if (matchedKeywords.length === 0) {
      return <p className="text-sm text-[#1A1A1A] font-mono leading-relaxed p-4 bg-[#FFFDF9] border-2 border-[#1A1A1A]">{extractedText}</p>;
    }

    // Sort matched terms by length descending for regex matching
    const sortedMatched = [...matchedKeywords].sort((a, b) => b.length - a.length);
    const escapedTerms = sortedMatched.map((t) =>
      t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    );
    const regex = new RegExp(`(${escapedTerms.join('|')})`, 'gi');

    const parts = extractedText.split(regex);

    return (
      <div className="font-mono text-sm leading-relaxed text-[#1A1A1A] p-4 bg-[#FFFDF9] border-2 border-[#1A1A1A]">
        {parts.map((part, idx) => {
          const isMatched = matchedKeywords.some(
            (kw) => kw.toLowerCase() === part.toLowerCase()
          );

          if (isMatched) {
            return (
              <span
                key={idx}
                className="inline-block bg-[#2E6F40] text-white px-2 py-0.5 mx-0.5 font-bold border border-[#1A1A1A] shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] text-xs"
                title={`Matched C++ NLP Keyword: "${part}"`}
              >
                ✓ {part}
              </span>
            );
          }
          return <span key={idx}>{part}</span>;
        })}
      </div>
    );
  };

  return (
    <div className="w-full bg-[#FBF8EF] border-2 border-[#1A1A1A] p-5 shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] font-mono">
      {/* Subject Rubric Switcher Tabs */}
      <div className="border-b-2 border-[#1A1A1A] pb-3 mb-5">
        <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
          <h2 className="text-xl font-extrabold text-[#1A1A1A] uppercase tracking-wide flex items-center gap-2">
            <Award className="w-5 h-5" />
            <span>SECTION B: C++ NLP DIAGNOSTIC HEATMAP</span>
          </h2>
        </div>

        <div className="flex flex-wrap gap-2">
          {Object.keys(DEFAULT_RUBRICS).map((key) => {
            const rub = DEFAULT_RUBRICS[key];
            const isActive = activeRubricKey === key;
            return (
              <button
                key={key}
                onClick={() => setActiveRubricKey(key)}
                className={`px-3 py-1.5 border-2 border-[#1A1A1A] font-bold text-xs uppercase press-btn ${
                  isActive
                    ? 'bg-[#1A1A1A] text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
                    : 'bg-[#F2EFE9] hover:bg-[#E6E0D4] text-[#1A1A1A]'
                }`}
              >
                {rub.id}
              </button>
            );
          })}
        </div>
      </div>

      {/* Question Prompt */}
      <div className="mb-5 bg-[#F2EFE9] border border-[#1A1A1A] p-3 text-xs">
        <div className="font-bold text-[#1A1A1A] uppercase mb-1 flex items-center gap-1.5">
          <BookOpen className="w-4 h-4" />
          <span>{activeRubric.subject}</span>
        </div>
        <p className="text-[#2B2B2B] italic">{activeRubric.question}</p>
      </div>

      {/* C++ NLP Score Card Driven strictly by API payload */}
      <div className="mb-5 bg-[#FFFDF9] border-2 border-[#1A1A1A] p-4 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-3">
          <div>
            <span className="text-xs font-bold text-[#4A4A4A] uppercase tracking-wider block flex items-center gap-1">
              <Cpu className="w-3.5 h-3.5 text-[#2E6F40]" />
              C++ CROW NLP SCORE PERCENTAGE
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-extrabold text-[#1A1A1A]">
                {scorePercentage.toFixed(1)}%
              </span>
            </div>
          </div>

          <div className="text-right">
            <div
              className={`inline-block px-3 py-1 border-2 border-[#1A1A1A] text-xs font-bold text-white uppercase ${
                scorePercentage >= 75
                  ? 'bg-[#2E6F40]'
                  : scorePercentage >= 50
                  ? 'bg-[#8C6D23]'
                  : 'bg-[#A83232]'
              }`}
            >
              {apiResult ? `STATUS: ${apiResult.status}` : 'READY FOR EVALUATION'}
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-[#F2EFE9] border-2 border-[#1A1A1A] h-5 p-0.5">
          <div
            className={`h-full transition-all duration-300 ${
              scorePercentage >= 75
                ? 'bg-[#2E6F40]'
                : scorePercentage >= 50
                ? 'bg-[#8C6D23]'
                : 'bg-[#A83232]'
            }`}
            style={{ width: `${Math.min(100, Math.max(0, scorePercentage))}%` }}
          />
        </div>
      </div>

      {/* Realtime Diagnostic Highlighted Text */}
      <div className="mb-5">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-[#1A1A1A] uppercase">
            TEXT HEATMAP (GREEN PILLS = MATCHED C++ KEYWORDS):
          </span>
          <span className="text-[11px] text-[#2E6F40] font-bold">
            {matchedKeywords.length} Matched / {missingKeywords.length} Missing
          </span>
        </div>
        {renderHighlightedText()}
      </div>

      {/* Matched vs Missing Keywords Badges */}
      <div className="mb-5 grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Matched Keywords */}
        <div className="bg-[#F0F7F2] border-2 border-[#2E6F40] p-3 text-xs">
          <span className="font-bold text-[#2E6F40] uppercase flex items-center gap-1.5 mb-2">
            <CheckCircle2 className="w-4 h-4" />
            MATCHED KEYWORDS ({matchedKeywords.length})
          </span>
          {matchedKeywords.length === 0 ? (
            <p className="text-[#4A4A4A] italic">No keywords matched yet.</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {matchedKeywords.map((kw, idx) => (
                <span
                  key={idx}
                  className="bg-[#2E6F40] text-white px-2 py-1 font-bold border border-[#1A1A1A] text-[11px] shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]"
                >
                  ✓ {kw}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Missing Keywords */}
        <div className="bg-[#FDF2F2] border-2 border-[#A83232] p-3 text-xs">
          <span className="font-bold text-[#A83232] uppercase flex items-center gap-1.5 mb-2">
            <XCircle className="w-4 h-4" />
            MISSING KEYWORDS ({missingKeywords.length})
          </span>
          {missingKeywords.length === 0 ? (
            <p className="text-[#2E6F40] font-bold">All mandatory rubric terms satisfied!</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {missingKeywords.map((kw, idx) => (
                <span
                  key={idx}
                  className="bg-[#A83232] text-white px-2 py-1 font-bold border border-[#1A1A1A] text-[11px] line-through shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]"
                >
                  ✗ {kw}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Dynamic Custom Keyword Form */}
      <div className="bg-[#F2EFE9] border-2 border-[#1A1A1A] p-4 text-xs">
        <span className="font-bold text-[#1A1A1A] uppercase block mb-2">
          ADD CUSTOM RUBRIC KEYWORD FOR C++ NLP EVALUATION:
        </span>
        <form onSubmit={handleAddKeyword} className="flex flex-wrap gap-2 items-center">
          <input
            type="text"
            placeholder="e.g. conservation of momentum"
            value={newKeyword}
            onChange={(e) => setNewKeyword(e.target.value)}
            className="flex-1 bg-white border border-[#1A1A1A] px-2 py-1 text-xs focus:outline-none"
          />
          <button
            type="submit"
            className="px-3 py-1 border border-[#1A1A1A] bg-[#1A1A1A] text-white font-bold press-btn flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" />
            ADD KEYWORD
          </button>
        </form>

        {/* Custom Keywords List */}
        {customKeywords.length > 0 && (
          <div className="mt-3 pt-2 border-t border-[#D3CBBE]">
            <span className="font-bold text-[#4A4A4A] text-[11px] block mb-1">
              CUSTOM KEYWORDS INCLUDED IN NLP EVALUATION:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {customKeywords.map((kw, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1 bg-white border border-[#1A1A1A] px-2 py-0.5 font-bold"
                >
                  <span>{kw}</span>
                  <button
                    onClick={() => handleRemoveCustomKeyword(idx)}
                    className="text-[#A83232] hover:text-black ml-1"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
