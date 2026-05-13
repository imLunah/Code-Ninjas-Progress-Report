// sections.jsx — the marketing layouts that wrap the phone mocks.

// ─── Brand mark ────────────────────────────────────────────────────────────

function BrandMark({ size = 28, mono = false }) {
  // Uses a tightly-cropped DojoLink logo (stacked: ninja head over DOJOLINK wordmark).
  // Source canvas is 1285×687 (~1.87:1). Width is set explicitly so the image
  // can't be stretched by a flex/grid parent — `width: auto` alone gets squashed
  // when the parent uses align-items: stretch.
  // `mono` flattens to a solid white silhouette for dark canvases.
  const h = size * 1.5;
  const w = h * (1285 / 687);
  return (
    <img
      src="assets/DojoLinkLogo.png"
      alt="DojoLink"
      style={{
        height: h,
        width: w,
        flexShrink: 0,
        alignSelf: 'flex-start',
        display: 'inline-block',
        filter: mono ? 'brightness(0) invert(1)' : 'none',
      }}
    />
  );
}

// ─── Shuriken background pattern ───────────────────────────────────────────

function ShurikenBg({ color, density = 'normal', opacity = 1 }) {
  const sizes = density === 'subtle' ? [220] : density === 'extra' ? [120, 200, 280, 360] : [180, 260, 340];
  // Build a layered diagonal grid of dot/star marks
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden', opacity }}>
      <svg width="100%" height="100%" style={{ position: 'absolute', inset: 0 }}>
        <defs>
          <pattern id={`dots-${density}`} x="0" y="0" width="64" height="64" patternUnits="userSpaceOnUse">
            <circle cx="32" cy="32" r="2.2" fill={color} opacity="0.5" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill={`url(#dots-${density})`} />
      </svg>
      {sizes.map((s, i) => (
        <Shuriken
          key={i}
          size={s}
          color={color}
          style={{
            position: 'absolute',
            top: `${(i * 137) % 80 + 5}%`,
            left: `${(i * 53) % 90 + 2}%`,
            transform: `rotate(${i * 23}deg)`,
            opacity: density === 'extra' ? 0.16 : density === 'subtle' ? 0.05 : 0.09,
          }}
        />
      ))}
    </div>
  );
}

function Shuriken({ size, color, style }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" style={style} aria-hidden="true">
      <path
        d="M50 5 L58 42 L95 50 L58 58 L50 95 L42 58 L5 50 L42 42 Z"
        fill={color}
      />
      <circle cx="50" cy="50" r="8" fill="#fff" />
    </svg>
  );
}

// ─── Section header (a label + size) ───────────────────────────────────────

function ExportLabel({ name, size }) {
  return (
    <div
      style={{
        position: 'absolute',
        top: -34,
        left: 0,
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        fontFamily: 'JetBrains Mono, ui-monospace, monospace',
        fontSize: 12,
        color: '#64748b',
      }}
    >
      <span
        style={{
          background: '#0b1220',
          color: '#fff',
          padding: '3px 8px',
          borderRadius: 6,
          fontWeight: 700,
        }}
      >
        {name}
      </span>
      <span>{size}</span>
    </div>
  );
}

function GraphicFrame({ name, width, height, children, bg = '#fff' }) {
  return (
    <div style={{ position: 'relative', marginBottom: 80 }}>
      <ExportLabel name={name} size={`${width} × ${height}`} />
      <div
        style={{
          width,
          height,
          background: bg,
          borderRadius: 24,
          overflow: 'hidden',
          position: 'relative',
          boxShadow: '0 30px 80px -30px rgba(15, 23, 42, 0.25), 0 0 0 1px rgba(15, 23, 42, 0.06)',
        }}
      >
        {children}
      </div>
    </div>
  );
}

// ─── 1) HERO BANNER — 1920×1080 ────────────────────────────────────────────

