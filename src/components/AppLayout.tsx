import { Home, Car, Route, Radio, Fuel, BarChart3, Settings } from 'lucide-react';
import { NavLink, Outlet } from 'react-router-dom';

const navItems = [
  { label: 'Dashboard', to: '/', icon: Home },
  { label: 'Trips', to: '/trips', icon: Route },
  { label: 'Track', to: '/track', icon: Radio },
  { label: 'Vehicles', to: '/vehicles', icon: Car },
  { label: 'Fuel', to: '/fuel', icon: Fuel },
  { label: 'Stats', to: '/stats', icon: BarChart3 },
  { label: 'Settings', to: '/settings', icon: Settings }
];

export function AppLayout() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 md:grid md:grid-cols-[220px_1fr]">
      <aside className="hidden border-r border-slate-200 bg-white p-4 md:block">
        <h1 className="mb-6 text-xl font-semibold">Fahrtentracker</h1>
        <nav className="space-y-1">
          {navItems.map(({ label, to, icon: Icon }) => (
            <NavItem key={to} label={label} to={to} Icon={Icon} />
          ))}
        </nav>
      </aside>
      <div className="pb-16 md:pb-0">
        <main className="mx-auto max-w-5xl p-4 md:p-6">
          <Outlet />
        </main>
      </div>
      <nav className="fixed bottom-0 left-0 right-0 flex items-center justify-around border-t border-slate-200 bg-white py-2 md:hidden">
        {navItems.slice(0, 5).map(({ label, to, icon: Icon }) => (
          <NavItem key={to} label={label} to={to} Icon={Icon} compact />
        ))}
      </nav>
    </div>
  );
}

function NavItem({ label, to, Icon, compact = false }: { label: string; to: string; Icon: React.ElementType; compact?: boolean }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        [
          'flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors',
          isActive ? 'bg-sky-100 text-sky-800' : 'text-slate-600 hover:bg-slate-100'
        ].join(' ')
      }
    >
      <Icon size={18} />
      {!compact && <span>{label}</span>}
    </NavLink>
  );
}
