import { useNavigate } from 'react-router-dom';

export function Landing() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center px-6">
      <div className="flex flex-col items-center gap-10">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-[0.2em] text-text">STOCK NEWS</h1>
        <button type="button" onClick={() => navigate('/app')} className="btn-primary px-10 py-3 text-sm tracking-widest font-semibold">
          ENTER
        </button>
      </div>
    </div>
  );
}
