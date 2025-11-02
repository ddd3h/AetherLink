import { Outlet, useLocation, Link } from 'react-router-dom';
import TopBar from './components/TopBar';
import SideNav from './components/SideNav';
import { useApplyTheme } from './utils/theme';

export default function App() {
  useApplyTheme();
  const loc = useLocation();
  return (
    <div className="min-h-screen flex bg-white dark:bg-neutral-950 text-neutral-900 dark:text-neutral-50">
      <SideNav />
      <div className="flex-1 flex flex-col">
        <TopBar />
        <main className="p-4">
          <Outlet />
        </main>
        <footer className="px-4 py-2 text-xs text-neutral-500">
          <Link to="/about" className="underline">About</Link> · {loc.pathname}
        </footer>
      </div>
    </div>
  );
}

