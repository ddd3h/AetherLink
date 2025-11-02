// Side navigation links
import { NavLink } from 'react-router-dom';
import { Gauge, Settings, PlayCircle, Info } from 'lucide-react';

const linkCls = ({ isActive }: { isActive: boolean }) =>
  'flex items-center gap-2 px-3 py-2 rounded-xl text-sm ' + (isActive ? 'bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900' : 'hover:bg-neutral-100 dark:hover:bg-neutral-900');

export default function SideNav() {
  return (
    <nav className="hidden md:flex w-56 shrink-0 flex-col gap-1 p-3 border-r border-neutral-200 dark:border-neutral-800">
      <NavLink to="/" className={linkCls}><Gauge size={16} /> Dashboard</NavLink>
      <NavLink to="/settings" className={linkCls}><Settings size={16} /> Settings</NavLink>
      <NavLink to="/replay" className={linkCls}><PlayCircle size={16} /> Replay</NavLink>
      <NavLink to="/about" className={linkCls}><Info size={16} /> About</NavLink>
    </nav>
  );
}

