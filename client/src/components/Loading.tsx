export function Loading({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex items-center gap-2 py-8 text-sm text-muted justify-center">
      <span className="h-3.5 w-3.5 rounded-full border-2 border-border border-t-muted animate-spin" />
      {label}
    </div>
  );
}

export function InlineLoading() {
  return <span className="inline-block h-3 w-3 rounded-full border-2 border-border border-t-muted animate-spin" />;
}
