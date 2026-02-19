import React, { useState } from 'react';
import { Menu, X, Sun, Moon } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

const navLinks = [
    { name: 'Beranda', href: '#' },
    { name: 'Fitur', href: '#' },
    { name: 'Tentang', href: '#' },
    { name: 'Kontak', href: '#' },
];

const Navbar: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const { theme, toggleTheme } = useTheme();

    return (
        <nav
            className="fixed w-full z-50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 transition-colors duration-300"
            aria-label="Navigasi utama"
        >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-16 items-center">
                    <div className="flex-shrink-0 flex items-center">
                        <span className="text-lg xs:text-xl md:text-2xl font-bold text-primary italic">
                            Komisi CS PJB System
                        </span>
                    </div>

                    {/* Desktop Nav */}
                    <div className="hidden md:flex items-center space-x-8">
                        {navLinks.map((link) => (
                            <a
                                key={link.name}
                                href={link.href}
                                className="text-gray-600 dark:text-gray-300 hover:text-primary dark:hover:text-primary font-medium transition-colors"
                            >
                                {link.name}
                            </a>
                        ))}
                        <button
                            onClick={toggleTheme}
                            className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:ring-2 hover:ring-primary transition-all"
                            aria-label={theme === 'dark' ? 'Beralih ke mode terang' : 'Beralih ke mode gelap'}
                        >
                            {theme === 'dark' ? (
                                <Sun size={20} className="animate-spin-once" />
                            ) : (
                                <Moon size={20} className="animate-spin-once" />
                            )}
                        </button>
                        <a
                            href="/login"
                            className="bg-primary hover:bg-primary-dark text-white px-6 py-2 rounded-full font-semibold transition-all active:scale-95 shadow-lg shadow-primary/25"
                        >
                            Login Member
                        </a>
                    </div>

                    {/* Mobile Right Controls */}
                    <div className="md:hidden flex items-center space-x-2">
                        <button
                            onClick={toggleTheme}
                            className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 transition-colors"
                            aria-label={theme === 'dark' ? 'Beralih ke mode terang' : 'Beralih ke mode gelap'}
                        >
                            {theme === 'dark' ? (
                                <Sun size={20} className="animate-spin-once" />
                            ) : (
                                <Moon size={20} className="animate-spin-once" />
                            )}
                        </button>
                        <button
                            onClick={() => setIsOpen(!isOpen)}
                            className="p-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                            aria-label={isOpen ? 'Tutup menu' : 'Buka menu'}
                            aria-expanded={isOpen}
                        >
                            {isOpen ? <X size={24} /> : <Menu size={24} />}
                        </button>
                    </div>
                </div>
            </div>

            {/* Mobile Menu */}
            {isOpen && (
                <div className="md:hidden bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 animate-slide-down">
                    <div className="px-4 pt-2 pb-4 space-y-1">
                        {navLinks.map((link) => (
                            <a
                                key={link.name}
                                href={link.href}
                                className="block px-3 py-2.5 rounded-lg text-base font-medium text-gray-700 dark:text-gray-200 hover:bg-primary/10 hover:text-primary transition-colors"
                                onClick={() => setIsOpen(false)}
                            >
                                {link.name}
                            </a>
                        ))}
                        <div className="pt-4 pb-2 px-3">
                            <a
                                href="/login"
                                className="block w-full text-center bg-primary text-white px-6 py-3 rounded-full font-semibold shadow-lg shadow-primary/25 active:scale-95 transition-transform"
                            >
                                Login Member
                            </a>
                        </div>
                    </div>
                </div>
            )}
        </nav>
    );
};

export default Navbar;
