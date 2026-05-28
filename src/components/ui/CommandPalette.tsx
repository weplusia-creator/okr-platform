import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, FolderKanban, Users, Target, FileText, Handshake, Briefcase,
  Plus, BarChart3, DollarSign, Banknote, ListChecks,
  X, CornerDownLeft, Command as CommandIcon,
} from 'lucide-react';
import { useProjects } from '../../context/ProjectContext';
import { useFinance } from '../../context/FinanceContext';
import { useOKR } from '../../context/OKRContext';
import { useProposals } from '../../context/ProposalContext';
import { useCRM } from '../../context/CRMContext';

type ItemGroup =
  | 'Acciones'
  | 'Navegacion'
  | 'Proyectos'
  | 'Clientes'
  | 'OKRs'
  | 'Propuestas'
  | 'Deals'
  | 'Leads';

interface PaletteItem {
  id: string;
  group: ItemGroup;
  title: string;
  subtitle?: string;
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  /** lowercased search blob built once at item creation */
  haystack: string;
  /** rank weight used to break ties (higher = better) */
  weight: number;
}

const GROUP_ORDER: ItemGroup[] = [
  'Acciones', 'Navegacion', 'Proyectos', 'Clientes', 'OKRs', 'Propuestas', 'Deals', 'Leads',
];

/**
 * Score `haystack` against the lowercased `query`. Returns -Infinity if no match.
 * Simple fuzzy: every space-separated token in query must appear as substring.
 * Higher score = better. Prefix matches and shorter haystacks rank higher.
 */
function score(query: string, item: PaletteItem): number {
  if (!query) return item.weight;
  const tokens = query.split(/\s+/).filter(Boolean);
  let s = 0;
  for (const tk of tokens) {
    const i = item.haystack.indexOf(tk);
    if (i < 0) return -Infinity;
    s += 100 - i;                   // prefix matches score higher
    if (item.haystack.startsWith(tk)) s += 50;
  }
  s += item.weight;
  s -= item.haystack.length * 0.1;  // shorter title wins ties
  return s;
}

const ACTIONS: Array<Omit<PaletteItem, 'haystack'>> = [
  { id: 'a:new-proposal', group: 'Acciones', title: 'Nueva propuesta', to: '/proposals/new', icon: Plus, weight: 10 },
  { id: 'a:new-project',  group: 'Acciones', title: 'Nuevo proyecto',  to: '/projects/new',  icon: Plus, weight: 10 },
  { id: 'a:new-invoice',  group: 'Acciones', title: 'Nueva factura',   to: '/finance/invoices/new', icon: Plus, weight: 10 },
  { id: 'a:new-client',   group: 'Acciones', title: 'Nuevo cliente',   to: '/projects/clients/new', icon: Plus, weight: 10 },
  { id: 'a:new-lead',     group: 'Acciones', title: 'Nuevo lead',      to: '/crm/leads/new', icon: Plus, weight: 10 },
  { id: 'a:new-deal',     group: 'Acciones', title: 'Nueva oportunidad', to: '/crm/deals/new', icon: Plus, weight: 10 },
];

const NAV: Array<Omit<PaletteItem, 'haystack'>> = [
  { id: 'n:dashboard',  group: 'Navegacion', title: 'Tablero de control', subtitle: 'Vista general', to: '/dashboard', icon: BarChart3, weight: 9 },
  { id: 'n:okrs',       group: 'Navegacion', title: 'OKRs', to: '/okrs', icon: Target, weight: 9 },
  { id: 'n:projects',   group: 'Navegacion', title: 'Proyectos', to: '/projects', icon: FolderKanban, weight: 9 },
  { id: 'n:crm',        group: 'Navegacion', title: 'CRM', to: '/crm', icon: Handshake, weight: 9 },
  { id: 'n:proposals',  group: 'Navegacion', title: 'Propuestas', to: '/proposals', icon: FileText, weight: 9 },
  { id: 'n:finance',    group: 'Navegacion', title: 'Finanzas', to: '/finance', icon: DollarSign, weight: 9 },
  { id: 'n:cashflow',   group: 'Navegacion', title: 'Flujo de caja', to: '/finance/cash-flow', icon: Banknote, weight: 9 },
  { id: 'n:invoices',   group: 'Navegacion', title: 'Facturas', to: '/finance/invoices', icon: FileText, weight: 9 },
  { id: 'n:clients',    group: 'Navegacion', title: 'Clientes', to: '/projects/clients', icon: Users, weight: 9 },
  { id: 'n:tasks',      group: 'Navegacion', title: 'Tareas', to: '/tareas', icon: ListChecks, weight: 9 },
];

