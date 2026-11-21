import { useState } from 'react';
import { Menu, X } from 'lucide-react';
import type { ScreenId } from '../types/survey';

interface TopNavProps {
  activeScreen: ScreenId;
  onNavigate: (screen: ScreenId) => void;
}

const NAV_ITEMS: Array<{ id: ScreenId; label: string }> = [
  { id: 'intro', label: 'Giới thiệu' },
  { id: 'questions', label: 'Câu hỏi' },
  { id: 'confirmation', label: 'Xác nhận' },
  { id: 'admin', label: 'Quản trị' },
  { id: 'analytics', label: 'Thống kê' },
  { id: 'export', label: 'Xuất báo cáo' },
];

export function TopNav({ activeScreen, onNavigate }: TopNavProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleSelect = (screen: ScreenId) => {
    onNavigate(screen);
    setMobileOpen(false);
  };

  return (
    <header className="no-print sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-8 px-4 sm:h-16 sm:px-6 lg:px-8">
        {/* Zone 1: Single-element wordmark */}
        <button
          type="button"
          onClick={() => handleSelect('intro')}
          className="cursor-pointer font-display text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-teal-700"
        >
          PulseCX
        </button>

        {/* Zone 2: Concise single-line nav links */}
        <nav
          aria-label="Điều hướng chính"
          className="hidden md:flex items-center gap-6 overflow-x-auto"
        >
          {NAV_ITEMS.map((item) => {
            const isActive = activeScreen === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelect(item.id)}
                className={`cursor-pointer py-1 text-sm font-medium transition-colors whitespace-nowrap shrink-0 border-b-2 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-teal-700 ${
                  isActive
                    ? 'border-teal-700 text-slate-900'
                    : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Single primary CTA + Mobile menu toggle */}
        <div className="flex items-center gap-2 shrink-0">
          {activeScreen === 'questions' ? (
            <button
              type="button"
              onClick={() => handleSelect('analytics')}
              className="hidden sm:inline-flex cursor-pointer items-center justify-center rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-slate-800 whitespace-nowrap shrink-0 min-h-[40px]"
            >
              Xem thống kê
            </button>
          ) : (
            <button
              type="button"
              onClick={() => handleSelect('questions')}
              className="hidden sm:inline-flex cursor-pointer items-center justify-center rounded-lg bg-teal-700 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-teal-800 whitespace-nowrap shrink-0 min-h-[40px]"
            >
              Làm khảo sát
            </button>
          )}

          <button
            type="button"
            onClick={() => setMobileOpen((prev) => !prev)}
            aria-label={mobileOpen ? 'Đóng menu' : 'Mở menu'}
            aria-expanded={mobileOpen}
            className="inline-flex md:hidden cursor-pointer items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 min-h-[44px] min-w-[44px]"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile collapsible menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white px-4 py-3">
          <nav aria-label="Menu di động" className="grid grid-cols-2 gap-2">
            {NAV_ITEMS.map((item) => {
              const isActive = activeScreen === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSelect(item.id)}
                  className={`cursor-pointer flex items-center justify-start rounded-lg px-3 py-2.5 text-sm font-medium min-h-[44px] transition-colors ${
                    isActive
                      ? 'bg-teal-50 text-teal-800 border border-teal-200'
                      : 'text-slate-700 hover:bg-slate-50 border border-slate-200'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>
        </div>
      )}
    </header>
  );
}
