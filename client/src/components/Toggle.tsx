export function Toggle({ checked, onChange, disabled }: { checked: boolean; onChange: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={onChange}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
        checked ? 'bg-text' : 'bg-border'
      }`}
    >
      <span className={`inline-block h-4 w-4 transform rounded-full bg-bg transition-transform ${checked ? 'translate-x-5' : 'translate-x-1'}`} />
    </button>
  );
}
