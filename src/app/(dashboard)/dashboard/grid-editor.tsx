'use client';

import { useState, useTransition } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Settings, Check, RotateCcw, ArrowLeft, ArrowRight, 
  Maximize2, Minimize2, ChevronDown, ChevronUp, EyeOff, LayoutGrid
} from 'lucide-react';
import { updateWidgetLayouts } from '@/app/actions/widgets';

interface WidgetLayout {
  widgetId: string;
  positionX: number;
  positionY: number;
  width: number;
  height: number;
  isCollapsed: boolean;
}

interface GridEditorProps {
  initialLayouts: WidgetLayout[];
  widgetContent: Record<string, React.ReactNode>;
}

const DEFAULT_LAYOUTS: WidgetLayout[] = [
  { widgetId: 'greeting', positionX: 0, positionY: 0, width: 12, height: 2, isCollapsed: false },
  { widgetId: 'stats', positionX: 0, positionY: 2, width: 8, height: 2, isCollapsed: false },
  { widgetId: 'streak', positionX: 8, positionY: 2, width: 4, height: 2, isCollapsed: false },
  { widgetId: 'ai-coach', positionX: 0, positionY: 4, width: 8, height: 4, isCollapsed: false },
  { widgetId: 'pomodoro', positionX: 8, positionY: 4, width: 4, height: 4, isCollapsed: false },
  { widgetId: 'agenda', positionX: 0, positionY: 8, width: 7, height: 6, isCollapsed: false },
  { widgetId: 'habits', positionX: 7, positionY: 8, width: 5, height: 6, isCollapsed: false },
  { widgetId: 'heatmap', positionX: 0, positionY: 14, width: 12, height: 3, isCollapsed: false },
];

