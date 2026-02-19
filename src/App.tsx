import React from 'react';
import { ThemeProvider } from './contexts/ThemeContext';
import Navbar from './components/Navbar';
import Hero from './components/Hero';

const App: React.FC = () => {
  return (
    <ThemeProvider>
      <div className="min-h-screen bg-white dark:bg-gray-900 selection:bg-primary/30 transition-colors duration-300">
        <Navbar />
        <main>
          <Hero />
        </main>

        {/* Footer simple for completeness */}
        <footer className="py-12 border-t border-gray-200 dark:border-gray-800 text-center">
          <p className="text-gray-500 dark:text-gray-400">
            © 2026 Antigravity. Built for performance and aesthetics.
          </p>
        </footer>
      </div>
    </ThemeProvider>
  );
};

export default App;
