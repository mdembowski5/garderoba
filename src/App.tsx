import { useCallback, useEffect, useRef, useState } from 'react';
import TabBar, { type Tab } from './components/TabBar';
import Dashboard from './screens/Dashboard';
import AddItem from './screens/AddItem';
import Wardrobe from './screens/Wardrobe';
import Assistant from './screens/Assistant';
import { useWeather } from './hooks/useWeather';

export default function App() {
  const [tab, setTab] = useState<Tab>('home');
  const [toast, setToast] = useState<string | null>(null);
  const timer = useRef<number>();
  const weatherState = useWeather();

  const notify = useCallback((msg: string) => {
    setToast(msg);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setToast(null), 2200);
  }, []);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  // Ekrany pozostają zamontowane (zachowują stan formularza i wylosowany zestaw) – ukrywamy nieaktywne.
  const screen = (id: Tab) => `absolute inset-0 ${tab === id ? '' : 'hidden'}`;

  return (
    <div className="fixed inset-0 flex flex-col bg-ink-950 font-sans text-slate-100">
      <main className="relative min-h-0 flex-1">
        <div className={screen('home')}>
          <Dashboard weatherState={weatherState} onNavigate={setTab} notify={notify} />
        </div>
        <div className={screen('add')}>
          <AddItem onSaved={() => setTab('wardrobe')} notify={notify} />
        </div>
        <div className={screen('wardrobe')}>
          <Wardrobe onNavigate={setTab} notify={notify} />
        </div>
        <div className={screen('assistant')}>
          <Assistant notify={notify} />
        </div>

        {toast && (
          <div className="pointer-events-none absolute inset-x-0 bottom-4 z-40 flex justify-center px-4">
            <div className="animate-toast-in rounded-full bg-white px-4 py-2.5 text-sm font-semibold text-ink-950 shadow-xl">
              {toast}
            </div>
          </div>
        )}
      </main>
      <TabBar tab={tab} onChange={setTab} />
    </div>
  );
}
