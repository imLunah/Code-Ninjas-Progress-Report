import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useParentAuth } from '../../context/ParentAuthContext';
import ParentLayout from '../../components/layout/ParentLayout';
import ProgramBadge from '../../components/ui/ProgramBadge';
import BeltBadge from '../../components/ui/BeltBadge';
import Button from '../../components/ui/Button';
import { api } from '../../api/client';
import { formatDate } from '../../utils/dateUtils';
import { CARD } from '../../lib/surfaces';
import { SkeletonCards } from '../../components/ui/Skeleton';

export default function ParentDashboard() {
  const { parent } = useParentAuth();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const navigate = useNavigate();

  useEffect(() => {
    api.get('/parent/students')
      .then(setStudents)
      .catch(() => setError('Failed to load your children\'s profiles.'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <ParentLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold font-ninja text-ninja-navy">
            {parent?.parentName ? `Welcome, ${parent.parentName}` : 'My Ninjas'}
          </h1>
          <p className="text-ninja-muted font-ninja mt-1 text-sm">
            Track your child's progress at Code Ninjas
          </p>
        </div>


        {loading && (
          <SkeletonCards count={3} cols="sm:grid-cols-2 lg:grid-cols-3" label="Loading" />
        )}
        {error && (
          <p className="text-ninja-red font-ninja text-center py-12">{error}</p>
        )}

        {!loading && !error && students.length === 0 && (
          <div className={`${CARD} p-8 text-center`}>
            <p className="text-ninja-muted font-ninja">No students found linked to your email.</p>
          </div>
        )}

        {!loading && students.map((s) => {
          const createEnrollment = (s.programs || []).find((p) => p.program === 'CREATE');
          return (
            <div
              key={s.id}
              className={`${CARD} overflow-hidden cursor-pointer hover:border-ninja-blue transition-colors`}
              onClick={() => navigate(`/parent/students/${s.id}`)}
            >
              {/* Thin colored top bar for CREATE students */}
              {createEnrollment?.belt_level && (
                <div className="h-1 w-full" style={{ background: 'linear-gradient(90deg, #006ADD 0%, #004fa8 100%)' }} />
              )}
              <div className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h2 className="text-xl font-bold font-ninja text-ninja-navy mb-2">{s.full_name}</h2>
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      {(s.programs || []).map((p) => (
                        <ProgramBadge key={p.program} program={p.program} size="sm" />
                      ))}
                      {createEnrollment?.belt_level && (
                        <BeltBadge belt={createEnrollment.belt_level} sublevel={createEnrollment.belt_sublevel} size="xs" />
                      )}
                    </div>
                    <p className="text-ninja-muted font-ninja text-xs">
                      {s.last_activity ? `Last session: ${formatDate(s.last_activity)}` : 'No sessions yet'}
                    </p>
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    <Button size="sm" onClick={(e) => { e.stopPropagation(); navigate(`/parent/students/${s.id}`); }}>
                      View →
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </ParentLayout>
  );
}
