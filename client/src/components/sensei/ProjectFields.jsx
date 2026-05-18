import { useState, useEffect } from 'react';
import { PROJECTS, STATUSES, BELT_LEVEL_PROJECTS, getLevelProjects } from '../../utils/beltConfig';

const UPPER_BELTS = ['Purple', 'Brown', 'Red'];

function getSectionLabel(index, total) {
  if (index === total - 1) return 'Adventure';
  const num = Math.floor(index / 2) + 1;
  return index % 2 === 0 ? `Build ${num}` : `Solve ${num}`;
}

export default function ProjectFields({ project, setProject, status, setStatus, beltLevel, beltSublevel }) {
  const [isCustomProject, setIsCustomProject] = useState(false);

  const levelProjects = getLevelProjects(beltLevel, beltSublevel);
  const projectOptions = levelProjects ?? PROJECTS;
  const hasBeltProjects = beltLevel && !!BELT_LEVEL_PROJECTS[beltLevel];
  const needsSublevel = hasBeltProjects && (!beltSublevel || parseInt(beltSublevel) < 1);
  const showLabels = levelProjects && !UPPER_BELTS.includes(beltLevel);

  // Exit custom mode when project is cleared externally (e.g., belt changed)
  useEffect(() => {
    if (!project) setIsCustomProject(false);
  }, [project]);

  const handleProjectChange = (e) => {
    if (e.target.value === '__custom__') {
      setIsCustomProject(true);
      setProject('');
    } else {
      setProject(e.target.value);
    }
  };

  const exitCustomProject = () => {
    setIsCustomProject(false);
    setProject('');
  };

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-ninja-muted text-sm font-ninja font-semibold mb-1 uppercase tracking-wide">
          Project
        </label>
        {needsSublevel ? (
          <p className="text-ninja-muted font-ninja text-sm italic">Select a sublevel above to see projects.</p>
        ) : isCustomProject ? (
          <div className="space-y-1.5">
            <input
              type="text"
              value={project}
              onChange={(e) => setProject(e.target.value)}
              placeholder="Project name..."
              className="w-full bg-white border border-ninja-blue text-ninja-navy rounded-lg px-4 py-2 font-ninja focus:outline-none focus:border-ninja-blue transition-colors"
              autoFocus
            />
            <button
              type="button"
              onClick={exitCustomProject}
              className="text-ninja-muted hover:text-ninja-navy text-xs font-ninja underline"
            >
              ← Use standard project
            </button>
          </div>
        ) : (
          <select
            value={project}
            onChange={handleProjectChange}
            className="w-full bg-white border border-ninja-border text-ninja-navy rounded-lg px-4 py-2 font-ninja focus:outline-none focus:border-ninja-blue transition-colors"
          >
            <option value="">Select project...</option>
            {projectOptions.map((p, i) => {
              const label = showLabels
                ? `${getSectionLabel(i, projectOptions.length)}: ${p}`
                : p;
              return <option key={p} value={p}>{label}</option>;
            })}
            <option value="__custom__">Custom...</option>
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
