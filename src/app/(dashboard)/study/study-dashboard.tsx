'use client';

import { useState, useTransition } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, Target, Trash2, Edit2, X, ChevronRight, CheckSquare, 
  RotateCcw, Sparkles, BookOpen, Layers, Award, AlertCircle
} from 'lucide-react';
import { createSubject, createTopic, createFlashcard, submitFlashcardGrade } from '@/app/actions/study';
import confetti from 'canvas-confetti';

interface Topic {
  id: string;
  name: string;
  cardsCount: number;
  dueCount: number;
}

interface Subject {
  id: string;
  name: string;
  topics: Topic[];
}

interface DueCard {
  id: string;
  front: string;
  back: string;
  ease: number;
  repetitions: number;
  interval: number;
  topicName: string;
  subjectName: string;
}

interface StudyDashboardProps {
  initialSubjects: Subject[];
  dueCards: DueCard[];
}

export default function StudyDashboard({ initialSubjects, dueCards }: StudyDashboardProps) {
  const [subjects, setSubjects] = useState<Subject[]>(initialSubjects);
  const [reviewerQueue, setReviewerQueue] = useState<DueCard[]>(dueCards);
  
  // Reviewer session state
  const [isReviewing, setIsReviewing] = useState(false);
  const [currentQueueIdx, setCurrentQueueIdx] = useState(0);
  const [isCardFlipped, setIsCardFlipped] = useState(false);

  // Modals state
  const [isSubjectOpen, setIsSubjectOpen] = useState(false);
  const [isTopicOpen, setIsTopicOpen] = useState(false);
  const [isCardOpen, setIsCardOpen] = useState(false);

  // Form states
  const [subjectName, setSubjectName] = useState('');
  const [topicName, setTopicName] = useState('');
  const [selectedSubjectId, setSelectedSubjectId] = useState(initialSubjects[0]?.id || '');
  const [cardFront, setCardFront] = useState('');
  const [cardBack, setCardBack] = useState('');
  const [selectedTopicId, setSelectedTopicId] = useState('');

  const [isPending, startTransition] = useTransition();

  const totalDueCount = reviewerQueue.length;

  const handleCreateSubject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subjectName.trim()) return;

    startTransition(async () => {
      const res = await createSubject(subjectName);
      if (!res.error && res.subject) {
        const added: Subject = {
          id: res.subject.id,
          name: res.subject.name,
          topics: [],
        };
        setSubjects((prev) => [added, ...prev]);
        setSelectedSubjectId(added.id);
        setIsSubjectOpen(false);
        setSubjectName('');
      }
    });
  };

  const handleCreateTopic = (e: React.FormEvent) => {
    e.preventDefault();
    if (!topicName.trim() || !selectedSubjectId) return;

    startTransition(async () => {
      const res = await createTopic(selectedSubjectId, topicName);
      if (!res.error && res.topic) {
        setSubjects((prev) =>
          prev.map((s) => {
            if (s.id !== selectedSubjectId) return s;
            return {
              ...s,
              topics: [
                ...s.topics,
                { id: res.topic.id, name: res.topic.name, cardsCount: 0, dueCount: 0 },
              ],
            };
          })
        );
        setSelectedTopicId(res.topic.id);
        setIsTopicOpen(false);
        setTopicName('');
      }
    });
  };

  const handleCreateCard = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cardFront.trim() || !cardBack.trim() || !selectedTopicId) return;

    startTransition(async () => {
      const res = await createFlashcard(selectedTopicId, cardFront, cardBack);
      if (!res.error && res.card) {
        // Increment cards count in client list
        setSubjects((prev) =>
          prev.map((s) => ({
            ...s,
            topics: s.topics.map((t) => {
              if (t.id !== selectedTopicId) return t;
              return {
                ...t,
                cardsCount: t.cardsCount + 1,
                dueCount: t.dueCount + 1, // Newly created cards are immediately due
              };
            }),
          }))
        );

        // Put the card into reviewer queue as well!
        const addedCard: DueCard = {
          id: res.card.id,
          front: res.card.front,
          back: res.card.back,
          ease: res.card.ease,
          repetitions: res.card.repetitions,
          interval: res.card.interval,
          topicName: '', // Optional details
          subjectName: '',
        };

        setReviewerQueue((prev) => [...prev, addedCard]);
        setIsCardOpen(false);
        setCardFront('');
        setCardBack('');
      }
    });
  };

  const handleGradeCard = (grade: number) => {
    const activeCard = reviewerQueue[currentQueueIdx];
    if (!activeCard) return;

    // 1. Trigger database SM-2 scheduler update
    startTransition(async () => {
      const res = await submitFlashcardGrade({ cardId: activeCard.id, grade });
      if (!res.error) {
        // Progress reviewer queue index
        setIsCardFlipped(false);
        setTimeout(() => {
          if (currentQueueIdx + 1 >= reviewerQueue.length) {
            // End of review session
            confetti({
              particleCount: 150,
              spread: 80,
              origin: { y: 0.6 },
            });
            setIsReviewing(false);
            // Refresh counts
            window.location.reload();
          } else {
            setCurrentQueueIdx((idx) => idx + 1);
          }
        }, 300);
      }
    });
  };

  // Filter topics based on active subject selection in modals
  const activeSubject = subjects.find((s) => s.id === selectedSubjectId);
  const modalTopics = activeSubject ? activeSubject.topics : [];

  return (
    <div className="space-y-6 text-left">
      {/* Top Banner metrics summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="rounded-3xl glass-panel p-6 flex items-center justify-between shadow-sm md:col-span-2">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-2xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center">
              <BookOpen className="h-6 w-6" />
            </div>
            <div>
              <h4 className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Due for revision</h4>
              <div className="text-2xl font-bold text-foreground mt-0.5">
                {totalDueCount} <span className="text-xs text-muted-foreground font-medium">Decks flashcards due</span>
              </div>
            </div>
          </div>
          
          <button
            onClick={() => {
              if (totalDueCount > 0) {
                setCurrentQueueIdx(0);
                setIsCardFlipped(false);
                setIsReviewing(true);
              } else {
                alert('No cards due for review today. Add new flashcards to practice!');
              }
            }}
            disabled={totalDueCount === 0}
            className="px-4 py-2 bg-primary text-primary-foreground font-semibold text-xs rounded-xl hover:bg-primary/95 shadow-md shadow-primary/10 transition-all cursor-pointer disabled:opacity-50"
          >
            Review Due Deck
          </button>
        </div>

        <div className="rounded-3xl glass-panel p-6 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-2xl bg-amber-500/10 text-amber-500 border border-amber-500/20 flex items-center justify-center">
              <Award className="h-6 w-6" />
            </div>
            <div>
              <h4 className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Revision XP</h4>
              <div className="text-2xl font-bold text-foreground mt-0.5">+10 XP</div>
            </div>
          </div>
          <span className="text-[10px] text-muted-foreground bg-white/5 px-2 py-1 rounded-full uppercase tracking-wider font-semibold">
            Per reviewed card
          </span>
        </div>
      </div>

      {/* Subjects and actions list header */}
      <div className="flex items-center justify-between mt-6">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Revision Decks
        </h3>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsSubjectOpen(true)}
            className="px-3 py-1.5 bg-white/5 border border-white/5 text-muted-foreground hover:text-foreground hover:bg-white/10 text-xs font-semibold rounded-xl transition-all cursor-pointer flex items-center gap-1"
          >
            <Plus className="h-3.5 w-3.5" />
            New Subject
          </button>
          <button
            onClick={() => {
              if (subjects.length > 0) {
                setSelectedSubjectId(subjects[0].id);
                setIsTopicOpen(true);
              } else {
                alert('Please create a Subject deck first!');
              }
            }}
            className="px-3 py-1.5 bg-white/5 border border-white/5 text-muted-foreground hover:text-foreground hover:bg-white/10 text-xs font-semibold rounded-xl transition-all cursor-pointer flex items-center gap-1"
          >
            <Plus className="h-3.5 w-3.5" />
            New Topic
          </button>
          <button
            onClick={() => {
              if (subjects.length > 0) {
                setSelectedSubjectId(subjects[0].id);
                const sub = subjects[0];
                if (sub.topics.length > 0) {
                  setSelectedTopicId(sub.topics[0].id);
                }
                setIsCardOpen(true);
              } else {
                alert('Please create study subjects and topics first!');
              }
            }}
            className="px-3 py-1.5 bg-primary text-primary-foreground text-xs font-semibold rounded-xl hover:bg-primary/95 shadow-md shadow-primary/10 transition-all cursor-pointer flex items-center gap-1"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Flashcard
          </button>
        </div>
      </div>

      {/* Grid listing Subjects */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {subjects.map((s) => {
          const totalCards = s.topics.reduce((acc, curr) => acc + curr.cardsCount, 0);
          const totalDue = s.topics.reduce((acc, curr) => acc + curr.dueCount, 0);

          return (
            <div
              key={s.id}
              className="rounded-3xl border border-border bg-card/60 p-6 shadow-sm hover:border-white/10 hover:shadow-lg transition-all text-left space-y-4"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="text-base font-bold text-foreground">
                    {s.name}
                  </h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    Contains {s.topics.length} topics • {totalCards} cards total
                  </p>
                </div>

                <div className="text-xs font-bold text-primary bg-primary/10 border border-primary/20 px-2.5 py-0.5 rounded-full">
                  {totalDue} due today
                </div>
              </div>

              {/* Topics breakdown checklist */}
              <div className="space-y-2 pt-2 border-t border-white/5">
                {s.topics.map((t) => (
                  <div
                    key={t.id}
                    className="flex items-center justify-between p-2 rounded-xl bg-white/[0.01] border border-white/5 text-xs text-foreground/80 font-medium"
                  >
                    <span className="flex items-center gap-1.5 truncate">
                      <Layers className="h-3.5 w-3.5 text-muted-foreground/60" />
                      {t.name}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {t.cardsCount} cards ({t.dueCount} due)
                    </span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* DETAILED ACTIVE FLASHCARD REVIEWER MODAL */}
      <AnimatePresence>
        {isReviewing && reviewerQueue[currentQueueIdx] && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-[500px] rounded-3xl glass-panel p-6 shadow-2xl relative flex flex-col items-center justify-between min-h-[460px] text-center"
            >
              {/* Close session button */}
              <button
                onClick={() => {
                  if (confirm('Exit study review session? Progress will be saved.')) {
                    setIsReviewing(false);
                    window.location.reload();
                  }
                }}
                className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-white/5 text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
              >
                <X className="h-5 w-5" />
              </button>

              {/* Deck info */}
              <div className="w-full">
                <span className="text-[10px] font-bold text-primary uppercase tracking-wider bg-primary/10 px-2 py-0.5 rounded-full border border-primary/20">
                  {reviewerQueue[currentQueueIdx].subjectName} • {reviewerQueue[currentQueueIdx].topicName}
                </span>
                <p className="text-xs text-muted-foreground mt-2 font-semibold">
                  Card {currentQueueIdx + 1} of {totalDueCount}
                </p>
              </div>

              {/* 3D Card Flip animation Container */}
              <div
                onClick={() => setIsCardFlipped((f) => !f)}
                className="my-6 w-full max-w-[380px] h-[220px] relative cursor-pointer group"
                style={{ perspective: '1000px' }}
              >
                <motion.div
                  animate={{ rotateY: isCardFlipped ? 180 : 0 }}
                  transition={{ duration: 0.5, ease: 'easeInOut' }}
                  className="w-full h-full relative"
                  style={{ transformStyle: 'preserve-3d' }}
                >
                  {/* Front Face */}
                  <div
                    className="absolute inset-0 rounded-2xl border border-white/10 bg-zinc-950 p-6 flex flex-col items-center justify-center shadow-lg backface-hidden"
                  >
                    <span className="text-[10px] text-muted-foreground/60 uppercase font-bold tracking-wider absolute top-4">
                      Front (Question)
                    </span>
                    <p className="text-base font-semibold leading-relaxed text-foreground text-center">
                      {reviewerQueue[currentQueueIdx].front}
                    </p>
                    <span className="text-[10px] text-primary/60 group-hover:text-primary uppercase font-bold tracking-wider absolute bottom-4 transition-colors">
                      Click card to flip
                    </span>
                  </div>

                  {/* Back Face */}
                  <div
                    className="absolute inset-0 rounded-2xl border border-primary/20 bg-zinc-950/90 p-6 flex flex-col items-center justify-center shadow-lg backface-hidden"
                    style={{ transform: 'rotateY(180deg)' }}
                  >
                    <span className="text-[10px] text-primary/60 uppercase font-bold tracking-wider absolute top-4">
                      Back (Answer)
                    </span>
                    <p className="text-base font-semibold leading-relaxed text-foreground text-center">
                      {reviewerQueue[currentQueueIdx].back}
                    </p>
                  </div>
                </motion.div>
              </div>

              {/* SM-2 Grading system panel (Displays when card is flipped!) */}
              <div className="w-full min-h-[80px] flex flex-col justify-center">
                <AnimatePresence mode="wait">
                  {isCardFlipped ? (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="space-y-3 w-full"
                    >
                      <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider block">
                        Rate your memory recall quality:
                      </span>
                      <div className="flex justify-between items-center gap-1 px-2">
                        {[
                          { grade: 0, label: '0', title: 'Blackout', color: 'hover:bg-red-500 hover:border-red-500 text-red-400' },
                          { grade: 1, label: '1', title: 'Fail', color: 'hover:bg-orange-500 hover:border-orange-500 text-orange-400' },
                          { grade: 2, label: '2', title: 'Flaky', color: 'hover:bg-amber-500 hover:border-amber-500 text-amber-400' },
                          { grade: 3, label: '3', title: 'Hard', color: 'hover:bg-blue-500 hover:border-blue-500 text-blue-400' },
                          { grade: 4, label: '4', title: 'Good', color: 'hover:bg-indigo-500 hover:border-indigo-500 text-indigo-400' },
                          { grade: 5, label: '5', title: 'Easy', color: 'hover:bg-emerald-500 hover:border-emerald-500 text-emerald-400' },
                        ].map((btn) => (
                          <button
                            key={btn.grade}
                            onClick={() => handleGradeCard(btn.grade)}
                            disabled={isPending}
                            className={`h-9 w-9 rounded-xl border border-white/10 text-xs font-bold transition-all bg-card cursor-pointer flex items-center justify-center ${btn.color} hover:text-white disabled:opacity-50`}
                            title={btn.title}
                          >
                            {btn.label}
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  ) : (
                    <motion.span
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 0.5 }}
                      className="text-xs text-muted-foreground italic"
                    >
                      Flip card to grade your recall...
                    </motion.span>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* NEW SUBJECT MODAL */}
      <AnimatePresence>
        {isSubjectOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-[400px] rounded-3xl glass-panel p-6 shadow-2xl relative"
            >
              <button
                onClick={() => setIsSubjectOpen(false)}
                className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-white/5 text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
              >
                <X className="h-5 w-5" />
              </button>

              <h3 className="text-lg font-bold text-foreground mb-4">
                Create Subject Deck
              </h3>

              <form onSubmit={handleCreateSubject} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                    Subject Name
                  </label>
                  <input
                    type="text"
                    required
                    value={subjectName}
                    onChange={(e) => setSubjectName(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl glass-input text-sm text-foreground"
                    placeholder="Computer Science, Biology, Law..."
                  />
                </div>

                <button
                  type="submit"
                  disabled={isPending}
                  className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/95 transition-all shadow-md shadow-primary/10 cursor-pointer disabled:opacity-50"
                >
                  {isPending ? 'Syncing...' : 'Create Subject'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* NEW TOPIC MODAL */}
      <AnimatePresence>
        {isTopicOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-[400px] rounded-3xl glass-panel p-6 shadow-2xl relative"
            >
              <button
                onClick={() => setIsTopicOpen(false)}
                className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-white/5 text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
              >
                <X className="h-5 w-5" />
              </button>

              <h3 className="text-lg font-bold text-foreground mb-4">
                Configure Study Topic
              </h3>

              <form onSubmit={handleCreateTopic} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                    Subject Parent
                  </label>
                  <select
                    value={selectedSubjectId}
                    onChange={(e) => setSelectedSubjectId(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl glass-input text-sm text-foreground bg-card cursor-pointer"
                  >
                    {subjects.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                    Topic Name
                  </label>
                  <input
                    type="text"
                    required
                    value={topicName}
                    onChange={(e) => setTopicName(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl glass-input text-sm text-foreground"
                    placeholder="Compiler Parsing, Biochemistry, Contracts..."
                  />
                </div>

                <button
                  type="submit"
                  disabled={isPending}
                  className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/95 transition-all shadow-md shadow-primary/10 cursor-pointer disabled:opacity-50"
                >
                  {isPending ? 'Syncing...' : 'Add Topic'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* NEW FLASHCARD MODAL */}
      <AnimatePresence>
        {isCardOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-[460px] rounded-3xl glass-panel p-6 shadow-2xl relative"
            >
              <button
                onClick={() => setIsCardOpen(false)}
                className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-white/5 text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
              >
                <X className="h-5 w-5" />
              </button>

              <h3 className="text-lg font-bold text-foreground mb-4">
                Add Flashcard card
              </h3>

              <form onSubmit={handleCreateCard} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                      Subject
                    </label>
                    <select
                      value={selectedSubjectId}
                      onChange={(e) => {
                        setSelectedSubjectId(e.target.value);
                        // Pre-select first topic of new subject
                        const targetSub = subjects.find((s) => s.id === e.target.value);
                        if (targetSub && targetSub.topics.length > 0) {
                          setSelectedTopicId(targetSub.topics[0].id);
                        } else {
                          setSelectedTopicId('');
                        }
                      }}
                      className="w-full px-3 py-2.5 rounded-xl glass-input text-sm text-foreground bg-card cursor-pointer"
                    >
                      {subjects.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                      Topic Parent
                    </label>
                    <select
                      value={selectedTopicId}
                      required
                      onChange={(e) => setSelectedTopicId(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl glass-input text-sm text-foreground bg-card cursor-pointer"
                    >
                      <option value="">Select Topic</option>
                      {modalTopics.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                    Front (Question content)
                  </label>
                  <textarea
                    required
                    value={cardFront}
                    onChange={(e) => setCardFront(e.target.value)}
                    rows={2}
                    className="w-full px-4 py-2.5 rounded-xl glass-input text-sm text-foreground resize-none"
                    placeholder="E.g., What is the time complexity of Quick Sort in the worst case?"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                    Back (Recall Answer)
                  </label>
                  <textarea
                    required
                    value={cardBack}
                    onChange={(e) => setCardBack(e.target.value)}
                    rows={2}
                    className="w-full px-4 py-2.5 rounded-xl glass-input text-sm text-foreground resize-none"
                    placeholder="E.g., O(N^2), occurring when the pivot consistently divides the array unevenly."
                  />
                </div>

                <button
                  type="submit"
                  disabled={isPending || !selectedTopicId}
                  className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/95 transition-all shadow-md shadow-primary/10 cursor-pointer disabled:opacity-50"
                >
                  {isPending ? 'Syncing...' : 'Add Flashcard'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
