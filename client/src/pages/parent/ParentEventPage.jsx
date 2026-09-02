import { lazy, Suspense, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import ParentLayout from '../../components/layout/ParentLayout';
import { api } from '../../api/client';
import { useParentAuth } from '../../context/ParentAuthContext';
import { ArrowLeftIcon } from 'lucide-react';
import { MoreLink } from '../../components/parent/ParentUI';
import EventCard from '../../components/parent/EventCard';
import Logo from '../../components/ui/Logo';
import { SkeletonProfile } from '../../components/ui/Skeleton';
import { FLAT } from '../../lib/surfaces';
import { ymd, listingHook, fullWhen, nearWhen, daysUntil, HOUSE, WASH, PLATE } from '../../lib/eventListing';

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
// THE SHAPE IS AN EVENT PAGE'S, not the portal's. Every other parent page is
// a full-bleed banner pinned to the top of the screen with the page riding up
// over it on a sheet; this one is a poster card with the details floating on
// it and the reading underneath. That is a deliberate divergence: the pinned
// banner is how a SECTION of the portal opens, and this is not a section, it
// is one thing a center is advertising. The picture is a poster, so it is
// framed like one — inset, with corners — rather than run to the screen edges
// as chrome.
//
// The card overlapping the poster is the whole design. Date, place and the
// way in are what somebody came for, and floating them half on the artwork
// says they belong to it, without making the picture share a strip with a
// button. On a phone there is no room to float anything, so it stacks under
// the poster and reads as the next thing rather than a thing on top.
//
// The poster says how near it is ("This Saturday") and the card says the date
// in full. Two surfaces, two halves of one fact, on purpose.

// The prose. Lazy for the same reason the rest of the app loads it lazily —
// the markdown renderer is not small, and it is the only thing on this page
// that needs it.
const ReactMarkdown = lazy(() => import('react-markdown'));

// A listing's description is CD-authored markdown on white paper in BOTH
// themes, so every ink here is an inline navy rather than a class:
// `.dark .text-ninja-navy` would turn the words slate on a sheet that stays
// white. `img: () => null` stays — markdown never gets to draw an image on
// this surface (the same rule as the note maps, session 32).
// THE PAGE'S COLUMN. The poster, the floating card and the reading all sit
// inside this, centred, so the page is a block in the middle of the screen
// rather than something hanging off its left edge.
//
// 63rem is wide enough for a poster to be a poster. The READING inside it is
// capped separately at 42rem and centred, because a line of body copy has a
// width it wants and the picture above it does not.
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

// One row of the floating card: a quiet label over the answer.
//
// EVERY ROW IS THIS COMPONENT, which is what keeps them aligned. An earlier
// version had one row as a glyph beside a value and another as a label above
// one; two shapes side by side share no grid, so the date sat level with the
// word "Where" and nothing lined up. One shape, and the tiers do the work.
function Fact({ label, value, detail }) {
  return (
    <div className="min-w-0">
      <p className="font-ninja text-[12.5px] font-bold text-ninja-muted leading-tight">{label}</p>
      <p className="font-ninja text-[15.5px] font-extrabold text-ninja-navy leading-snug mt-1">{value}</p>
      {detail && <p className="font-ninja text-[12.5px] font-bold text-ninja-muted leading-snug mt-1">{detail}</p>}
    </div>
  );
}

// The card that floats on the poster: when, where, and the way in.
//
// Rendered TWICE — once absolutely on the poster at lg, once in flow under it
// below that — rather than one copy moved by CSS. A single node cannot be
// both inside the poster's overflow-hidden box (so it can be floated on the
// art) and outside it (so it can hang past the bottom corner on a phone).
// Two call sites of one component is the honest version of that; a `position`
// switch would need the poster to stop clipping, and the poster clips because
// its corners are the frame.
function DetailCard({ whenValue, whenDetail, centerName, url, past }) {
  return (
    <div className={`${FLAT} p-5 shadow-[0_18px_48px_-24px_rgb(6_13_26/0.45)] space-y-4`}>
      <div className="space-y-4">
        <Fact label="Date and time" value={whenValue} detail={whenDetail} />
        {/* The center's name and nothing else, because that is all there is:
            `locations` carries a name and a slug and no address, so there is
            no street to print and no map to link. A location block with "View
            map" over a guessed address is worse than one that is honest. */}
        {centerName && <Fact label="Where" value={centerName} />}
      </div>

      {/* An event that has already happened still opens, because a link a
          family was sent last week should land somewhere honest rather than
          on a 404. This is the honest part, and it replaces the button
          rather than sitting beside a live one. */}
      {past ? (
        <p className="font-ninja text-[13px] font-bold text-ninja-muted pt-1">
          This event has already happened.
        </p>
      ) : url ? (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="block w-full text-center font-ninja text-[15px] font-extrabold rounded-xl px-6 py-3 bg-ninja-blue text-white transition-colors hover:bg-ninja-blue/90"
        >
          Sign up
        </a>
      ) : null}
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
      <div className={`${COLUMN} pb-2`}>

        {/* THE POSTER. Inset and rounded rather than run to the screen's
            edges: this is a picture a center made, so it is framed like one.
            The right padding at lg is the hole the floating card sits in —
            without it a long title runs under the card. */}
        <section
          className="relative overflow-hidden rounded-[26px] text-white"
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

          <div className="relative flex min-h-[19rem] sm:min-h-[22rem] lg:min-h-[25rem] flex-col justify-between p-6 sm:p-8 lg:pr-[23rem]">
            {/* A worded back link, not a round chip. The chip is what the
                portal's pinned banners use because they have no room for
                anything wider; there is room here, and a word is clearer
                than a glyph. */}
            <Link
              to="/parent/events"
              className="inline-flex items-center gap-2 self-start font-ninja text-[14px] font-extrabold text-white/90 hover:text-white transition-colors"
            >
              <ArrowLeftIcon size={18} strokeWidth={2.4} aria-hidden />
              Back
            </Link>

            <div className="min-w-0 mt-8">
              <p className="font-ninja text-[12px] sm:text-[13px] font-extrabold uppercase tracking-[0.1em] opacity-90">
                {near}
              </p>
              {/* Left aligned and wrapping. On the billboard the title is
                  truncated because a rotating poster has one line to give
                  it; this page IS the listing, so it prints the whole name. */}
              <h1 className="font-ninja font-extrabold text-[28px] sm:text-[36px] lg:text-[42px] leading-[1.1] mt-2 tracking-[-0.02em]">
                {ev.title}
              </h1>
              {hook && <p className="font-ninja text-[14px] sm:text-[15.5px] font-bold opacity-90 mt-3 max-w-xl line-clamp-3">{hook}</p>}
            </div>

            {!ev.image_url && (
              <span aria-hidden className="absolute right-6 bottom-6 hidden sm:block lg:hidden" style={{ color: '#ffffff', opacity: 0.18 }}>
                <Logo variant="mark" className="h-20" />
              </span>
            )}
          </div>

          {/* THE FLOATING CARD, on the poster at lg and under it below that.
              Absolute inside the poster means it can never be taller than the
              art it is floating on, which is why the poster carries a
              min-height rather than the card being pinned to its edges. */}
          <div className="hidden lg:block absolute right-8 top-1/2 -translate-y-1/2 w-[20rem]">
            <DetailCard
              whenValue={whenValue}
              whenDetail={whenDetail}
              centerName={parent?.centerName}
              url={ev.event_url}
              past={past}
            />
          </div>
        </section>

        {/* The phone and tablet copy of the same card. It overlaps the
            poster's bottom corner by a hair, which is what says the two
            belong together once they are no longer on top of each other. */}
        <div className="lg:hidden -mt-6 px-3 relative z-10">
          <DetailCard
            whenValue={whenValue}
            whenDetail={whenDetail}
            centerName={parent?.centerName}
            url={ev.event_url}
            past={past}
          />
        </div>

        {/* THE READING. Capped at 42rem and centred in the column: a line of
            body copy has a width it wants, and the poster above it does not.
            93 characters at 16px on 28px, which is long, so the leading is
            loose — finding the start of the next line is what a long measure
            actually costs you. */}
        {ev.description && (
          <div
            className="max-w-[42rem] mx-auto pt-10 lg:pt-14"
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

        {/* WHAT ELSE IS ON, as cards rather than the thin list of rows this
            used to be in a margin. They are the same card the Events index
            draws, in its tile shape, so a listing looks like itself wherever
            it turns up. A page about one event should end with a way to
            another one rather than with the last line of a paragraph. */}
        {rest.length > 0 && (
          <section className="pt-12 lg:pt-16">
            <div className="flex items-baseline justify-between gap-4 mb-4">
              <h2 className="font-ninja font-extrabold text-[20px] tracking-[-0.02em] text-ninja-navy">
                More at {parent?.centerName || 'the center'}
              </h2>
              <MoreLink to="/parent/events">All events</MoreLink>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {rest.map((o) => <EventCard key={o.id} ev={o} layout="tile" />)}
            </div>
          </section>
        )}
      </div>
    </ParentLayout>
  );
}
