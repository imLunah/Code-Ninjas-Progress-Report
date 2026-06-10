import Markdown from './Markdown';

function formatDate(d) {
  if (!d) return '';
  const date = new Date(d);
  if (isNaN(date)) return '';
  return date.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' });
}

function MediaItem({ item }) {
  if (item.type === 'video') {
    return (
      <video
        src={item.url}
        autoPlay
        loop
        muted
        playsInline
        controls
        className="w-full rounded-xl border border-ninja-border bg-black/40 max-h-[60vh] object-contain"
      />
    );
  }
  return (
    <img
      src={item.url}
      alt=""
      loading="lazy"
      className="w-full rounded-xl border border-ninja-border object-contain max-h-[60vh]"
    />
  );
}

// Renders a single release (title, version chip, date, markdown body, media gallery).
// Reused by the What's New modal and the Changelog page.
export default function ReleaseContent({ release, showDate = true }) {
  if (!release) return null;
  const media = Array.isArray(release.media) ? release.media : [];
  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 mb-1">
        <h3 className="text-lg font-bold font-ninja text-ninja-navy">{release.title}</h3>
        {release.version && (
          <span className="px-2 py-0.5 rounded-full bg-ninja-blue/10 text-ninja-blue text-xs font-ninja font-semibold">
            {release.version}
          </span>
        )}
      </div>
      {showDate && release.published_at && (
        <p className="text-ninja-muted font-ninja text-xs mb-3">{formatDate(release.published_at)}</p>
      )}
      {release.body_md?.trim() && (
        <div className="mb-3">
          <Markdown>{release.body_md}</Markdown>
        </div>
      )}
      {media.length > 0 && (
        <div className="space-y-3">
          {media.map((m, i) => (
            <MediaItem key={i} item={m} />
          ))}
        </div>
      )}
    </div>
  );
}
