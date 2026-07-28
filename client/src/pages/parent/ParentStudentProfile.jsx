import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useParentAuth } from '../../context/ParentAuthContext';
import ParentLayout from '../../components/layout/ParentLayout';
import BeltBadge from '../../components/ui/BeltBadge';
import ProgramBadge from '../../components/ui/ProgramBadge';
import ReactMarkdown from 'react-markdown';
import { api } from '../../api/client';
import { formatDate } from '../../utils/dateUtils';
import ProgressVisuals from '../../components/parent/ProgressVisuals';
import { ClubBadge } from '../../components/shared/ClubSessionsPanel';
import { Pin, MARKDOWN_COMPONENTS } from '../../components/shared/PinnedNote';
import LazyMarkdownEditor from '../../components/shared/LazyMarkdownEditor';
import { CARD } from '../../lib/surfaces';

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
    <ParentLayout wide>
      <div className="space-y-5">
        <button
          onClick={() => navigate('/parent/dashboard')}
          className="text-ninja-muted hover:text-ninja-blue font-ninja text-sm flex items-center gap-1 transition-colors"
        >
          ← Back
        </button>

        {/* Profile header */}
        <div className={`${CARD} p-5`}>
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
            {student.created_at && `Member since ${new Date(student.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`}
          </p>
        </div>

        <div className="lg:grid lg:grid-cols-3 lg:gap-5 lg:items-start">
          {/* Main column — progress cards */}
          <div className="lg:col-span-2 mb-5 lg:mb-0">
            {programs.length > 0 && (
              <ProgressVisuals programs={programs} sessionLogs={student.session_logs || []} />
            )}
          </div>

          {/* Right rail — note + session history */}
          <div className="space-y-5 lg:sticky lg:top-6">
            {/* Note for senseis — shared pinned-note style */}
        <div className="rounded-2xl bg-amber-50 ring-1 ring-amber-200/80 shadow-sm">
          <div className="px-4 py-4">
            <div className="flex items-center justify-between gap-3 mb-2.5">
              <div className="flex items-center gap-2 text-amber-700">
                <Pin className="w-4 h-4 -rotate-12" />
                <h3 className="font-ninja font-bold text-[15px] text-amber-900">Note for Senseis</h3>
              </div>
              {!editing && (
                <button
                  onClick={() => { setDraft(instructions); setEditing(true); }}
                  className="font-ninja text-xs font-bold text-amber-700 hover:text-amber-900 transition-colors"
                >
                  {instructions && instructions.trim() ? 'Edit' : 'Add note'}
                </button>
              )}
            </div>

            {editing ? (
              <div className="space-y-2.5">
                <LazyMarkdownEditor
                  value={draft}
                  onChange={setDraft}
                  placeholder="Allergies, pickup notes, learning style — anything the senseis should know."
                />
                <div className="flex items-center gap-1">
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="font-ninja text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white px-3.5 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                  >
                    {saving ? 'Saving…' : 'Save note'}
                  </button>
                  <button
                    onClick={() => { setEditing(false); setDraft(instructions); }}
                    className="font-ninja text-xs font-bold text-amber-700 hover:text-amber-900 px-3 py-1.5 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : instructions && instructions.trim() ? (
              <div className="font-ninja text-sm leading-relaxed text-gray-900 dark:text-white">
                <ReactMarkdown
                  components={MARKDOWN_COMPONENTS}
                  urlTransform={(url) => (/^(https?:|mailto:)/i.test(url) ? url : '')}
                >
                  {instructions}
                </ReactMarkdown>
              </div>
            ) : (
              <p className="font-ninja text-sm leading-relaxed text-amber-700/70 dark:text-amber-200/40">
                Nothing pinned yet.
              </p>
            )}
          </div>
        </div>

        {/* Session history */}
        <div className={`${CARD} p-5`}>
          <div className="mb-4">
            <h2 className="text-ninja-navy font-ninja font-bold text-lg">Session History</h2>
          </div>
          {(student.session_logs || []).length === 0 && (student.club_attendance || []).length === 0 ? (
            <p className="text-ninja-muted font-ninja text-sm italic">No sessions logged yet.</p>
          ) : (
            <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1 lg:max-h-[calc(100vh-11rem)] no-scrollbar">
              {[
                ...(student.session_logs || []).map((l) => ({ ...l, _type: 'session' })),
                ...(student.club_attendance || []).map((c) => ({ ...c, _type: 'club' })),
              ]
                .sort((a, b) => String(b.session_date).localeCompare(String(a.session_date)))
                .map((entry) => (
                  <div key={`${entry._type}-${entry.id}`} className="flex items-start gap-3 p-3 bg-ninja-bg border border-ninja-border rounded-xl">
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
        </div>
      </div>
    </ParentLayout>
  );
}
