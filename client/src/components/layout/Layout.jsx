import Sidebar from './Sidebar';
import MobileNav from './MobileNav';
import ThemeToggle from '../ui/ThemeToggle';

export default function Layout({ children }) {
  return (
    <div className="min-h-[100dvh] bg-ninja-bg lg:flex">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 relative">
        {/* Mobile theme toggle — fixed top-right, hidden on desktop (sidebar has it) */}
        <div className="lg:hidden fixed top-3 right-4 z-30">
          <ThemeToggle />
        </div>
        <main className="max-w-7xl lg:max-w-none mx-auto w-full px-4 sm:px-6 lg:px-8 py-4 sm:py-8 pb-32 lg:pb-8">
          {children}
        </main>
      </div>
      <MobileNav />
    </div>
  );
}