function HeroBanner({ accent, density, dark, copyVariant }) {
  const headline = copyVariant === 'parent'
    ? <>One link to <em style={{ fontStyle: 'normal', color: accent }}>your ninja's</em><br/>journey.</>
    : copyVariant === 'staff'
    ? <>The session board<br/>your dojo deserves.</>
    : <>Run the dojo.<br/><em style={{ fontStyle: 'normal', color: accent }}>Skip the chaos.</em></>;

  const sub = copyVariant === 'parent'
    ? 'Belt progress, session history, and direct messages with the senseis who teach your kid. All in one place.'
    : copyVariant === 'staff'
    ? 'Replace paper sign-in sheets and scribbled belt notes with structured progress logs, color-coded boards, and per-program belt tracking.'
    : 'DojoLink replaces paper notes and spreadsheets with a progress tracker for senseis, directors, and parents. Built for Code Ninjas centers.';

  const bg = dark ? '#0b1220' : '#f5f7fa';
  const fg = dark ? '#fff' : DOJO_NAVY;
  const subFg = dark ? '#94a3b8' : DOJO_MUTED;

  return (
    <GraphicFrame name="hero-1920x1080.png" width={1920} height={1080} bg={bg}>
      <ShurikenBg color={accent} density={density} opacity={dark ? 0.5 : 1} />
      {/* Big diagonal gradient blob */}
      <div
        style={{
          position: 'absolute',
          right: -200,
          top: -200,
          width: 1100,
          height: 1100,
          borderRadius: '50%',
          background: `radial-gradient(circle at center, ${accent}33 0%, ${accent}00 60%)`,
        }}
      />

      <div style={{ position: 'relative', height: '100%', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 40, padding: '80px 96px' }}>
        {/* LEFT — copy */}
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <BrandMark size={48} mono={dark} />

          <div>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                background: dark ? 'rgba(255,255,255,0.08)' : '#fff',
                border: `1px solid ${dark ? 'rgba(255,255,255,0.12)' : DOJO_BORDER}`,
                padding: '6px 12px',
                borderRadius: 999,
                fontFamily: 'Nunito, sans-serif',
                fontSize: 14,
                fontWeight: 800,
                color: dark ? '#fff' : DOJO_NAVY,
                marginBottom: 24,
              }}
            >
              <span style={{ width: 8, height: 8, borderRadius: 999, background: accent }} />
              For Code Ninjas franchise centers
            </div>
            <h1
              style={{
                fontFamily: 'Nunito, sans-serif',
                fontWeight: 900,
                fontSize: 96,
                lineHeight: 0.97,
                color: fg,
                margin: 0,
                letterSpacing: '-0.03em',
              }}
            >
              {headline}
            </h1>
            <p
              style={{
                marginTop: 28,
                fontFamily: 'Nunito, sans-serif',
                fontSize: 22,
                lineHeight: 1.5,
                color: subFg,
                maxWidth: 600,
              }}
            >
              {sub}
            </p>
            <div style={{ marginTop: 36, display: 'flex', gap: 14 }}>
              <button
                style={{
                  background: accent,
                  color: '#fff',
                  border: 'none',
                  padding: '18px 28px',
                  borderRadius: 14,
                  fontFamily: 'Nunito, sans-serif',
                  fontWeight: 900,
                  fontSize: 18,
                  boxShadow: `0 10px 30px -8px ${accent}80`,
                  cursor: 'pointer',
                }}
              >
                Open the dojo →
              </button>
              <button
                style={{
                  background: 'transparent',
                  color: fg,
                  border: `2px solid ${dark ? 'rgba(255,255,255,0.18)' : DOJO_BORDER}`,
                  padding: '18px 28px',
                  borderRadius: 14,
                  fontFamily: 'Nunito, sans-serif',
                  fontWeight: 800,
                  fontSize: 18,
                  cursor: 'pointer',
                }}
              >
                Watch the tour
              </button>
            </div>
          </div>

          {/* trust strip */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 32, color: subFg, fontFamily: 'Nunito, sans-serif', fontSize: 15, fontWeight: 700 }}>
            <span>🥷 3 centers</span>
            <span>👶 120+ ninjas</span>
            <span>🎯 4 programs tracked</span>
          </div>
        </div>

        {/* RIGHT — stacked phones */}
        <div style={{ position: 'relative' }}>
          <div style={{ position: 'absolute', right: 60, top: -10, transform: 'rotate(-4deg)' }}>
            <Phone width={300}>
              {({ scale }) => <ScreenTodayBoard scale={scale} accent={accent} />}
            </Phone>
          </div>
          <div style={{ position: 'absolute', right: 280, top: 220, transform: 'rotate(6deg)' }}>
            <Phone width={280}>
              {({ scale }) => <ScreenParentPortal scale={scale} accent={accent} />}
            </Phone>
          </div>
        </div>
      </div>
    </GraphicFrame>
  );
}

