import React from 'react';
import Navbar from '../components/Navbar';
import Hero from '../components/Hero';

const LandingPage: React.FC = () => {
    return (
        <div className="min-h-screen bg-white dark:bg-gray-900 selection:bg-primary/30 transition-colors duration-300">
            <Navbar />
            <main>
                <Hero />
            </main>

            <footer className="py-12 border-t border-gray-200 dark:border-gray-800 text-center">
                <p className="text-gray-500 dark:text-gray-400">
                    © 2026 Antigravity. Built for performance and aesthetics.
                </p>
            </footer>
        </div>
    );
};

export default LandingPage;
