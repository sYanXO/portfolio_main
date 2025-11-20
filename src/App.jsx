import React, { useState, useEffect } from 'react';
import PeepingSnorlax from './components/PeepingSnorlax';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import Experience from './components/Experience';
import Projects from './components/Projects';
import Skills from './components/Skills';
import Education from './components/Education';
import Contact from './components/Contact';

const App = () => {
  const [darkMode, setDarkMode] = useState(true);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('home');

  // Handle scroll to highlight active section
  useEffect(() => {
    const handleScroll = () => {
      const sections = ['home', 'about', 'experience', 'projects', 'skills', 'education', 'contact'];
      const scrollPosition = window.scrollY + 100;

      for (const section of sections) {
        const element = document.getElementById(section);
        if (element && element.offsetTop <= scrollPosition && (element.offsetTop + element.offsetHeight) > scrollPosition) {
          setActiveSection(section);
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const toggleTheme = () => {
    setDarkMode(!darkMode);
  };

  const scrollToSection = (id) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setIsMenuOpen(false);
    }
  };

  // Theme classes - Catppuccin Mocha (Dark) & Latte (Light)
  const theme = {
    bg: darkMode ? 'bg-[#1e1e2e]' : 'bg-[#eff1f5]',
    text: darkMode ? 'text-[#cdd6f4]' : 'text-[#4c4f69]',
    textMuted: darkMode ? 'text-[#a6adc8]' : 'text-[#6c6f85]',
    accent: darkMode ? 'text-[#fab387]' : 'text-[#fe640b]', // Peach for focus
    accentSecondary: darkMode ? 'text-[#89b4fa]' : 'text-[#1e66f5]', // Blue for secondary
    border: darkMode ? 'border-[#45475a]' : 'border-[#bcc0cc]',
    glass: darkMode
      ? 'bg-[#1e1e2e]/80 backdrop-blur-xl border-b border-[#cdd6f4]/10'
      : 'bg-[#eff1f5]/80 backdrop-blur-xl border-b border-[#4c4f69]/10',
    cardGlass: darkMode
      ? 'bg-[#313244]/60 backdrop-blur-md border border-[#cdd6f4]/5 hover:border-[#fab387]/50'
      : 'bg-[#e6e9ef]/60 backdrop-blur-md border border-[#4c4f69]/5 hover:border-[#fe640b]/50',
    button: darkMode
      ? 'bg-[#fab387] text-[#1e1e2e] hover:bg-[#f9e2af] shadow-[0_0_15px_rgba(250,179,135,0.3)]'
      : 'bg-[#fe640b] text-[#eff1f5] hover:bg-[#df8e1d] shadow-[0_0_15px_rgba(254,100,11,0.3)]',
    techBadge: darkMode
      ? 'border-[#45475a] bg-[#45475a]/30 text-[#cdd6f4]'
      : 'border-[#bcc0cc] bg-[#bcc0cc]/30 text-[#4c4f69]',
  };

  return (
    <div className={`min-h-screen transition-colors duration-500 font-sans selection:bg-[#fab387] selection:text-[#1e1e2e] ${theme.bg} ${theme.text}`}>

      <PeepingSnorlax darkMode={darkMode} />

      <Navbar
        darkMode={darkMode}
        toggleTheme={toggleTheme}
        isMenuOpen={isMenuOpen}
        setIsMenuOpen={setIsMenuOpen}
        activeSection={activeSection}
        scrollToSection={scrollToSection}
        theme={theme}
      />

      <Hero theme={theme} scrollToSection={scrollToSection} darkMode={darkMode} />

      <Experience theme={theme} darkMode={darkMode} />

      <Projects theme={theme} darkMode={darkMode} />

      <Skills theme={theme} darkMode={darkMode} />

      <Education theme={theme} darkMode={darkMode} />

      <Contact theme={theme} />

    </div>
  );
};

export default App;