// ─── 2) FEATURE BLOCKS — 1440 wide stack ───────────────────────────────────

const FEATURES = [
  {
    eyebrow: 'TODAY\u2019S BOARD',
    title: 'Color-coded check-ins. No more "is anyone logging this?"',
    body: 'Green when logged, yellow when pending, red when overdue. The board shows what still needs attention before the session ends, and what carries over to tomorrow.',
    bullets: ['Per-ninja status dots', 'Multi-program split rows', 'Overdue auto-carry-over'],
    Screen: 'ScreenTodayBoard',
    tone: 'green',
  },
  {
    eyebrow: 'NINJA PROFILE',
    title: 'A belt journey, not a row in a spreadsheet.',
    body: 'Every ninja has a profile with a visual belt path, sublevel progress, monthly activity, and threaded sensei notes scoped per program.',
    bullets: ['Visual belt path', 'Per-program enrollment', 'Threaded session notes'],
    Screen: 'ScreenNinjaProfile',
    tone: 'orange',
  },
  {
    eyebrow: 'LOG PROGRESS',
    title: 'Logging a session takes under a minute.',
    body: 'Senseis pick the program, advance belt or sublevel, set project status, and add a note. The next session opens already pre-filled with where the ninja left off.',
    bullets: ['Smart belt advance', 'Project + status in one tap', 'Markdown notes'],
    Screen: 'ScreenLogProgress',
    tone: 'blue',
  },
  {
    eyebrow: 'CLUBS',
    title: '3D Design. Minecraft. Roblox. Any club you want.',
    body: 'Pinned markdown notes, file resources (up to 50 MB), and session threads with attendance. Make your own clubs. Each center gets custom slots.',
    bullets: ['Pinned staff note', 'PDFs, images, links', 'Attendance tracking'],
    Screen: 'ScreenClubProfile',
    tone: 'purple',
  },
  {
    eyebrow: 'PARENT PORTAL',
    title: 'Parents log in with just an email.',
    body: 'No passwords. Parents see belt progress and session history, leave pinned notes for the senseis, and get a monthly recap email when staff are ready to send it.',
    bullets: ['Magic-link email login', 'Pinned notes to senseis', 'Monthly progress emails'],
    Screen: 'ScreenParentPortal',
    tone: 'blue',
  },
  {
    eyebrow: 'ROSTER',
    title: 'Import from MyStudio. Manage from one screen.',
    body: 'Bulk add ninjas, switch programs, edit enrollments, or delete in batches. Center Directors can read across all 3 locations; writes stay locked to your home center.',
    bullets: ['CSV import', 'Per-program filter', 'Multi-location read'],
    Screen: 'ScreenRoster',
    tone: 'navy',
  },
];

