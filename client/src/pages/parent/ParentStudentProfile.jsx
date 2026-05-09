import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useParentAuth } from '../../context/ParentAuthContext';
import ParentLayout from '../../components/layout/ParentLayout';
import BeltBadge from '../../components/ui/BeltBadge';
import ProgramBadge from '../../components/ui/ProgramBadge';
import Button from '../../components/ui/Button';
import { api } from '../../api/client';
import { formatDate } from '../../utils/dateUtils';

function formatTimestamp(ts) {
  return new Date(ts).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit',
  });
}

function calcAge(birthday) {
  const dob = new Date(birthday.split('T')[0] + 'T00:00:00');
  return Math.floor((Date.now() - dob) / (365.25 * 24 * 60 * 60 * 1000));
}

export default function ParentStudentProfile() {
  const { id } = useParams();
  const { parent } = useParentAuth();
  const navigate = useNavigate();

  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [messages, setMessages] = useState([]);
  const [msgLoading, setMsgLoading] = useState(true);
  const [msgBody, setMsgBody] = useState('');
  const [sending, setSending] = useState(false);
  const msgBottomRef = useRef(null);

  useEffect(() => {
    api.get(`/parent/students/${id}`)
      .then(setStudent)
      .catch(() => setError('Could not load this profile.'))
      .finally(() => setLoading(false));

    api.get(`/parent/students/${id}/messages`)
      .then(setMessages)
      .catch(() => {})
      .finally(() => setMsgLoading(false));
  }, [id]);

  useEffect(() => {
    msgBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!msgBody.trim()) return;
    setSending(true);
    try {
      const msg = await api.post(`/parent/students/${id}/messages`, { body: msgBody.trim() });
      setMessages((prev) => [...prev, msg]);
      setMsgBody('');
    } catch {
      // silently fail — message stays in input
    } finally {
      setSending(false);
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
  const create = programs.find((p) => p.program === 'CREATE');
  const otherPrograms = programs.filter((p) => p.program !== 'CREATE');

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
          {student.birthday && (
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

        {/* CREATE progress */}
        {create && (
          <div className="bg-white border border-ninja-border rounded-2xl shadow-sm p-5">
            <h2 className="text-ninja-navy font-ninja font-bold text-lg mb-3">CREATE Progress</h2>

            {/* Current status */}
            <div className="flex flex-wrap items-center gap-3 mb-4 pb-4 border-b border-ninja-border">
              {create.belt_level ? (
                <BeltBadge belt={create.belt_level} sublevel={create.belt_sublevel} size="md" />
              ) : (
                <span className="text-ninja-muted font-ninja text-sm italic">No belt assigned yet</span>
              )}
              {create.current_project && (
                <div>
                  <span className="text-ninja-navy font-ninja font-semibold">{create.current_project}</span>
                  {create.project_status && (
                    <span className={`ml-2 text-xs font-ninja font-semibold px-2 py-0.5 rounded-md ${
                      create.project_status === 'Completed' ? 'bg-green-100 text-green-700'
                      : create.project_status === 'Working On' ? 'bg-blue-100 text-blue-700'
                      : 'bg-gray-100 text-gray-600'
                    }`}>{create.project_status}</span>
                  )}
                </div>
              )}
            </div>

            {/* Recent sessions */}
            <p className="text-ninja-muted font-ninja text-xs font-semibold uppercase tracking-wide mb-3">
              Recent Sessions
            </p>
            {(student.create_logs || []).length === 0 ? (
              <p className="text-ninja-muted font-ninja text-sm italic">No sessions logged yet.</p>
            ) : (
              <div className="space-y-3">
                {student.create_logs.map((log, i) => (
                  <div key={i} className="flex items-start gap-3 text-sm">
                    <div className="flex-shrink-0 w-24 text-ninja-muted font-ninja text-xs pt-0.5">
                      {formatDate(log.session_date)}
                    </div>
                    <div className="flex-1 min-w-0">
                      {log.belt_level_at && (
                        <BeltBadge belt={log.belt_level_at} sublevel={log.belt_sublevel_at} size="xs" />
                      )}
                      {log.project_at && (
                        <span className="text-ninja-navy font-ninja ml-2">{log.project_at}</span>
                      )}
                      {log.notes && (
                        <p className="text-ninja-muted font-ninja text-xs mt-1 italic">"{log.notes}"</p>
                      )}
                    </div>
                    {log.sensei_name && (
                      <span className="text-ninja-muted font-ninja text-xs flex-shrink-0">{log.sensei_name}</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Other programs — placeholder */}
        {otherPrograms.length > 0 && (
          <div className="bg-white border border-ninja-border rounded-2xl shadow-sm p-5">
            <h2 className="text-ninja-navy font-ninja font-bold text-lg mb-3">Other Programs</h2>
            <div className="flex flex-wrap gap-2">
              {otherPrograms.map((p) => (
                <ProgramBadge key={p.program} program={p.program} size="md" />
              ))}
            </div>
            <p className="text-ninja-muted font-ninja text-xs mt-3 italic">
              Detailed progress for these programs coming soon.
            </p>
          </div>
        )}

        {/* Messages */}
        <div className="bg-white border border-ninja-border rounded-2xl shadow-sm flex flex-col">
          <div className="px-5 py-4 border-b border-ninja-border">
            <h2 className="text-ninja-navy font-ninja font-bold text-lg">Messages with Senseis</h2>
            <p className="text-ninja-muted font-ninja text-xs mt-0.5">
              Questions or notes for {student.full_name}'s instructors
            </p>
          </div>

          {/* Thread */}
          <div className="flex-1 px-5 py-4 space-y-3 max-h-80 overflow-y-auto">
            {msgLoading && <p className="text-ninja-muted font-ninja text-sm text-center py-4">Loading...</p>}
            {!msgLoading && messages.length === 0 && (
              <p className="text-ninja-muted font-ninja text-sm text-center py-4 italic">
                No messages yet. Send a note to your child's senseis!
              </p>
            )}
            {messages.map((m) => {
              const isParent = m.sender_type === 'parent';
              return (
                <div key={m.id} className={`flex flex-col ${isParent ? 'items-end' : 'items-start'}`}>
                  <div className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm font-ninja ${
                    isParent
                      ? 'bg-ninja-blue text-white rounded-br-sm'
                      : 'bg-ninja-bg border border-ninja-border text-ninja-navy rounded-bl-sm'
                  }`}>
                    {m.body}
                  </div>
                  <span className="text-ninja-muted font-ninja text-xs mt-1 px-1">
                    {isParent ? 'You' : (m.sender_name || 'Sensei')} · {formatTimestamp(m.created_at)}
                  </span>
                </div>
              );
            })}
            <div ref={msgBottomRef} />
          </div>

          {/* Input */}
          <div className="px-5 py-4 border-t border-ninja-border">
            <form onSubmit={handleSend} className="flex gap-2">
              <input
                type="text"
                value={msgBody}
                onChange={(e) => setMsgBody(e.target.value)}
                placeholder="Write a message..."
                className="flex-1 bg-ninja-bg border border-ninja-border text-ninja-navy rounded-lg px-4 py-2 font-ninja text-sm focus:outline-none focus:border-ninja-blue transition-colors"
              />
              <Button type="submit" disabled={sending || !msgBody.trim()} size="sm">
                {sending ? '...' : 'Send'}
              </Button>
            </form>
          </div>
        </div>
      </div>
    </ParentLayout>
  );
}
