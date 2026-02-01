import { Sun, Moon, Monitor } from 'lucide-react';
import { useTheme } from '../hooks/useTheme';

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  const Icon = theme === 'light' ? Sun : theme === 'dark' ? Moon : Monitor;
  const label = theme === 'light' ? 'Modo claro' : theme === 'dark' ? 'Modo oscuro' : 'Sistema';

  return (
    <button
      onClick={toggleTheme}
      className="btn-ghost btn-sm flex items-center gap-2"
      title={`Tema actual: ${label}`}
      aria-label={`Cambiar tema (actual: ${label})`}
    >
      <Icon className="w-5 h-5" />
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}
