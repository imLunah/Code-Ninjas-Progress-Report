import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserRoundIcon } from 'lucide-react';
import ParentLayout from '../../components/layout/ParentLayout';
import FamilyPass from '../../components/shared/FamilyPass';
import { useParentAuth } from '../../context/ParentAuthContext';
import { useParentPortal } from '../../context/ParentPortalContext';
import { CARD } from '../../lib/surfaces';
import useIsDesktop from '../../lib/useIsDesktop';
import { calcAge } from '../../lib/parentProgress';

// The parent's settings. The same shape as the staff settings screen: a
// rail with the sections and Sign Out, and a pane with the section. There is
// one section, Edit profile: the family pass up top printing the draft as it
// is typed, then the form — first name, last name, email, relationship — and
// the center code, shown and not editable, because the center hands it out
// and a parent cannot move themselves to another center by retyping it.
//
// Email is the sign-in identity, so the save moves every ninja record that
// carried the old address. The server refuses an address already on another
// family's records.

const RELATIONSHIPS = ['Mom', 'Dad', 'Guardian', 'Grandparent', 'Other'];
const FIELD = 'w-full px-4 py-3 rounded-xl bg-ninja-bg border border-ninja-border text-ninja-navy font-ninja text-sm focus:border-ninja-blue focus:outline-none transition-colors';
const LABEL = 'block text-ninja-muted font-ninja text-xs font-semibold uppercase tracking-wide mb-1.5';

function ninjasOf(students) {
  return (students || []).map((s) => {
    const programs = s.programs || [];
    const withBelt = programs.find((p) => p.program === 'CREATE' && p.belt_level) || programs.find((p) => p.belt_level);
    return { name: s.full_name, age: calcAge(s.birthday), belt: withBelt?.belt_level || null };
  });
}

