import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeftIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import ThemeCustomizer from '../components/theme/ThemeCustomizer';
import { useTheme } from '../context/ThemeContext';

export default function AppearancePage() {
  const navigate = useNavigate();
  const { experimental } = useTheme();

  // Lives under the Experimental toggle now — no direct access when it's off.
  useEffect(() => {
    if (!experimental) navigate('/account', { replace: true });
  }, [experimental, navigate]);

  if (!experimental) return null;

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
          <ChevronLeftIcon width={18} height={18} strokeWidth={2.2} />
          Account
        </motion.button>

        <ThemeCustomizer />
      </div>
    </Layout>
  );
}
