import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function AdminBar() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  if (user?.role !== 'admin') return null;

  const isManager = pathname.startsWith('/manager');
  const isSensei  = pathname.startsWith('/sensei');

  return (
    <div
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[9999] flex items-center gap-1 px-2 py-1.5 rounded-2xl shadow-xl font-ninja text-xs font-bold"
      style={{
        background: 'rgba(15, 18, 30, 0.92)',
        border: '1px solid rgba(56,161,255,0.25)',
        backdropFilter: 'blur(12px)',
      }}
    >
      <span style={{ color: 'rgba(56,161,255,0.6)' }} className="px-2 tracking-widest uppercase text-[10px]">
        Admin
      </span>
      <div style={{ width: 1, height: 16, background: 'rgba(255,255,255,0.1)' }} />
      <button
        onClick={() => navigate('/manager/dashboard')}
        className="px-3 py-1 rounded-xl transition-colors"
        style={{
          background: isManager ? 'rgb(56,161,255)' : 'transparent',
          color: isManager ? '#fff' : 'rgba(255,255,255,0.5)',
        }}
      >
        Manager
      </button>
      <button
        onClick={() => navigate('/sensei/dashboard')}
        className="px-3 py-1 rounded-xl transition-colors"
        style={{
          background: isSensei ? 'rgb(56,161,255)' : 'transparent',
          color: isSensei ? '#fff' : 'rgba(255,255,255,0.5)',
        }}
      >
        Sensei
      </button>
    </div>
  );
}
