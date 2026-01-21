import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import Experience from './components/Experience';
import Projects from './components/Projects';
import Skills from './components/Skills';
import Education from './components/Education';
import Contact from './components/Contact';
import GithubHeatmap from './components/GithubHeatmap';

const App = () => {
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

  const scrollToSection = (id) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setIsMenuOpen(false);
    }
  };

  // Theme classes - Vercel Style (Dark Minimalist)
  const theme = {
    bg: 'bg-[#000000]',
    text: 'text-[#EDEDED]',
    textMuted: 'text-[#888888]',
    accent: 'text-[#FFFFFF]',
    accentSecondary: 'text-[#CCCCCC]',
    border: 'border-[#333333]',
    glass: 'bg-[#000000]/80 backdrop-blur-xl border-b border-[#333333]',
    cardGlass: 'bg-[#111111] border border-[#333333] hover:border-[#EDEDED]',
    button: 'bg-[#EDEDED] text-[#000000] transition-all duration-300 hover:bg-white/10 hover:backdrop-blur-md hover:border hover:border-white/20 hover:text-white hover:shadow-[0_8px_32px_0_rgba(255,255,255,0.1)]',
    techBadge: 'border-[#333333] bg-[#111111] text-[#EDEDED]',
  };

  return (
    <div className={`min-h-screen font-sans selection:bg-[#333333] selection:text-[#EDEDED] ${theme.bg} ${theme.text}`}>

      <Navbar
        isMenuOpen={isMenuOpen}
        setIsMenuOpen={setIsMenuOpen}
        activeSection={activeSection}
        scrollToSection={scrollToSection}
        theme={theme}
      />

      <Hero theme={theme} scrollToSection={scrollToSection} />

      <Experience theme={theme} />

      <Projects theme={theme} />

      <Skills theme={theme} />

      <GithubHeatmap theme={theme} />

      <Education theme={theme} />

      <Contact theme={theme} />

    </div>
  );
};

export default App;