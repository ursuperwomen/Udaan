import React from 'react';
import { ActiveTab } from '../types/visa';

interface TopNavProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  onOpenNewTrip: () => void;
}

const NAV_ITEMS: Array<{ id: ActiveTab; label: string }> = [
  { id: 'checklist', label: 'Checklist' },
  { id: 'documents', label: 'Documents & Pre-Fill' },
  { id: 'tracker', label: 'Status Tracker' },
  { id: 'budget', label: 'Travel Budget' },
  { id: 'interview', label: 'Interview Coach' },
];

export const TopNav: React.FC<TopNavProps> = ({ activeTab, onSelectTab, onOpenNewTrip }) => {
  return (
    <header className="sticky top-0 z-30 bg-[#FFFFFF]/95 backdrop-blur-sm border-b border-slate-200/80">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-10 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Brand Wordmark (single line, no attached chips) */}
        <button
          type="button"
          onClick={() => onSelectTab('checklist')}
          className="text-lg font-extrabold tracking-tight text-[#1E3A8A] whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E3A8A]/40 rounded"
        >
          UDAAN
        </button>

        {/* Zone 2: Concise single-line navigation links */}
        <nav aria-label="Primary" className="hidden md:flex items-center gap-6">
          {NAV_ITEMS.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectTab(item.id)}
                className={`relative py-2 text-sm font-medium whitespace-nowrap shrink-0 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E3A8A]/40 rounded ${
                  isActive
                    ? 'text-[#1E3A8A] font-semibold'
                    : 'text-[#475569] hover:text-[#1E293B]'
                }`}
              >
                {item.label}
                {isActive && (
                  <span
                    aria-hidden="true"
                    className="absolute left-0 right-0 -bottom-[15px] h-0.5 bg-[#1E3A8A] rounded-full"
                  />
                )}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Single primary action */}
        <div className="flex items-center shrink-0">
          <button
            type="button"
            onClick={onOpenNewTrip}
            className="h-10 px-4 text-sm font-semibold text-white bg-[#1E3A8A] hover:bg-[#172554] rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E3A8A]/40"
          >
            New Visa Trip
          </button>
        </div>
      </div>

      {/* Mobile horizontal tab strip */}
      <nav
        aria-label="Mobile navigation"
        className="flex md:hidden items-center gap-4 px-4 pb-2.5 overflow-x-auto border-t border-slate-100"
      >
        {NAV_ITEMS.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectTab(item.id)}
              className={`pt-2 pb-1 text-xs font-semibold whitespace-nowrap shrink-0 border-b-2 transition-colors ${
                isActive
                  ? 'text-[#1E3A8A] border-[#1E3A8A]'
                  : 'text-[#475569] border-transparent hover:text-[#1E293B]'
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
