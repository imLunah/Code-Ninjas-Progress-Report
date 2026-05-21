import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useParentAuth } from '../../context/ParentAuthContext';
import ParentLayout from '../../components/layout/ParentLayout';
import ProgramBadge from '../../components/ui/ProgramBadge';
import BeltBadge from '../../components/ui/BeltBadge';
import Button from '../../components/ui/Button';
import { api } from '../../api/client';
import { formatDate } from '../../utils/dateUtils';

export default function ParentDashboard() {
  const { parent } = useParentAuth();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showWelcome, setShowWelcome] = useState(true);
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

        {showWelcome && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 flex items-start justify-between gap-3">
            <p className="text-blue-700 font-ninja text-sm leading-relaxed">
              Your child's progress is shared with you by your Code Ninjas center. Questions about your data?{' '}
              <Link to="/privacy" className="underline hover:text-blue-900 transition-colors">Privacy Policy</Link>
            </p>
            <button
              onClick={() => setShowWelcome(false)}
              className="text-blue-400 hover:text-blue-700 transition-colors flex-shrink-0 text-lg leading-none mt-0.5"
              aria-label="Dismiss"
            >
              ✕
            </button>
          </div>
        )}

        {loading && (
          <p className="text-ninja-muted font-ninja text-center py-12">Loading...</p>
        )}
        {error && (
          <p className="text-ninja-red font-ninja text-center py-12">{error}</p>
        )}

        {!loading && !error && students.length === 0 && (
          <div className="bg-white border border-ninja-border rounded-2xl p-8 text-center shadow-sm">
            <p className="text-ninja-muted font-ninja">No students found linked to your email.</p>
          </div>
        )}

        {!loading && students.map((s) => {
          const createEnrollment = (s.programs || []).find((p) => p.program === 'CREATE');
          return (
            <div
              key={s.id}
              className="bg-white border border-ninja-border rounded-2xl shadow-sm overflow-hidden cursor-pointer hover:border-ninja-blue transition-colors"
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
