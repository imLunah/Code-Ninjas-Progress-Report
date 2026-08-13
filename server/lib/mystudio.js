// The only place in DojoLink that talks to the studio management system.
//
// That system has no public API, no OAuth, and no service credential. Its web
// client authenticates with session cookies plus one custom header, so the only
// way in is to hold a session the way a signed-in browser holds one. Everything
// here is a GET against endpoints the vendor's own front end calls, with one
// exception noted at verifySession(). Nothing is ever written upstream: it is
// the franchise system of record, attendance there counts against a family's
// membership limits, and its registration paths touch a payment processor.
//
// Two rules that are easy to get wrong and expensive to get wrong:
//
//   1. The participants endpoint returns `all`, `registered` and `waitlisted`.
//      `all` is every active member at the center, not a roster. Reading it
//      would offer to check in the entire center. Only `registered` answers
//      "who is booked into this class today".
//
//   2. The upstream roster carries a child's check-in PIN, date of birth,
//      contact email, mobile number and parent names. None of that is needed to
//      match a ninja to a DojoLink record, so it is dropped here at the
//      boundary and never reaches a route, a response, the database or a log.

const crypto = require('crypto');

const BASE = 'https://codeninjas.mystudio.io';

// The stored cookie is a live credential for a third-party system holding
// student records, so it is encrypted at rest rather than sitting in a column
// in plaintext. 32 bytes, hex encoded.
const ENC_KEY_HEX = (process.env.MYSTUDIO_ENC_KEY || '').trim();

// The vendor's client echoes navigator.userAgent into a custom header. Sending
// a plausible desktop value keeps our requests shaped like the ones the app
// itself makes; a missing or obviously synthetic agent is the kind of thing a
// bot filter looks at.
const USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36';

// Class titles map to DojoLink programs only when the match is unambiguous.
// "Academies" is one class covering both Robotics Academy and AI Academy, and
// the membership category on the participant describes what the family bought
// rather than which class they are sitting in, so it cannot break the tie.
// Anything unresolved becomes a generic check-in (program NULL), which the
// daily route already supports and where the sensei picks the class at log
// time. Guessing here would either fail the program CHECK constraint or, worse,
// file a session under the wrong program.
const PROGRAMS = [
  'CREATE',
  'Robotics Academy',
  'AI Academy',
  'JR',
  'VR Coding',
  'Silver',
  'Gold Unity',
  'Gold Godot',
];

// Raised when the upstream session is no longer good. Callers turn this into a
// "reconnect" state rather than an error, because an expired cookie is the
// expected end of every connection's life, not a fault.
class MyStudioAuthError extends Error {
  constructor(message = 'MyStudio session is no longer valid') {
    super(message);
    this.name = 'MyStudioAuthError';
    this.expired = true;
  }
}

// Anything else: upstream 500s, a shape we did not expect, a network failure.
class MyStudioError extends Error {
  constructor(message = 'MyStudio request failed') {
    super(message);
    this.name = 'MyStudioError';
  }
}

function isConfigured() {
  return /^[0-9a-f]{64}$/i.test(ENC_KEY_HEX);
}

function encryptionKey() {
  if (!isConfigured()) {
    throw new MyStudioError('MYSTUDIO_ENC_KEY is missing or not 64 hex characters');
  }
  return Buffer.from(ENC_KEY_HEX, 'hex');
}

// AES-256-GCM so the stored value is authenticated as well as hidden: a cookie
// that has been tampered with fails to decrypt instead of being sent upstream.
function encryptCookie(plain) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', encryptionKey(), iv);
  const body = Buffer.concat([cipher.update(String(plain), 'utf8'), cipher.final()]);
  return [
    'v1',
    iv.toString('base64'),
    cipher.getAuthTag().toString('base64'),
    body.toString('base64'),
  ].join(':');
}

function decryptCookie(blob) {
  const parts = String(blob || '').split(':');
  if (parts.length !== 4 || parts[0] !== 'v1') {
    throw new MyStudioError('Stored MyStudio credential is unreadable');
  }
  try {
    const decipher = crypto.createDecipheriv(
      'aes-256-gcm',
      encryptionKey(),
      Buffer.from(parts[1], 'base64')
    );
    decipher.setAuthTag(Buffer.from(parts[2], 'base64'));
    return Buffer.concat([
      decipher.update(Buffer.from(parts[3], 'base64')),
      decipher.final(),
    ]).toString('utf8');
  } catch {
    // Wrong key, or the row was edited. Either way it cannot be used, and the
    // underlying error is not worth surfacing.
    throw new MyStudioError('Stored MyStudio credential is unreadable');
  }
}

