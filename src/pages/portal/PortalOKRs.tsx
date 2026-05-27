import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Dashboard } from '../Dashboard';

/**
 * Portal view of OKRs for client users.
 *
 * We deliberately reuse the same <Dashboard /> component that internal
 * consultants see — same stats panel, same chip filters, same pacing
 * cards, same "click row → /okrs/objectives/:id" full detail with
 * charts. The only difference is the scope: forced to the user's own
 * client_id so they never see another client's data.
 *
 * Layout.tsx already keeps the CLIENT_NAV sidebar visible for these
 * users (it switches on userType, not URL), so they get the
 * stripped-down navigation but the full OKR experience inside.
 */
export function PortalOKRs() {
  const { appUser, loading } = useAuth();

  if (loading) return null;

  // If somehow a non-client lands here, send them to the regular hub.
  if (appUser?.userType !== 'client') {
    return <Navigate to="/okrs" replace />;
  }

  // Client without a clientId can't see anything — show an empty state.
  if (!appUser?.clientId) {
    return (
      <div className="rounded-xl border border-dashed border-gray-200 dark:border-gray-700 p-12 text-center">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Tu usuario todavía no está asociado a una empresa. Pedile al administrador que te asigne.
        </p>
      </div>
    );
  }

  // Reuse the same dashboard the admins use, scoped to this client.
  return <Dashboard scope={appUser.clientId} />;
}
