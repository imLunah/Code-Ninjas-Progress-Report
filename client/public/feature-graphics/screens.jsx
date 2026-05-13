// screens.jsx — six mock screens of the DojoLink web app, sized for the Phone frame.
// All screens are rendered as a function of `scale` (returned by <Phone>).

// ─── Top bar shared by app screens ─────────────────────────────────────────

function AppTopBar({ scale, title, sub, right, accent = DOJO_BLUE }) {
  return (
    <div
      style={{
        background: '#fff',
        borderBottom: `1px solid ${DOJO_BORDER}`,
        padding: `${10 * scale}px ${16 * scale}px ${12 * scale}px`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 10 * scale,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 9 * scale, minWidth: 0 }}>
        <img
          src="assets/DojoLinkLogo.png"
          alt="DojoLink"
          style={{
            height: 34 * scale,
            width: 'auto',
            flexShrink: 0,
            display: 'block',
          }}
        />
        <div
          style={{
            width: 1,
            height: 18 * scale,
            background: DOJO_BORDER,
            flexShrink: 0,
            margin: `0 ${2 * scale}px`,
          }}
        />
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontFamily: 'Nunito, sans-serif',
              fontWeight: 900,
              fontSize: 13 * scale,
              color: DOJO_NAVY,
              lineHeight: 1.1,
              whiteSpace: 'nowrap',
            }}
          >
            {title}
          </div>
          {sub && (
            <div
              style={{
                fontFamily: 'Nunito, sans-serif',
                fontSize: 10 * scale,
                color: DOJO_MUTED,
                marginTop: 1 * scale,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {sub}
            </div>
          )}
        </div>
      </div>
      {right}
    </div>
  );
}

function Avatar({ scale, name, color = DOJO_BLUE, size = 28 }) {
  const initials = name
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('');
  return (
    <div
      style={{
        width: size * scale,
        height: size * scale,
        borderRadius: 999,
        background: color,
        color: '#fff',
        display: 'grid',
        placeItems: 'center',
        fontFamily: 'Nunito, sans-serif',
        fontWeight: 900,
        fontSize: 11 * scale,
        flexShrink: 0,
      }}
    >
      {initials}
    </div>
  );
}

// ─── 1) Today's Session Board ──────────────────────────────────────────────