// The pasted value is a document.cookie style string: "a=b; c=d".
//
// Carriage returns and newlines are stripped rather than escaped. This string is
// interpolated into an outbound HTTP header, and a newline in a header value is
// request splitting.
function sanitizeCookie(raw) {
  return String(raw || '').replace(/[\r\n]+/g, ' ').trim();
}

// Pulls the cookie out of whatever the person actually pasted.
//
// The credential lives in two httpOnly cookies, which means there is no way to
// read it from the console and no bookmarklet that can fetch it. Someone has to
// go into devtools. Asking a center director to find one header row inside a
// request is a bad instruction, and the first person to try it said so, so the
// screen now says "right click the request, Copy, Copy as cURL" instead: one
// menu everybody can find, and the cookie is in what lands on the clipboard.
//
// So this accepts three shapes and stops caring which:
//   - a cURL command, from either the -b/--cookie flag or a cookie -H header
//   - a bare cookie header, with or without a leading "cookie:" label
//   - the raw "a=b; c=d" string
//
// Being generous here is a security decision as much as a usability one. The
// alternative to accepting a pasted cURL is a person retyping a credential by
// hand, and retyping goes wrong quietly.
function extractCookie(raw) {
  const text = String(raw || '').trim();
  if (!text) return '';

  // cURL's -b/--cookie, quoted or not.
  const flag = /(?:^|\s)(?:-b|--cookie)\s+(?:'([^']*)'|"([^"]*)"|(\S+))/.exec(text);
  if (flag) return sanitizeCookie(flag[1] ?? flag[2] ?? flag[3]);

  // A cookie passed as a header, in a cURL command or pasted on its own. Chrome
  // writes -H 'cookie: ...'; Firefox and Safari capitalise it differently, hence
  // the case-insensitive match.
  const header =
    /(?:-H|--header)\s+(?:'\s*cookie\s*:\s*([^']*)'|"\s*cookie\s*:\s*([^"]*)")/i.exec(text) ||
    /(?:^|\n)\s*cookie\s*:\s*([^\n]+)/i.exec(text);
  if (header) return sanitizeCookie(header[1] ?? header[2] ?? header[3]);

  // It was a command or a set of headers, and none of them was the cookie. Give
  // back nothing rather than falling through, because the fallback below would
  // hand the whole command over to be stored and sent as a cookie header. An
  // empty answer becomes "paste the cookie to connect", which is the truth.
  const looksLikeCommand =
    /^\s*curl\b/i.test(text) || /(?:^|\s)(?:-H|--header|-b|--cookie)\s/.test(text);
  if (looksLikeCommand) return '';

  // Nothing wrapping it: treat the paste as the cookie itself.
  return sanitizeCookie(text);
}

function parseCookie(raw) {
  const out = {};
  for (const pair of extractCookie(raw).split(';')) {
    const eq = pair.indexOf('=');
    if (eq < 1) continue;
    const name = pair.slice(0, eq).trim();
    if (!name) continue;
    let value = pair.slice(eq + 1).trim();
    try {
      value = decodeURIComponent(value);
    } catch {
      // A value that is not valid percent-encoding is used as-is.
    }
    out[name] = value;
  }
  return out;
}

// What a usable paste has to contain.
//
// `companyId` says which center to ask about. `kc_access` and `kc_refresh` are
// the actual credential: httpOnly Keycloak tokens that authorize every API call.
// Because they are httpOnly, `document.cookie` cannot see them, so a cookie
// copied out of a console will look complete and fail with no_refresh_token. The
// connect screen therefore asks for the cookie request header from the network
// tab, and this is where a paste that missed the tokens gets rejected with an
// explanation rather than a shrug.
//
// PHPSESSID and ms_u_em are read too, but they are NOT required: they belong to
// a legacy session that expires on its own schedule while the Keycloak tokens
// stay good, so treating them as mandatory would reject working cookies.
function readCookieIdentity(raw) {
  const jar = parseCookie(raw);
  const companyId = jar.companyId;
  const access = jar.kc_access;
  const refresh = jar.kc_refresh;

  if (!companyId) {
    throw new MyStudioAuthError('That cookie is missing companyId');
  }
  if (!access && !refresh) {
    throw new MyStudioAuthError(
      'That cookie is missing the kc_access and kc_refresh values. Copy the ' +
        'whole cookie header from the network tab, not from the console.'
    );
  }

  return {
    companyId,
    sessionId: jar.PHPSESSID || null,
    email: jar.ms_u_em || null,
  };
}

