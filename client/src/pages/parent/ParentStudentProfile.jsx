import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useParentAuth } from '../../context/ParentAuthContext';
import ParentLayout from '../../components/layout/ParentLayout';
import BeltBadge from '../../components/ui/BeltBadge';
import ProgramBadge from '../../components/ui/ProgramBadge';
import Button from '../../components/ui/Button';
import { api } from '../../api/client';
import { formatDate } from '../../utils/dateUtils';
import ProgressVisuals from '../../components/parent/ProgressVisuals';
import { ClubBadge } from '../../components/shared/ClubSessionsPanel';

function calcAge(birthday) {
  if (!birthday || typeof birthday !== 'string' || !birthday.trim()) return null;
  const dob = new Date(birthday.split('T')[0] + 'T00:00:00');
  if (isNaN(dob.getTime())) return null;
  return Math.floor((Date.now() - dob) / (365.25 * 24 * 60 * 60 * 1000));
}

export default function ParentStudentProfile() {
  const { id } = useParams();
  const { parent } = useParentAuth();
  const navigate = useNavigate();

  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [instructions, setInstructions] = useState('');
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get(`/parent/students/${id}`)
      .then((data) => {
        setStudent(data);
        setInstructions(data.special_instructions || '');
        setDraft(data.special_instructions || '');
      })
      .catch(() => setError('Could not load this profile.'))
      .finally(() => setLoading(false));
  }, [id]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const result = await api.patch(`/parent/students/${id}/instructions`, {
        special_instructions: draft,
      });
      setInstructions(result.special_instructions || '');
      setDraft(result.special_instructions || '');
      setEditing(false);
    } catch {
      // silently fail — keep editing open
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <ParentLayout>
        <p className="text-ninja-muted font-ninja text-center py-12">Loading...</p>
      </ParentLayout>
    );
  }

  if (error || !student) {
    return (
      <ParentLayout>
        <p className="text-ninja-red font-ninja text-center py-12">{error || 'Profile not found'}</p>
      </ParentLayout>
    );
  }

  const programs = student.programs || [];

  return (
    <ParentLayout>
      <div className="space-y-5">
        <button
          onClick={() => navigate('/parent/dashboard')}
          className="text-ninja-muted hover:text-ninja-blue font-ninja text-sm flex items-center gap-1 transition-colors"
        >
          ← Back
        </button>

        {/* Profile header */}
        <div className="bg-white border border-ninja-border rounded-2xl shadow-sm p-5">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <h1 className="text-2xl font-bold font-ninja text-ninja-navy">{student.full_name}</h1>
            {programs.map((p) => (
              <ProgramBadge key={p.program} program={p.program} size="sm" />
            ))}
          </div>
          {student.birthday && calcAge(student.birthday) !== null && (
            <p className="text-ninja-muted font-ninja text-sm">
              Age {calcAge(student.birthday)}
              {' · '}
              Born {new Date(student.birthday.split('T')[0] + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </p>
          )}
          <p className="text-ninja-muted font-ninja text-xs mt-1">
            Member since {new Date(student.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </p>
        </div>

        {/* Progress visualizations */}
        {programs.length > 0 && (student.session_logs || []).length > 0 && (
          <ProgressVisuals programs={programs} sessionLogs={student.session_logs || []} />
        )}


        {/* Note for senseis — pinned note style */}
        <div className="rounded-2xl overflow-hidden" style={{ background: '#fffbeb', border: '1.5px dashed #fcd34d' }}>
          <div className="p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-base">📌</span>
                <h2 className="font-ninja font-bold text-sm" style={{ color: '#92400e' }}>Note for Senseis</h2>
              </div>
              {!editing && (
                <button
                  onClick={() => { setDraft(instructions); setEditing(true); }}
                  className="font-ninja text-sm font-semibold hover:underline flex-shrink-0"
                  style={{ color: '#92400e', opacity: 0.7 }}
                >
                  {instructions ? 'Edit' : '+ Add'}
                </button>
              )}
            </div>

            {editing ? (
              <div className="space-y-3">
                <textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  rows={4}
                  placeholder="e.g. Has a peanut allergy. Gets picked up by grandma on Tuesdays. Prefers written instructions."
                  autoFocus
                  className="w-full border rounded-xl px-4 py-3 font-ninja text-sm focus:outline-none resize-none"
                  style={{ backgroundColor: 'rgba(255,255,255,0.7)', borderColor: '#fcd34d', color: '#78350f' }}
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleSave} disabled={saving}>
                    {saving ? 'Saving...' : 'Save'}
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => { setEditing(false); setDraft(instructions); }}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : instructions ? (
              <p className="font-ninja text-sm leading-relaxed whitespace-pre-wrap" style={{ color: '#78350f' }}>
                {instructions}
              </p>
            ) : (
              <p className="font-ninja text-sm italic" style={{ color: '#a16207' }}>
                Tap Edit to leave a note for your child's senseis — allergies, pickup notes, etc.
              </p>
            )}
          </div>
        </div>

        {/* Session history */}
        <div className="bg-white border border-ninja-border rounded-2xl shadow-sm p-5">
          <div className="mb-4">
            <h2 className="text-ninja-navy font-ninja font-bold text-lg">Session History</h2>
          </div>
          {(student.session_logs || []).length === 0 && (student.club_attendance || []).length === 0 ? (
            <p className="text-ninja-muted font-ninja text-sm italic">No sessions logged yet.</p>
          ) : (
            <div className="space-y-3">
              {[
                ...(student.session_logs || []).map((l) => ({ ...l, _type: 'session' })),
                ...(student.club_attendance || []).map((c) => ({ ...c, _type: 'club' })),
              ]
                .sort((a, b) => String(b.session_date).localeCompare(String(a.session_date)))
                .map((entry, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 bg-ninja-bg border border-ninja-border rounded-xl">
                    <div className="flex-shrink-0 w-20 text-ninja-muted font-ninja text-xs pt-0.5">
                      {formatDate(entry.session_date)}
                    </div>
                    <div className="flex-1 min-w-0 flex flex-wrap items-center gap-1.5">
                      {entry._type === 'club' ? (
                        <ClubBadge name={entry.club_name} />
                      ) : (
                        <>
                          <ProgramBadge program={entry.program} size="xs" />
                          {entry.sub_program && (
                            <span className="text-xs bg-purple-50 text-purple-700 border border-purple-200 px-2 py-0.5 rounded-md font-ninja font-semibold">
                              {entry.sub_program}
                            </span>
                          )}
                          {entry.module_name && (
                            <span className="text-xs bg-white border border-ninja-border text-ninja-navy px-2 py-0.5 rounded-md font-ninja">
                              {entry.module_name}
                            </span>
                          )}
                          {entry.lesson_name && (
                            <span className="text-xs text-ninja-muted font-ninja">{entry.lesson_name}</span>
                          )}
                          {entry.belt_level_at && (
                            <BeltBadge belt={entry.belt_level_at} sublevel={entry.belt_sublevel_at} size="xs" />
                          )}
                          {entry.project_at && (
                            <span className="text-xs text-ninja-navy font-ninja font-semibold">{entry.project_at}</span>
                          )}
                          {entry.status_at && (
                            <span className={`text-xs font-ninja font-semibold px-2 py-0.5 rounded-md ${
                              entry.status_at === 'Completed' ? 'bg-green-100 text-green-700'
                              : entry.status_at === 'Working On' ? 'bg-blue-100 text-blue-700'
                              : 'bg-gray-100 text-gray-600'
                            }`}>{entry.status_at}</span>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>
    </ParentLayout>
  );
}
