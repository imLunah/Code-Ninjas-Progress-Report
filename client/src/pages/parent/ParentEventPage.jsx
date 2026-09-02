import { lazy, Suspense, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
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
// THE PAGE'S COLUMN, and the one measure everything on this page sits in.
//
// 63rem is not a taste: it is what the body grid adds up to — 42rem of prose
// plus a 3rem gutter plus an 18rem margin. So the two-column body FILLS this
// column rather than sitting at one end of a wider one, which is what made
// the page hug the left edge with a few hundred pixels of nothing beside it.
//
// The prose was 34rem, which read as a thin ribbon down the middle of a wide
// screen. 42rem measures a 93-character line, which is past the 45-to-75 a
// line is classically given; the type went up a point (15 to 16) to buy some
// of that back, and the leading stayed loose at 1.75, because what actually
// costs you on a long line is finding the start of the next one.
//
// The facts band takes the same measure, so the "When" label starts on the
// same vertical as the prose under it. That is the part that has to be
// shared: centring the body on its own would leave the band's words at the
// far left and the reading a hundred pixels in from them.
//
// Inside the column everything stays LEFT aligned. Centring the block is
// right; centring the lines of a paragraph would not be.
const COLUMN = 'max-w-[63rem] mx-auto';

const NAVY = '#1a2e4a';
const LISTING_MD = {
  p: (props) => <p className="font-ninja text-[16px] leading-[1.75] mb-4 last:mb-0" {...props} />,
  strong: (props) => <strong className="font-extrabold" style={{ color: NAVY }} {...props} />,
  a: (props) => <a target="_blank" rel="noopener noreferrer" className="underline font-bold" style={{ color: '#0c2f6b' }} {...props} />,
  ul: (props) => <ul className="list-disc pl-5 mb-3.5 space-y-1.5" {...props} />,
  ol: (props) => <ol className="list-decimal pl-5 mb-3.5 space-y-1.5" {...props} />,
  li: (props) => <li className="font-ninja text-[16px] leading-[1.75]" {...props} />,
  h1: (props) => <p className="font-ninja font-extrabold text-[17px] mb-2 mt-5 first:mt-0" style={{ color: NAVY }} {...props} />,
  h2: (props) => <p className="font-ninja font-extrabold text-[16px] mb-2 mt-5 first:mt-0" style={{ color: NAVY }} {...props} />,
  h3: (props) => <p className="font-ninja font-extrabold text-[15px] mb-1.5 mt-4 first:mt-0" style={{ color: NAVY }} {...props} />,
  code: (props) => <code className="font-mono text-[13px] px-1 rounded" style={{ background: 'rgb(26 46 74 / 0.08)' }} {...props} />,
  blockquote: (props) => <blockquote className="pl-3 mb-2.5" style={{ borderLeft: '2px solid rgb(26 46 74 / 0.3)' }} {...props} />,
  img: () => null,
};

// One cell of the facts band.
//
// EVERY CELL IS THIS COMPONENT, and that is the whole point of it. The band
// was awkward because the two cells had different shapes: When was a glyph
// beside a value on one line, Where was a small label above a value. Two
// different structures side by side have no shared grid, so nothing could
// line up — the date sat level with the word "Where" and the center's name
// hung underneath with nothing beside it. Aligning them by hand only moves
// which pair looks wrong.
//
// So they are one shape, in three tiers, and the tiers do the aligning:
//
//   label   quiet, small, the same size in every cell
//   value   the answer, and the line the eye reads across
//   detail  optional, and it hangs BELOW the grid rather than inside it, so
//           a cell with one is still aligned with a cell without one
//
// The glyphs went with the change. A calendar beside a date under a label
// reading "When" is the same fact said three ways, and Apple's own spec rows
// (the App Store's Age / Chart / Developer strip, a Calendar event's detail)
// carry a label and a value and no icon at all. The label is what makes the
// two cells the same shape, so the label is what stays.
function Fact({ label, value, detail }) {
  return (
    <div className="min-w-0">
      <p className="font-ninja text-[13px] font-bold text-ninja-muted leading-tight">{label}</p>
      <p className="font-ninja text-[16px] font-extrabold text-ninja-navy leading-snug mt-1">{value}</p>
      {detail && <p className="font-ninja text-[13px] font-bold text-ninja-muted leading-snug mt-1">{detail}</p>}
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
  // The cell's third tier, and everything that is not the headline answer
  // goes on it as ONE line. The time and the countdown used to be two more
  // stacked lines, which made the When cell three tiers taller than Where and
  // put the band back out of balance the moment a listing had both.
  const whenDetail = [
    when && ev.event_time ? ev.event_time : null,
    // The countdown only starts once the banner has run out of words for it.
    // Inside a week the banner already says "Tomorrow" or "This Saturday".
    days !== null && days >= 7 && days <= 60 ? `In ${days} days` : null,
  ].filter(Boolean).join(' · ') || null;
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
          {/* THE FACTS BAND. A white strip running the whole content region,
              square, with a hairline under it — not a rounded card floating
              in the page. That is what an event page does under its picture,
              and it is what the card version was pretending to be: a bordered
              capsule with two words in it and an ocean of white to its right
              reads as a component that failed to fill, where a band reads as
              a rule ruled across the page.

              It breaks out of the sheet's column the same way the banner
              breaks out of main's — `left-1/2` against a centred column plus
              `w-[100cqw]` lands exactly on the region's edges — and puts its
              own max-w-6xl back inside, so the words still line up with the
              body underneath. */}
          <div className="relative left-1/2 -translate-x-1/2 w-[100cqw] bg-white border-b border-ninja-border">
            {/* The gutter sits OUTSIDE the column, not on it. With the
                padding on the column itself the band's 55rem would be a
                border box and its words would start a gutter's width in from
                where the body's 55rem starts, which is a 24px misalignment
                between the label and the paragraph under it. */}
            <div className="px-4 sm:px-6">
            <div className={`${COLUMN} py-5 sm:py-6 flex flex-col gap-6 sm:flex-row sm:items-start sm:gap-16`}>
              <Fact label="When" value={whenValue} detail={whenDetail} />

              {/* The center's name and nothing else, because that is all
                  there is. `locations` carries a name and a slug and no
                  address, so there is no street to print and no map to link,
                  and a Location block with "View map" over a guess is worse
                  than one that says where honestly. */}
              {parent?.centerName && <Fact label="Where" value={parent.centerName} />}

              {/* Filled, prominent, and centred on the row rather than on a
                  line of text — Apple centres a trailing control against the
                  whole block, not against one of its baselines. `rounded-xl`
                  is 12px, which is the radius a control this tall wants;
                  8px on a 46px button reads as a cut-off rectangle. */}
              {ev.event_url && !past && (
                <a
                  href={ev.event_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="sm:ml-auto sm:self-center inline-flex w-full sm:w-auto items-center justify-center font-ninja text-[15px] font-extrabold rounded-xl px-10 py-3 bg-ninja-blue text-white transition-colors hover:bg-ninja-blue/90"
                >
                  Sign up
                </a>
              )}
            </div>
            </div>
          </div>

          {/* An event that has already happened still opens, because a link a
              family was sent last week should land somewhere honest rather
              than on a 404. This is the honest part. A plain line, because a
              boxed notice on a page with no other boxes on it is the loudest
              thing on the screen for the quietest reason. */}
          {past && (
            <p className={`${COLUMN} font-ninja text-[13.5px] font-bold text-ninja-muted pt-6`}>
              This event has already happened.
            </p>
          )}

          {/* The body, and no cards on it either. The reference has the
              reading sitting straight on the page under a heading, with the
              rest in a margin beside it, and it is right: a card is a way of
              saying "this is one item among several", and there is one thing
              on this page.

              The column widths are the measured ones from before. 34rem is
              what puts a line of this prose at 71 characters, inside the
              45-to-75 a line is meant to be; the full width measured 81. */}
          <div className={`${COLUMN} pt-7 lg:pt-9 grid gap-8 lg:gap-12 lg:items-start ${ev.description && rest.length > 0 ? 'lg:grid-cols-[minmax(0,42rem)_18rem]' : ''}`}>
            {ev.description && (
              <div
                className="lg:col-start-1 lg:row-start-1 lg:max-w-[42rem] lg:mx-auto"
                style={{ color: 'rgb(26 46 74 / 0.9)' }}
              >
                <h2 className="font-ninja font-extrabold text-[22px] tracking-[-0.02em] mb-4" style={{ color: NAVY }}>
                  About this event
                </h2>
                <Suspense fallback={<p className="font-ninja text-[16px] leading-[1.75] whitespace-pre-line">{ev.description}</p>}>
                  <ReactMarkdown
                    components={LISTING_MD}
                    urlTransform={(url) => (/^(https?:|mailto:)/i.test(url) ? url : '')}
                  >
                    {ev.description}
                  </ReactMarkdown>
                </Suspense>
              </div>
            )}

            {/* With a sidebar, these two fill the column between them.
                Without one, whichever survives is a 34rem block in an 880px
                column, so it centres — which puts it on the same axis as the
                band above, whose own content is justified out to both edges
                of that column. Left-aligning it instead would sit it a third
                of the way across a page that is otherwise centred. */}
            {rest.length > 0 && (
              <aside className={ev.description ? 'lg:col-start-2 lg:row-start-1' : 'lg:max-w-[42rem] lg:mx-auto'}>
                {/* `bare`: the rows keep their own hairline dividers, which
                    is what actually says "list", and drop the card around
                    them, which is what the rest of this page has dropped. */}
                <Group bare title="Also coming up" action={<MoreLink to="/parent/events">All events</MoreLink>}>
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
        </PageSheet>
      </div>
    </ParentLayout>
  );
}
