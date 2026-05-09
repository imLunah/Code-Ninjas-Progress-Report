import { useNavigate } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import { CLUBS, CLUB_NAME_TO_SLUG, CLUB_COLORS, CLUB_DESCRIPTIONS } from '../utils/clubUtils';

export default function ClubsPage() {
  const navigate = useNavigate();

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl sm:text-4xl font-bold font-ninja text-ninja-navy tracking-wide">
            Clubs
          </h1>
          <p className="text-ninja-muted font-ninja mt-1">Weekly optional clubs at your center.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {CLUBS.map((clubName) => {
            const c = CLUB_COLORS[clubName];
            const slug = CLUB_NAME_TO_SLUG[clubName];
            return (
              <button
                key={clubName}
                onClick={() => navigate(`/clubs/${slug}`)}
                className="bg-white border border-ninja-border rounded-2xl p-6 shadow-sm text-left hover:border-ninja-blue hover:shadow-md transition-all group"
              >
                <div className="mb-4">
                  <span className={`inline-block text-sm font-ninja font-bold px-3 py-1 rounded-full border ${c.bg} ${c.text} ${c.border}`}>
                    {clubName}
                  </span>
                </div>
                <p className="text-ninja-muted font-ninja text-sm leading-relaxed">{CLUB_DESCRIPTIONS[clubName]}</p>
                <p className="text-ninja-blue font-ninja font-semibold text-sm mt-4 group-hover:underline">
                  View Club →
                </p>
              </button>
            );
          })}
        </div>
      </div>
    </Layout>
  );
}
