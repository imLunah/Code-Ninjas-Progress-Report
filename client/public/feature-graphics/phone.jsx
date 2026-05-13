// phone.jsx — phone frame + small shared UI bits for the DojoLink screens.

const DOJO_BLUE = '#006ADD';
const DOJO_NAVY = '#1a2e4a';
const DOJO_BG = '#f5f7fa';
const DOJO_BORDER = '#e2e8f0';
const DOJO_MUTED = '#506690';

const BELT_COLORS = {
  White:  { bg: '#ffffff', text: '#0f172a', stroke: '#cbd5e1' },
  Yellow: { bg: '#fbbf24', text: '#000000' },
  Orange: { bg: '#f97316', text: '#000000' },
  Green:  { bg: '#22c55e', text: '#000000' },
  Blue:   { bg: '#3b82f6', text: '#ffffff' },
  Purple: { bg: '#a855f7', text: '#ffffff' },
  Brown:  { bg: '#92400e', text: '#ffffff' },
  Red:    { bg: '#cc0000', text: '#ffffff' },
  Black:  { bg: '#111111', text: '#ffffff' },
};

const PROGRAM_BADGE = {
  'CREATE':           { bg: '#dbeafe', fg: '#1d4ed8' },
  'Robotics Academy': { bg: '#ede9fe', fg: '#6d28d9' },
  'AI Academy':       { bg: '#e0e7ff', fg: '#4338ca' },
  'JR':               { bg: '#dcfce7', fg: '#15803d' },
};

// ─── Phone frame ────────────────────────────────────────────────────────────
// Default canvas is iPhone-ish 390×844 viewport. Width can be overridden by `width`;
// height is derived to keep aspect.

function Phone({ children, width = 320, tilt = 0, shadow = true, time = '9:41', style = {} }) {
  const scale = width / 390;
  const h = 844 * scale;
  return (
    <div
      style={{
        width,
        height: h,
        position: 'relative',
        transform: `rotate(${tilt}deg)`,
        transformOrigin: 'center center',
        ...style,
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: 54 * scale,
          background: '#0b1220',
          padding: 12 * scale,
          boxShadow: shadow
            ? `0 ${30 * scale}px ${60 * scale}px -${12 * scale}px rgba(15, 23, 42, 0.35), 0 ${10 * scale}px ${20 * scale}px -${8 * scale}px rgba(15,23,42,.25), inset 0 0 0 1.5px #1f2937`
            : 'none',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 12 * scale,
            borderRadius: 44 * scale,
            background: DOJO_BG,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Status bar */}
          <div
            style={{
              height: 44 * scale,
              flexShrink: 0,
              display: 'flex',
              alignItems: 'flex-end',
              justifyContent: 'space-between',
              padding: `0 ${24 * scale}px ${6 * scale}px`,
              fontFamily: '"SF Pro Text", -apple-system, system-ui, sans-serif',
              fontSize: 15 * scale,
              fontWeight: 600,
              color: DOJO_NAVY,
              position: 'relative',
            }}
          >
            <span>{time}</span>
            {/* Dynamic Island */}
            <div
              style={{
                position: 'absolute',
                left: '50%',
                top: 11 * scale,
                transform: 'translateX(-50%)',
                width: 120 * scale,
                height: 32 * scale,
                borderRadius: 999,
                background: '#0b1220',
              }}
            />
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 * scale }}>
              <SignalIcon scale={scale} />
              <WifiIcon scale={scale} />
              <BatteryIcon scale={scale} />
            </div>
          </div>
          <div style={{ flex: 1, minHeight: 0, position: 'relative' }}>{children({ scale })}</div>
        </div>
      </div>
    </div>
  );
}

