import React from 'react';
import { Terminal, X, Menu } from 'lucide-react';

const navItems = [
    { label: 'Experience', id: 'experience' },
    { label: 'Projects', id: 'projects' },
    { label: 'Skills', id: 'skills' },
    { label: 'Activity', id: 'activity' },
    { label: 'Education', id: 'education' },
    { label: 'Contact', id: 'contact' },
];

const Navbar = ({
    isMenuOpen,
    setIsMenuOpen,
    activeSection,
    scrollToSection,
    theme
}) => {
    return (
        <nav className={`fixed w-full z-50 transition-all duration-500 ${theme.glass}`}>
            <div className="max-w-6xl mx-auto px-5 sm:px-6 py-3 md:py-4 flex justify-between items-center">
                <button
                    type="button"
                    className="text-lg sm:text-xl font-medium tracking-[-0.04em] cursor-pointer flex items-center gap-2 group interactive-focus font-body"
                    onClick={() => scrollToSection('home')}
                >
                    <Terminal size={22} className={theme.accent} />
                    <span>Sreayan De</span>
                </button>

                {/* Desktop Menu */}
                <div className="hidden md:flex items-center gap-6 lg:gap-8 text-sm uppercase tracking-[0.08em] font-label">
                    {navItems.map((item) => (
                        <button
                            key={item.id}
                            onClick={() => scrollToSection(item.id)}
                            className={`relative interactive-focus transition-colors ${activeSection === item.id ? theme.accent : theme.textMuted} ${theme.accentStrongHover}`}
                        >
                            {activeSection === item.id ? `[ ${item.label} ]` : item.label}
                        </button>
                    ))}
                </div>

                {/* Mobile Menu Toggle */}
                <div className="md:hidden flex items-center gap-4">
                    <button
                        onClick={() => setIsMenuOpen(!isMenuOpen)}
                        aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
                        aria-expanded={isMenuOpen}
                        aria-controls="mobile-nav-menu"
                        className="interactive-focus"
                    >
                        {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
                    </button>
                </div>
            </div>

            {/* Mobile Menu Dropdown */}
            {isMenuOpen && (
                <div id="mobile-nav-menu" className={`md:hidden absolute w-full px-6 py-4 border-b ${theme.bg} ${theme.border}`}>
                    {navItems.map((item) => (
                        <button
                            key={item.id}
                            onClick={() => scrollToSection(item.id)}
                            className={`block w-full text-left py-3 font-label uppercase tracking-[0.08em] transition-colors ${theme.accentStrongHover} ${activeSection === item.id ? theme.accentStrong : theme.textMuted} interactive-focus`}
                        >
                            {item.label}
                        </button>
                    ))}
                </div>
            )}
        </nav>
    );
};

export default Navbar;