function ScreenTodayBoard({ scale, accent = DOJO_BLUE }) {
  const cards = [
    { name: 'Mia Chen',      program: 'CREATE', belt: 'Orange', sub: 7, project: 'Build 2 · Working On', status: 'done',    sensei: 'Sensei Ray' },
    { name: 'Jaden Park',    program: 'CREATE', belt: 'Green',  sub: 4, project: 'Solve 1 · Started',    status: 'done',    sensei: 'Sensei Ray' },
    { name: 'Aria Patel',    program: 'Robotics Academy', kit: 'EV3 · Module 4',  status: 'pending', sensei: 'Sensei Kim' },
    { name: 'Owen Brooks',   program: 'CREATE', belt: 'Yellow', sub: 9, project: 'Build 3 · Working On', status: 'pending', sensei: 'Sensei Kim' },
    { name: 'Lila Nguyen',   program: 'AI Academy',  module: 'Module 2 · Lesson 3', status: 'overdue', sensei: 'Unassigned' },
    { name: 'Theo Williams', program: 'CREATE', belt: 'White',  sub: 5, project: 'Build 1 · Started',    status: 'pending', sensei: 'Sensei Ray' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <AppTopBar
        scale={scale}
        title="Today's Board"
        sub="Yorba Linda · Wed, May 13"
        accent={accent}
        right={
          <button
            style={{
              background: accent,
              color: '#fff',
              border: 'none',
              borderRadius: 10 * scale,
              padding: `${7 * scale}px ${10 * scale}px`,
              fontFamily: 'Nunito, sans-serif',
              fontWeight: 800,
              fontSize: 11 * scale,
              whiteSpace: 'nowrap',
            }}
          >
            + Check In
          </button>
        }
      />

      {/* legend */}
      <div
        style={{
          padding: `${10 * scale}px ${16 * scale}px ${4 * scale}px`,
          display: 'flex',
          alignItems: 'center',
          gap: 10 * scale,
          fontFamily: 'Nunito, sans-serif',
          fontSize: 10 * scale,
          color: DOJO_MUTED,
        }}
      >
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 * scale }}>
          <StatusDot status="done" scale={scale} /> Logged
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 * scale }}>
          <StatusDot status="pending" scale={scale} /> Pending
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 * scale }}>
          <StatusDot status="overdue" scale={scale} /> Overdue
        </span>
        <span style={{ marginLeft: 'auto', fontWeight: 800, color: DOJO_NAVY }}>
          2 / 6
        </span>
      </div>

      <div
        style={{
          padding: `${6 * scale}px ${16 * scale}px ${16 * scale}px`,
          display: 'flex',
          flexDirection: 'column',
          gap: 9 * scale,
          overflow: 'hidden',
        }}
      >
        {cards.map((c, i) => {
          const border = c.status === 'done' ? '#4ade80' : c.status === 'overdue' ? '#f87171' : '#fde047';
          return (
            <div
              key={i}
              style={{
                background: '#fff',
                border: `2px solid ${border}`,
                borderRadius: 14 * scale,
                padding: `${9 * scale}px ${11 * scale}px`,
                boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div
                  style={{
                    fontFamily: 'Nunito, sans-serif',
                    fontWeight: 900,
                    fontSize: 13 * scale,
                    color: DOJO_NAVY,
                  }}
                >
                  {c.name}
                  {c.status === 'overdue' && (
                    <span
                      style={{
                        marginLeft: 6 * scale,
                        fontSize: 9 * scale,
                        background: '#fee2e2',
                        color: '#b91c1c',
                        padding: `${1 * scale}px ${5 * scale}px`,
                        borderRadius: 5 * scale,
                        border: '1px solid #fecaca',
                      }}
                    >
                      Overdue
                    </span>
                  )}
                </div>
                <StatusDot status={c.status} scale={scale} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 * scale, marginTop: 5 * scale, flexWrap: 'wrap' }}>
                <ProgramChip program={c.program} scale={scale} />
                {c.belt && <BeltChip belt={c.belt} sublevel={c.sub} scale={scale} />}
              </div>
              <div
                style={{
                  marginTop: 5 * scale,
                  fontFamily: 'Nunito, sans-serif',
                  fontSize: 10 * scale,
                  color: DOJO_MUTED,
                }}
              >
                {c.project || c.kit || c.module}
              </div>
              <div
                style={{
                  marginTop: 2 * scale,
                  fontFamily: 'Nunito, sans-serif',
                  fontSize: 9 * scale,
                  color: DOJO_MUTED,
                }}
              >
                Sensei: {c.sensei}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── 2) Ninja profile (staff view — belt + history) ────────────────────────

function ScreenNinjaProfile({ scale, accent = DOJO_BLUE }) {
  const belt = 'Orange';
  const sublevel = 7;
  const maxLevel = 12;
  const pct = Math.round((sublevel / maxLevel) * 100);

  const beltOrder = ['White', 'Yellow', 'Orange', 'Green', 'Blue'];

  const history = [
    { date: 'Mon, May 12', note: 'Finished Build 2 walkthrough. Moving to debug today.', sensei: 'Ray' },
    { date: 'Wed, May 7',  note: 'Stuck on collision logic. Paired with sensei for 20m.', sensei: 'Kim' },
    { date: 'Mon, May 5',  note: 'Earned Orange #7 today. Confident on functions.',     sensei: 'Ray' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <AppTopBar
        scale={scale}
        title="Mia Chen"
        sub="Yorba Linda · CREATE · Joined Aug 2024"
        accent={accent}
        right={
          <Avatar scale={scale} name="Mia Chen" color="#f97316" size={30} />
        }
      />
      <div
        style={{
          padding: `${12 * scale}px ${16 * scale}px ${16 * scale}px`,
          display: 'flex',
          flexDirection: 'column',
          gap: 10 * scale,
          overflow: 'hidden',
        }}
      >
        {/* Belt path */}
        <div
          style={{
            background: '#fff',
            border: `1px solid ${DOJO_BORDER}`,
            borderRadius: 14 * scale,
            padding: `${11 * scale}px ${12 * scale}px`,
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'baseline',
              marginBottom: 7 * scale,
            }}
          >
            <div style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 900, fontSize: 12 * scale, color: DOJO_NAVY }}>
              Belt Journey
            </div>
            <div style={{ fontFamily: 'Nunito, sans-serif', fontSize: 10 * scale, color: DOJO_MUTED }}>
              {belt} #{sublevel} of {maxLevel}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 * scale }}>
            {beltOrder.map((b) => {
              const isActive = b === belt;
              const isPast = beltOrder.indexOf(b) < beltOrder.indexOf(belt);
              const sz = (isActive ? 32 : 22) * scale;
              return (
                <div key={b} style={{ display: 'flex', alignItems: 'center', gap: 4 * scale, flex: 1 }}>
                  <img
                    src={`assets/belts/${b.toLowerCase()}.png`}
                    alt={b}
                    style={{
                      width: sz,
                      height: sz,
                      objectFit: 'contain',
                      display: 'block',
                      flexShrink: 0,
                      filter: isPast || isActive ? 'none' : 'grayscale(1)',
                      opacity: isPast || isActive ? 1 : 0.35,
                      transform: isActive ? `scale(${1 + 4 / sz})` : 'none',
                      transformOrigin: 'center',
                    }}
                  />
                  {b !== beltOrder[beltOrder.length - 1] && (
                    <div style={{ flex: 1, height: 2 * scale, background: isPast ? accent : DOJO_BORDER }} />
                  )}
                </div>
              );
            })}
          </div>
          {/* Sublevel bar */}
          <div style={{ marginTop: 9 * scale }}>
            <div
              style={{
                height: 7 * scale,
                background: '#eef2f7',
                borderRadius: 999,
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: `${pct}%`,
                  height: '100%',
                  background: BELT_COLORS[belt].bg,
                  borderRadius: 999,
                }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 * scale, fontFamily: 'Nunito, sans-serif', fontSize: 9 * scale, color: DOJO_MUTED }}>
              <span>Current project: Build 2</span>
              <span style={{ fontWeight: 800, color: DOJO_NAVY }}>{pct}%</span>
            </div>
          </div>
        </div>

        {/* Activity */}
        <div
          style={{
            background: '#fff',
            border: `1px solid ${DOJO_BORDER}`,
            borderRadius: 14 * scale,
            padding: `${11 * scale}px ${12 * scale}px`,
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'baseline',
              marginBottom: 7 * scale,
            }}
          >
            <div style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 900, fontSize: 12 * scale, color: DOJO_NAVY }}>
              Activity
            </div>
            <div style={{ fontFamily: 'Nunito, sans-serif', fontSize: 10 * scale, color: accent, fontWeight: 800 }}>
              38 sessions
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4 * scale, height: 40 * scale }}>
            {[5, 8, 4, 9, 7, 5].map((n, i) => (
              <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 * scale }}>
                <div
                  style={{
                    width: '100%',
                    height: `${n * 4 * scale}px`,
                    background: accent,
                    borderRadius: `${3 * scale}px ${3 * scale}px 0 0`,
                  }}
                />
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 4 * scale, marginTop: 3 * scale, fontFamily: 'Nunito, sans-serif', fontSize: 8 * scale, color: DOJO_MUTED }}>
            {['Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May'].map((m) => (
              <div key={m} style={{ flex: 1, textAlign: 'center' }}>{m}</div>
            ))}
          </div>
        </div>

        {/* History */}
        <div
          style={{
            background: '#fff',
            border: `1px solid ${DOJO_BORDER}`,
            borderRadius: 14 * scale,
            padding: `${11 * scale}px ${12 * scale}px`,
            flex: 1,
            minHeight: 0,
            overflow: 'hidden',
          }}
        >
          <div style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 900, fontSize: 12 * scale, color: DOJO_NAVY, marginBottom: 6 * scale }}>
            Recent Progress
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 * scale }}>
            {history.map((h, i) => (
              <div key={i} style={{ display: 'flex', gap: 7 * scale }}>
                <div style={{ width: 3 * scale, background: accent, borderRadius: 999, flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 800, fontSize: 10 * scale, color: DOJO_NAVY }}>
                    {h.date} · Sensei {h.sensei}
                  </div>
                  <div style={{ fontFamily: 'Nunito, sans-serif', fontSize: 10 * scale, color: DOJO_MUTED, marginTop: 1 * scale, lineHeight: 1.35 }}>
                    {h.note}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── 3) Log Progress form (sensei) ─────────────────────────────────────────

function ScreenLogProgress({ scale, accent = DOJO_BLUE }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <AppTopBar
        scale={scale}
        title="Log Progress"
        sub="Owen Brooks · CREATE"
        accent={accent}
        right={
          <button
            style={{
              background: 'transparent',
              color: DOJO_MUTED,
              border: 'none',
              fontFamily: 'Nunito, sans-serif',
              fontSize: 11 * scale,
              fontWeight: 800,
            }}
          >
            Cancel
          </button>
        }
      />
      <div
        style={{
          padding: `${12 * scale}px ${16 * scale}px ${16 * scale}px`,
          display: 'flex',
          flexDirection: 'column',
          gap: 10 * scale,
          overflow: 'hidden',
        }}
      >
        {/* Belt advancement card */}
        <div
          style={{
            background: '#fff',
            border: `1px solid ${DOJO_BORDER}`,
            borderRadius: 14 * scale,
            padding: `${11 * scale}px ${12 * scale}px`,
          }}
        >
          <div style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 900, fontSize: 12 * scale, color: DOJO_NAVY }}>
            Belt
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 * scale, marginTop: 8 * scale }}>
            <BeltChip belt="Yellow" sublevel={9} scale={scale * 1.3} />
            <svg width={18 * scale} height={12 * scale} viewBox="0 0 18 12" fill={DOJO_MUTED}>
              <path d="M0 6h13M9 1l5 5-5 5" stroke={DOJO_MUTED} strokeWidth="1.5" fill="none" />
            </svg>
            <BeltChip belt="Yellow" sublevel={10} scale={scale * 1.3} />
          </div>
          <div style={{ display: 'flex', gap: 6 * scale, marginTop: 9 * scale }}>
            {[
              { label: 'Stayed', selected: false },
              { label: '+1 Sublevel', selected: true },
              { label: 'Belt up!', selected: false },
            ].map((b) => (
              <div
                key={b.label}
                style={{
                  flex: 1,
                  textAlign: 'center',
                  border: `1.5px solid ${b.selected ? accent : DOJO_BORDER}`,
                  background: b.selected ? `${accent}10` : '#fff',
                  color: b.selected ? accent : DOJO_NAVY,
                  borderRadius: 10 * scale,
                  padding: `${7 * scale}px 0`,
                  fontFamily: 'Nunito, sans-serif',
                  fontWeight: 800,
                  fontSize: 10 * scale,
                }}
              >
                {b.label}
              </div>
            ))}
          </div>
        </div>

        {/* Project card */}
        <div
          style={{
            background: '#fff',
            border: `1px solid ${DOJO_BORDER}`,
            borderRadius: 14 * scale,
            padding: `${11 * scale}px ${12 * scale}px`,
          }}
        >
          <div style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 900, fontSize: 12 * scale, color: DOJO_NAVY }}>
            Project
          </div>
          <div
            style={{
              marginTop: 7 * scale,
              border: `1px solid ${DOJO_BORDER}`,
              borderRadius: 10 * scale,
              padding: `${8 * scale}px ${10 * scale}px`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontFamily: 'Nunito, sans-serif',
              fontSize: 11 * scale,
              color: DOJO_NAVY,
              fontWeight: 700,
            }}
          >
            <span>Build 3</span>
            <span style={{ color: DOJO_MUTED }}>▾</span>
          </div>
          <div style={{ display: 'flex', gap: 6 * scale, marginTop: 8 * scale }}>
            {[
              { label: 'Started', sel: false },
              { label: 'Working On', sel: true },
              { label: 'Completed', sel: false },
            ].map((s) => (
              <div
                key={s.label}
                style={{
                  flex: 1,
                  textAlign: 'center',
                  background: s.sel ? accent : '#fff',
                  color: s.sel ? '#fff' : DOJO_NAVY,
                  border: `1.5px solid ${s.sel ? accent : DOJO_BORDER}`,
                  borderRadius: 10 * scale,
                  padding: `${6 * scale}px 0`,
                  fontFamily: 'Nunito, sans-serif',
                  fontWeight: 800,
                  fontSize: 10 * scale,
                }}
              >
                {s.label}
              </div>
            ))}
          </div>
        </div>

        {/* Notes card */}
        <div
          style={{
            background: '#fff',
            border: `1px solid ${DOJO_BORDER}`,
            borderRadius: 14 * scale,
            padding: `${11 * scale}px ${12 * scale}px`,
            flex: 1,
            minHeight: 0,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 900, fontSize: 12 * scale, color: DOJO_NAVY, marginBottom: 6 * scale }}>
            Session Notes
          </div>
          <div
            style={{
              flex: 1,
              border: `1px solid ${DOJO_BORDER}`,
              borderRadius: 10 * scale,
              padding: `${8 * scale}px ${10 * scale}px`,
              fontFamily: 'Nunito, sans-serif',
              fontSize: 10 * scale,
              color: DOJO_NAVY,
              lineHeight: 1.45,
            }}
          >
            Owen got functions clicking today. Walked through Build 3 intro,
            paired on the conditional. Confident going into next session<span style={{ background: `${accent}22`, padding: `0 1px` }}>|</span>
          </div>
        </div>

        <button
          style={{
            background: accent,
            color: '#fff',
            border: 'none',
            borderRadius: 12 * scale,
            padding: `${10 * scale}px 0`,
            fontFamily: 'Nunito, sans-serif',
            fontWeight: 900,
            fontSize: 12 * scale,
            boxShadow: `0 ${6 * scale}px ${14 * scale}px -${4 * scale}px ${accent}66`,
          }}
        >
          Save Progress
        </button>
      </div>
    </div>
  );
}

