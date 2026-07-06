'use client';

import { useState, useTransition } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  PenTool, Eye, EyeOff, Save, Calendar, Sparkles, BookOpen, ChevronDown, ChevronUp
} from 'lucide-react';
import { saveJournalEntry } from '@/app/actions/journal';
import confetti from 'canvas-confetti';

interface JournalEntry {
  id: string;
  content: string;
  moodScore: number;
  date: string;
}

interface JournalDashboardProps {
  todayEntry: JournalEntry | null;
  initialEntries: JournalEntry[];
}

const MOODS = [
  { score: 1, emoji: '😢', label: 'Struggling' },
  { score: 2, emoji: '😕', label: 'Off-beat' },
  { score: 3, emoji: '😐', label: 'Balanced' },
  { score: 4, emoji: '🙂', label: 'Good' },
  { score: 5, emoji: '😄', label: 'Energetic' },
];

export default function JournalDashboard({ todayEntry, initialEntries }: JournalDashboardProps) {
  const [entries] = useState<JournalEntry[]>(initialEntries);
  const [content, setContent] = useState(todayEntry?.content || '');
  const [moodScore, setMoodScore] = useState(todayEntry?.moodScore || 3);
  const [isPreview, setIsPreview] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [isPending, startTransition] = useTransition();

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || isPending) return;

    startTransition(async () => {
      const res = await saveJournalEntry({ content, moodScore });
      if (res?.success) {
        if (res.created) {
          confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 },
          });
        }
        window.location.reload();
      } else if (res?.error) {
        alert(res.error);
      }
    });
  };

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  // Helper parser for inline bold tags and headers in history previews
  const parseMarkdown = (text: string) => {
    return text.split('\n').map((line, i) => {
      if (line.startsWith('### ')) {
        return <h4 key={i} className="text-sm font-bold text-primary mt-2 mb-1">{line.substring(4)}</h4>;
      }
      if (line.startsWith('#### ')) {
        return <h5 key={i} className="text-xs font-bold text-foreground mt-2 mb-1">{line.substring(5)}</h5>;
      }
      if (line.startsWith('* ') || line.startsWith('- ')) {
        return <li key={i} className="text-xs text-muted-foreground list-disc ml-4 my-0.5">{line.substring(2)}</li>;
      }
      if (!line.trim()) {
        return <div key={i} className="h-1.5" />;
      }
      return <p key={i} className="text-xs leading-relaxed text-foreground/90 my-0.5">{line}</p>;
    });
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start text-left">
      {/* Left Panel: Today's Reflection Editor (md:col-span-7) */}
      <div className="md:col-span-7 rounded-3xl glass-panel p-6 shadow-sm space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <PenTool className="h-5 w-5 text-primary" />
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Today's Reflection Entry
            </h3>
          </div>

          <button
            onClick={() => setIsPreview(!isPreview)}
            className="flex items-center gap-1 text-[10px] text-primary bg-primary/10 border border-primary/20 px-2.5 py-1 rounded-lg font-bold uppercase tracking-wider cursor-pointer"
          >
            {isPreview ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            {isPreview ? 'Write log' : 'Preview md'}
          </button>
        </div>

        <form onSubmit={handleSave} className="space-y-6">
          {/* Mood selection row */}
          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              How is your energy score today?
            </label>
            <div className="grid grid-cols-5 gap-3">
              {MOODS.map((m) => {
                const isSelected = moodScore === m.score;
                return (
                  <button
                    key={m.score}
                    type="button"
                    onClick={() => setMoodScore(m.score)}
                    className={`flex flex-col items-center justify-center py-2.5 rounded-2xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-primary/15 border-primary text-foreground shadow-sm shadow-primary/10'
                        : 'bg-white/[0.01] border-white/5 text-muted-foreground hover:bg-white/5 hover:text-foreground'
                    }`}
                  >
                    <span className="text-2xl">{m.emoji}</span>
                    <span className="text-[9px] font-semibold mt-1.5 uppercase tracking-wider scale-90">
                      {m.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Core editor text area or preview */}
          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Write reflection log *(supports Markdown headers & bullet lists)*
            </label>

            {isPreview ? (
              <div className="w-full h-64 px-4 py-3 rounded-2xl border border-white/5 bg-white/[0.02] text-foreground overflow-y-auto scrollbar-thin">
                {content.trim() ? (
                  <div className="space-y-1">{parseMarkdown(content)}</div>
                ) : (
                  <p className="text-xs text-muted-foreground italic my-2">
                    Nothing typed yet. Use Markdown tags to preview lists and headings.
                  </p>
                )}
              </div>
            ) : (
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="w-full h-64 px-4 py-3 rounded-2xl glass-input text-xs text-foreground placeholder-muted-foreground/50 resize-none focus:outline-none scrollbar-thin"
                placeholder={`### Today's Reflection
Today went well. Completed my compiler syntax algorithms and spent 50 focus minutes.

#### Highlights
- Completed study planner blocks
- Rescued my habits checks using a Streak Freeze

#### Next targets
1. Review binary search tree cards`}
              />
            )}
          </div>

          <button
            type="submit"
            disabled={!content.trim() || isPending}
            className="w-full py-3.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/95 transition-all shadow-md shadow-primary/10 cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            {isPending ? 'Saving Reflection...' : 'Save daily log'}
          </button>
        </form>
      </div>

      {/* Right Panel: Past Journal Logs (md:col-span-5) */}
      <div className="md:col-span-5 rounded-3xl glass-panel p-6 shadow-sm space-y-6 h-[510px] flex flex-col overflow-hidden">
        <div className="flex items-center gap-2 shrink-0">
          <BookOpen className="h-5 w-5 text-primary" />
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Past reflection history
          </h3>
        </div>

        <div className="flex-1 overflow-y-auto space-y-3.5 pr-1 scrollbar-thin select-none">
          {entries.length === 0 ? (
            <div className="text-center py-24 text-xs text-muted-foreground border border-dashed border-white/5 rounded-3xl p-6">
              No journals saved yet. Write today's reflection to start your log.
            </div>
          ) : (
            entries.map((e) => {
              const isExpanded = expandedId === e.id;
              const matchingMood = MOODS.find((m) => m.score === e.moodScore);

              return (
                <div
                  key={e.id}
                  className="rounded-2xl border border-white/5 bg-white/[0.01] hover:border-white/10 transition-colors overflow-hidden"
                >
                  {/* Summary trigger row */}
                  <div
                    onClick={() => toggleExpand(e.id)}
                    className="p-3.5 flex items-center justify-between cursor-pointer"
                  >
                    <div>
                      <div className="text-xs font-bold text-foreground flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5 text-primary shrink-0" />
                        {new Date(e.date).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </div>
                      <span className="text-[10px] text-muted-foreground font-semibold mt-1 flex items-center gap-1 uppercase tracking-wider">
                        Energy Index: {matchingMood?.emoji} {matchingMood?.label}
                      </span>
                    </div>

                    {isExpanded ? (
                      <ChevronUp className="h-4.5 w-4.5 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-4.5 w-4.5 text-muted-foreground" />
                    )}
                  </div>

                  {/* Expanded content */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: 'auto' }}
                        exit={{ height: 0 }}
                        className="border-t border-white/5 bg-white/[0.005] overflow-hidden"
                      >
                        <div className="p-4 space-y-1 max-h-60 overflow-y-auto scrollbar-thin">
                          {parseMarkdown(e.content)}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