function FeatureBlock({ feature, idx, accent, density, dark }) {
  const flip = idx % 2 === 1;
  const ScreenComp = window[feature.Screen];
  const bg = dark ? '#0b1220' : '#fff';
  const fg = dark ? '#fff' : DOJO_NAVY;
  const subFg = dark ? '#94a3b8' : DOJO_MUTED;
  const cardBg = dark ? '#0f1a2e' : '#f5f7fa';

  return (
    <GraphicFrame name={`feature-${(idx + 1).toString().padStart(2, '0')}-${feature.Screen.replace('Screen', '').toLowerCase()}.png`} width={1440} height={760} bg={bg}>
      <ShurikenBg color={accent} density={density === 'extra' ? 'normal' : 'subtle'} opacity={dark ? 0.6 : 1} />
      <div
        style={{
          position: 'relative',
          height: '100%',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 60,
          padding: '70px 90px',
          alignItems: 'center',
          direction: flip ? 'rtl' : 'ltr',
        }}
      >
        <div style={{ direction: 'ltr' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              background: dark ? 'rgba(255,255,255,0.06)' : `${accent}12`,
              padding: '6px 12px',
              borderRadius: 999,
              fontFamily: 'Nunito, sans-serif',
              fontSize: 13,
              fontWeight: 900,
              letterSpacing: '0.12em',
              color: accent,
              marginBottom: 22,
            }}
          >
            <span>0{idx + 1}</span>
            <span style={{ width: 4, height: 4, borderRadius: 999, background: accent, opacity: 0.4 }} />
            <span>{feature.eyebrow}</span>
          </div>
          <h2
            style={{
              fontFamily: 'Nunito, sans-serif',
              fontWeight: 900,
              fontSize: 54,
              lineHeight: 1.05,
              color: fg,
              margin: 0,
              letterSpacing: '-0.02em',
              textWrap: 'pretty',
            }}
          >
            {feature.title}
          </h2>
          <p
            style={{
              marginTop: 22,
              fontFamily: 'Nunito, sans-serif',
              fontSize: 19,
              lineHeight: 1.5,
              color: subFg,
              maxWidth: 480,
            }}
          >
            {feature.body}
          </p>
          <ul style={{ marginTop: 28, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 12 }}>
            {feature.bullets.map((b) => (
              <li key={b} style={{ display: 'flex', alignItems: 'center', gap: 12, fontFamily: 'Nunito, sans-serif', fontSize: 17, fontWeight: 700, color: fg }}>
                <span
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 6,
                    background: accent,
                    color: '#fff',
                    display: 'grid',
                    placeItems: 'center',
                    fontSize: 14,
                    fontWeight: 900,
                  }}
                >
                  ✓
                </span>
                {b}
              </li>
            ))}
          </ul>
        </div>
        {/* phone side */}
        <div
          style={{
            direction: 'ltr',
            position: 'relative',
            height: '100%',
            display: 'grid',
            placeItems: 'center',
          }}
        >
          <div
            style={{
              position: 'absolute',
              width: 480,
              height: 480,
              borderRadius: '50%',
              background: `radial-gradient(circle, ${accent}26 0%, ${accent}00 60%)`,
            }}
          />
          <div style={{ position: 'relative', transform: `rotate(${flip ? -3 : 3}deg)` }}>
            <Phone width={340}>
              {({ scale }) => <ScreenComp scale={scale} accent={accent} />}
            </Phone>
          </div>
        </div>
      </div>
    </GraphicFrame>
  );
}

// ─── 3) SCREENS GRID — 1920×1080 ───────────────────────────────────────────

