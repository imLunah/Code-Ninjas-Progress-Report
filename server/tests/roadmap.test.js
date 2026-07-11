import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import app from '../index.js';
import { csrf, resetDb, login, pool } from './helpers.js';

let world;
beforeEach(async () => { world = await resetDb(); });
afterAll(async () => { await pool.end(); });

async function rosterStudent(agent, id) {
  const res = await agent.get('/api/students?sort=last_active&limit=500');
  return res.body.students.find((s) => s.id === id);
}

// A roadmap mass-check marks curriculum complete but is NOT a real session — it must not
// count toward activity/last-active. Real sessions only come from an actual progress log.
describe('roadmap mass-check is not a session', () => {
  it('a roadmap completion does not bump roster last_activity', async () => {
    const { agent } = await login(app, 'sensei_a');
    const r = await csrf(agent.post(`/api/students/${world.studentA}/roadmap/complete`))
      .send({ program: 'CREATE', entries: [{ module_name: 'M1', lesson_name: 'L1' }] });
    expect(r.status).toBe(200);

    const s = await rosterStudent(agent, world.studentA);
    expect(s.last_activity).toBeNull(); // roadmap-only activity => still "never active"
  });

  it('a real progress log DOES set last_activity', async () => {
    const { agent } = await login(app, 'sensei_a');
    await csrf(agent.post('/api/progress'))
      .send({ student_id: world.studentA, program: 'CREATE', notes: 'real session' });

    const s = await rosterStudent(agent, world.studentA);
    expect(s.last_activity).not.toBeNull();
  });

  it('roadmap rows are distinguishable from real logs (from_roadmap marker)', async () => {
    const { agent } = await login(app, 'sensei_a');
    await csrf(agent.post(`/api/students/${world.studentA}/roadmap/complete`))
      .send({ program: 'CREATE', entries: [{ module_name: 'M1', lesson_name: 'L1' }] });
    await csrf(agent.post('/api/progress'))
      .send({ student_id: world.studentA, program: 'CREATE', notes: 'real session' });

    const { rows } = await pool.query(
      "SELECT (notes = 'Marked complete from roadmap') AS from_roadmap FROM progress_logs WHERE student_id = $1",
      [world.studentA]
    );
    expect(rows.filter((r) => r.from_roadmap).length).toBe(1);  // exactly one roadmap mark
    expect(rows.filter((r) => !r.from_roadmap).length).toBe(1); // exactly one real session
  });
});
