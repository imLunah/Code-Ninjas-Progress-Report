import { useEffect, useRef } from 'react';

// The onboarding staff badge: a physical card in 3D that prints what the form
// collects as it is typed. Drag it to spin, throw it and it keeps momentum,
// leave it alone and it floats. The front carries the name and avatar, the
// back the username, and `side` turns it over so the step being filled in is
// the face being looked at.
//
// The faces are inline hex on purpose: this is a printed object, identical in
// light and dark, and `.dark .bg-white` would turn a Tailwind-painted face
// slate mid-spin. Rotation is written straight to the node from one rAF loop —
// setState per frame would re-render the page behind the card.

const CARD_W = 300;
const CARD_H = 470;

const FACE = {
  position: 'absolute',
  inset: 0,
  borderRadius: 18,
  backfaceVisibility: 'hidden',
  overflow: 'hidden',
  boxShadow: '0 30px 60px -20px rgba(10, 20, 40, 0.35)',
  display: 'flex',
  flexDirection: 'column',
};

const SHEEN = {
  position: 'absolute',
  inset: 0,
  pointerEvents: 'none',
  background: 'linear-gradient(105deg, transparent 42%, rgba(255,255,255,0.22) 50%, transparent 58%)',
  backgroundSize: '320% 100%',
  backgroundPosition: 'var(--shx, 50%) 0',
};

function initialsOf(name = '') {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return parts.slice(0, 2).map((p) => p[0].toUpperCase()).join('');
}

