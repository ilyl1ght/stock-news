import React from 'react';
import { Link, NavLink } from 'react-router-dom';
import { SearchBar } from './SearchBar';

const NAV_ITEMS = [
  { to: '/app', label: 'WATCHLIST', end: true },
  { to: '/app/news', label: 'NEWS', end: false },
  { to: '/app/market', label: 'MARKET', end: false },
  { to: '/app/alerts', label: 'ALERTS', end: false },
  { to: '/app/settings', label: 'SETTINGS', end: false },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-bg">
      <header className="sticky top-0 z-30 bg-bg/95 backdrop-blur border-b border-border">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16 gap-4">
            <Link to="/app" className="text-sm font-bold tracking-widest text-text shrink-0">
              STOCK NEWS
            </Link>
            <nav className="hidden md:flex items-center gap-6">
              {NAV_ITEMS.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) => `nav-link ${isActive ? 'nav-link-active' : ''}`}
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>
            <div className="hidden sm:block">
              <SearchBar variant="nav" />
            </div>
          </div>
          <div className="sm:hidden pb-3">
            <SearchBar variant="nav" fullWidth />
          </div>
        </div>
        <nav className="md:hidden flex items-center gap-4 overflow-x-auto px-4 sm:px-6 pb-3 -mt-1">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => `nav-link text-xs whitespace-nowrap shrink-0 ${isActive ? 'nav-link-active' : ''}`}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </header>
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">{children}</main>
    </div>
  );
}
