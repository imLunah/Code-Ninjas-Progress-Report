import { Navigate } from 'react-router-dom';
import { useParentAuth } from '../../context/ParentAuthContext';

export default function ParentRoute({ children }) {
  const { parent, loading } = useParentAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-ninja-bg flex items-center justify-center">
        <p className="text-ninja-muted font-ninja text-xl">Loading...</p>
      </div>
    );
  }

  if (!parent) return <Navigate to="/parent/login" replace />;
  return children;
}
