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
                    className="text-lg sm:text-xl font-bold tracking-tighter cursor-pointer flex items-center gap-2 group interactive-focus"
                    onClick={() => scrollToSection('home')}
                >
                    <Terminal size={24} className={`${theme.accent} transition-transform group-hover:rotate-12`} />
                    <span>Sreayan De</span>
                </button>

                {/* Desktop Menu */}
                <div className="hidden md:flex items-center gap-6 lg:gap-8 text-sm font-medium">
                    {navItems.map((item) => (
                        <button
                            key={item.id}
                            onClick={() => scrollToSection(item.id)}
                            className={`relative interactive-focus hover:text-[#FFFFFF] transition-colors ${activeSection === item.id ? theme.accent : 'text-[#888888]'} after:content-[''] after:absolute after:-bottom-1 after:left-0 after:w-0 after:h-0.5 after:bg-current after:transition-all hover:after:w-full`}
                        >
                            {item.label}
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
                <div id="mobile-nav-menu" className={`md:hidden absolute w-full px-6 py-4 border-b ${theme.bg} ${theme.border} shadow-2xl`}>
                    {navItems.map((item) => (
                        <button
                            key={item.id}
                            onClick={() => scrollToSection(item.id)}
                            className={`block w-full text-left py-3 font-medium hover:pl-2 transition-all hover:text-[#FFFFFF] ${activeSection === item.id ? 'text-[#FFFFFF]' : 'text-[#888888]'} interactive-focus`}
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
