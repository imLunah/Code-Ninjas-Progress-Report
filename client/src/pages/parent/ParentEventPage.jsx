import { lazy, Suspense, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { CalendarDaysIcon, MapPinIcon } from 'lucide-react';
import ParentLayout from '../../components/layout/ParentLayout';
import { api } from '../../api/client';
import { useParentAuth } from '../../context/ParentAuthContext';
import { PinnedHero, PageSheet, BackChip, Group, Row, MoreLink } from '../../components/parent/ParentUI';
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
  p: (props) => <p className="font-ninja text-[15px] leading-[1.75] mb-3.5 last:mb-0" {...props} />,
  strong: (props) => <strong className="font-extrabold" style={{ color: NAVY }} {...props} />,
  a: (props) => <a target="_blank" rel="noopener noreferrer" className="underline font-bold" style={{ color: '#0c2f6b' }} {...props} />,
  ul: (props) => <ul className="list-disc pl-5 mb-3.5 space-y-1.5" {...props} />,
  ol: (props) => <ol className="list-decimal pl-5 mb-3.5 space-y-1.5" {...props} />,
  li: (props) => <li className="font-ninja text-[15px] leading-[1.75]" {...props} />,
  h1: (props) => <p className="font-ninja font-extrabold text-[17px] mb-2 mt-5 first:mt-0" style={{ color: NAVY }} {...props} />,
  h2: (props) => <p className="font-ninja font-extrabold text-[16px] mb-2 mt-5 first:mt-0" style={{ color: NAVY }} {...props} />,
  h3: (props) => <p className="font-ninja font-extrabold text-[15px] mb-1.5 mt-4 first:mt-0" style={{ color: NAVY }} {...props} />,
  code: (props) => <code className="font-mono text-[13px] px-1 rounded" style={{ background: 'rgb(26 46 74 / 0.08)' }} {...props} />,
  blockquote: (props) => <blockquote className="pl-3 mb-2.5" style={{ borderLeft: '2px solid rgb(26 46 74 / 0.3)' }} {...props} />,
  img: () => null,
};

