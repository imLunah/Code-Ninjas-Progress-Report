import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import app from '../index.js';
import { csrf, resetDb, login, pool } from './helpers.js';

let world;
beforeEach(async () => { world = await resetDb(); });
afterAll(async () => { await pool.end(); });

// Body that satisfies the required fields; override per test.
const logBody = (over = {}) => ({ student_id: world.studentA, program: 'CREATE', notes: 'worked on it', ...over });

describe('POST /api/progress — write validation (security regressions)', () => {
  it('logs progress for an enrolled program (happy path, 201)', async () => {
    const { agent } = await login(app, 'sensei_a');
    const res = await csrf(agent.post('/api/progress')).send(logBody());
    expect(res.status).toBe(201);
    expect(res.body.id).toBeDefined();
  });

  // Session 26: an authenticated user could write an arbitrary `program` string
  // (ZAP injection) that polluted the TodayBoard filter. The enrollment guard
  // must reject any program the student is not enrolled in.
  it('rejects a program the student is NOT enrolled in (400)', async () => {
    const { agent } = await login(app, 'sensei_a');
    const res = await csrf(agent.post('/api/progress')).send(logBody({ program: 'Robotics Academy' }));
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/not enrolled/i);
  });

  it('rejects an outright junk program string (400)', async () => {
    const { agent } = await login(app, 'sensei_a');
    const res = await csrf(agent.post('/api/progress')).send(logBody({ program: "'; DROP TABLE students;--" }));
    expect(res.status).toBe(400);
  });

  // Session 27: a sensei replayed the request with belt_sublevel_at: 1000 and set a
  // student's belt to 1000 (integer column, no range guard). validateSublevel now
  // bounds it against the real per-belt max (White = 4).
  it('rejects an out-of-range belt_sublevel_at like 1000 (400)', async () => {
    const { agent } = await login(app, 'sensei_a');
    const res = await csrf(agent.post('/api/progress'))
      .send(logBody({ belt_level_at: 'White', belt_sublevel_at: 1000, update_student: true }));
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/belt level/i);
  });

  it('accepts belt_sublevel_at at the real max for the belt (White 4, 201)', async () => {
    const { agent } = await login(app, 'sensei_a');
    const res = await csrf(agent.post('/api/progress'))
      .send(logBody({ belt_level_at: 'White', belt_sublevel_at: 4 }));
    expect(res.status).toBe(201);
  });

  it('rejects a non-real belt label (400)', async () => {
    const { agent } = await login(app, 'sensei_a');
    const res = await csrf(agent.post('/api/progress')).send(logBody({ belt_level_at: 'Rainbow' }));
    expect(res.status).toBe(400);
  });
});

describe('DELETE /api/progress/:id — ownership', () => {
  async function makeLog() {
    const { agent } = await login(app, 'sensei_a');
    const res = await csrf(agent.post('/api/progress')).send(logBody());
    return res.body.id;
  }

  it('lets a sensei delete their own log (200)', async () => {
    const id = await makeLog();
    const { agent } = await login(app, 'sensei_a');
    const res = await csrf(agent.delete(`/api/progress/${id}`)).send();
    expect(res.status).toBe(200);
  });

  it('forbids a different sensei from deleting another sensei\'s log (404)', async () => {
    const id = await makeLog();
    const { agent } = await login(app, 'sensei_a2'); // same center, different sensei
    const res = await csrf(agent.delete(`/api/progress/${id}`)).send();
    expect(res.status).toBe(404);
    // and the log still exists
    const { rows } = await pool.query('SELECT 1 FROM progress_logs WHERE id = $1', [id]);
    expect(rows.length).toBe(1);
  });

  it('lets a manager delete any log in their center (200)', async () => {
    const id = await makeLog();
    const { agent } = await login(app, 'mgr_a');
    const res = await csrf(agent.delete(`/api/progress/${id}`)).send();
    expect(res.status).toBe(200);
  });
});
