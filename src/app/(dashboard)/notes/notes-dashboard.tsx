'use client';

import { useState, useTransition } from 'react';
import { motion } from 'framer-motion';
import { 
  BookMarked, Plus, Save, Terminal, Code2, Play, AlertTriangle, BookOpen, Clipboard
} from 'lucide-react';
import { createNoteDocument, saveNoteContent } from '@/app/actions/notes';

interface NoteDocument {
  id: string;
  title: string;
  author: string;
  totalPages: number;
  currentPage: number;
  status: string;
  notes: string;
  updatedAt: string;
}

interface NotesDashboardProps {
  initialNotes: NoteDocument[];
}

export default function NotesDashboard({ initialNotes }: NotesDashboardProps) {
  const [notes, setNotes] = useState<NoteDocument[]>(initialNotes);
  const [selectedId, setSelectedId] = useState<string | null>(initialNotes[0]?.id || null);
  
  // Note inputs
  const activeNote = notes.find((n) => n.id === selectedId);
  const [noteText, setNoteText] = useState(activeNote?.notes || '');
  const [currentPage, setCurrentPage] = useState(activeNote?.currentPage || 0);

  // Sync state if selection changes
  useState(() => {
    if (activeNote) {
      setNoteText(activeNote.notes);
      setCurrentPage(activeNote.currentPage);
    }
  });

  // Modal dialog states
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newAuthor, setNewAuthor] = useState('');

  // Active sub-tab (notes vs code execution)
  const [activeTab, setActiveTab] = useState<'editor' | 'sandbox'>('editor');

  // Code sandbox states
  const [sandboxCode, setSandboxCode] = useState(`// Javascript Playground
// Write code here and click "Run Snippet" to execute in the browser.

const fibonacci = (n) => {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
};

console.log("Fibonacci of 8 is:", fibonacci(8));
`);
  const [terminalOutput, setTerminalOutput] = useState('Write code above and run to see console outputs.');

  const [isPending, startTransition] = useTransition();

  const handleSelectNote = (id: string) => {
    setSelectedId(id);
    const selected = notes.find((n) => n.id === id);
    if (selected) {
      setNoteText(selected.notes);
      setCurrentPage(selected.currentPage);
    }
  };

  const handleCreateNotebook = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || isPending) return;

    startTransition(async () => {
      const res = await createNoteDocument({ title: newTitle, author: newAuthor });
      if (res?.success && res.noteId) {
        setShowAddModal(false);
        setNewTitle('');
        setNewAuthor('');
        window.location.reload();
      } else if (res?.error) {
        alert(res.error);
      }
    });
  };

  const handleSaveNotes = () => {
    if (!selectedId || isPending) return;
    
    startTransition(async () => {
      const res = await saveNoteContent(selectedId, noteText, currentPage);
      if (res?.success) {
        // Update local state to match
        setNotes((prev) =>
          prev.map((n) =>
            n.id === selectedId
              ? { ...n, notes: noteText, currentPage, status: currentPage >= n.totalPages ? 'COMPLETED' : 'READING' }
              : n
          )
        );
        alert('Notes and page progress saved successfully!');
      } else if (res?.error) {
        alert(res.error);
      }
    });
  };

  // Safe Browser Javascript Runner
  const runJavaScriptCode = () => {
    const logs: string[] = [];
    const originalLog = console.log;

    // Intercept console.log calls
    console.log = (...args) => {
      logs.push(args.map(a => typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a)).join(' '));
    };

    try {
      // Evaluate custom script cleanly inside a closure
      const runner = new Function(sandboxCode);
      const result = runner();
      if (result !== undefined) {
        logs.push(`=> Return Value: ${typeof result === 'object' ? JSON.stringify(result) : String(result)}`);
      }
    } catch (err: any) {
      logs.push(`🔴 Runtime Error: ${err.message}`);
    }

    // Restore original console.log
    console.log = originalLog;
    setTerminalOutput(logs.join('\n') || 'Executed snippet successfully with no logs output.');
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-stretch text-left">
      {/* Left Sidebar: Notebook list (md:col-span-4) */}
      <div className="md:col-span-4 rounded-3xl glass-panel p-5 shadow-sm space-y-4 flex flex-col h-[540px]">
        <div className="flex items-center justify-between shrink-0">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Notes Catalog
          </h3>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1 text-[10px] text-primary bg-primary/10 hover:bg-primary/20 border border-primary/20 px-2 py-1 rounded-lg font-bold uppercase tracking-wider cursor-pointer transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            New Note
          </button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-2 pr-1 scrollbar-thin select-none">
          {notes.length === 0 ? (
            <div className="text-center py-24 text-xs text-muted-foreground border border-dashed border-white/5 rounded-2xl p-4">
              No notes folders available. Click "New Note" to create one.
            </div>
          ) : (
            notes.map((n) => {
              const isSelected = n.id === selectedId;
              const progressPercent = Math.round((n.currentPage / n.totalPages) * 100);

              return (
                <div
                  key={n.id}
                  onClick={() => handleSelectNote(n.id)}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex flex-col gap-1.5 ${
                    isSelected
                      ? 'bg-primary/10 border-primary/20 shadow-sm'
                      : 'bg-white/[0.01] border-white/5 hover:bg-white/5'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="text-xs font-bold text-foreground truncate">{n.title}</h4>
                    <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full shrink-0 border ${
                      n.status === 'COMPLETED'
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        : 'bg-primary/10 text-primary border-primary/20'
                    }`}>
                      {n.status === 'COMPLETED' ? 'Done' : `${progressPercent}%`}
                    </span>
                  </div>

                  <p className="text-[10px] text-muted-foreground truncate">{n.author || 'Unknown Author'}</p>

                  <div className="w-full bg-white/5 rounded-full h-1 mt-1 overflow-hidden">
                    <div
                      className="bg-primary h-full rounded-full transition-all"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Right Panel: Content editor & Code sandbox (md:col-span-8) */}
      <div className="md:col-span-8 space-y-4 flex flex-col h-[540px]">
        {activeNote ? (
          <div className="rounded-3xl glass-panel p-6 shadow-sm flex flex-col flex-1 overflow-hidden space-y-4">
            {/* Header info */}
            <div className="flex items-center justify-between border-b border-white/5 pb-4 shrink-0">
              <div>
                <h3 className="text-sm font-bold text-foreground">{activeNote.title}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">{activeNote.author || 'No Author'}</p>
              </div>

              {/* Page progress slider editor */}
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Page Progress</div>
                  <input
                    type="number"
                    value={currentPage}
                    min={0}
                    max={activeNote.totalPages}
                    onChange={(e) => setCurrentPage(Math.min(activeNote.totalPages, Math.max(0, parseInt(e.target.value) || 0)))}
                    className="w-16 text-center text-xs py-0.5 rounded bg-white/5 border border-white/5 mt-0.5 text-foreground"
                  />
                  <span className="text-[10px] text-muted-foreground font-semibold ml-1">/ {activeNote.totalPages}</span>
                </div>
                
                <button
                  onClick={handleSaveNotes}
                  disabled={isPending}
                  className="px-3.5 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/95 transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Save className="h-4 w-4" />
                  Save Workspace
                </button>
              </div>
            </div>

            {/* Tab switch headers */}
            <div className="flex border-b border-white/5 shrink-0 select-none">
              <button
                onClick={() => setActiveTab('editor')}
                className={`px-4 py-2 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'editor'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                <BookOpen className="h-4 w-4" />
                Notes Summary
              </button>
              <button
                onClick={() => setActiveTab('sandbox')}
                className={`px-4 py-2 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'sandbox'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                <Code2 className="h-4 w-4" />
                Code Execution
              </button>
            </div>

            {/* Core workspace layout tabs content */}
            <div className="flex-1 overflow-hidden min-h-0 relative">
              {activeTab === 'editor' ? (
                <textarea
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  className="w-full h-full px-4 py-3 rounded-2xl glass-input text-xs text-foreground placeholder-muted-foreground/50 resize-none focus:outline-none scrollbar-thin"
                  placeholder="Summarize your notebook readings, formulate guides..."
                />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-full items-stretch">
                  {/* Left Side: Code Editor */}
                  <div className="flex flex-col space-y-2 h-full">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">
                        Editor (Javascript)
                      </span>
                      <button
                        onClick={runJavaScriptCode}
                        className="flex items-center gap-1.5 text-[9px] text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 px-2.5 py-1 rounded-lg font-bold uppercase tracking-wider cursor-pointer"
                      >
                        <Play className="h-3.5 w-3.5 fill-current" />
                        Run Snippet
                      </button>
                    </div>
                    <textarea
                      value={sandboxCode}
                      onChange={(e) => setSandboxCode(e.target.value)}
                      className="flex-1 p-3 rounded-xl border border-white/5 bg-black/40 text-[11px] font-mono text-emerald-300 resize-none focus:outline-none focus:border-primary/40 scrollbar-none"
                    />
                  </div>

                  {/* Right Side: Output Terminal */}
                  <div className="flex flex-col space-y-2 h-full">
                    <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider flex items-center gap-1">
                      <Terminal className="h-3.5 w-3.5 text-primary" />
                      Console Output
                    </span>
                    <pre className="flex-1 p-3 rounded-xl border border-white/5 bg-black/60 text-[11px] font-mono text-zinc-300 overflow-y-auto whitespace-pre-wrap scrollbar-thin">
                      {terminalOutput}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="rounded-3xl glass-panel p-6 shadow-sm flex flex-col items-center justify-center flex-1 text-center py-24 select-none border border-dashed border-white/5">
            <BookMarked className="h-12 w-12 text-muted-foreground/40 animate-pulse" />
            <h3 className="text-sm font-bold text-foreground mt-4">No active notebook selected</h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-[280px] leading-relaxed">
              Create a new guide notebook or select an existing notes template to access code editor sheets.
            </p>
          </div>
        )}
      </div>

      {/* Add Notebook Modal Dialog */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="rounded-3xl border border-white/10 bg-card p-6 shadow-xl w-full max-w-sm text-left relative"
          >
            <h4 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2">
              <BookMarked className="h-4.5 w-4.5 text-primary" />
              Add New Notebook
            </h4>

            <form onSubmit={handleCreateNotebook} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
                  Notebook Title
                </label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl glass-input text-xs text-foreground"
                  placeholder="e.g. Compiler Design Parser Notes"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
                  Author / Reference Guide
                </label>
                <input
                  type="text"
                  value={newAuthor}
                  onChange={(e) => setNewAuthor(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl glass-input text-xs text-foreground"
                  placeholder="e.g. Martin Kleppmann"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-1.5 rounded-xl border border-white/5 hover:bg-white/5 text-muted-foreground text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-3 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/95 transition-all cursor-pointer disabled:opacity-50"
                >
                  Create Document
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
