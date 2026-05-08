import { useState, useEffect } from 'react';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';

export default function AssignSenseiDropdown({ assignmentId, currentSenseiId, onAssigned }) {
  const [senseis, setSenseis] = useState([]);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    api.get('/users?role=sensei')
      .then(setSenseis)
      .catch(console.error);
  }, [user?.activeLocation?.id]);

  const handleChange = async (e) => {
    const senseiId = e.target.value ? parseInt(e.target.value) : null;
    setLoading(true);
    try {
      const updated = await api.patch(`/daily/${assignmentId}/assign`, { sensei_id: senseiId });
      onAssigned && onAssigned(updated);
    } catch (err) {
      console.error('Failed to assign sensei:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <select
      value={currentSenseiId || ''}
      onChange={handleChange}
      disabled={loading}
      className="bg-white border border-ninja-border text-ninja-navy text-sm font-ninja rounded-lg px-2 py-1 focus:outline-none focus:border-ninja-blue transition-colors min-w-[130px]"
    >
      <option value="">Unassigned</option>
      {senseis.map((s) => (
        <option key={s.id} value={s.id}>
          {s.display_name}
        </option>
      ))}
    </select>
  );
}
