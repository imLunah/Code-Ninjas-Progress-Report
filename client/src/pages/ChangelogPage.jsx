import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Layout from '../components/layout/Layout';
import ReleaseContent from '../components/shared/ReleaseContent';
import { api } from '../api/client';
import { Skeleton } from '../components/ui/Skeleton';

const fadeUp = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] } },
};

export default function ChangelogPage() {
  const [releases, setReleases] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/releases')
      .then((rows) => setReleases(Array.isArray(rows) ? rows : []))
      .catch(() => setReleases([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <Layout>
      <div className="max-w-2xl mx-auto">
        <motion.div variants={fadeUp} initial="hidden" animate="show" className="mb-6">
          <h1 className="text-2xl font-black font-ninja text-ninja-navy">What's New</h1>
          <p className="text-ninja-muted font-ninja text-sm mt-1">Recent updates and improvements to DojoLink.</p>
        </motion.div>

        {loading ? (
          <div role="status" aria-busy="true" aria-label="Loading releases" className="space-y-2"><Skeleton className="h-4 w-1/3" /><Skeleton className="h-3 w-full" /><Skeleton className="h-3 w-4/5" /></div>
        ) : releases.length === 0 ? (
          <div className="bg-ninja-border/10 border border-ninja-border rounded-2xl p-8 text-center">
            <p className="text-ninja-muted font-ninja text-sm">No updates yet. Check back soon.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {releases.map((r, i) => (
              <motion.div
                key={r.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: Math.min(i, 8) * 0.04, ease: [0.22, 1, 0.36, 1] }}
                className="bg-ninja-border/10 border border-ninja-border rounded-2xl p-5"
              >
                <ReleaseContent release={r} />
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
