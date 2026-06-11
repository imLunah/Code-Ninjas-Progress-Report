import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import ThemeCustomizer from '../components/theme/ThemeCustomizer';

export default function AppearancePage() {
  const navigate = useNavigate();

  return (
    <Layout>
      <div className="max-w-md mx-auto">
        <motion.button
          type="button"
          onClick={() => navigate('/account')}
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-1.5 mb-4 text-sm font-ninja font-semibold text-ninja-muted hover:text-ninja-navy transition-colors"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
          Account
        </motion.button>

        <ThemeCustomizer />
      </div>
    </Layout>
  );
}
