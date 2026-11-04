import { Briefcase, Plus, Shirt, ShoppingBag, Sparkles, type LucideIcon } from 'lucide-react';

export type Tab = 'home' | 'tryon' | 'add' | 'wardrobe' | 'assistant';

const TABS: { id: Tab; label: string; Icon: LucideIcon }[] = [
  { id: 'home', label: 'Stylizacja', Icon: Sparkles },
  { id: 'tryon', label: 'Przymierz', Icon: ShoppingBag },
  { id: 'add', label: 'Dodaj', Icon: Plus },
  { id: 'wardrobe', label: 'Szafa', Icon: Shirt },
  { id: 'assistant', label: 'Asystent', Icon: Briefcase },
];

export default function TabBar({ tab, onChange }: { tab: Tab; onChange: (t: Tab) => void }) {
  return (
    <nav className="pb-safe shrink-0 border-t border-white/10 bg-ink-900/95 px-2 pt-2 backdrop-blur">
      <div className="mx-auto flex max-w-md items-center justify-around">
        {TABS.map(({ id, label, Icon }) => {
          const active = id === tab;
          const isAdd = id === 'add';
          return (
            <button
              key={id}
              onClick={() => onChange(id)}
              className={`flex min-w-0 flex-1 flex-col items-center gap-0.5 py-1 text-[11px] font-medium ${
                active ? 'text-accent-300' : 'text-ink-400'
              }`}
            >
              <span
                className={`flex h-8 items-center justify-center rounded-full ${
                  isAdd ? 'w-12 bg-accent-500 text-white' : 'w-8'
                }`}
              >
                <Icon size={22} strokeWidth={active || isAdd ? 2.4 : 1.8} />
              </span>
              {label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