// ─── 4) Club profile ───────────────────────────────────────────────────────

function ScreenClubProfile({ scale, accent = DOJO_BLUE }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <AppTopBar
        scale={scale}
        title="Minecraft Club"
        sub="Fullerton · 14 members"
        accent={accent}
        right={
          <div
            style={{
              fontSize: 18 * scale,
              width: 28 * scale,
              height: 28 * scale,
              borderRadius: 8 * scale,
              background: '#dcfce7',
              display: 'grid',
              placeItems: 'center',
            }}
          >
            ⛏
          </div>
        }
      />
      <div
        style={{
          padding: `${12 * scale}px ${16 * scale}px ${16 * scale}px`,
          display: 'flex',
          flexDirection: 'column',
          gap: 10 * scale,
          overflow: 'hidden',
        }}
      >
        {/* Pinned note */}
        <div
          style={{
            background: '#fffbeb',
            border: '1.5px dashed #fcd34d',
            borderRadius: 14 * scale,
            padding: `${10 * scale}px ${12 * scale}px`,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 * scale, fontFamily: 'Nunito, sans-serif', fontWeight: 900, fontSize: 10 * scale, color: '#92400e', marginBottom: 4 * scale }}>
            <span style={{ fontSize: 11 * scale }}>📌</span> Pinned by Sensei Ray
          </div>
          <div style={{ fontFamily: 'Nunito, sans-serif', fontSize: 11 * scale, color: '#78350f', lineHeight: 1.45 }}>
            New redstone build challenge this Saturday. Bring laptops charged.
            Theme: <b>working clock tower</b>.
          </div>
        </div>

        {/* Resources */}
        <div
          style={{
            background: '#fff',
            border: `1px solid ${DOJO_BORDER}`,
            borderRadius: 14 * scale,
            padding: `${11 * scale}px ${12 * scale}px`,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 7 * scale }}>
            <div style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 900, fontSize: 12 * scale, color: DOJO_NAVY }}>
              Resources
            </div>
            <div style={{ fontFamily: 'Nunito, sans-serif', fontSize: 10 * scale, color: accent, fontWeight: 800 }}>
              + Add
            </div>
          </div>
          {[
            { kind: 'PDF', name: 'Redstone basics.pdf', meta: '2.1 MB' },
            { kind: 'LINK', name: 'Server world download', meta: 'minecraft.net' },
            { kind: 'IMG', name: 'last-week-builds.zip', meta: '18 MB' },
          ].map((r, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 9 * scale,
                padding: `${6 * scale}px 0`,
                borderBottom: i < 2 ? `1px solid ${DOJO_BORDER}` : 'none',
              }}
            >
              <div
                style={{
                  width: 26 * scale,
                  height: 26 * scale,
                  borderRadius: 7 * scale,
                  background: r.kind === 'PDF' ? '#fee2e2' : r.kind === 'LINK' ? '#dbeafe' : '#ede9fe',
                  color: r.kind === 'PDF' ? '#b91c1c' : r.kind === 'LINK' ? '#1d4ed8' : '#6d28d9',
                  display: 'grid',
                  placeItems: 'center',
                  fontFamily: 'Nunito, sans-serif',
                  fontWeight: 900,
                  fontSize: 8 * scale,
                  flexShrink: 0,
                }}
              >
                {r.kind}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 700, fontSize: 11 * scale, color: DOJO_NAVY, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {r.name}
                </div>
                <div style={{ fontFamily: 'Nunito, sans-serif', fontSize: 9 * scale, color: DOJO_MUTED }}>
                  {r.meta}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Sessions */}
        <div
          style={{
            background: '#fff',
            border: `1px solid ${DOJO_BORDER}`,
            borderRadius: 14 * scale,
            padding: `${11 * scale}px ${12 * scale}px`,
            flex: 1,
            minHeight: 0,
            overflow: 'hidden',
          }}
        >
          <div style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 900, fontSize: 12 * scale, color: DOJO_NAVY, marginBottom: 7 * scale }}>
            Sessions
          </div>
          {[
            { date: 'May 11', status: 'done',    attendees: 12, note: 'Built spawn village together.' },
            { date: 'May 4',  status: 'done',    attendees: 9,  note: 'Mob-proofing techniques.' },
            { date: 'Apr 27', status: 'overdue', attendees: 11, note: 'Notes still pending...' },
          ].map((s, i) => {
            const border = s.status === 'done' ? '#4ade80' : '#f87171';
            return (
              <div
                key={i}
                style={{
                  borderLeft: `3px solid ${border}`,
                  padding: `${4 * scale}px ${8 * scale}px ${4 * scale}px ${9 * scale}px`,
                  marginBottom: 6 * scale,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'Nunito, sans-serif', fontSize: 10 * scale, fontWeight: 800, color: DOJO_NAVY }}>
                  <span>{s.date}</span>
                  <span style={{ color: DOJO_MUTED, fontWeight: 700 }}>{s.attendees} attended</span>
                </div>
                <div style={{ fontFamily: 'Nunito, sans-serif', fontSize: 10 * scale, color: DOJO_MUTED, marginTop: 1 * scale }}>
                  {s.note}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── 5) Parent portal (belt path + messaging preview) ──────────────────────

function ScreenParentPortal({ scale, accent = DOJO_BLUE }) {
  const belt = 'Orange';
  const sublevel = 7;
  const beltOrder = ['White', 'Yellow', 'Orange', 'Green', 'Blue'];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <AppTopBar
        scale={scale}
        title="Mia's Progress"
        sub="Parent view · CREATE"
        accent={accent}
        right={
          <div
            style={{
              fontFamily: 'Nunito, sans-serif',
              fontSize: 10 * scale,
              color: accent,
              fontWeight: 800,
              border: `1.5px solid ${accent}`,
              padding: `${4 * scale}px ${8 * scale}px`,
              borderRadius: 999,
              whiteSpace: 'nowrap',
            }}
          >
            Switch ninja
          </div>
        }
      />
      <div
        style={{
          padding: `${12 * scale}px ${16 * scale}px ${16 * scale}px`,
          display: 'flex',
          flexDirection: 'column',
          gap: 10 * scale,
          overflow: 'hidden',
        }}
      >
        {/* Hero belt card */}
        <div
          style={{
            background: `linear-gradient(135deg, ${accent} 0%, #0058b8 100%)`,
            borderRadius: 18 * scale,
            padding: `${14 * scale}px ${14 * scale}px`,
            color: '#fff',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div style={{ position: 'absolute', right: -10 * scale, top: -10 * scale, opacity: 0.25 }}>
            <NinjaIcon size={90 * scale} color="#fff" maskColor="rgba(255,255,255,0.4)" />
          </div>
          <div style={{ fontFamily: 'Nunito, sans-serif', fontSize: 10 * scale, opacity: 0.85, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            Current Belt
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 * scale, marginTop: 3 * scale }}>
            <div style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 900, fontSize: 24 * scale, lineHeight: 1 }}>
              {belt}
            </div>
            <div style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 800, fontSize: 14 * scale, opacity: 0.9 }}>
              #{sublevel}
            </div>
          </div>
          <div
            style={{
              marginTop: 10 * scale,
              display: 'flex',
              alignItems: 'center',
              gap: 4 * scale,
            }}
          >
            {beltOrder.map((b, i) => {
              const isCurrent = b === belt;
              const idx = beltOrder.indexOf(belt);
              const done = i < idx;
              const sz = (isCurrent ? 38 : 22) * scale;
              return (
                <div key={b} style={{ display: 'flex', alignItems: 'center', gap: 4 * scale, flex: 1 }}>
                  <img
                    src={`assets/belts/${b.toLowerCase()}.png`}
                    alt={b}
                    style={{
                      width: sz,
                      height: sz,
                      objectFit: 'contain',
                      display: 'block',
                      flexShrink: 0,
                      opacity: done || isCurrent ? 1 : 0.55,
                      filter: isCurrent
                        ? `drop-shadow(0 0 ${6 * scale}px rgba(255,255,255,0.5))`
                        : 'none',
                    }}
                  />
                  {b !== beltOrder[beltOrder.length - 1] && (
                    <div style={{ flex: 1, height: 2 * scale, background: done ? '#fff' : 'rgba(255,255,255,0.3)' }} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent sessions (no instructor notes — parent view) */}
        <div
          style={{
            background: '#fff',
            border: `1px solid ${DOJO_BORDER}`,
            borderRadius: 14 * scale,
            padding: `${11 * scale}px ${12 * scale}px`,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 7 * scale }}>
            <div style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 900, fontSize: 12 * scale, color: DOJO_NAVY }}>
              Recent Sessions
            </div>
            <div
              style={{
                fontFamily: 'Nunito, sans-serif',
                fontSize: 9 * scale,
                color: accent,
                fontWeight: 800,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 3 * scale,
                background: `${accent}10`,
                padding: `${2 * scale}px ${6 * scale}px`,
                borderRadius: 999,
              }}
            >
              <span style={{ fontSize: 10 * scale }}>📧</span> Monthly recap
            </div>
          </div>
          {[
            { date: 'Mon, May 12', subtitle: 'Build 2 · Working On' },
            { date: 'Wed, May 7',  subtitle: 'Build 2 · Working On' },
            { date: 'Mon, May 5',  subtitle: 'Orange #7 earned 🎉' },
          ].map((s, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: `${6 * scale}px 0`,
                borderBottom: i < 2 ? `1px solid ${DOJO_BORDER}` : 'none',
              }}
            >
              <div>
                <div style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 800, fontSize: 11 * scale, color: DOJO_NAVY }}>
                  {s.date}
                </div>
                <div style={{ fontFamily: 'Nunito, sans-serif', fontSize: 10 * scale, color: DOJO_MUTED }}>
                  {s.subtitle}
                </div>
              </div>
              <StatusDot status="done" scale={scale} />
            </div>
          ))}
        </div>

        {/* Parent pinned note for senseis */}
        <div
          style={{
            background: '#fffbeb',
            border: '1.5px dashed #fcd34d',
            borderRadius: 14 * scale,
            padding: `${10 * scale}px ${12 * scale}px`,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 5 * scale,
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 5 * scale,
                fontFamily: 'Nunito, sans-serif',
                fontWeight: 900,
                fontSize: 10 * scale,
                color: '#92400e',
              }}
            >
              <span style={{ fontSize: 11 * scale }}>📌</span> Note for the senseis
            </div>
            <div
              style={{
                fontFamily: 'Nunito, sans-serif',
                fontSize: 9 * scale,
                color: '#92400e',
                fontWeight: 700,
                opacity: 0.65,
              }}
            >
              Edit
            </div>
          </div>
          <div style={{ fontFamily: 'Nunito, sans-serif', fontSize: 11 * scale, color: '#78350f', lineHeight: 1.45 }}>
            Mia gets a little quiet when she's stuck. A nudge usually helps her ask
            for hints. She's also <b>out next Wednesday</b> for a school trip.
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── 6) Manager dashboard / roster ─────────────────────────────────────────

