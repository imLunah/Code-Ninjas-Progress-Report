import Sidebar from './Sidebar';

export default function Layout({ children }) {
  return (
    <div className="min-h-[100dvh] bg-ninja-bg lg:flex">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <main className="max-w-7xl lg:max-w-none mx-auto w-full px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