export default function DashboardGridEditor({ initialLayouts, widgetContent }: GridEditorProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [layouts, setLayouts] = useState<WidgetLayout[]>(() => {
    // Fallback to defaults if no custom layouts exist
    return initialLayouts.length > 0 ? initialLayouts : DEFAULT_LAYOUTS;
  });
  const [isPending, startTransition] = useTransition();

  // Helper to reorder layouts array
  const moveWidget = (index: number, direction: 'prev' | 'next') => {
    const newLayouts = [...layouts];
    const targetIndex = direction === 'prev' ? index - 1 : index + 1;
    
    if (targetIndex >= 0 && targetIndex < newLayouts.length) {
      // Swap positions order indices
      const temp = newLayouts[index];
      newLayouts[index] = newLayouts[targetIndex];
      newLayouts[targetIndex] = temp;
      setLayouts(newLayouts);
    }
  };

  // Helper to scale width options: 3 -> 4 -> 6 -> 8 -> 12 -> 3
  const cycleWidth = (index: number) => {
    const newLayouts = [...layouts];
    const currentWidth = newLayouts[index].width;
    let nextWidth = 12;
    
    if (currentWidth === 3) nextWidth = 4;
    else if (currentWidth === 4) nextWidth = 6;
    else if (currentWidth === 6) nextWidth = 8;
    else if (currentWidth === 8) nextWidth = 12;
    else if (currentWidth === 12) nextWidth = 3;

    newLayouts[index].width = nextWidth;
    setLayouts(newLayouts);
  };

  // Helper to cycle height options: 2 -> 3 -> 4 -> 6 -> 2
  const cycleHeight = (index: number) => {
    const newLayouts = [...layouts];
    const currentHeight = newLayouts[index].height;
    let nextHeight = 2;

    if (currentHeight === 2) nextHeight = 3;
    else if (currentHeight === 3) nextHeight = 4;
    else if (currentHeight === 4) nextHeight = 6;
    else if (currentHeight === 6) nextHeight = 2;

    newLayouts[index].height = nextHeight;
    setLayouts(newLayouts);
  };

  const toggleCollapse = (index: number) => {
    const newLayouts = [...layouts];
    newLayouts[index].isCollapsed = !newLayouts[index].isCollapsed;
    setLayouts(newLayouts);
  };

  const handleReset = () => {
    setLayouts(DEFAULT_LAYOUTS);
  };

  const handleSave = () => {
    startTransition(async () => {
      // Map positions sequential coords before saving to prevent overlaps
      const updated = layouts.map((l, i) => ({
        ...l,
        positionY: i, // Sequence order index acts as positions Y
        positionX: 0,
      }));
      
      const res = await updateWidgetLayouts(updated);
      if (!res.error) {
        setIsEditing(false);
      }
    });
  };

  // Helper mapping widget title labels
  const getWidgetTitle = (id: string) => {
    switch (id) {
      case 'greeting': return 'Greeting & Focus';
      case 'stats': return 'Performance Stats';
      case 'streak': return 'Streaks Summary';
      case 'ai-coach': return 'Growth AI Brief';
      case 'pomodoro': return 'Study Pomodoro';
      case 'agenda': return 'Today\'s Agenda Planner';
      case 'habits': return 'Habit Consistency Checklist';
      case 'heatmap': return 'Activity Heatmap';
      default: return 'Widget';
    }
  };

  return (
    <div className="space-y-6">
      {/* Editor Header Controller panel */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
            Personal Space
          </h1>
          <p className="text-sm text-muted-foreground mt-1.5">
            Your daily operating center. Customize widget positions and spans.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isEditing ? (
            <>
              <button
                onClick={handleReset}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-white/5 border border-white/5 text-muted-foreground hover:text-foreground cursor-pointer transition-colors flex items-center gap-1.5"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Defaults
              </button>
              <button
                onClick={handleSave}
                disabled={isPending}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-primary text-primary-foreground hover:bg-primary/95 cursor-pointer shadow-md shadow-primary/10 transition-colors flex items-center gap-1.5"
              >
                {isPending ? 'Syncing...' : (
                  <>
                    <Check className="h-3.5 w-3.5" />
                    Save Layout
                  </>
                )}
              </button>
            </>
          ) : (
            <button
              onClick={() => setIsEditing(true)}
              className="px-4 py-2 text-xs font-semibold rounded-xl bg-white/5 border border-white/5 text-muted-foreground hover:text-foreground hover:bg-white/10 cursor-pointer transition-all flex items-center gap-1.5"
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              Customize Layout
            </button>
          )}
        </div>
      </div>

      {/* Grid container */}
      <div className="grid grid-cols-12 gap-6 auto-rows-max">
        {layouts.map((w, index) => {
          const content = widgetContent[w.widgetId];
          const title = getWidgetTitle(w.widgetId);
          
          // Map column spans for sizes. Small screen always full col span.
          const colSpanClass = {
            3: 'col-span-12 md:col-span-3',
            4: 'col-span-12 md:col-span-4',
            6: 'col-span-12 md:col-span-6',
            8: 'col-span-12 md:col-span-8',
            12: 'col-span-12',
          }[w.width as 3 | 4 | 6 | 8 | 12] || 'col-span-12';

          const rowSpanStyle = {
            gridRow: w.isCollapsed ? 'span 1' : `span ${w.height}`,
          };

          return (
            <motion.div
              layout
              key={w.widgetId}
              style={rowSpanStyle}
              className={`rounded-3xl glass-panel relative overflow-hidden transition-all flex flex-col ${colSpanClass} ${
                isEditing ? 'ring-2 ring-primary/45 border-primary/20 scale-[0.99] shadow-lg shadow-primary/5' : 'shadow-md shadow-black/10'
              }`}
            >
              {/* Layout Editor Toolbar Overlay */}
              {isEditing && (
                <div className="absolute inset-x-0 top-0 bg-primary/10 border-b border-primary/20 backdrop-blur-md px-4 py-1.5 flex items-center justify-between z-20 text-primary-foreground">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-primary">
                    {title}
                  </span>

                  <div className="flex items-center gap-1.5">
                    {/* Move Left / Up */}
                    <button
                      onClick={() => moveWidget(index, 'prev')}
                      disabled={index === 0}
                      className="p-1 rounded-md hover:bg-white/10 text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer transition-colors"
                      title="Move Widget Up"
                    >
                      <ArrowLeft className="h-3.5 w-3.5" />
                    </button>
                    
                    {/* Move Right / Down */}
                    <button
                      onClick={() => moveWidget(index, 'next')}
                      disabled={index === layouts.length - 1}
                      className="p-1 rounded-md hover:bg-white/10 text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer transition-colors"
                      title="Move Widget Down"
                    >
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>

                    {/* Cycle Width */}
                    <button
                      onClick={() => cycleWidth(index)}
                      className="p-1 rounded-md hover:bg-white/10 text-muted-foreground hover:text-foreground cursor-pointer transition-colors flex items-center gap-0.5"
                      title={`Width: ${w.width}/12 (Cycle width)`}
                    >
                      <Maximize2 className="h-3.5 w-3.5 rotate-45" />
                      <span className="text-[9px] font-bold">{w.width}</span>
                    </button>

                    {/* Cycle Height */}
                    <button
                      onClick={() => cycleHeight(index)}
                      className="p-1 rounded-md hover:bg-white/10 text-muted-foreground hover:text-foreground cursor-pointer transition-colors flex items-center gap-0.5"
                      title={`Height: ${w.height} rows (Cycle height)`}
                    >
                      <Maximize2 className="h-3.5 w-3.5" />
                      <span className="text-[9px] font-bold">{w.height}</span>
                    </button>

                    {/* Toggle Collapse */}
                    <button
                      onClick={() => toggleCollapse(index)}
                      className="p-1 rounded-md hover:bg-white/10 text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                      title={w.isCollapsed ? 'Expand content' : 'Collapse widget'}
                    >
                      {w.isCollapsed ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>
              )}

              {/* Widget Card Frame Content wrapper */}
              <div className={`p-6 flex-1 flex flex-col ${isEditing ? 'pt-10' : ''}`}>
                <AnimatePresence mode="wait">
                  {w.isCollapsed ? (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex items-center justify-between text-xs text-muted-foreground font-semibold py-1 select-none"
                    >
                      <span>{title} (Collapsed)</span>
                      <ChevronDown className="h-3.5 w-3.5" />
                    </motion.div>
                  ) : (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex-1"
                    >
                      {content}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