function ScreenRoster({ scale, accent = DOJO_BLUE }) {
  const ninjas = [
    { name: 'Mia Chen',       belt: 'Orange', sub: 7,  programs: ['CREATE'] },
    { name: 'Jaden Park',     belt: 'Green',  sub: 4,  programs: ['CREATE', 'Robotics Academy'] },
    { name: 'Aria Patel',     belt: null,           programs: ['Robotics Academy'] },
    { name: 'Owen Brooks',    belt: 'Yellow', sub: 9,  programs: ['CREATE'] },
    { name: 'Lila Nguyen',    belt: null,           programs: ['AI Academy'] },
    { name: 'Theo Williams',  belt: 'White',  sub: 5,  programs: ['CREATE', 'JR'] },
    { name: 'Sasha Romero',   belt: 'Blue',   sub: 2,  programs: ['CREATE'] },
  ];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <AppTopBar
        scale={scale}
        title="Roster"
        sub="Cerritos · 42 ninjas"
        accent={accent}
        right={
          <button
            style={{
              background: accent,
              color: '#fff',
              border: 'none',
              borderRadius: 10 * scale,
              padding: `${7 * scale}px ${10 * scale}px`,
              fontFamily: 'Nunito, sans-serif',
              fontWeight: 800,
              fontSize: 11 * scale,
              whiteSpace: 'nowrap',
            }}
          >
            + Add
          </button>
        }
      />
      {/* Search */}
      <div style={{ padding: `${10 * scale}px ${16 * scale}px ${4 * scale}px` }}>
        <div
          style={{
            background: '#fff',
            border: `1px solid ${DOJO_BORDER}`,
            borderRadius: 12 * scale,
            padding: `${7 * scale}px ${10 * scale}px`,
            display: 'flex',
            alignItems: 'center',
            gap: 7 * scale,
            color: DOJO_MUTED,
            fontFamily: 'Nunito, sans-serif',
            fontSize: 11 * scale,
          }}
        >
          <span>🔍</span> Search ninjas…
        </div>
      </div>

      {/* Program filter pills */}
      <div style={{ padding: `${4 * scale}px ${16 * scale}px ${4 * scale}px`, display: 'flex', gap: 5 * scale, flexWrap: 'wrap' }}>
        {[
          { label: 'All', active: true },
          { label: 'CREATE', active: false },
          { label: 'Robotics', active: false },
          { label: 'AI', active: false },
          { label: 'JR', active: false },
        ].map((p) => (
          <div
            key={p.label}
            style={{
              padding: `${3 * scale}px ${9 * scale}px`,
              background: p.active ? accent : '#fff',
              color: p.active ? '#fff' : DOJO_NAVY,
              border: `1px solid ${p.active ? accent : DOJO_BORDER}`,
              borderRadius: 999,
              fontFamily: 'Nunito, sans-serif',
              fontWeight: 800,
              fontSize: 10 * scale,
            }}
          >
            {p.label}
          </div>
        ))}
      </div>

      <div
        style={{
          padding: `${6 * scale}px ${16 * scale}px ${16 * scale}px`,
          flex: 1,
          minHeight: 0,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            background: '#fff',
            border: `1px solid ${DOJO_BORDER}`,
            borderRadius: 14 * scale,
            overflow: 'hidden',
          }}
        >
          {ninjas.map((n, i) => (
            <div
              key={n.name}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 9 * scale,
                padding: `${8 * scale}px ${11 * scale}px`,
                borderBottom: i < ninjas.length - 1 ? `1px solid ${DOJO_BORDER}` : 'none',
              }}
            >
              <Avatar scale={scale} name={n.name} color={['#f97316', '#22c55e', '#a855f7', '#fbbf24', '#4338ca', '#06b6d4', '#3b82f6'][i % 7]} size={28} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 800, fontSize: 12 * scale, color: DOJO_NAVY }}>
                  {n.name}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 * scale, marginTop: 2 * scale, flexWrap: 'wrap' }}>
                  {n.programs.map((p) => (
                    <ProgramChip key={p} program={p} scale={scale * 0.85} />
                  ))}
                </div>
              </div>
              {n.belt && <BeltChip belt={n.belt} sublevel={n.sub} scale={scale * 1.1} />}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// expose
Object.assign(window, {
  ScreenTodayBoard, ScreenNinjaProfile, ScreenLogProgress,
  ScreenClubProfile, ScreenParentPortal, ScreenRoster,
  AppTopBar, Avatar,
});
