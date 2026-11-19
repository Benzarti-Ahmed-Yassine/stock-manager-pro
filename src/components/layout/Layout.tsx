import Navbar from "./Navbar";

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      {/* Navigation Bar au dessus (Horizontal Top Nav) */}
      <Navbar />

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto w-full fade-in">
          {children}
        </div>
      </main>
    </div>
  );
}