// One fact, with its glyph: When, Where.
//
// The glyph rides WITH the label rather than on a tinted tile beside it. A
// tile is the app's lead for a row you can act on, where the square is the
// tap target and the thing it holds is a number or an initial standing in for
// a name. Nothing here is a row and nothing here is tappable: When and Where
// are two facts on a card, and putting each one behind its own coloured
// square made the card look like a menu of two options. Inline, the glyph is
// what it actually is, a mark on a caption.
function Fact({ Glyph, label, children }) {
  return (
    <div className="min-w-0">
      <p className="flex items-center gap-1.5 font-ninja text-[11px] font-extrabold uppercase tracking-[0.08em] text-ninja-muted">
        <Glyph size={13} strokeWidth={2.6} aria-hidden className="flex-shrink-0" />
        {label}
      </p>
      <div className="font-ninja text-[14.5px] font-extrabold text-ninja-navy leading-snug mt-1">{children}</div>
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
  // An undated listing that still carries a time used to read "Any time"
  // with "4 - 5" under it, which is the page contradicting itself in two
  // consecutive lines. With no date the time IS the answer, so it moves up
  // and the placeholder only appears when there is genuinely nothing to say.
  const whenValue = when || ev.event_time || 'Anytime';
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

            {/* CENTRED, and the date line ABOVE the title. A listing page
                is a poster for one thing, and centring is what says "one
                thing" — the index is the left-aligned scanning surface, this
                is the arrival. The small line over the title is the same
                shape as the date on a printed invitation.

                It is `nearWhen` rather than the date, though. The bar under
                this carries the date in full, and a page that prints
                "Saturday, October 4" twice in the first two inches has
                started reading like a form. */}
            <div className="relative h-64 sm:h-80 lg:h-[24rem]">
              <div className="relative h-full max-w-6xl mx-auto flex flex-col items-center justify-center text-center px-4 sm:px-6 py-14">
                {!ev.image_url && (
                  <span aria-hidden className="absolute right-6 top-1/2 -translate-y-1/2 hidden sm:block" style={{ color: '#ffffff', opacity: 0.22 }}>
                    <Logo variant="mark" className="h-24" />
                  </span>
                )}
                {/* Out of the flow, so the words stay optically centred in
                    the banner instead of being pushed down by the chip. The
                    inset matches the container's own gutter, which is what
                    lines the chip up with the left edge of the cards below
                    rather than floating it out over the page margin. */}
                <div className="absolute left-4 sm:left-6 top-[max(1.25rem,env(safe-area-inset-top))]">
                  <BackChip to="/parent/events" label="Back to events" />
                </div>
                <div className="min-w-0 w-full">
                  <p className="font-ninja text-[12px] sm:text-[13px] font-extrabold uppercase tracking-[0.1em] opacity-90">
                    {near}
                  </p>
                  {/* The title wraps here. On the billboard it is truncated
                      because a rotating poster has one line to give it; this
                      page is the listing, so it prints the whole name. The
                      cap keeps a long one breaking into readable lines rather
                      than running the full width of a wide screen. */}
                  <h1 className="font-ninja font-extrabold text-[30px] sm:text-[38px] lg:text-[46px] leading-[1.1] mt-2.5 tracking-[-0.02em] max-w-3xl mx-auto text-balance">
                    {ev.title}
                  </h1>
                  {hook && <p className="font-ninja text-[14px] sm:text-[16px] font-bold opacity-90 mt-3 max-w-xl mx-auto line-clamp-2">{hook}</p>}
                </div>
              </div>
            </div>
          </section>
        </PinnedHero>

        <PageSheet corner="square">
          <div className="space-y-4 lg:space-y-5">

            {/* THE FACTS BAR, straight under the banner and running the full
                width. This is the shape an event page has settled on: the
                picture sells it, then one strip answers when, where and how
                to get in, then the reading starts. It is one row rather than
                a column in the margin because these are the three things
                somebody came for, and a person who has decided in the first
                two seconds should not have to hunt down a rail for the
                button.

                `ml-auto` pushes the sign-up to the far end of the strip on a
                desktop; on a phone the strip stacks and the button is the
                full width of it, which is where a thumb expects it. */}
            <div className={`${FLAT} p-5 sm:px-6 sm:py-5 flex flex-col gap-5 sm:flex-row sm:items-center sm:gap-8`}>
              {/* The two facts align to each OTHER at the top, so When and
                  Where start on the same line however many lines When runs
                  to. Centring them individually against the strip put Where's
                  label a row below When's, which reads as two things that
                  were never meant to line up. The button still centres, on
                  the strip rather than on the text. */}
              <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:gap-10">
              <Fact Glyph={CalendarDaysIcon} label="When">
                {whenValue}
                {/* No clock glyph. The label above already carries a mark,
                    and the time sits directly under the date it belongs to,
                    so a second icon inside one fact is decoration on
                    something nobody could misread. */}
                {when && ev.event_time && (
                  <span className="block font-ninja text-[13px] font-bold text-ninja-muted mt-0.5">{ev.event_time}</span>
                )}
                {/* The countdown only starts once the banner has run out of
                    words for it. Inside a week the banner already says
                    "Tomorrow" or "This Saturday", and "In 3 days" under it is
                    the third printing of one fact on one screen. */}
                {days !== null && days >= 7 && days <= 60 && (
                  <span className="block font-ninja text-[13px] font-bold text-ninja-muted mt-0.5">In {days} days</span>
                )}
              </Fact>

              {/* The center's name and nothing else, because that is all
                  there is. `locations` carries a name and a slug and no
                  address, so there is no street to print and no map to link,
                  and a Location block that says "View map" over a guess is
                  worse than one that says where honestly. */}
              {parent?.centerName && (
                <Fact Glyph={MapPinIcon} label="Where">{parent.centerName}</Fact>
              )}
              </div>

              {ev.event_url && !past && (
                <a
                  href={ev.event_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="sm:ml-auto inline-flex w-full sm:w-auto items-center justify-center gap-1 font-ninja text-[14px] font-extrabold rounded-full px-8 py-3 transition-opacity hover:opacity-90"
                  style={{ background: NAVY, color: '#ffffff' }}
                >
                  Sign up ›
                </a>
              )}
            </div>

            {/* An event that has already happened still opens, because a link
                a family was sent last week should land somewhere honest
                rather than on a 404. This is the honest part. It sits under
                the bar rather than inside it so it does not squeeze the
                facts into a corner of their own strip. */}
            {past && (
              <p className={`${FLAT} font-ninja text-[13.5px] font-bold px-5 py-3.5`} style={{ color: 'rgb(26 46 74 / 0.75)' }}>
                This event has already happened.
              </p>
            )}

            {/* The reading, and what is on after it. Same two-column split as
                before and for the same measured reason: 34rem is the width
                that puts a line at 71 characters here, inside the 45-to-75 a
                line is meant to be. Full width it measured 81. */}
            <div className={`grid gap-4 lg:gap-5 lg:items-start ${ev.description && rest.length > 0 ? 'lg:grid-cols-[minmax(0,34rem)_20rem]' : ''}`}>
              {ev.description && (
                <article
                  className={`${FLAT} lg:col-start-1 lg:row-start-1 lg:max-w-[34rem] p-5 sm:p-6 lg:p-7`}
                  style={{ color: 'rgb(26 46 74 / 0.9)' }}
                >
                  <h2 className="font-ninja font-extrabold text-[20px] tracking-[-0.02em] mb-3.5" style={{ color: NAVY }}>
                    About this event
                  </h2>
                  <Suspense fallback={<p className="font-ninja text-[15px] leading-[1.75] whitespace-pre-line">{ev.description}</p>}>
                    <ReactMarkdown
                      components={LISTING_MD}
                      urlTransform={(url) => (/^(https?:|mailto:)/i.test(url) ? url : '')}
                    >
                      {ev.description}
                    </ReactMarkdown>
                  </Suspense>
                </article>
              )}

              {rest.length > 0 && (
                <aside className={ev.description ? 'lg:col-start-2 lg:row-start-1' : 'lg:max-w-[34rem]'}>
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
                </aside>
              )}
            </div>
          </div>
        </PageSheet>
      </div>
    </ParentLayout>
  );
}