function ScreensGrid({ accent, density, dark }) {
  const screens = ['ScreenTodayBoard', 'ScreenNinjaProfile', 'ScreenLogProgress', 'ScreenClubProfile', 'ScreenParentPortal', 'ScreenRoster'];
  const labels = ["Today's Board", 'Ninja Profile', 'Log Progress', 'Clubs', 'Parent Portal', 'Roster'];

  const bg = dark ? '#0b1220' : '#f5f7fa';
  const fg = dark ? '#fff' : DOJO_NAVY;
  const subFg = dark ? '#94a3b8' : DOJO_MUTED;

  return (
    <GraphicFrame name="screens-grid-1920x1080.png" width={1920} height={1080} bg={bg}>
      <ShurikenBg color={accent} density={density} opacity={dark ? 0.4 : 1} />
      <div style={{ position: 'relative', height: '100%', padding: '70px 90px', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div>
            <div
              style={{
                display: 'inline-block',
                background: accent,
                color: '#fff',
                padding: '5px 12px',
                borderRadius: 999,
                fontFamily: 'Nunito, sans-serif',
                fontWeight: 900,
                fontSize: 13,
                letterSpacing: '0.1em',
                marginBottom: 14,
              }}
            >
              EVERY SCREEN
            </div>
            <h2
              style={{
                margin: 0,
                fontFamily: 'Nunito, sans-serif',
                fontWeight: 900,
                fontSize: 60,
                color: fg,
                lineHeight: 1,
                letterSpacing: '-0.02em',
              }}
            >
              Six views.<br />
              <span style={{ color: accent }}>One source of truth.</span>
            </h2>
          </div>
          <p
            style={{
              fontFamily: 'Nunito, sans-serif',
              fontSize: 18,
              color: subFg,
              maxWidth: 360,
              margin: 0,
              lineHeight: 1.5,
            }}
          >
            Manager, sensei, and parent views all share the same database, so what one role sees, the others can trust.
          </p>
        </div>

        <div
          style={{
            flex: 1,
            display: 'grid',
            gridTemplateColumns: 'repeat(6, 1fr)',
            gap: 28,
            marginTop: 60,
            alignItems: 'end',
          }}
        >
          {screens.map((s, i) => {
            const ScreenComp = window[s];
            const lift = i % 2 === 0 ? 0 : -20;
            return (
              <div key={s} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, transform: `translateY(${lift}px)` }}>
                <Phone width={220}>
                  {({ scale }) => <ScreenComp scale={scale} accent={accent} />}
                </Phone>
                <div style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 900, fontSize: 15, color: fg }}>
                  {labels[i]}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </GraphicFrame>
  );
}

// ─── 4) SOCIAL CARDS ───────────────────────────────────────────────────────

function SocialOG({ accent, density, dark, copyVariant }) {
  const bg = dark ? '#0b1220' : '#fff';
  const fg = dark ? '#fff' : DOJO_NAVY;
  const subFg = dark ? '#94a3b8' : DOJO_MUTED;

  return (
    <GraphicFrame name="social-og-1200x630.png" width={1200} height={630} bg={bg}>
      <ShurikenBg color={accent} density={density} opacity={dark ? 0.6 : 1} />
      <div
        style={{
          position: 'absolute',
          left: -80,
          bottom: -80,
          width: 360,
          height: 360,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${accent}33 0%, ${accent}00 70%)`,
        }}
      />
      <div style={{ position: 'relative', height: '100%', display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: 30, padding: '54px 64px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <BrandMark size={32} mono={dark} />
          <div>
            <h1
              style={{
                margin: 0,
                fontFamily: 'Nunito, sans-serif',
                fontWeight: 900,
                fontSize: 56,
                lineHeight: 0.98,
                letterSpacing: '-0.02em',
                color: fg,
              }}
            >
              The dojo,<br />
              <span style={{ color: accent }}>finally tracked.</span>
            </h1>
            <p style={{ marginTop: 18, fontFamily: 'Nunito, sans-serif', fontSize: 19, color: subFg, maxWidth: 460, lineHeight: 1.45 }}>
              Belt progress, session notes, parent messaging. Built for Code Ninjas centers.
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontFamily: 'Nunito, sans-serif', fontSize: 16, color: subFg, fontWeight: 700 }}>
            <span style={{ width: 8, height: 8, borderRadius: 999, background: '#22c55e' }} />
            dojolink-neon.vercel.app
          </div>
        </div>
        <div style={{ position: 'relative', display: 'grid', placeItems: 'center' }}>
          <div style={{ transform: 'rotate(4deg)' }}>
            <Phone width={260}>
              {({ scale }) => <ScreenTodayBoard scale={scale} accent={accent} />}
            </Phone>
          </div>
        </div>
      </div>
    </GraphicFrame>
  );
}

function SocialSquare({ accent, density, dark }) {
  const bg = dark ? '#0b1220' : DOJO_NAVY;
  return (
    <GraphicFrame name="social-square-1080x1080.png" width={1080} height={1080} bg={bg}>
      <ShurikenBg color={accent} density="extra" opacity={0.5} />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `radial-gradient(circle at 70% 30%, ${accent}66 0%, ${accent}00 50%)`,
        }}
      />
      <div style={{ position: 'relative', height: '100%', padding: 80, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
        <BrandMark size={48} mono={true} />
        <div>
          <div
            style={{
              fontFamily: 'Nunito, sans-serif',
              fontWeight: 900,
              fontSize: 22,
              color: accent,
              letterSpacing: '0.1em',
              marginBottom: 18,
            }}
          >
            NOW LIVE
          </div>
          <h1
            style={{
              margin: 0,
              fontFamily: 'Nunito, sans-serif',
              fontWeight: 900,
              fontSize: 88,
              lineHeight: 0.95,
              letterSpacing: '-0.03em',
              color: '#fff',
            }}
          >
            Run the dojo.<br />
            <span style={{ color: accent }}>Skip the chaos.</span>
          </h1>
          <p style={{ marginTop: 28, fontFamily: 'Nunito, sans-serif', fontSize: 22, color: '#94a3b8', maxWidth: 600, lineHeight: 1.5 }}>
            DojoLink replaces paper sign-in sheets with a progress dashboard
            for Code Ninjas centers.
          </p>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div style={{ fontFamily: 'Nunito, sans-serif', fontSize: 18, color: '#94a3b8', fontWeight: 700 }}>
            dojolink-neon.vercel.app
          </div>
          <div style={{ position: 'absolute', right: 60, bottom: 60, transform: 'rotate(-6deg)' }}>
            <Phone width={230}>
              {({ scale }) => <ScreenParentPortal scale={scale} accent={accent} />}
            </Phone>
          </div>
        </div>
      </div>
    </GraphicFrame>
  );
}

function SocialStory({ accent, density, dark }) {
  const bg = dark ? '#0b1220' : '#fff';
  const fg = dark ? '#fff' : DOJO_NAVY;
  const subFg = dark ? '#94a3b8' : DOJO_MUTED;
  return (
    <GraphicFrame name="social-story-1080x1920.png" width={1080} height={1920} bg={bg}>
      <ShurikenBg color={accent} density={density} opacity={dark ? 0.4 : 1} />
      <div
        style={{
          position: 'absolute',
          top: -200,
          left: -200,
          width: 700,
          height: 700,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${accent}40 0%, ${accent}00 60%)`,
        }}
      />
      <div style={{ position: 'relative', height: '100%', padding: 80, display: 'flex', flexDirection: 'column' }}>
        <BrandMark size={44} mono={dark} />
        <div style={{ marginTop: 80 }}>
          <div
            style={{
              display: 'inline-block',
              background: accent,
              color: '#fff',
              padding: '8px 16px',
              borderRadius: 999,
              fontFamily: 'Nunito, sans-serif',
              fontWeight: 900,
              fontSize: 18,
              letterSpacing: '0.1em',
              marginBottom: 24,
            }}
          >
            FOR PARENTS
          </div>
          <h1
            style={{
              margin: 0,
              fontFamily: 'Nunito, sans-serif',
              fontWeight: 900,
              fontSize: 92,
              lineHeight: 0.95,
              color: fg,
              letterSpacing: '-0.03em',
            }}
          >
            Watch your ninja{' '}
            <span style={{ color: accent }}>level up.</span>
          </h1>
          <p style={{ marginTop: 32, fontFamily: 'Nunito, sans-serif', fontSize: 28, color: subFg, lineHeight: 1.5 }}>
            Belt progress and session history, visible the moment a sensei logs it.
          </p>
        </div>
        <div style={{ flex: 1, display: 'grid', placeItems: 'center', marginTop: 30 }}>
          <div style={{ transform: 'rotate(-3deg)' }}>
            <Phone width={500}>
              {({ scale }) => <ScreenParentPortal scale={scale} accent={accent} />}
            </Phone>
          </div>
        </div>
        <div style={{ textAlign: 'center', fontFamily: 'Nunito, sans-serif', fontSize: 22, color: subFg, fontWeight: 700 }}>
          ↓ Open DojoLink
        </div>
      </div>
    </GraphicFrame>
  );
}

Object.assign(window, {
  HeroBanner, FeatureBlock, ScreensGrid, SocialOG, SocialSquare, SocialStory,
  BrandMark, GraphicFrame, ExportLabel, FEATURES,
});
