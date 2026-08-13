import { describe, it, expect } from 'vitest';
import ms from '../lib/mystudio.js';

// Pure unit tests: no database and no network. Everything here is the part of
// the MyStudio integration that can be wrong quietly. The two that matter most
// are the PII strip and the program mapping, because a mistake in either is
// invisible in the UI and lands in the database or a log.

describe('cookie handling', () => {
  const full =
    'PHPSESSID=abc123; ms_u_em=director%40example.invalid; companyId=480; ' +
    'keepCache=true; kc_access=tok-a; kc_refresh=tok-r';

  it('reads the identity values out of a pasted cookie', () => {
    expect(ms.readCookieIdentity(full)).toEqual({
      companyId: '480',
      sessionId: 'abc123',
      email: 'director@example.invalid',
    });
  });

  it('requires companyId', () => {
    expect(() => ms.readCookieIdentity('kc_access=a; kc_refresh=b')).toThrow(
      ms.MyStudioAuthError
    );
    expect(() => ms.readCookieIdentity('')).toThrow(ms.MyStudioAuthError);
  });

  // The mistake this feature invites. kc_access and kc_refresh are httpOnly, so
  // a cookie copied from the console omits them silently and upstream answers
  // no_refresh_token. The error has to name the fix.
  it('explains a paste that is missing the httpOnly tokens', () => {
    expect(() => ms.readCookieIdentity('PHPSESSID=a; ms_u_em=b; companyId=480')).toThrow(
      /kc_access and kc_refresh/
    );
  });

  // The legacy PHP session expires on its own schedule while the Keycloak
  // tokens stay valid, so demanding it would reject working cookies.
  it('accepts a cookie with the tokens but no legacy session', () => {
    expect(ms.readCookieIdentity('companyId=480; kc_access=a; kc_refresh=b')).toEqual({
      companyId: '480',
      sessionId: null,
      email: null,
    });
  });

  it('strips CR and LF so a pasted value cannot inject a header', () => {
    const out = ms.sanitizeCookie('PHPSESSID=a\r\nX-User-Info: {"companyId":"999"}');
    expect(out).not.toMatch(/[\r\n]/);
  });

  it('keeps a value containing an equals sign intact', () => {
    expect(ms.parseCookie('a=b=c; d=e').a).toBe('b=c');
  });
});

// The connect screen asks for "Copy as cURL" because the credential is httpOnly
// and the header-row instruction it replaced was one a director could not follow.
// That only works if the paste is accepted in whatever shape it arrives.
describe('accepting what people actually paste', () => {
  const COOKIE = 'companyId=480; kc_access=tok-a; kc_refresh=tok-r';

  it('takes a Chrome Copy as cURL, where the cookie is a -H header', () => {
    const pasted =
      `curl 'https://codeninjas.mystudio.io/api/features/attendance/class-list?selected_date=2026-08-13' \\\n` +
      `  -H 'accept: application/json' \\\n` +
      `  -H 'cookie: ${COOKIE}' \\\n` +
      `  -H 'user-agent: Mozilla/5.0'`;
    expect(ms.extractCookie(pasted)).toBe(COOKIE);
    expect(ms.readCookieIdentity(pasted).companyId).toBe('480');
  });

  it('takes a cURL that uses -b or --cookie instead', () => {
    expect(ms.extractCookie(`curl 'https://x.test' -b '${COOKIE}'`)).toBe(COOKIE);
    expect(ms.extractCookie(`curl 'https://x.test' --cookie "${COOKIE}"`)).toBe(COOKIE);
  });

  it('takes a bare header line, whatever its capitalisation', () => {
    expect(ms.extractCookie(`Cookie: ${COOKIE}`)).toBe(COOKIE);
    expect(ms.extractCookie(`cookie: ${COOKIE}`)).toBe(COOKIE);
  });

  it('still takes the plain cookie string', () => {
    expect(ms.extractCookie(COOKIE)).toBe(COOKIE);
  });

  it('does not mistake another header for the cookie', () => {
    // A cURL with no cookie at all must not hand back the user-agent.
    const noCookie = `curl 'https://x.test' -H 'user-agent: Mozilla/5.0'`;
    expect(ms.extractCookie(noCookie)).not.toMatch(/Mozilla/);
  });

  it('never lets a pasted newline into the outbound header', () => {
    // Multi-line cURL is the normal case, so this is the shape most likely to
    // carry a newline into a header value if extraction were sloppy.
    const pasted = `curl 'https://x.test' \\\n  -H 'cookie: ${COOKIE}' \\\n`;
    expect(ms.extractCookie(pasted)).not.toMatch(/[\r\n]/);
  });

  it('returns empty for an empty paste rather than guessing', () => {
    expect(ms.extractCookie('')).toBe('');
    expect(ms.extractCookie(null)).toBe('');
  });
});