function buildHeaders(cookie, companyId, extra = {}) {
  return {
    accept: 'application/json',
    // extract rather than sanitize: a stored value that came from a pasted cURL
    // must go out as the cookie header, not as the whole command.
    cookie: extractCookie(cookie),
    // Only companyId is actually required. The vendor's client also sends
    // stripeAcc, userId, userEmail and isStaffRequest, all of which the read
    // endpoints ignore, and two of which we deliberately do not store.
    'X-User-Info': JSON.stringify({ companyId: String(companyId) }),
    'User-Agent-Info': USER_AGENT,
    'user-agent': USER_AGENT,
    'x-origin-url': '/attendance/class-schedule',
    ...extra,
  };
}

async function request(cookie, companyId, method, path, { params, body } = {}) {
  const url = new URL(path, BASE);
  for (const [k, v] of Object.entries(params || {})) {
    if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, String(v));
  }

  const headers = buildHeaders(cookie, companyId);
  if (body) headers['content-type'] = 'application/json';

  let res;
  try {
    res = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      // Do not follow a bounce to the sign-in page. Following it turns an
      // expired session into a 200 with an HTML body, which reads as a shape
      // problem instead of the auth problem it is.
      redirect: 'manual',
      signal: AbortSignal.timeout(20000),
    });
  } catch (err) {
    throw new MyStudioError(
      err && err.name === 'TimeoutError' ? 'MyStudio timed out' : 'Could not reach MyStudio'
    );
  }

  if (res.status >= 300 && res.status < 400) throw new MyStudioAuthError();
  if (res.status === 401 || res.status === 403) throw new MyStudioAuthError();

  const text = await res.text();
  const contentType = res.headers.get('content-type') || '';

  if (!contentType.includes('json')) {
    // An HTML body here is the sign-in page rendered in place.
    if (/login|sign\s*in/i.test(text.slice(0, 2000))) throw new MyStudioAuthError();
    throw new MyStudioError('MyStudio returned an unexpected response');
  }

  let json;
  try {
    json = JSON.parse(text);
  } catch {
    throw new MyStudioError('MyStudio returned an unexpected response');
  }

  // Upstream error bodies can quote request data back, so the status is logged
  // and the body is not.
  if (!res.ok) throw new MyStudioError(`MyStudio responded ${res.status}`);

  return json;
}

// Best effort friendly name for the connected center.
//
// The vendor's client turns its cookies into a user record through this call, and
// the record carries the center's display name. It leans on the LEGACY session
// though, which expires independently of the Keycloak tokens: a perfectly usable
// cookie regularly gets "Expired" here while every read endpoint still answers.
// So the name is a nicety and never a verdict. Failure returns null.
async function fetchCompanyName(rawCookie, companyId, sessionId, email) {
  if (!sessionId || !email) return null;
  try {
    const data = await request(
      rawCookie,
      companyId,
      'POST',
      '/api/v1SessionLogin/v1SessionLogin',
      { body: { session_id: sessionId, email } }
    );
    if (!data || data.status !== 'Success') return null;
    const companies = Array.isArray(data.company_list) ? data.company_list : [];
    const match = companies.find((c) => String(c.company_id) === String(companyId));
    return (match && match.company_name) || null;
  } catch {
    return null;
  }
}

// Confirms a cookie can actually do the job.
//
// Deliberately verified against class-list, the endpoint the feature depends on,
// rather than against a session-exchange call that reports on a different and
// shorter-lived session. Verifying with the real capability is the only check
// that cannot pass while the feature is broken, or fail while it works.
async function verifySession(rawCookie, date) {
  const { companyId, sessionId, email } = readCookieIdentity(rawCookie);
  const probeDate = date || new Date().toLocaleDateString('en-CA', { timeZone: 'America/Los_Angeles' });

  const data = await request(rawCookie, companyId, 'GET', '/api/features/attendance/class-list', {
    params: { selected_date: probeDate },
  });

  // A body without a classList is not a schedule, whatever its status code.
  if (!data || !Array.isArray(data.classList)) throw new MyStudioAuthError();

  return {
    companyId: String(companyId),
    companyName: await fetchCompanyName(rawCookie, companyId, sessionId, email),
    classCount: data.classList.length,
  };
}

