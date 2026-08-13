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