// A MyStudio page also loads the support chat, Stripe and analytics, so "copy
// any request" is not good enough advice: the first real attempt copied the
// embedded HubSpot chat widget and got HubSpot's cookies. The paste parses
// perfectly and is simply the wrong site, which is the one failure the error
// text has to explain rather than blame on MyStudio.
describe('a request copied from the wrong site', () => {
  // Same shape as the real mis-paste, with invented token values.
  const hubspotCurl =
    `curl --url 'https://app.hubspot.com/api/livechat-public/v1/feedback/survey/CSAT/4?hs_static_app=conversations-visitor-ui' \\\n` +
    `  -H 'accept: application/json' \\\n` +
    `  -b 'hubspotapi-prefs=1; hubspotapi=FAKE-TOKEN; csrf.app=FAKE-CSRF' \\\n` +
    `  -H 'referer: https://app.hubspot.com/conversations-visitor/22638569/threads/utk/abc'`;

  it('reads the host out of the pasted command', () => {
    expect(ms.extractRequestHost(hubspotCurl)).toBe('app.hubspot.com');
    expect(ms.isMyStudioHost('app.hubspot.com')).toBe(false);
    expect(ms.isMyStudioHost('codeninjas.mystudio.io')).toBe(true);
  });

  it('names the wrong site and points at the row that works', () => {
    let message = '';
    try {
      ms.readCookieIdentity(hubspotCurl);
    } catch (e) {
      message = e.message;
    }
    expect(message).toContain('app.hubspot.com');
    // Names one row rather than describing a filter, because two rounds of
    // filter advice both failed for different reasons.
    expect(message).toMatch(/home/i);
    // Must not read as a MyStudio fault, which is what "missing companyId" did.
    expect(message).not.toMatch(/missing companyId/i);
  });

  it('is not fooled by a mystudio.io referer on another host', () => {
    // The chat widget's referer mentions codeninjas.mystudio.io, so matching the
    // first mystudio string anywhere in the paste would call this the right site.
    const withMyStudioReferer =
      `curl --url 'https://app.hubspot.com/api/x' \\\n` +
      `  -H 'referer: https://app.hubspot.com/c?domain=codeninjas.mystudio.io&url=https%3A%2F%2Fcodeninjas.mystudio.io%2Fhome' \\\n` +
      `  -b 'hubspotapi=FAKE'`;
    expect(ms.extractRequestHost(withMyStudioReferer)).toBe('app.hubspot.com');
    expect(() => ms.readCookieIdentity(withMyStudioReferer)).toThrow(/app\.hubspot\.com/);
  });

  it('accepts the real thing on a mystudio.io host', () => {
    const good =
      `curl 'https://codeninjas.mystudio.io/api/features/attendance/class-list?selected_date=2026-08-13' \\\n` +
      `  -H 'cookie: companyId=480; kc_refresh=tok-r'`;
    expect(ms.readCookieIdentity(good).companyId).toBe('480');
  });

  // cn.mystudio.io serves uploaded images. It is a real mystudio.io host, so a
  // domain check waves it through, and it never receives the sign-in cookies, so
  // what gets waved through is useless. The studio logo sits in the network list
  // looking exactly as copyable as anything else.
  it('tells apart the image host from the signed-in one', () => {
    expect(ms.isMyStudioHost('codeninjas.mystudio.io')).toBe(true);
    expect(ms.isMyStudioHost('cn.mystudio.io')).toBe(false);
    expect(ms.isMyStudioAssetHost('cn.mystudio.io')).toBe(true);
    expect(ms.isMyStudioAssetHost('codeninjas.mystudio.io')).toBe(false);
    expect(ms.isMyStudioAssetHost('app.hubspot.com')).toBe(false);
  });

  it('explains the image host instead of calling it a missing companyId', () => {
    const logoCurl = `curl 'https://cn.mystudio.io/uploads/Default/your_logo.png' -H 'accept: image/png'`;
    let message = '';
    try {
      ms.readCookieIdentity(logoCurl);
    } catch (e) {
      message = e.message;
    }
    expect(message).toContain('cn.mystudio.io');
    expect(message).toMatch(/home/i);
    expect(message).not.toMatch(/missing companyId/i);
  });
});

