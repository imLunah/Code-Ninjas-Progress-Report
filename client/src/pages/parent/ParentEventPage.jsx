import { lazy, Suspense, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { CalendarDaysIcon, ClockIcon, MapPinIcon } from 'lucide-react';
import ParentLayout from '../../components/layout/ParentLayout';
import { api } from '../../api/client';
import { useParentAuth } from '../../context/ParentAuthContext';
import { PinnedHero, PageSheet, BackChip, Group, Row, Tile, MoreLink } from '../../components/parent/ParentUI';
import Logo from '../../components/ui/Logo';
import { SkeletonProfile } from '../../components/ui/Skeleton';
import { FLAT } from '../../lib/surfaces';
import { ymd, listingHook, rowWhen, fullWhen, nearWhen, daysUntil, HOUSE, WASH, PLATE } from '../../lib/eventListing';

// The listing's own page: what "Learn more" opens.
//
// It used to grow the home billboard downward in place, and in-place was the
// wrong shape for it. A listing's description is the longest prose in the
// portal, the banner it opened inside is the tallest thing on the page, and
// the pair together were taller than a phone — so the billboard had to let go
// of the top of the screen while it was open, and a parent who wanted to read
// and then get back to their ninja had to scroll up, find the button again
// and close it. It also had no address: a CD could not send a family a link
// to the thing they were promoting.
//
// So it is a page, and the page opens with the SAME artwork the parent just
// tapped, at the same size, with the same wash over it. That continuity is
// the point of leading with the picture: the click lands somewhere that looks
// like where it came from, and nobody has to check they went to the right
// place.
//
// The banner says how near it is ("This Saturday") and the details card says
// the date in full. Two surfaces, two halves of the same fact, on purpose:
// printing "Saturday, October 4" twice on one screen is how an event page
// starts reading like a form.

// The prose. Lazy for the same reason the rest of the app loads it lazily —
// the markdown renderer is not small, and it is the only thing on this page
// that needs it.
const ReactMarkdown = lazy(() => import('react-markdown'));

// A listing's description is CD-authored markdown on white paper in BOTH
// themes, so every ink here is an inline navy rather than a class:
// `.dark .text-ninja-navy` would turn the words slate on a sheet that stays
// white. `img: () => null` stays — markdown never gets to draw an image on
// this surface (the same rule as the note maps, session 32).
const NAVY = '#1a2e4a';
const LISTING_MD = {
  p: (props) => <p className="font-ninja text-[14px] leading-relaxed mb-2.5 last:mb-0" {...props} />,
  strong: (props) => <strong className="font-extrabold" style={{ color: NAVY }} {...props} />,
  a: (props) => <a target="_blank" rel="noopener noreferrer" className="underline font-bold" style={{ color: '#0c2f6b' }} {...props} />,
  ul: (props) => <ul className="list-disc pl-5 mb-2.5 space-y-1" {...props} />,
  ol: (props) => <ol className="list-decimal pl-5 mb-2.5 space-y-1" {...props} />,
  li: (props) => <li className="font-ninja text-[14px] leading-relaxed" {...props} />,
  h1: (props) => <p className="font-ninja font-extrabold text-[16px] mb-2 mt-4 first:mt-0" style={{ color: NAVY }} {...props} />,
  h2: (props) => <p className="font-ninja font-extrabold text-[15px] mb-2 mt-4 first:mt-0" style={{ color: NAVY }} {...props} />,
  h3: (props) => <p className="font-ninja font-extrabold text-[14px] mb-1.5 mt-3 first:mt-0" style={{ color: NAVY }} {...props} />,
  code: (props) => <code className="font-mono text-[13px] px-1 rounded" style={{ background: 'rgb(26 46 74 / 0.08)' }} {...props} />,
  blockquote: (props) => <blockquote className="pl-3 mb-2.5" style={{ borderLeft: '2px solid rgb(26 46 74 / 0.3)' }} {...props} />,
  img: () => null,
};

// One fact, with its glyph: When, Where.
function Fact({ Glyph, label, children }) {
  return (
    <div className="flex items-start gap-3">
      <Tile size={34} tint="rgb(var(--ninja-blue) / 0.10)">
        <Glyph size={17} strokeWidth={2.2} aria-hidden />
      </Tile>
      <div className="min-w-0">
        <p className="font-ninja text-[11px] font-extrabold uppercase tracking-[0.08em] text-ninja-muted">{label}</p>
        <div className="font-ninja text-[14.5px] font-extrabold text-ninja-navy leading-snug mt-0.5">{children}</div>
      </div>
    </div>
  );
}

export default function ParentEventPage() {
  const { id } = useParams();
  const { parent } = useParentAuth();
  const [ev, setEv] = useState(null);
  const [status, setStatus] = useState('loading'); // loading | ready | missing | error
  const [others, setOthers] = useState([]);

  useEffect(() => {
    let alive = true;
    setStatus('loading');
    setEv(null);
    api.get(`/parent/events/${encodeURIComponent(id)}`)
      .then((row) => { if (alive) { setEv(row); setStatus('ready'); } })
      .catch((err) => { if (alive) setStatus(err?.status === 404 ? 'missing' : 'error'); });
    return () => { alive = false; };
  }, [id]);

  // What else is on, so the page has a way onward instead of a dead end. It
  // is the same list the Events page draws, minus this one.
  useEffect(() => {
    let alive = true;
    api.get(`/parent/events?today=${ymd(new Date())}&limit=8`)
      .then((rows) => { if (alive) setOthers(rows || []); })
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  if (status === 'loading') {
    return <ParentLayout><SkeletonProfile label="Loading the event" /></ParentLayout>;
  }

  if (status !== 'ready') {
    return (
      <ParentLayout>
        <div className={`${FLAT} p-8 text-center space-y-2`}>
          <p className="text-ninja-navy font-ninja font-bold">
            {status === 'missing' ? 'That event is not on your center’s calendar.' : 'Could not load that event.'}
          </p>
          <MoreLink to="/parent/events">All events</MoreLink>
        </div>
      </ParentLayout>
    );
  }

  const when = fullWhen(ev.event_date);
  const near = nearWhen(ev.event_date);
  const days = daysUntil(ev.event_date);
  const past = days !== null && days < 0;
  const hook = listingHook(ev);
  const rest = others.filter((o) => String(o.id) !== String(ev.id)).slice(0, 3);

  return (
    <ParentLayout>
      <div className="relative">
        <PinnedHero>
          <section
            className="relative left-1/2 -translate-x-1/2 w-[100cqw] overflow-hidden text-white"
            style={{ background: PLATE }}
          >
            <span
              aria-hidden
              className="absolute inset-0"
              style={ev.image_url
                ? { background: `url("${ev.image_url}") center / cover no-repeat` }
                : { background: HOUSE }}
            />
            <span aria-hidden className="absolute inset-0" style={{ background: WASH }} />

            <div className="relative h-64 sm:h-80 lg:h-[24rem]">
              <div className="relative h-full max-w-6xl mx-auto flex flex-col justify-center px-4 sm:px-6 pt-[max(1rem,env(safe-area-inset-top))]">
                {!ev.image_url && (
                  <span aria-hidden className="absolute right-6 top-1/2 -translate-y-1/2 hidden sm:block" style={{ color: '#ffffff', opacity: 0.22 }}>
                    <Logo variant="mark" className="h-24" />
                  </span>
                )}
                <div className="mb-6"><BackChip to="/parent/events" label="Back to events" /></div>
                <div className="min-w-0">
                  <p className="font-ninja text-[12px] sm:text-[13px] font-extrabold uppercase tracking-[0.08em] opacity-90">
                    {near}
                  </p>
                  {/* The title wraps here. On the billboard it is truncated
                      because a rotating poster has one line to give it; this
                      page is the listing, so it prints the whole name. */}
                  <h1 className="font-ninja font-extrabold text-[30px] sm:text-[38px] lg:text-[46px] leading-[1.05] mt-1.5 tracking-[-0.02em]">
                    {ev.title}
                  </h1>
                  {hook && <p className="font-ninja text-[14px] sm:text-[16px] font-bold opacity-90 mt-2 max-w-2xl line-clamp-2">{hook}</p>}
                </div>
              </div>
            </div>
          </section>
        </PinnedHero>

        <PageSheet corner="square">
          <div className="space-y-4 lg:space-y-5">

            {/* The facts and the prose on ONE card, split by a hairline. Two
                cards put a gap between the date and the paragraph explaining
                it, which is the one place on this page where nothing should
                come between them. */}
            <article className={`${FLAT} overflow-hidden`}>
              <div className="p-5 sm:p-6 space-y-5">
                <div className="grid gap-5 sm:grid-cols-2">
                  <Fact Glyph={CalendarDaysIcon} label="When">
                    {when || 'Any time'}
                    {ev.event_time && (
                      <span className="block font-ninja text-[13px] font-bold text-ninja-muted mt-0.5">
                        <ClockIcon size={12} strokeWidth={2.4} aria-hidden className="inline-block mr-1 -mt-0.5" />
                        {ev.event_time}
                      </span>
                    )}
                    {/* The countdown only starts once the banner has run out
                        of words for it. Inside a week the banner already says
                        "Tomorrow" or "This Saturday", and "In 3 days" under
                        it is the third printing of one fact on one screen. */}
                    {days !== null && days >= 7 && days <= 60 && (
                      <span className="block font-ninja text-[13px] font-bold text-ninja-muted mt-0.5">In {days} days</span>
                    )}
                  </Fact>
                  {parent?.centerName && (
                    <Fact Glyph={MapPinIcon} label="Where">{parent.centerName}</Fact>
                  )}
                </div>

                {/* An event that has already happened still opens, because a
                    link a family was sent last week should land somewhere
                    honest rather than on a 404. This is the honest part. */}
                {past && (
                  <p className="font-ninja text-[13px] font-bold rounded-xl px-3.5 py-2.5" style={{ background: 'rgb(26 46 74 / 0.06)', color: 'rgb(26 46 74 / 0.75)' }}>
                    This event has already happened.
                  </p>
                )}

                {ev.event_url && !past && (
                  <p>
                    <a
                      href={ev.event_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex w-full sm:w-auto items-center justify-center gap-1 font-ninja text-[14px] font-extrabold rounded-full px-6 py-2.5 transition-opacity hover:opacity-90"
                      style={{ background: NAVY, color: '#ffffff' }}
                    >
                      Sign up ›
                    </a>
                  </p>
                )}
              </div>

              {ev.description && (
                <div className="border-t border-ninja-navy/[0.08] p-5 sm:p-6" style={{ color: 'rgb(26 46 74 / 0.9)' }}>
                  <Suspense fallback={<p className="font-ninja text-[14px] leading-relaxed whitespace-pre-line">{ev.description}</p>}>
                    <ReactMarkdown
                      components={LISTING_MD}
                      urlTransform={(url) => (/^(https?:|mailto:)/i.test(url) ? url : '')}
                    >
                      {ev.description}
                    </ReactMarkdown>
                  </Suspense>
                </div>
              )}
            </article>

            {rest.length > 0 && (
              <Group title="Also coming up" action={<MoreLink to="/parent/events">All events</MoreLink>}>
                {rest.map((o, i) => (
                  <Row
                    key={o.id}
                    first={i === 0}
                    to={`/parent/events/${o.id}`}
                    title={o.title}
                    subtitle={rowWhen(o) || listingHook(o) || 'Anytime'}
                  />
                ))}
              </Group>
            )}
          </div>
        </PageSheet>
      </div>
    </ParentLayout>
  );
}
