import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import Experience from './components/Experience';
import Projects from './components/Projects';
import Skills from './components/Skills';
import Education from './components/Education';
import Contact from './components/Contact';
import GithubHeatmap from './components/GithubHeatmap';

const theme = {
  bg: 'bg-[#000000]',
  text: 'text-[#E8E8E8]',
  textMuted: 'text-[#999999]',
  accent: 'text-[#FFFFFF]',
  accentSecondary: 'text-[#CCCCCC]',
  accentStrong: 'text-[#FFFFFF]',
  accentStrongHover: 'hover:text-[#FFFFFF]',
  border: 'border-[#333333]',
  borderSoft: 'border-[#222222]',
  glass: 'bg-[#000000]/95 border-b border-[#222222]',
  sectionBlend: 'bg-[radial-gradient(circle,_rgba(51,51,51,0.16)_1px,transparent_1px)] [background-size:16px_16px]',
  topGlow: 'bg-[linear-gradient(180deg,rgba(17,17,17,0.92),rgba(0,0,0,0))]',
  cardGlass: 'bg-[#111111] border border-[#222222] hover:border-[#333333] hover:bg-[#151515]',
  button: 'bg-[#FFFFFF] text-[#000000] transition-colors duration-300 hover:bg-[#E8E8E8]',
  secondaryButton: 'bg-transparent text-[#E8E8E8] border-[#333333] hover:border-[#FFFFFF] hover:text-[#FFFFFF]',
  techBadge: 'border-[#333333] bg-transparent text-[#E8E8E8]',
  chip: 'bg-transparent text-[#999999] border-[#333333]',
  iconGlow: 'bg-[#111111]',
  headingGradient: '',
  selection: 'selection:bg-[#333333] selection:text-[#FFFFFF]',
  heroGlowPrimary: '',
  heroGlowSecondary: '',
  heroEyebrow: 'bg-[#111111]',
  scrollCue: 'text-[#999999]',
};

const App = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('home');

  useEffect(() => {
    const handleScroll = () => {
      const sections = ['home', 'experience', 'projects', 'skills', 'activity', 'education', 'contact'];
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

  return (
    <div className={`min-h-screen font-body ${theme.selection} ${theme.bg} ${theme.text}`}>
      <div className={`fixed inset-0 -z-20 ${theme.bg}`}></div>
      <div className={`fixed inset-0 -z-10 opacity-90 ${theme.sectionBlend}`}></div>
      <div className={`fixed inset-x-0 top-0 -z-10 h-[36rem] ${theme.topGlow}`}></div>

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
