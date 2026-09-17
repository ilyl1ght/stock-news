export function ErrorState({ message }: { message: string }) {
  return (
    <div className="panel px-4 py-6 text-center text-sm text-muted">
      {message}
    </div>
  );
}

/** Maps a backend "unavailable" reason code to a friendly, non-technical message. */
export function unavailableMessage(reason: string | null | undefined): string | null {
  if (!reason) return null;
  switch (reason) {
    case 'provider_not_configured':
      return 'Market data temporarily unavailable.';
    case 'provider_error':
      return 'Market data temporarily unavailable.';
    case 'not_found':
      return 'No matching stock found.';
    default:
      return 'Something went wrong. Please try again.';
  }
}
