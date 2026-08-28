import { useState } from 'react';
import { CaretLeft, CaretRight, UploadSimple, Graph, Clock, FileText, X } from '@phosphor-icons/react';

interface DemoDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

const steps = [
  {
    icon: UploadSimple,
    title: '1. Upload & Schema Mapping',
    body: 'Investigators upload raw CDR or bank transaction CSVs. The system auto-detects columns and maps them to the analysis schema — no pre-formatting needed.',
    script: '"Upload your CDR or transaction CSV — column mapping is automatic."',
  },
  {
    icon: Graph,
    title: '2. Interactive Network Graph',
    body: 'Every phone number and account becomes a node; every call and transfer becomes an edge. The system scores each node by degree centrality and flags the most influential orchestrators automatically.',
    script: '"The graph builds in real time. Watch for the pulsing orchestrator node — that\'s who the algorithm thinks is running the network."',
  },
  {
    icon: Clock,
    title: '3. Time-Range Filtering',
    body: 'Narrow the graph to any time window to isolate activity around the crime event. The visualization updates smoothly as you adjust the slider.',
    script: '"Drag the time slider to focus on the period around the incident."',
  },
  {
    icon: FileText,
    title: '4. Audit Report Export',
    body: 'One-click export produces a court-ready PDF or CSV documenting the flagged network, detected patterns, and evidence trail — reproducible from the same underlying data.',
    script: '"Export a report for legal documentation — same result every time."',
  },
];

export function DemoDrawer({ isOpen, onClose }: DemoDrawerProps) {
  const [step, setStep] = useState(0);
  const current = steps[step]!;

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} />

      {/* Drawer */}
      <div className="fixed right-0 top-0 bottom-0 w-96 bg-panel border-l border-border-default z-50 flex flex-col animate-slide-in-right shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border-default">
          <h2 className="text-sm font-display font-bold text-accent uppercase tracking-wider">
            Feature Walkthrough
          </h2>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Step content */}
        <div className="flex-1 flex flex-col p-6">
          <div className="flex-1">
            <current.icon className="w-8 h-8 text-accent mb-4" />
            <h3 className="text-base font-display font-bold text-text-primary mb-3">
              {current.title}
            </h3>
            <p className="text-sm text-text-muted leading-relaxed mb-4">
              {current.body}
            </p>
            <div className="p-3 rounded bg-panel-alt border border-border-default">
              <p className="text-[11px] font-mono text-accent italic">
                {current.script}
              </p>
            </div>
          </div>

          {/* Progress */}
          <div className="mt-6">
            <div className="flex gap-1.5 mb-3">
              {steps.map((_, i) => (
                <div
                  key={i}
                  className={`h-1 flex-1 rounded-full transition-colors ${
                    i <= step ? 'bg-accent' : 'bg-border-default'
                  }`}
                />
              ))}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono text-text-muted">
                Step {step + 1} of {steps.length}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setStep(Math.max(0, step - 1))}
                  disabled={step === 0}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs font-mono rounded border border-border-default text-text-muted hover:text-text-primary disabled:opacity-30 transition-colors"
                >
                  <CaretLeft className="w-3 h-3" />
                  Back
                </button>
                <button
                  onClick={() =>
                    step < steps.length - 1
                      ? setStep(step + 1)
                      : onClose()
                  }
                  className="flex items-center gap-1 px-3 py-1.5 text-xs font-mono rounded bg-accent text-[#05080d] font-semibold hover:bg-accent/90 transition-colors"
                >
                  {step < steps.length - 1 ? 'Next' : 'Done'}
                  <CaretRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