export default function ParentAccountPage() {
  const { parent, saveProfile, logout } = useParentAuth();
  const portal = useParentPortal();
  const navigate = useNavigate();
  const isDesktop = useIsDesktop();

  const [first, setFirst] = useState(parent?.firstName || '');
  const [last, setLast] = useState(parent?.lastName || '');
  const [email, setEmail] = useState(parent?.email || '');
  const [relationship, setRelationship] = useState(parent?.relationship || '');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null); // { ok, text }

  // A save that changes the email re-keys the parent; follow it.
  useEffect(() => {
    setFirst(parent?.firstName || '');
    setLast(parent?.lastName || '');
    setEmail(parent?.email || '');
    setRelationship(parent?.relationship || '');
  }, [parent?.firstName, parent?.lastName, parent?.email, parent?.relationship]);

  const fullName = `${first.trim()} ${last.trim()}`.trim();
  const dirty = first.trim() !== (parent?.firstName || '') || last.trim() !== (parent?.lastName || '')
    || email.trim().toLowerCase() !== (parent?.email || '') || (relationship || null) !== (parent?.relationship || null);

  const handleSave = async (e) => {
    e.preventDefault();
    setMsg(null);
    if (!first.trim() || !last.trim()) { setMsg({ ok: false, text: 'Please enter your first and last name.' }); return; }
    setSaving(true);
    try {
      await saveProfile({ first_name: first.trim(), last_name: last.trim(), email: email.trim(), relationship: relationship || null });
      setMsg({ ok: true, text: 'Saved.' });
    } catch (err) {
      setMsg({ ok: false, text: err?.message || 'Could not save. Please try again.' });
    } finally {
      setSaving(false);
    }
  };

  const pass = (
    <div className="flex justify-center">
      <FamilyPass
        parentName={fullName}
        relationship={relationship}
        phone={parent?.phone || ''}
        center={parent?.centerName}
        centerCode={parent?.centerCode}
        ninjas={ninjasOf(portal?.students)}
        scale={isDesktop ? 0.9 : 0.72}
      />
    </div>
  );

  const form = (
    <form onSubmit={handleSave} className={`${CARD} p-6 space-y-5`}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="pa-first" className={LABEL}>First name</label>
          <input id="pa-first" value={first} onChange={(e) => setFirst(e.target.value)} autoComplete="given-name" className={FIELD} />
        </div>
        <div>
          <label htmlFor="pa-last" className={LABEL}>Last name</label>
          <input id="pa-last" value={last} onChange={(e) => setLast(e.target.value)} autoComplete="family-name" className={FIELD} />
        </div>
      </div>
      <div>
        <label htmlFor="pa-email" className={LABEL}>Email</label>
        <input id="pa-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" className={FIELD} />
        <p className="mt-1.5 font-ninja text-[12px] text-ninja-muted">You sign in with this, together with your center code.</p>
      </div>
      <div>
        <p className={LABEL}>Relationship</p>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Relationship">
          {RELATIONSHIPS.map((r) => {
            const on = relationship === r;
            return (
              <button
                key={r}
                type="button"
                aria-pressed={on}
                onClick={() => setRelationship(on ? '' : r)}
                className={`px-4 py-2 rounded-full font-ninja font-bold text-sm border transition-colors ${
                  on ? 'bg-ninja-blue border-ninja-blue text-white' : 'border-ninja-border text-ninja-navy hover:border-ninja-blue/60'
                }`}
              >
                {r}
              </button>
            );
          })}
        </div>
      </div>
      <div>
        <label htmlFor="pa-code" className={LABEL}>Center code</label>
        <input
          id="pa-code"
          value={parent?.centerCode || ''}
          readOnly
          aria-readonly="true"
          tabIndex={-1}
          className={`${FIELD} font-black tracking-[0.22em] uppercase text-ninja-muted cursor-default select-all`}
        />
        <p className="mt-1.5 font-ninja text-[12px] text-ninja-muted">{parent?.centerName ? `Code Ninjas ${parent.centerName}` : 'Your center'} gives you this. It cannot be changed here.</p>
      </div>

      {msg && (
        <p className={`font-ninja text-sm ${msg.ok ? 'text-green-600' : 'text-ninja-red'}`} role="status">{msg.text}</p>
      )}

      <button
        type="submit"
        disabled={saving || !dirty}
        className="w-full py-3.5 rounded-xl bg-ninja-blue text-white font-ninja font-bold text-sm hover:bg-ninja-blue/90 transition-colors disabled:opacity-50"
      >
        {saving ? 'Saving…' : 'Save Changes'}
      </button>
    </form>
  );

  const signOut = (
    <button
      type="button"
      onClick={async () => { try { await logout(); } catch { /* sign out locally anyway */ } navigate('/login?tab=parent'); }}
      className="w-full border border-ninja-red text-ninja-red font-ninja font-semibold text-sm py-2.5 rounded-xl hover:bg-red-50 transition-colors"
    >
      Sign Out
    </button>
  );

  if (isDesktop) {
    return (
      <ParentLayout>
        <div className="w-full">
          <div className="grid grid-cols-[272px_1fr]">
            <div className="pr-8 border-r border-ninja-border">
              <div className="space-y-6 sticky top-8 max-h-[calc(100dvh-5rem)] overflow-y-auto">
                <h1 className="font-ninja font-black text-2xl text-ninja-navy tracking-tight">Settings</h1>
                <nav aria-label="Settings sections">
                  <p className="px-3 mb-1.5 font-ninja text-xs font-bold uppercase tracking-wide text-ninja-muted">Your account</p>
                  <button
                    type="button"
                    aria-current="page"
                    className="w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-left font-ninja text-sm font-semibold bg-ninja-bg text-ninja-navy"
                  >
                    <UserRoundIcon className="w-[18px] h-[18px] flex-shrink-0" />
                    Edit profile
                  </button>
                </nav>
                <div className="pt-4 border-t border-ninja-border">{signOut}</div>
              </div>
            </div>
            <div className="pl-8">
              <div className="max-w-2xl space-y-6">
                <h2 className="font-ninja font-bold text-xl text-ninja-navy">Edit profile</h2>
                {pass}
                {form}
              </div>
            </div>
          </div>
        </div>
      </ParentLayout>
    );
  }

  return (
    <ParentLayout>
      <div className="mx-auto w-full max-w-md space-y-6">
        <h1 className="font-ninja font-black text-2xl text-ninja-navy tracking-tight">Settings</h1>
        {pass}
        {form}
        {signOut}
      </div>
    </ParentLayout>
  );
}