// `details` is optional back-of-card print: [{ label, value }] rows under the
// Staff ID, for a badge that describes someone else (joined date, log count on
// the staff profile). Onboarding and Edit profile pass nothing and the back
// stays as it was.
export default function StaffBadge({ name, username, role, center, avatar, side = 'front', scale = 1, className = '', details = [] }) {
  const stageRef = useRef(null);
  const cardRef = useRef(null);
  // All motion state lives in one ref so the component never re-renders for it.
  const m = useRef({ rx: -6, ry: 24, tRx: -6, tRy: 24, vx: 0, dragging: false, px: 0, py: 0, lastTouch: 0, side: 'front' }).current;

  // Turning the card over is one more half-turn in whichever direction it is
  // already going, not a snap to a fixed angle — a spin the sensei gave it is
  // kept, not corrected.
  useEffect(() => {
    if (side !== m.side) {
      m.side = side;
      m.tRy += side === 'back' ? 180 : -180;
      m.lastTouch = performance.now();
    }
  }, [side]);

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let raf;
    const frame = (t) => {
      const idle = !m.dragging && performance.now() - m.lastTouch > 2600;
      let sway = 0;
      let bob = 0;
      if (idle && !reduced) {
        sway = Math.sin(t / 1900) * 6;
        bob = Math.sin(t / 1450) * 5;
      }
      m.ry += (m.tRy - m.ry) * 0.09;
      m.rx += (m.tRx - m.rx) * 0.09;
      if (cardRef.current) {
        cardRef.current.style.transform = `translateY(${bob}px) rotateX(${m.rx}deg) rotateY(${m.ry + sway}deg)`;
        cardRef.current.style.setProperty('--shx', `${50 - Math.sin(((m.ry + sway) * Math.PI) / 180) * 65}%`);
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, []);

  const onPointerDown = (e) => {
    m.dragging = true;
    m.vx = 0;
    m.px = e.clientX;
    m.py = e.clientY;
    m.lastTouch = performance.now();
    stageRef.current?.setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e) => {
    if (!m.dragging) return;
    const dx = e.clientX - m.px;
    const dy = e.clientY - m.py;
    m.px = e.clientX;
    m.py = e.clientY;
    m.tRy += dx * 0.45;
    m.vx = dx;
    m.tRx = Math.max(-42, Math.min(42, m.tRx - dy * 0.3));
    m.lastTouch = performance.now();
  };
  const onPointerUp = () => {
    if (!m.dragging) return;
    m.dragging = false;
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) m.tRy += m.vx * 9;
    m.lastTouch = performance.now();
  };

  const shownName = (name || '').trim();
  const shownUser = (username || '').trim();

  return (
    <div
      ref={stageRef}
      className={`relative select-none ${className}`}
      style={{
        width: CARD_W * scale + 48,
        height: CARD_H * scale + 56,
        perspective: 1150,
        touchAction: 'none',
        cursor: 'grab',
        display: 'grid',
        placeItems: 'center',
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      {/* floor shadow */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute', bottom: 6, width: CARD_W * scale * 0.72, height: 24 * scale + 8,
          borderRadius: '50%', background: 'rgba(10,18,35,0.18)', filter: 'blur(12px)',
        }}
      />
      <div style={{ width: CARD_W * scale, height: CARD_H * scale, transformStyle: 'preserve-3d' }}>
        <div style={{ width: CARD_W, height: CARD_H, transform: `scale(${scale})`, transformOrigin: 'top left', transformStyle: 'preserve-3d' }}>
          <div ref={cardRef} style={{ position: 'relative', width: CARD_W, height: CARD_H, transformStyle: 'preserve-3d', willChange: 'transform' }}>

            {/* ── front ── */}
            <div style={{ ...FACE, transform: 'translateZ(2.5px)', background: '#ffffff', color: '#1a2e4a' }}>
              <div
                aria-hidden="true"
                style={{
                  position: 'absolute', top: 0, right: 0, width: '65%', height: '42%',
                  backgroundImage: 'radial-gradient(circle, #006add 2.1px, transparent 2.6px)',
                  backgroundSize: '15px 15px', opacity: 0.14,
                  WebkitMaskImage: 'radial-gradient(110% 110% at 100% 0%, black 30%, transparent 72%)',
                  maskImage: 'radial-gradient(110% 110% at 100% 0%, black 30%, transparent 72%)',
                }}
              />
              {/* lanyard slot */}
              <div style={{ width: 52, height: 9, borderRadius: 6, background: '#10192c', margin: '16px auto 0', flexShrink: 0, boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.5)' }} />
              <div className="flex justify-between items-baseline" style={{ padding: '14px 24px 0' }}>
                <span className="font-ninja font-black" style={{ fontSize: 17, letterSpacing: '0.04em' }}>
                  <span style={{ color: '#006add' }}>DOJO</span><span style={{ color: '#1a2e4a' }}>LINK</span>
                </span>
                <span className="font-ninja font-extrabold uppercase" style={{ fontSize: 11, letterSpacing: '0.14em', color: '#506690' }}>Staff</span>
              </div>
              <div className="grid place-items-center" style={{ marginTop: 34 }}>
                <div
                  className="grid place-items-center overflow-hidden"
                  style={{ width: 112, height: 112, borderRadius: '50%', background: '#e6f0fc', border: '4px solid #006add' }}
                >
                  {avatar
                    ? <img src={avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <span className="font-ninja font-black" style={{ fontSize: 40, color: shownName ? '#1a2e4a' : '#50669055' }}>{initialsOf(shownName) || '?'}</span>}
                </div>
              </div>
              <div
                className="font-ninja font-black text-center"
                style={{ marginTop: 22, fontSize: 27, letterSpacing: '-0.01em', padding: '0 20px', minHeight: 38, overflowWrap: 'anywhere', color: shownName ? '#1a2e4a' : '#50669055' }}
              >
                {shownName || 'Your name'}
              </div>
              <div className="font-ninja font-bold text-center" style={{ color: '#506690', fontSize: 14, marginTop: 2, padding: '0 16px' }}>
                {[role, center].filter(Boolean).join(' · ')}
              </div>
              <div style={{ marginTop: 'auto', height: 14, background: 'linear-gradient(90deg, #006add, #38a1ff)' }} />
              <div aria-hidden="true" style={SHEEN} />
            </div>

            {/* ── back ── */}
            <div style={{ ...FACE, transform: 'rotateY(180deg) translateZ(2.5px)', background: '#1a2e4a', color: '#ffffff' }}>
              <div
                aria-hidden="true"
                style={{
                  position: 'absolute', bottom: 0, left: 0, width: '65%', height: '42%',
                  backgroundImage: 'radial-gradient(circle, #ffffff 2.1px, transparent 2.6px)',
                  backgroundSize: '15px 15px', opacity: 0.14, transform: 'scale(-1)',
                  WebkitMaskImage: 'radial-gradient(110% 110% at 100% 0%, black 30%, transparent 72%)',
                  maskImage: 'radial-gradient(110% 110% at 100% 0%, black 30%, transparent 72%)',
                }}
              />
              <div style={{ width: 52, height: 9, borderRadius: 6, background: '#10192c', margin: '16px auto 0', flexShrink: 0, boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.5)' }} />
              <div style={{ height: 44, background: '#10192c', marginTop: 22, flexShrink: 0 }} />
              <div className="flex flex-col flex-1" style={{ padding: '26px 24px' }}>
                <span className="font-ninja font-black" style={{ fontSize: 26, letterSpacing: '0.04em' }}>
                  <span style={{ color: '#38a1ff' }}>DOJO</span><span style={{ color: '#ffffff' }}>LINK</span>
                </span>
                <div className="font-ninja font-extrabold uppercase" style={{ fontSize: 12, letterSpacing: '0.22em', color: '#8a9bb8', marginTop: 18 }}>
                  Staff ID
                  <b className="block font-ninja" style={{ fontSize: 24, letterSpacing: '0.04em', overflowWrap: 'anywhere', color: shownUser ? '#ffffff' : '#8a9bb855', textTransform: 'none' }}>
                    {shownUser || 'your.username'}
                  </b>
                </div>
                {details.length > 0 && (
                  <div className="flex gap-6" style={{ marginTop: 18 }}>
                    {details.map(({ label, value }) => (
                      <div key={label} className="font-ninja font-extrabold uppercase" style={{ fontSize: 10, letterSpacing: '0.18em', color: '#8a9bb8' }}>
                        {label}
                        <b className="block font-ninja" style={{ fontSize: 17, letterSpacing: '0.02em', color: '#ffffff', textTransform: 'none' }}>{value}</b>
                      </div>
                    ))}
                  </div>
                )}
                <div className="font-ninja" style={{ marginTop: 'auto', fontSize: 12, color: '#8a9bb8', lineHeight: 1.7 }}>
                  Property of {center ? `Code Ninjas ${center}` : 'Code Ninjas'}.<br />
                  If found, return it to the dojo.<br />
                  <span className="font-extrabold" style={{ color: '#38a1ff' }}>www.dojolink.app</span>
                </div>
              </div>
              <div aria-hidden="true" style={SHEEN} />
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