function toMinutes(time) {
  const m = /^(\d{1,2}):(\d{2})\s*([AP]M)$/i.exec(String(time || '').trim());
  if (!m) return Number.MAX_SAFE_INTEGER;
  let hour = Number(m[1]) % 12;
  if (/PM/i.test(m[3])) hour += 12;
  return hour * 60 + Number(m[2]);
}

function programForClass(title) {
  const raw = String(title || '').trim();
  if (!raw) return null;
  const hit = PROGRAMS.find((p) => p.toLowerCase() === raw.toLowerCase());
  return hit || null;
}

// Everything the feature needs, and nothing else. See the PII note at the top:
// the fields not copied here are the reason this function exists.
function normalizeParticipant(p, cls) {
  const first = String(p.participant_first_name || '').trim();
  const last = String(p.participant_last_name || '').trim();
  return {
    participantId: String(p.participant_id || ''),
    firstName: first,
    lastName: last,
    // Built from the parts rather than taken from participant_full_name, which
    // arrives as "First, Last" and would not match a DojoLink full_name.
    fullName: [first, last].filter(Boolean).join(' '),
    rankName: String(p.rank_name || '').trim() || null,
    // Already marked present upstream. Shown as context so staff are not asked
    // to check in a kid the vendor's own portal already has.
    checkedInUpstream: Boolean(
      String(p.checkin_status || '').trim() || p.att_checkin_datetime
    ),
    className: String(cls.class_appointment_title || '').trim(),
    startTime: String(cls.start_time || '').trim(),
    program: programForClass(cls.class_appointment_title),
  };
}

async function getClassList(cookie, companyId, date) {
  const data = await request(cookie, companyId, 'GET', '/api/features/attendance/class-list', {
    params: { selected_date: date },
  });
  return Array.isArray(data && data.classList) ? data.classList : [];
}

// `registered` only. See rule 1 at the top of this file.
async function getRegisteredForClass(cookie, companyId, date, cls) {
  const data = await request(
    cookie,
    companyId,
    'GET',
    '/api/features/attendance/class-participants',
    {
      params: {
        selected_date: date,
        class_appointment_id: cls.class_appointment_id,
        class_appointment_times_id: cls.class_appointment_times_id,
        class_appointment_occurrence_id: cls.class_appointment_occurrence_id,
        drop_in_flag: 'N',
        include_active_only: '1',
      },
    }
  );
  const registered = Array.isArray(data && data.registered) ? data.registered : [];
  return registered.map((p) => normalizeParticipant(p, cls));
}

// Small pool rather than Promise.all over every class. A center runs about 17
// classes a day and we only ask about the ones with bookings, but firing all of
// them at a vendor API at once is rude and gains nothing.
async function mapPooled(items, limit, fn) {
  const out = [];
  let cursor = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor++;
      out[index] = await fn(items[index]);
    }
  });
  await Promise.all(workers);
  return out;
}

// Who is booked into a class at this center on `date`.
async function getExpectedForDate(cookie, companyId, date) {
  const classes = await getClassList(cookie, companyId, date);
  const booked = classes.filter((c) => Number(c.registration_count) > 0);

  const perClass = await mapPooled(booked, 4, (cls) =>
    getRegisteredForClass(cookie, companyId, date, cls)
  );

  // A ninja booked into two classes on one day is one person to check in, so
  // collapse on participant id and keep the earliest class.
  const byParticipant = new Map();
  for (const row of perClass.flat()) {
    if (!row.participantId) continue;
    const seen = byParticipant.get(row.participantId);
    if (!seen || toMinutes(row.startTime) < toMinutes(seen.startTime)) {
      byParticipant.set(row.participantId, row);
    }
  }

  const expected = [...byParticipant.values()].sort(
    (a, b) =>
      toMinutes(a.startTime) - toMinutes(b.startTime) ||
      a.lastName.localeCompare(b.lastName) ||
      a.firstName.localeCompare(b.firstName)
  );

  return {
    date,
    classCount: classes.length,
    bookedClassCount: booked.length,
    expected,
  };
}

module.exports = {
  MyStudioAuthError,
  MyStudioError,
  isConfigured,
  encryptCookie,
  decryptCookie,
  sanitizeCookie,
  extractCookie,
  parseCookie,
  readCookieIdentity,
  verifySession,
  fetchCompanyName,
  getClassList,
  getRegisteredForClass,
  getExpectedForDate,
  normalizeParticipant,
  programForClass,
  toMinutes,
  PROGRAMS,
};
