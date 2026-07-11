import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import app from '../index.js';
import { csrf, resetDb, login, pool } from './helpers.js';

let world;
beforeEach(async () => { world = await resetDb(); });
afterAll(async () => { await pool.end(); });

describe('POST /api/daily — check-in', () => {
  it('checks a ninja in for an enrolled program (201)', async () => {
    const { agent } = await login(app, 'mgr_a');
    const res = await csrf(agent.post('/api/daily')).send({ student_id: world.studentA, program: 'CREATE' });
    expect(res.status).toBe(201);
  });

  it('rejects a program the ninja is not enrolled in (404)', async () => {
    const { agent } = await login(app, 'mgr_a');
    const res = await csrf(agent.post('/api/daily')).send({ student_id: world.studentA, program: 'Robotics Academy' });
    expect(res.status).toBe(404);
  });

  // Session 28: a same-day second check-in for the same program used to collapse into
  // the one existing row (only one loggable session). Reuse is now scoped to OVERDUE
  // rows only, so a second check-in today creates a fresh second session.
  it('creates a SECOND session row on a same-day repeat check-in', async () => {
    const { agent } = await login(app, 'mgr_a');
    await csrf(agent.post('/api/daily')).send({ student_id: world.studentA, program: 'CREATE' });
    await csrf(agent.post('/api/daily')).send({ student_id: world.studentA, program: 'CREATE' });

    const { rows } = await pool.query(
      `SELECT COUNT(*)::int AS n FROM daily_assignments
       WHERE student_id = $1 AND program = 'CREATE' AND session_date = CURRENT_DATE`,
      [world.studentA]
    );
    expect(rows[0].n).toBe(2);
  });
});
