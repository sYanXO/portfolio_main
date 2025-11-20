import React from 'react';
import { Terminal, Sun, Moon, X, Menu } from 'lucide-react';

const Navbar = ({
    darkMode,
    toggleTheme,
    isMenuOpen,
    setIsMenuOpen,
    activeSection,
    scrollToSection,
    theme
}) => {
    return (
        <nav className={`fixed w-full z-50 transition-all duration-500 ${theme.glass}`}>
            <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
                <div className="text-xl font-bold tracking-tighter cursor-pointer flex items-center gap-2 group" onClick={() => scrollToSection('home')}>
                    <Terminal size={24} className={`${theme.accent} transition-transform group-hover:rotate-12`} />
                    <span>Sreayan De</span>
                </div>

                {/* Desktop Menu */}
                <div className="hidden md:flex items-center gap-8 text-sm font-medium">
                    {['Experience', 'Projects', 'Skills', 'Education', 'Contact'].map((item) => (
                        <button
                            key={item}
                            onClick={() => scrollToSection(item.toLowerCase())}
                            className={`relative hover:text-[#fab387] dark:hover:text-[#fe640b] transition-colors ${activeSection === item.toLowerCase() ? theme.accent : ''} after:content-[''] after:absolute after:-bottom-1 after:left-0 after:w-0 after:h-0.5 after:bg-current after:transition-all hover:after:w-full`}
                        >
                            {item}
                        </button>
                    ))}
                    <button onClick={toggleTheme} className={`p-2 rounded-full transition-all duration-300 hover:rotate-12 ${darkMode ? 'hover:bg-[#cdd6f4]/10' : 'hover:bg-[#4c4f69]/10'}`}>
                        {darkMode ? <Sun size={20} className="text-[#f9e2af]" /> : <Moon size={20} className="text-[#8839ef]" />}
                    </button>
                </div>

                {/* Mobile Menu Toggle */}
                <div className="md:hidden flex items-center gap-4">
                    <button onClick={toggleTheme} className="p-2">
                        {darkMode ? <Sun size={20} /> : <Moon size={20} />}
                    </button>
                    <button onClick={() => setIsMenuOpen(!isMenuOpen)}>
                        {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
                    </button>
                </div>
            </div>

            {/* Mobile Menu Dropdown */}
            {isMenuOpen && (
                <div className={`md:hidden absolute w-full px-6 py-4 border-b ${theme.bg} ${theme.border} shadow-2xl`}>
                    {['Experience', 'Projects', 'Skills', 'Education', 'Contact'].map((item) => (
                        <button
                            key={item}
                            onClick={() => scrollToSection(item.toLowerCase())}
                            className="block w-full text-left py-3 font-medium hover:pl-2 transition-all"
                        >
                            {item}
                        </button>
                    ))}
                </div>
            )}
        </nav>
    );
};

export default Navbar;
