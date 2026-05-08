import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../../components/layout/Layout';
import Button from '../../components/ui/Button';
import { api } from '../../api/client';
import { BELTS, PROJECTS, STATUSES, PROGRAMS, getMaxLevel } from '../../utils/beltConfig';

export default function AddStudentPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    full_name: '',
    birthday: '',
    program: '',
    belt_level: '',
    belt_sublevel: '',
    current_project: '',
    project_status: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isCreate = form.program === 'CREATE';
  const maxLevel = getMaxLevel(form.belt_level);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => {
      const next = { ...prev, [name]: value };
      // Reset CREATE-specific fields when program changes
      if (name === 'program' && value !== 'CREATE') {
        next.belt_level = '';
        next.belt_sublevel = '';
        next.current_project = '';
        next.project_status = '';
      }
      // Reset sublevel when belt changes
      if (name === 'belt_level') {
        next.belt_sublevel = '';
      }
      return next;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const payload = {
        full_name: form.full_name,
        birthday: form.birthday || null,
        program: form.program,
        belt_level: isCreate && form.belt_level ? form.belt_level : null,
        belt_sublevel: isCreate && form.belt_sublevel ? parseInt(form.belt_sublevel) : null,
        current_project: isCreate && form.current_project ? form.current_project : null,
        project_status: isCreate && form.project_status ? form.project_status : null,
      };

      const student = await api.post('/students', payload);
      navigate(`/manager/students/${student.id}`);
    } catch (err) {
      setError(err.message || 'Failed to create student');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-xl mx-auto">
        <div className="mb-6">
          <button
            onClick={() => navigate('/manager/students')}
            className="text-ninja-muted hover:text-ninja-blue font-ninja text-sm mb-4 flex items-center gap-1 transition-colors"
          >
            ← Back to Roster
          </button>
          <h1 className="text-2xl sm:text-4xl font-bold font-ninja text-ninja-navy">
            New <span className="text-ninja-blue">Ninja</span>
          </h1>
        </div>

        <div className="bg-white border border-ninja-border rounded-xl p-6 shadow-sm">
          {error && (
            <div className="bg-red-50 border border-red-200 text-ninja-red rounded-lg p-3 mb-4 text-sm font-ninja">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-ninja-muted text-sm font-ninja font-semibold mb-1 uppercase tracking-wide">
                Full Name *
              </label>
              <input
                type="text"
                name="full_name"
                value={form.full_name}
                onChange={handleChange}
                required
                placeholder="Student's full name"
                className="w-full bg-white border border-ninja-border text-ninja-navy rounded-lg px-4 py-2 font-ninja focus:outline-none focus:border-ninja-blue transition-colors"
              />
            </div>

            <div>
              <label className="block text-ninja-muted text-sm font-ninja font-semibold mb-1 uppercase tracking-wide">
                Birthday
              </label>
              <input
                type="date"
                name="birthday"
                value={form.birthday}
                onChange={handleChange}
                className="w-full bg-white border border-ninja-border text-ninja-navy rounded-lg px-4 py-2 font-ninja focus:outline-none focus:border-ninja-blue transition-colors"
              />
            </div>

            <div>
              <label className="block text-ninja-muted text-sm font-ninja font-semibold mb-1 uppercase tracking-wide">
                Program *
              </label>
              <select
                name="program"
                value={form.program}
                onChange={handleChange}
                required
                className="w-full bg-white border border-ninja-border text-ninja-navy rounded-lg px-4 py-2 font-ninja focus:outline-none focus:border-ninja-blue transition-colors"
              >
                <option value="">Select a program...</option>
                {PROGRAMS.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>

            {isCreate && (
              <>
                <div className="border-t border-ninja-border pt-4">
                  <p className="text-ninja-muted font-ninja text-sm mb-3 italic">CREATE program details (optional):</p>
                </div>

                <div>
                  <label className="block text-ninja-muted text-sm font-ninja font-semibold mb-1 uppercase tracking-wide">
                    Belt Level
                  </label>
                  <select
                    name="belt_level"
                    value={form.belt_level}
                    onChange={handleChange}
                    className="w-full bg-white border border-ninja-border text-ninja-navy rounded-lg px-4 py-2 font-ninja focus:outline-none focus:border-ninja-blue transition-colors"
                  >
                    <option value="">Select belt...</option>
                    {BELTS.map((b) => (
                      <option key={b.name} value={b.name}>{b.name}</option>
                    ))}
                  </select>
                </div>

                {maxLevel && form.belt_level && (
                  <div>
                    <label className="block text-ninja-muted text-sm font-ninja font-semibold mb-1 uppercase tracking-wide">
                      Belt Sublevel (1–{maxLevel})
                    </label>
                    <input
                      type="number"
                      name="belt_sublevel"
                      value={form.belt_sublevel}
                      onChange={handleChange}
                      min={1}
                      max={maxLevel}
                      placeholder={`1 to ${maxLevel}`}
                      className="w-full bg-white border border-ninja-border text-ninja-navy rounded-lg px-4 py-2 font-ninja focus:outline-none focus:border-ninja-blue transition-colors"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-ninja-muted text-sm font-ninja font-semibold mb-1 uppercase tracking-wide">
                    Current Project
                  </label>
                  <select
                    name="current_project"
                    value={form.current_project}
                    onChange={handleChange}
                    className="w-full bg-white border border-ninja-border text-ninja-navy rounded-lg px-4 py-2 font-ninja focus:outline-none focus:border-ninja-blue transition-colors"
                  >
                    <option value="">Select project...</option>
                    {PROJECTS.map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-ninja-muted text-sm font-ninja font-semibold mb-1 uppercase tracking-wide">
                    Project Status
                  </label>
                  <select
                    name="project_status"
                    value={form.project_status}
                    onChange={handleChange}
                    className="w-full bg-white border border-ninja-border text-ninja-navy rounded-lg px-4 py-2 font-ninja focus:outline-none focus:border-ninja-blue transition-colors"
                  >
                    <option value="">Select status...</option>
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </>
            )}

            <div className="flex gap-3 pt-4">
              <Button type="submit" disabled={loading} className="flex-1">
                {loading ? 'Creating...' : 'Create Student'}
              </Button>
              <Button
                variant="secondary"
                type="button"
                onClick={() => navigate('/manager/students')}
              >
                Cancel
              </Button>
            </div>
          </form>
        </div>
      </div>
    </Layout>
  );
}
