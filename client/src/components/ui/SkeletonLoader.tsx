export function SkeletonLoader({ className = '' }: { className?: string }) {
  return (
    <div className={`relative overflow-hidden rounded bg-panel-alt ${className}`}>
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/5 to-transparent" />
    </div>
  );
}

export function GraphSkeleton() {
  return (
    <div className="flex-1 flex flex-col gap-3 p-4">
      <SkeletonLoader className="h-8 w-48" />
      <div className="flex-1 rounded-lg border border-border-default bg-panel">
        <div className="flex items-center justify-center h-full min-h-[400px]">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-2 border-accent border-t-transparent rounded-full animate-spin" />
            <span className="text-sm text-text-muted font-mono">Building network graph…</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function SidebarSkeleton() {
  return (
    <div className="flex flex-col gap-2 p-3">
      <SkeletonLoader className="h-5 w-32" />
      <SkeletonLoader className="h-4 w-full" />
      <SkeletonLoader className="h-4 w-3/4" />
      <SkeletonLoader className="h-4 w-5/6" />
      <SkeletonLoader className="h-4 w-2/3" />
    </div>
  );
}
