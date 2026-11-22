import React from 'react';
import { AppSection } from '../types/wizard';

interface TopBarProps {
  activeSection: AppSection;
  onSelectSection: (section: AppSection) => void;
  isSignedIn: boolean;
  isAuthReady: boolean;
  onSignIn: () => void;
  onSignOut: () => void;
}

const NAV_ITEMS: Array<{ id: AppSection; label: string }> = [
  { id: 'sanctum', label: 'Sanctum' },
  { id: 'diary', label: 'Secret Diary' },
  { id: 'scrolls', label: 'Arcane Scrolls' },
  { id: 'duel', label: 'Spell Duel' },
];

export const TopBar: React.FC<TopBarProps> = ({
  activeSection,
  onSelectSection,
  isSignedIn,
  isAuthReady,
  onSignIn,
  onSignOut,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-[#120d0a]/95 backdrop-blur-md border-b border-[#3b2b20]">
      <div className="max-w-7xl mx-auto px-4 sm:px-8 h-16 flex items-center justify-between gap-8">
        <button
          type="button"
          onClick={() => onSelectSection('sanctum')}
          className="font-display text-lg sm:text-xl font-semibold tracking-wide text-[#e6bd62] hover:text-[#f3ead8] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          Grimoire &amp; Quill
        </button>

        <nav className="hidden md:flex items-center gap-7" aria-label="Primary">
          {NAV_ITEMS.map((item) => {
            const active = activeSection === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectSection(item.id)}
                className={`relative py-2 text-sm font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  active
                    ? 'text-[#e6bd62]'
                    : 'text-[#d3c4aa] hover:text-[#f3ead8]'
                }`}
              >
                {item.label}
                {active && (
                  <span
                    aria-hidden="true"
                    className="absolute left-0 right-0 bottom-0 h-0.5 bg-[#c99a3b]"
                  />
                )}
              </button>
            );
          })}
        </nav>

        <div className="shrink-0">
          {!isAuthReady ? (
            <span className="text-xs text-[#a9987c] whitespace-nowrap">Connecting...</span>
          ) : isSignedIn ? (
            <button
              type="button"
              onClick={onSignOut}
              className="px-4 py-2 rounded-lg border border-[#5c4330] text-xs font-medium text-[#f3ead8] hover:border-[#c99a3b] hover:text-[#e6bd62] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Sign Out
            </button>
          ) : (
            <button
              type="button"
              onClick={onSignIn}
              className="px-4 py-2 rounded-lg bg-[#c99a3b] text-[#1a110b] text-xs font-semibold hover:bg-[#e6bd62] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Sign In with Google
            </button>
          )}
        </div>
      </div>

      {/* Compact mobile navigation row */}
      <nav
        className="flex md:hidden items-center justify-around border-t border-[#2b1f17] px-2 py-1.5"
        aria-label="Mobile Navigation"
      >
        {NAV_ITEMS.map((item) => {
          const active = activeSection === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectSection(item.id)}
              className={`px-2.5 py-2 text-xs font-medium whitespace-nowrap shrink-0 cursor-pointer ${
                active
                  ? 'text-[#e6bd62] underline underline-offset-4'
                  : 'text-[#c9b99c]'
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </nav>
    </header>
  );
};
