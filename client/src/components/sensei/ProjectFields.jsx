import { PROJECTS, STATUSES, BELT_LEVEL_PROJECTS, getLevelProjects } from '../../utils/beltConfig';

const UPPER_BELTS = ['Purple', 'Brown', 'Red'];

function getSectionLabel(index, total) {
  if (index === total - 1) return 'Adventure';
  const num = Math.floor(index / 2) + 1;
  return index % 2 === 0 ? `Build ${num}` : `Solve ${num}`;
}

export default function ProjectFields({ project, setProject, status, setStatus, beltLevel, beltSublevel }) {
  const levelProjects = getLevelProjects(beltLevel, beltSublevel);
  const projectOptions = levelProjects ?? PROJECTS;
  const hasBeltProjects = beltLevel && !!BELT_LEVEL_PROJECTS[beltLevel];
  const needsSublevel = hasBeltProjects && (!beltSublevel || parseInt(beltSublevel) < 1);
  const showLabels = levelProjects && !UPPER_BELTS.includes(beltLevel);

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-ninja-muted text-sm font-ninja font-semibold mb-1 uppercase tracking-wide">
          Project
        </label>
        {needsSublevel ? (
          <p className="text-ninja-muted font-ninja text-sm italic">Select a sublevel above to see projects.</p>
        ) : (
          <select
            value={project}
            onChange={(e) => setProject(e.target.value)}
            className="w-full bg-white border border-ninja-border text-ninja-navy rounded-lg px-4 py-2 font-ninja focus:outline-none focus:border-ninja-blue transition-colors"
          >
            <option value="">Select project...</option>
            {projectOptions.map((p, i) => {
              const label = showLabels
                ? `${getSectionLabel(i, projectOptions.length)}: ${p}`
                : p;
              return <option key={p} value={p}>{label}</option>;
            })}
          </select>
        )}
      </div>

      <div>
        <label className="block text-ninja-muted text-sm font-ninja font-semibold mb-1 uppercase tracking-wide">
          Status
        </label>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="w-full bg-white border border-ninja-border text-ninja-navy rounded-lg px-4 py-2 font-ninja focus:outline-none focus:border-ninja-blue transition-colors"
        >
          <option value="">Select status...</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>
    </div>
  );
}
