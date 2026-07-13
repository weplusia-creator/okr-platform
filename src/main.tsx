import './patchFetch';
import { Component, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { AuthProvider, useAuth } from './context/AuthContext';
import { OKRProvider } from './context/OKRContext';
import { FinanceProvider } from './context/FinanceContext';
import { ProjectProvider } from './context/ProjectContext';
import { KPIProvider } from './context/KPIContext';
import { MeetingProvider } from './context/MeetingContext';
import { PlaybookProvider } from './context/PlaybookContext';
import { CRMProvider } from './context/CRMContext';
import { ProposalProvider } from './context/ProposalContext';
import { ArcaProvider } from './context/ArcaContext';
import { TaskProvider } from './context/TaskContext';
import { CheckinProvider } from './context/CheckinContext';
import { NotificationProvider } from './context/NotificationContext';
import { PresentationProvider } from './context/PresentationContext';
import { QuizProvider } from './context/QuizContext';
import './index.css';
import App from './App';
import { toast } from './components/ui/toast';

// Gate: don't mount data providers until auth has finished loading.
// Renders its own spinner (NOT null) — App.tsx's spinner lives inside this
// gate, so if we returned null the user would see a fully blank page until
// auth resolves (or the 12s hard-reload kicks in). With the spinner here,
// the user always sees feedback that the app is alive.
function AuthGate({ children }: { children: ReactNode }) {
  const { loading } = useAuth();
  if (loading) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: '#2e2a2b', color: '#9ca3af', fontFamily: 'system-ui, -apple-system, sans-serif',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: 48, height: 48, margin: '0 auto 12px',
            border: '3px solid rgba(255,255,255,0.1)',
            borderTopColor: '#D4FC59',
            borderRadius: '50%',
            animation: 'wau-spin 0.8s linear infinite',
          }} />
          <p style={{ fontSize: 14, margin: 0 }}>Cargando...</p>
          <style>{`@keyframes wau-spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }
  return <>{children}</>;
}

class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error) {
    // Same recovery path as global handlers: if a lazy import 404'd because
    // Vercel deployed a new build, reload once to fetch the fresh chunks.
    const msg = error?.message || String(error);
    if (/Loading chunk \d+ failed|Failed to fetch dynamically imported module|Importing a module script failed|ChunkLoadError/i.test(msg)) {
      const KEY = 'wau:chunk-reload-at';
      const last = Number(sessionStorage.getItem(KEY) || 0);
      if (Date.now() - last >= 10_000) {
        sessionStorage.setItem(KEY, String(Date.now()));
        window.location.reload();
      }
    }
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: '2rem', fontFamily: 'monospace' }}>
          <h1 style={{ color: 'red' }}>Error en la aplicación</h1>
          <pre style={{ whiteSpace: 'pre-wrap', background: '#f5f5f5', padding: '1rem', borderRadius: '8px' }}>
            {this.state.error.message}
            {'\n\n'}
            {this.state.error.stack}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}

// ── Auto-recovery from stale chunk references after Vercel deploys ──
// React.lazy + Vite produces hashed chunk filenames. After a new deploy,
// chunks the open tab knows about (from when it first loaded) no longer
// exist on the server -> import() rejects with ChunkLoadError -> blank
// page. We intercept and reload the page once (with a guard against
// reload loops if the error has a different root cause).
const CHUNK_ERR_RE = /Loading chunk \d+ failed|Failed to fetch dynamically imported module|Importing a module script failed|ChunkLoadError/i;
function handleChunkError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  if (!CHUNK_ERR_RE.test(msg)) return false;
  const KEY = 'wau:chunk-reload-at';
  const last = Number(sessionStorage.getItem(KEY) || 0);
  if (Date.now() - last < 10_000) {
    // Already reloaded recently — don't loop. Show the error.
    console.error('[chunk-load] reload already attempted recently, surfacing error', err);
    return false;
  }
  sessionStorage.setItem(KEY, String(Date.now()));
  console.warn('[chunk-load] stale build detected, reloading once...');
  window.location.reload();
  return true;
}

// ── Red de seguridad global para errores no manejados ──────────────
// Muchas operaciones asíncronas (guardar, cobrar, cargar) se disparan sin
// await ni try/catch. Cuando fallan, la promesa se rechaza sin que nadie la
// atrape y el usuario no ve NADA: parece que "no pasó nada". Este manejador
// muestra un aviso visible cuando algo falla de verdad, sin tener que tocar
// cientos de llamadas una por una. Es conservador: ignora errores benignos
// (fetch abortado, timeouts de refresco en segundo plano) y no spamea.
let lastErrorToastAt = 0;
const BENIGN_ERR_RE = /AbortError|TimeoutError|user aborted|signal is aborted|ResizeObserver|Non-Error promise rejection|Load failed|Failed to fetch|NetworkError/i;
function surfaceUnexpectedError(err: unknown): void {
  const msg = err instanceof Error ? (err.message || err.name) : String(err ?? '');
  // Los errores de chunk ya se manejan (recarga) y los benignos no molestan.
  if (!msg || CHUNK_ERR_RE.test(msg) || BENIGN_ERR_RE.test(msg)) return;
  const now = Date.now();
  if (now - lastErrorToastAt < 4000) return; // throttle: máx. 1 aviso cada 4s
  lastErrorToastAt = now;
  console.error('[global-error]', err);
  toast.error('Ocurrió un error y tu última acción puede no haberse guardado. Revisá tu conexión y reintentá.');
}

window.addEventListener('error', (event) => {
  if (handleChunkError(event.error || event.message)) {
    event.preventDefault();
  }
});
window.addEventListener('unhandledrejection', (event) => {
  if (handleChunkError(event.reason)) {
    event.preventDefault();
    return;
  }
  // No manejado por nadie más: avisar al usuario en vez de fallar en silencio.
  surfaceUnexpectedError(event.reason);
});

createRoot(document.getElementById('root')!).render(
  <ErrorBoundary>
    <AuthProvider>
      <AuthGate>
        <OKRProvider>
          <FinanceProvider>
            <ProjectProvider>
              <KPIProvider>
                <MeetingProvider>
                    <PlaybookProvider>
                      <CRMProvider>
                        <ProposalProvider>
                          <ArcaProvider>
                                <TaskProvider>
                                  <CheckinProvider>
                                    <PresentationProvider>
                                      <QuizProvider>
                                        <NotificationProvider>
                                          <App />
                                        </NotificationProvider>
                                      </QuizProvider>
                                    </PresentationProvider>
                                  </CheckinProvider>
                                </TaskProvider>
                          </ArcaProvider>
                        </ProposalProvider>
                      </CRMProvider>
                    </PlaybookProvider>
                </MeetingProvider>
              </KPIProvider>
            </ProjectProvider>
          </FinanceProvider>
        </OKRProvider>
      </AuthGate>
    </AuthProvider>
  </ErrorBoundary>
);
// rebuild 1779921948
