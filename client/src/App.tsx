import { Navigate, Route, Routes } from 'react-router-dom';
import { Landing } from './pages/Landing';
import { Watchlist } from './pages/Watchlist';
import { StockDetail } from './pages/StockDetail';
import { News } from './pages/News';
import { Market } from './pages/Market';
import { Alerts } from './pages/Alerts';
import { Settings } from './pages/Settings';
import { AppShell } from './components/AppShell';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route
        path="/app"
        element={
          <AppShell>
            <Watchlist />
          </AppShell>
        }
      />
      <Route
        path="/app/stock/:symbol"
        element={
          <AppShell>
            <StockDetail />
          </AppShell>
        }
      />
      <Route
        path="/app/news"
        element={
          <AppShell>
            <News />
          </AppShell>
        }
      />
      <Route
        path="/app/market"
        element={
          <AppShell>
            <Market />
          </AppShell>
        }
      />
      <Route
        path="/app/alerts"
        element={
          <AppShell>
            <Alerts />
          </AppShell>
        }
      />
      <Route
        path="/app/settings"
        element={
          <AppShell>
            <Settings />
          </AppShell>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