describe('credential encryption', () => {
  const raw = 'PHPSESSID=abc123; ms_u_em=a%40b.com; companyId=480';

  it('round-trips', () => {
    expect(ms.decryptCookie(ms.encryptCookie(raw))).toBe(raw);
  });

  it('does not store the plaintext', () => {
    expect(ms.encryptCookie(raw)).not.toContain('PHPSESSID');
  });

  it('produces a different blob each time', () => {
    // Random IV per encrypt, so two connects with the same cookie do not
    // produce the same column value.
    expect(ms.encryptCookie(raw)).not.toBe(ms.encryptCookie(raw));
  });

  it('refuses a tampered blob rather than returning garbage', () => {
    const blob = ms.encryptCookie(raw);
    expect(() => ms.decryptCookie(`${blob.slice(0, -4)}AAAA`)).toThrow(ms.MyStudioError);
    expect(() => ms.decryptCookie('nonsense')).toThrow(ms.MyStudioError);
    expect(() => ms.decryptCookie('')).toThrow(ms.MyStudioError);
  });
});

describe('program mapping', () => {
  it('maps the titles that are unambiguous', () => {
    expect(ms.programForClass('CREATE')).toBe('CREATE');
    expect(ms.programForClass('JR')).toBe('JR');
    expect(ms.programForClass('create')).toBe('CREATE');
  });

  // The load-bearing one. "Academies" covers both Robotics Academy and AI
  // Academy upstream, and guessing either would file a session under a program
  // the ninja may not be enrolled in. NULL means the sensei picks at log time.
  it('refuses to guess for Academies', () => {
    expect(ms.programForClass('Academies')).toBeNull();
  });

  it('returns null for anything unrecognised', () => {
    expect(ms.programForClass('Birthday Party')).toBeNull();
    expect(ms.programForClass('')).toBeNull();
    expect(ms.programForClass(undefined)).toBeNull();
  });
});

describe('participant normalisation', () => {
  // Shaped like an upstream row, including the fields that must not survive.
  // Every value is invented: this repo is public, and a fixture copied from the
  // live roster would publish a child's name, PIN and date of birth.
  const upstream = {
    participant_id: 'PID-1',
    student_id: 'SID-1',
    participant_first_name: 'Testy',
    participant_last_name: 'McExample',
    participant_full_name: 'Testy, McExample',
    rank_name: 'ScratchJR',
    checkin_status: '',
    att_checkin_datetime: null,
    real_pin: 'PIN-0000',
    date_of_birth: '1999-01-01',
    student_email: 'nobody@example.invalid',
    student_mobile: '5550000000',
    buyer_first_name: 'Guardian',
    buyer_last_name: 'McExample',
    buyer_postal_code: '00000',
  };
  const cls = { class_appointment_title: 'JR', start_time: '04:00 PM' };

  it('drops every sensitive field', () => {
    const json = JSON.stringify(ms.normalizeParticipant(upstream, cls));
    for (const secret of [
      'PIN-0000',
      '1999-01-01',
      'nobody@example.invalid',
      '5550000000',
      'Guardian',
      '00000',
    ]) {
      expect(json).not.toContain(secret);
    }
  });

  it('builds a name that can match a DojoLink full_name', () => {
    // Upstream sends "First, Last" in participant_full_name, which would never
    // match, so the name is rebuilt from the parts.
    expect(ms.normalizeParticipant(upstream, cls).fullName).toBe('Testy McExample');
  });

  it('reads the upstream check-in state from either field', () => {
    expect(ms.normalizeParticipant(upstream, cls).checkedInUpstream).toBe(false);
    expect(
      ms.normalizeParticipant({ ...upstream, checkin_status: 'Y' }, cls).checkedInUpstream
    ).toBe(true);
    expect(
      ms.normalizeParticipant(
        { ...upstream, att_checkin_datetime: '2026-08-13 15:03:00' },
        cls
      ).checkedInUpstream
    ).toBe(true);
  });
});

describe('class time ordering', () => {
  it('sorts 12-hour times correctly across noon and midnight', () => {
    expect(ms.toMinutes('12:00 AM')).toBe(0);
    expect(ms.toMinutes('09:30 AM')).toBe(570);
    expect(ms.toMinutes('12:00 PM')).toBe(720);
    expect(ms.toMinutes('04:00 PM')).toBe(960);
    expect(ms.toMinutes('09:30 AM')).toBeLessThan(ms.toMinutes('04:00 PM'));
  });

  it('sends an unparseable time to the end rather than to the front', () => {
    expect(ms.toMinutes('Drop-in')).toBeGreaterThan(ms.toMinutes('11:59 PM'));
  });
});
