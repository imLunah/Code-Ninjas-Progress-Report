import { formatDate } from '../../utils/dateUtils';
import BeltBadge from '../ui/BeltBadge';

export default function ProgressHistory({ logs = [] }) {
  if (logs.length === 0) {
    return (
      <div className="text-center py-8 text-ninja-muted font-ninja">
        No progress logs yet.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {logs.map((log) => (
        <div
          key={log.id}
          className="bg-ninja-bg border border-ninja-border rounded-xl p-4"
        >
          <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-ninja-blue font-ninja font-semibold text-sm">
                {formatDate(log.session_date)}
              </span>
              {log.sensei_name && (
                <span className="text-ninja-muted text-sm font-ninja">
                  by {log.sensei_name}
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {log.belt_level_at && (
                <BeltBadge belt={log.belt_level_at} sublevel={log.belt_sublevel_at} size="xs" />
              )}
              {log.project_at && (
                <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-md font-ninja font-semibold">
                  {log.project_at}
                </span>
              )}
              {log.status_at && (
                <span className={`text-xs px-2 py-0.5 rounded-md font-ninja font-semibold ${
                  log.status_at === 'Completed'
                    ? 'bg-green-100 text-green-700'
                    : log.status_at === 'Working On'
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-gray-100 text-gray-600'
                }`}>
                  {log.status_at}
                </span>
              )}
            </div>
          </div>
          <p className="text-ninja-navy font-ninja text-sm leading-relaxed">{log.notes}</p>
        </div>
      ))}
    </div>
  );
}
