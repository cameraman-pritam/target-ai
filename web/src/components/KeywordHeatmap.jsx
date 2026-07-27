import React, { useState } from 'react';
import { Award, CheckCircle2, XCircle, Plus, Trash2, BookOpen } from 'lucide-react';
import { DEFAULT_RUBRICS } from '../hooks/useTargetEngine';

export default function KeywordHeatmap({
  extractedText,
  activeRubricKey,
  setActiveRubricKey,
  activeRubric,
  rubricEvaluation,
  customKeywords,
  setCustomKeywords,
}) {
  const [newKeyword, setNewKeyword] = useState('');
  const [newPoints, setNewPoints] = useState('1.0');
  const [newRequired, setNewRequired] = useState(true);

  const handleAddKeyword = (e) => {
    e.preventDefault();
    if (!newKeyword.trim()) return;

    setCustomKeywords([
      ...customKeywords,
      {
        term: newKeyword.trim().toLowerCase(),
        points: parseFloat(newPoints) || 1.0,
        required: newRequired,
      },
    ]);
    setNewKeyword('');
  };

  const handleRemoveCustomKeyword = (index) => {
    const updated = [...customKeywords];
    updated.splice(index, 1);
    setCustomKeywords(updated);
  };

  // Render Highlighted Text Engine (Green pills for matches, red underline for emphasis)
  const renderHighlightedText = () => {
    if (!extractedText) {
      return (
        <p className="text-xs text-[#4A4A4A] italic">
          No extracted text available to evaluate.
        </p>
      );
    }

    const { allKeywords } = rubricEvaluation;
    // Build regex pattern for all terms
    const sortedTerms = [...allKeywords]
      .map((k) => k.term)
      .sort((a, b) => b.length - a.length);

    if (sortedTerms.length === 0) {
      return <p className="text-sm text-[#1A1A1A] font-mono">{extractedText}</p>;
    }

    // Escape regex special chars
    const escapedTerms = sortedTerms.map((t) =>
      t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    );
    const regex = new RegExp(`(${escapedTerms.join('|')})`, 'gi');

    const parts = extractedText.split(regex);

    return (
      <div className="font-mono text-sm leading-relaxed text-[#1A1A1A] p-4 bg-[#FFFDF9] border-2 border-[#1A1A1A]">
        {parts.map((part, idx) => {
          const matchedKw = allKeywords.find(
            (k) => k.term.toLowerCase() === part.toLowerCase()
          );

          if (matchedKw) {
            return (
              <span
                key={idx}
                className="inline-block bg-[#2E6F40] text-white px-2 py-0.5 mx-0.5 font-bold border border-[#1A1A1A] shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] text-xs"
                title={`Matched Rubric Term: "${matchedKw.term}" (+${matchedKw.points} marks)`}
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

  const { score, maxMarks, percentage, matched, missing } = rubricEvaluation;

  return (
    <div className="w-full bg-[#FBF8EF] border-2 border-[#1A1A1A] p-5 shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] font-mono">
      {/* Subject Rubric Switcher Tabs */}
      <div className="border-b-2 border-[#1A1A1A] pb-3 mb-5">
        <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
          <h2 className="text-xl font-extrabold text-[#1A1A1A] uppercase tracking-wide flex items-center gap-2">
            <Award className="w-5 h-5" />
            <span>SECTION B: DIAGNOSTIC HEATMAP & RUBRIC EVALUATOR</span>
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

      {/* Question & Marking Scheme Prompt */}
      <div className="mb-5 bg-[#F2EFE9] border border-[#1A1A1A] p-3 text-xs">
        <div className="font-bold text-[#1A1A1A] uppercase mb-1 flex items-center gap-1.5">
          <BookOpen className="w-4 h-4" />
          <span>{activeRubric.subject}</span>
        </div>
        <p className="text-[#2B2B2B] italic">{activeRubric.question}</p>
      </div>

      {/* Score Progress Card */}
      <div className="mb-5 bg-[#FFFDF9] border-2 border-[#1A1A1A] p-4 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-3">
          <div>
            <span className="text-xs font-bold text-[#4A4A4A] uppercase tracking-wider block">
              RUBRIC EVALUATION SCORE
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-extrabold text-[#1A1A1A]">
                {score.toFixed(1)}
              </span>
              <span className="text-lg font-bold text-[#4A4A4A]">
                / {maxMarks} MARKS
              </span>
            </div>
          </div>

          <div className="text-right">
            <div
              className={`inline-block px-3 py-1 border-2 border-[#1A1A1A] text-sm font-bold text-white ${
                percentage >= 80
                  ? 'bg-[#2E6F40]'
                  : percentage >= 50
                  ? 'bg-[#8C6D23]'
                  : 'bg-[#A83232]'
              }`}
            >
              {percentage}% EVALUATION MATCH
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-[#F2EFE9] border-2 border-[#1A1A1A] h-5 p-0.5">
          <div
            className={`h-full transition-all duration-300 ${
              percentage >= 80
                ? 'bg-[#2E6F40]'
                : percentage >= 50
                ? 'bg-[#8C6D23]'
                : 'bg-[#A83232]'
            }`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>

      {/* Realtime Diagnostic Highlighted Text */}
      <div className="mb-5">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-[#1A1A1A] uppercase">
            TEXT HEATMAP (GREEN PILLS = MATCHED RUBRIC KEYWORDS):
          </span>
          <span className="text-[11px] text-[#2E6F40] font-bold">
            {matched.length} Matched / {missing.length} Missing
          </span>
        </div>
        {renderHighlightedText()}
      </div>

      {/* Missing Mandatory Rubric Checklist */}
      <div className="mb-5 grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Matched Keywords */}
        <div className="bg-[#F0F7F2] border-2 border-[#2E6F40] p-3 text-xs">
          <span className="font-bold text-[#2E6F40] uppercase flex items-center gap-1.5 mb-2">
            <CheckCircle2 className="w-4 h-4" />
            MATCHED KEYWORDS ({matched.length})
          </span>
          {matched.length === 0 ? (
            <p className="text-[#4A4A4A] italic">No keywords matched yet.</p>
          ) : (
            <ul className="space-y-1">
              {matched.map((kw, idx) => (
                <li key={idx} className="flex justify-between items-center bg-white border border-[#2E6F40] p-1.5">
                  <span className="font-bold text-[#2E6F40]">✓ {kw.term}</span>
                  <span className="bg-[#2E6F40] text-white px-1.5 py-0.5 text-[10px]">+{kw.points} pts</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Missing Required Keywords */}
        <div className="bg-[#FDF2F2] border-2 border-[#A83232] p-3 text-xs">
          <span className="font-bold text-[#A83232] uppercase flex items-center gap-1.5 mb-2">
            <XCircle className="w-4 h-4" />
            MISSING RUBRIC TERMS ({missing.length})
          </span>
          {missing.length === 0 ? (
            <p className="text-[#2E6F40] font-bold">All mandatory rubric terms satisfied!</p>
          ) : (
            <ul className="space-y-1">
              {missing.map((kw, idx) => (
                <li key={idx} className="flex justify-between items-center bg-white border border-[#A83232] p-1.5">
                  <span className="line-through text-[#A83232] font-bold">✗ {kw.term}</span>
                  <span className="text-[#A83232] text-[10px] font-bold">{kw.required ? 'REQUIRED' : 'OPTIONAL'} ({kw.points} pts)</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Dynamic Custom Keyword Form */}
      <div className="bg-[#F2EFE9] border-2 border-[#1A1A1A] p-4 text-xs">
        <span className="font-bold text-[#1A1A1A] uppercase block mb-2">
          ADD CUSTOM EVALUATION RUBRIC KEYWORD:
        </span>
        <form onSubmit={handleAddKeyword} className="flex flex-wrap gap-2 items-center">
          <input
            type="text"
            placeholder="e.g. conservation of momentum"
            value={newKeyword}
            onChange={(e) => setNewKeyword(e.target.value)}
            className="flex-1 bg-white border border-[#1A1A1A] px-2 py-1 text-xs focus:outline-none"
          />
          <select
            value={newPoints}
            onChange={(e) => setNewPoints(e.target.value)}
            className="bg-white border border-[#1A1A1A] px-2 py-1 text-xs font-bold"
          >
            <option value="0.5">0.5 pts</option>
            <option value="1.0">1.0 pts</option>
            <option value="1.5">1.5 pts</option>
            <option value="2.0">2.0 pts</option>
          </select>
          <label className="flex items-center gap-1 text-[11px] font-bold cursor-pointer select-none">
            <input
              type="checkbox"
              checked={newRequired}
              onChange={(e) => setNewRequired(e.target.checked)}
              className="accent-[#1A1A1A]"
            />
            <span>REQUIRED</span>
          </label>
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
              CUSTOM KEYWORDS ADDED:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {customKeywords.map((kw, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1 bg-white border border-[#1A1A1A] px-2 py-0.5 font-bold"
                >
                  <span>{kw.term} ({kw.points} pts)</span>
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
