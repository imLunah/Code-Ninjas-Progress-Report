// Emoji reactions, shared by the club board and the progress log.
//
// Each subject keeps its OWN table rather than one polymorphic reactions table
// keyed by (subject_type, subject_id). A real foreign key is what makes a
// deleted post take its reactions with it; a polymorphic id cannot be declared
// against two parents, so the cleanup would fall to application code that has
// to remember. What is shared is this file: the rule for what an emoji is, the
// aggregate the client draws, and the toggle.

// A wall of one-off emoji is noise, and every distinct one is another chip to
// lay out. Nobody is stopped from reacting, only from opening a twenty-first
// flavour of it.
const MAX_SUBJECT_REACTIONS = 20;

// The picker hands back whatever the platform has, so this cannot be an
// allowlist. It asks two things instead: the string is exactly ONE grapheme
// (a family emoji is seven code points but still one thing you see), and that
// grapheme is pictographic. Together those reject text, markup and pasted
// paragraphs without caring which emoji exist this year.
//
// Keycaps (1️⃣, #️⃣) are rejected as collateral: they are built out of an ASCII
// character, so they cannot be told apart from text by shape. Every table
// carries the same rule as a CHECK, which is the backstop if this is bypassed.
const GRAPHEMES = new Intl.Segmenter('en', { granularity: 'grapheme' });

function isEmoji(value) {
  if (typeof value !== 'string') return false;
  const str = value.trim();
  if (!str || str.length > 24) return false;
  if ([...GRAPHEMES.segment(str)].length !== 1) return false;
  if (!/\p{Extended_Pictographic}/u.test(str)) return false;
  return !/[\p{L}\p{N}\s]/u.test(str);
}

// One row per person per emoji, collapsed into what a client draws: the emoji,
// how many picked it, whether YOU are one of them, and who they were. Ordered
// by first use so a chip keeps its place as counts move.
//
// `table`, `fk` and `subject` are code-controlled identifiers, never request
// input. `userParam` is the placeholder holding the viewer's id.
function reactionsSubquery({ table, fk, subject, userParam }) {
  return `
  COALESCE((
    SELECT json_agg(json_build_object(
             'emoji', x.emoji, 'count', x.count, 'reacted', x.reacted, 'names', x.names
           ) ORDER BY x.first_at)
    FROM (
      SELECT rx.emoji,
             COUNT(*)::int AS count,
             BOOL_OR(rx.user_id = ${userParam}) AS reacted,
             MIN(rx.created_at) AS first_at,
             json_agg(COALESCE(ru.display_name, 'Someone') ORDER BY rx.created_at) AS names
      FROM ${table} rx
      LEFT JOIN users ru ON ru.id = rx.user_id
      WHERE rx.${fk} = ${subject}
      GROUP BY rx.emoji
    ) x
  ), '[]'::json)`;
}

async function readReactions(client, { table, fk, subjectId, userId }) {
  const { rows } = await client.query(
    `SELECT rx.emoji,
            COUNT(*)::int AS count,
            BOOL_OR(rx.user_id = $2) AS reacted,
            MIN(rx.created_at) AS first_at,
            json_agg(COALESCE(ru.display_name, 'Someone') ORDER BY rx.created_at) AS names
     FROM ${table} rx
     LEFT JOIN users ru ON ru.id = rx.user_id
     WHERE rx.${fk} = $1
     GROUP BY rx.emoji
     ORDER BY first_at`,
    [subjectId, userId]
  );
  return rows.map(({ first_at, ...chip }) => chip);
}

// Adds the reaction, or takes it back if it is already yours. Returns the whole
// set rather than a delta, so an optimistic client settles on the server's
// count instead of drifting from it.
//
// `verify` is given the client and must return the subject's id, or null if the
// caller may not touch it. It runs inside the transaction so the check and the
// write cannot straddle a delete.
async function toggleReaction(pool, { table, fk, emoji, userId, verify }) {
  if (!isEmoji(emoji)) return { status: 400, error: 'That is not an emoji' };
  const value = emoji.trim();

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const subjectId = await verify(client);
    if (!subjectId) {
      await client.query('ROLLBACK');
      return { status: 404, error: 'Not found' };
    }

    // Toggle off first. If nothing came out this is a new reaction and the cap
    // applies, but only to emoji the subject does not already carry: joining a
    // chip that exists adds no width.
    const { rowCount: removed } = await client.query(
      `DELETE FROM ${table} WHERE ${fk} = $1 AND user_id = $2 AND emoji = $3`,
      [subjectId, userId, value]
    );
    if (!removed) {
      const { rows: distinct } = await client.query(
        `SELECT COUNT(DISTINCT emoji)::int AS n, BOOL_OR(emoji = $2) AS exists
         FROM ${table} WHERE ${fk} = $1`,
        [subjectId, value]
      );
      if (!distinct[0].exists && distinct[0].n >= MAX_SUBJECT_REACTIONS) {
        await client.query('ROLLBACK');
        return { status: 400, error: `That can carry ${MAX_SUBJECT_REACTIONS} different reactions` };
      }
      // ON CONFLICT covers the double click that races its own toggle.
      await client.query(
        `INSERT INTO ${table} (${fk}, user_id, emoji) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
        [subjectId, userId, value]
      );
    }

    const reactions = await readReactions(client, { table, fk, subjectId, userId });
    await client.query('COMMIT');
    return { reactions };
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { isEmoji, reactionsSubquery, toggleReaction, MAX_SUBJECT_REACTIONS };
