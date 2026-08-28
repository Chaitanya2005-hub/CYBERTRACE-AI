import { Warning, WarningCircle, CheckCircle } from '@phosphor-icons/react';

type RiskLevel = 'low' | 'medium' | 'critical';

const config: Record<RiskLevel, { bg: string; border: string; text: string; icon: React.ReactNode; label: string }> = {
  critical: {
    bg: 'bg-risk-critical/15',
    border: 'border-risk-critical/40',
    text: 'text-risk-critical',
    icon: <Warning className="w-3 h-3" weight="fill" />,
    label: 'CRITICAL',
  },
  medium: {
    bg: 'bg-risk-medium/15',
    border: 'border-risk-medium/40',
    text: 'text-risk-medium',
    icon: <WarningCircle className="w-3 h-3" weight="fill" />,
    label: 'MEDIUM',
  },
  low: {
    bg: 'bg-risk-low/15',
    border: 'border-risk-low/40',
    text: 'text-risk-low',
    icon: <CheckCircle className="w-3 h-3" weight="fill" />,
    label: 'LOW',
  },
};

export function RiskBadge({ level, size = 'sm' }: { level: RiskLevel; size?: 'sm' | 'md' }) {
  const c = config[level];
  const sizeClasses = size === 'md' ? 'text-xs px-2.5 py-1 gap-1.5' : 'text-[10px] px-1.5 py-0.5 gap-1';
  return (
    <span
      className={`inline-flex items-center font-mono font-semibold uppercase rounded border ${c.bg} ${c.border} ${c.text} ${sizeClasses}`}
    >
      {c.icon}
      {c.label}
    </span>
  );
}