function SignalIcon({ scale }) {
  return (
    <svg width={17 * scale} height={11 * scale} viewBox="0 0 17 11" fill="currentColor">
      <rect x="0"  y="7" width="3" height="4" rx="0.6" />
      <rect x="4.5" y="5" width="3" height="6" rx="0.6" />
      <rect x="9"  y="2.5" width="3" height="8.5" rx="0.6" />
      <rect x="13.5" y="0" width="3" height="11" rx="0.6" />
    </svg>
  );
}
function WifiIcon({ scale }) {
  return (
    <svg width={15 * scale} height={11 * scale} viewBox="0 0 15 11" fill="currentColor">
      <path d="M7.5 1C4.6 1 2 2.2 0 4l1.7 1.7C3.3 4.2 5.3 3.5 7.5 3.5s4.2.7 5.8 2.2L15 4C13 2.2 10.4 1 7.5 1z"/>
      <path d="M7.5 5.2c-1.9 0-3.5.7-4.8 1.9l1.7 1.7c.9-.8 2-1.3 3.1-1.3s2.2.5 3.1 1.3l1.7-1.7c-1.3-1.2-2.9-1.9-4.8-1.9z"/>
      <circle cx="7.5" cy="9.5" r="1.4"/>
    </svg>
  );
}
function BatteryIcon({ scale }) {
  return (
    <svg width={27 * scale} height={12 * scale} viewBox="0 0 27 12" fill="none">
      <rect x="0.5" y="0.5" width="22" height="11" rx="3" stroke="currentColor" opacity="0.4"/>
      <rect x="2" y="2" width="19" height="8" rx="1.5" fill="currentColor"/>
      <rect x="23.5" y="3.5" width="2" height="5" rx="1" fill="currentColor" opacity="0.4"/>
    </svg>
  );
}

// ─── shared chips ───────────────────────────────────────────────────────────

function ProgramChip({ program, scale = 1, size = 'xs' }) {
  const c = PROGRAM_BADGE[program] || { bg: '#e2e8f0', fg: '#475569' };
  const sizes = {
    xs: { padX: 6, padY: 2, font: 10 },
    sm: { padX: 8, padY: 3, font: 11 },
  };
  const s = sizes[size];
  return (
    <span
      style={{
        background: c.bg,
        color: c.fg,
        padding: `${s.padY * scale}px ${s.padX * scale}px`,
        borderRadius: 6 * scale,
        fontSize: s.font * scale,
        fontWeight: 800,
        fontFamily: 'Nunito, sans-serif',
        whiteSpace: 'nowrap',
        letterSpacing: '0.01em',
      }}
    >
      {program}
    </span>
  );
}

function BeltChip({ belt, sublevel, scale = 1 }) {
  const c = BELT_COLORS[belt] || BELT_COLORS.White;
  return (
    <span
      style={{
        background: c.bg,
        color: c.text,
        padding: `${2 * scale}px ${6 * scale}px`,
        borderRadius: 6 * scale,
        fontSize: 10 * scale,
        fontWeight: 800,
        fontFamily: 'Nunito, sans-serif',
        border: c.stroke ? `1px solid ${c.stroke}` : 'none',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 3 * scale,
      }}
    >
      {belt}
      {sublevel != null && <span style={{ opacity: 0.75 }}>#{sublevel}</span>}
    </span>
  );
}

function StatusDot({ status, scale = 1 }) {
  const colors = { done: '#22c55e', pending: '#facc15', overdue: '#f87171' };
  return (
    <span
      style={{
        width: 10 * scale,
        height: 10 * scale,
        borderRadius: 999,
        background: colors[status],
        display: 'inline-block',
      }}
    />
  );
}

function NinjaIcon({ size = 24, color = '#0b1220', maskColor = '#e8d8b3' }) {
  // The DojoLink ninja head — round face, masked bandana, knot on the side.
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <circle cx="32" cy="32" r="28" fill={color} />
      {/* bandana knot */}
      <path d="M6 26 L2 22 L2 36 L6 32 L10 30 Z" fill={color} />
      <path d="M2 22 L2 36 L8 30 Z" fill={color} opacity="0.4" />
      {/* mask */}
      <path d="M6 26 H58 V36 H6 Z" fill={maskColor} />
      {/* eyes */}
      <path d="M18 31 q4 -2.5 8 0 v2 q-4 -1.5 -8 0 z" fill={color} />
      <path d="M38 31 q4 -2.5 8 0 v2 q-4 -1.5 -8 0 z" fill={color} />
      {/* nose ridge across mask */}
      <line x1="32" y1="26" x2="32" y2="36" stroke={color} strokeWidth="1" opacity="0.5" />
    </svg>
  );
}

// expose
Object.assign(window, {
  Phone, ProgramChip, BeltChip, StatusDot, NinjaIcon,
  DOJO_BLUE, DOJO_NAVY, DOJO_BG, DOJO_BORDER, DOJO_MUTED, BELT_COLORS, PROGRAM_BADGE,
});