function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // strip diacritics
    .toLowerCase()
    .trim();
}

interface Props {
  open: boolean;
  onClose: () => void;
}

function CommandPaletteInner({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);

  const { projects } = useProjects();
  const { clients } = useFinance();
  const { objectives } = useOKR();
  const { proposals } = useProposals();
  const { leads, deals } = useCRM();

  const items: PaletteItem[] = useMemo(() => {
    const out: PaletteItem[] = [];
    for (const a of [...ACTIONS, ...NAV]) {
      out.push({
        ...a,
        haystack: normalize(`${a.title} ${a.subtitle ?? ''}`),
      });
    }
    for (const p of projects) {
      const sub = [p.clientName, p.product].filter(Boolean).join(' · ');
      out.push({
        id: `project:${p.id}`,
        group: 'Proyectos',
        title: p.name,
        subtitle: sub || undefined,
        to: `/projects/${p.id}`,
        icon: FolderKanban,
        haystack: normalize(`${p.name} ${sub}`),
        weight: 5,
      });
    }
    for (const c of clients) {
      const sub = [c.company, c.email].filter(Boolean).join(' · ');
      out.push({
        id: `client:${c.id}`,
        group: 'Clientes',
        title: c.name,
        subtitle: sub || undefined,
        to: `/projects/clients/${c.id}`,
        icon: Users,
        haystack: normalize(`${c.name} ${sub}`),
        weight: 5,
      });
    }
    const clientById = new Map(clients.map(c => [c.id, c.name]));
    for (const o of objectives) {
      const cName = o.clientId ? clientById.get(o.clientId) : undefined;
      const sub = [cName, `${o.quarter} ${o.year}`].filter(Boolean).join(' · ');
      out.push({
        id: `obj:${o.id}`,
        group: 'OKRs',
        title: o.title,
        subtitle: sub || undefined,
        to: `/okrs/objectives/${o.id}`,
        icon: Target,
        haystack: normalize(`${o.title} ${cName ?? ''} ${o.owner ?? ''}`),
        weight: 4,
      });
    }
    for (const p of proposals) {
      out.push({
        id: `prop:${p.id}`,
        group: 'Propuestas',
        title: p.title,
        subtitle: p.clientName || undefined,
        to: `/proposals/${p.id}`,
        icon: FileText,
        haystack: normalize(`${p.title} ${p.clientName ?? ''} ${p.proposalNumber ?? ''}`),
        weight: 4,
      });
    }
    for (const d of deals) {
      out.push({
        id: `deal:${d.id}`,
        group: 'Deals',
        title: d.name,
        subtitle: d.clientName || undefined,
        to: `/crm/deals/${d.id}`,
        icon: Briefcase,
        haystack: normalize(`${d.name} ${d.clientName ?? ''}`),
        weight: 3,
      });
    }
    for (const l of leads) {
      const sub = [l.company, l.contactName].filter(Boolean).join(' · ');
      out.push({
        id: `lead:${l.id}`,
        group: 'Leads',
        title: l.contactName || l.company || 'Lead',
        subtitle: sub || undefined,
        to: `/crm/leads/${l.id}`,
        icon: Handshake,
        haystack: normalize(`${l.contactName ?? ''} ${l.company ?? ''} ${l.email ?? ''}`),
        weight: 3,
      });
    }
    return out;
  }, [projects, clients, objectives, proposals, deals, leads]);

  const filtered = useMemo(() => {
    const q = normalize(query);
    const scored = items
      .map((it) => ({ it, s: score(q, it) }))
      .filter((x) => x.s > -Infinity)
      .sort((a, b) => b.s - a.s);
    return scored.slice(0, 50).map((x) => x.it);
  }, [items, query]);

  // Group filtered items in display order, preserving the global score-sorted order within each group.
  const grouped = useMemo(() => {
    const map = new Map<ItemGroup, PaletteItem[]>();
    for (const it of filtered) {
      if (!map.has(it.group)) map.set(it.group, []);
      map.get(it.group)!.push(it);
    }
    return GROUP_ORDER.filter((g) => map.has(g)).map((g) => ({ group: g, items: map.get(g)! }));
  }, [filtered]);

  // Flat list in display order, used for keyboard navigation.
  const flat = useMemo(() => grouped.flatMap((g) => g.items), [grouped]);

  useEffect(() => {
    setActive(0);
  }, [query]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    // Keep the active item visible inside the scrollable list.
    const root = listRef.current;
    if (!root) return;
    const el = root.querySelector<HTMLElement>('[data-active="true"]');
    if (el) el.scrollIntoView({ block: 'nearest' });
  }, [active, flat.length]);

  const handleKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((a) => (flat.length === 0 ? 0 : (a + 1) % flat.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => (flat.length === 0 ? 0 : (a - 1 + flat.length) % flat.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const it = flat[active];
      if (it) {
        navigate(it.to);
        onClose();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-start justify-center p-4 sm:pt-[12vh]">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className="relative w-full max-w-2xl bg-white dark:bg-[#363233] rounded-2xl shadow-2xl ring-1 ring-black/5 dark:ring-white/10 animate-scale-in overflow-hidden flex flex-col max-h-[75vh]"
        role="dialog"
        aria-modal="true"
        aria-label="Buscador rapido"
      >
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 dark:border-[#443f40]">
          <Search className="w-5 h-5 text-gray-400 shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Buscar proyectos, clientes, OKRs, propuestas..."
            className="flex-1 bg-transparent border-0 outline-none text-base text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500"
            autoComplete="off"
            spellCheck={false}
          />
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-md text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#3d3839] transition-colors"
            aria-label="Cerrar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div ref={listRef} className="flex-1 overflow-y-auto scrollbar-thin py-2">
          {flat.length === 0 ? (
            <div className="px-4 py-12 text-center text-sm text-gray-500 dark:text-gray-400">
              Sin resultados para "{query}"
            </div>
          ) : (
            grouped.map(({ group, items: groupItems }) => (
              <div key={group} className="mb-1">
                <div className="px-4 pt-2 pb-1 text-[10px] uppercase tracking-wider font-semibold text-gray-400 dark:text-gray-500">
                  {group}
                </div>
                {groupItems.map((it) => {
                  const idx = flat.indexOf(it);
                  const isActive = idx === active;
                  const Icon = it.icon;
                  return (
                    <button
                      key={it.id}
                      type="button"
                      data-active={isActive}
                      onMouseEnter={() => setActive(idx)}
                      onClick={() => {
                        navigate(it.to);
                        onClose();
                      }}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                        isActive
                          ? 'bg-[#3100E2]/10 dark:bg-[#3100E2]/20 text-gray-900 dark:text-white'
                          : 'text-gray-800 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-[#3d3839]'
                      }`}
                    >
                      <Icon
                        className={`w-4 h-4 shrink-0 ${
                          isActive ? 'text-[#3100E2] dark:text-blue-400' : 'text-gray-400 dark:text-gray-500'
                        }`}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">{it.title}</div>
                        {it.subtitle && (
                          <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                            {it.subtitle}
                          </div>
                        )}
                      </div>
                      {isActive && (
                        <CornerDownLeft className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500 shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        <div className="hidden sm:flex items-center gap-4 px-4 py-2 border-t border-gray-200 dark:border-[#443f40] text-[11px] text-gray-400 dark:text-gray-500">
          <span className="inline-flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-[#2e2a2b] border border-gray-200 dark:border-[#443f40] font-sans">↑↓</kbd>
            navegar
          </span>
          <span className="inline-flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-[#2e2a2b] border border-gray-200 dark:border-[#443f40] font-sans">↵</kbd>
            ir
          </span>
          <span className="inline-flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-[#2e2a2b] border border-gray-200 dark:border-[#443f40] font-sans">esc</kbd>
            cerrar
          </span>
          <span className="ml-auto inline-flex items-center gap-1 opacity-70">
            <CommandIcon className="w-3 h-3" />K para abrir
          </span>
        </div>
      </div>
    </div>
  );
}

export function CommandPalette({ open, onClose }: Props) {
  if (!open) return null;
  return <CommandPaletteInner onClose={onClose} />;
}

/**
 * Mount this once near the top of the React tree. Listens globally for Cmd/Ctrl+K
 * and renders the palette. Uses underlying contexts so it must live inside the
 * provider tree (i.e. inside main.tsx's provider chain).
 */
export function CommandPaletteHost() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const isCmdK = (e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K');
      if (isCmdK) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  return <CommandPalette open={open} onClose={() => setOpen(false)} />;
}
