import './patchFetch';
import { Component, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { AuthProvider } from './context/AuthContext';
import { OKRProvider } from './context/OKRContext';
import { FinanceProvider } from './context/FinanceContext';
import { ProjectProvider } from './context/ProjectContext';
import { KPIProvider } from './context/KPIContext';
import { MeetingProvider } from './context/MeetingContext';
import { BMCProvider } from './context/BMCContext';
import { PlaybookProvider } from './context/PlaybookContext';
import { CRMProvider } from './context/CRMContext';
import { ProposalProvider } from './context/ProposalContext';
import { ArcaProvider } from './context/ArcaContext';
import { ToolsProvider } from './context/ToolsContext';
import { TaskProvider } from './context/TaskContext';
import { CheckinProvider } from './context/CheckinContext';
import './index.css';
import App from './App';

class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { error };
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

createRoot(document.getElementById('root')!).render(
  <ErrorBoundary>
    <AuthProvider>
      <OKRProvider>
        <FinanceProvider>
          <ProjectProvider>
            <KPIProvider>
              <MeetingProvider>
                <BMCProvider>
                  <PlaybookProvider>
                    <CRMProvider>
                      <ProposalProvider>
                        <ArcaProvider>
                          <ToolsProvider>
                            <TaskProvider>
                              <CheckinProvider>
                                <App />
                              </CheckinProvider>
                            </TaskProvider>
                          </ToolsProvider>
                        </ArcaProvider>
                      </ProposalProvider>
                    </CRMProvider>
                  </PlaybookProvider>
                </BMCProvider>
              </MeetingProvider>
            </KPIProvider>
          </ProjectProvider>
        </FinanceProvider>
      </OKRProvider>
    </AuthProvider>
  </ErrorBoundary>
);
