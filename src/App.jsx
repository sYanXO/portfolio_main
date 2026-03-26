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
  bg: 'bg-[#0B1215]',
  text: 'text-[#E6F0F2]',
  textMuted: 'text-[#8AA0B2]',
  accent: 'text-[#CFE7F3]',
  accentSecondary: 'text-[#A9C3D1]',
  accentStrong: 'text-[#F2FAFF]',
  accentStrongHover: 'hover:text-[#F2FAFF]',
  border: 'border-[#233342]',
  borderSoft: 'border-[#182734]',
  glass: 'bg-[#0F171F]/88 backdrop-blur-xl border-b border-[#182734]',
  sectionBlend: 'bg-[radial-gradient(circle_at_top_left,_rgba(1,17,34,0.9),_transparent_42%),radial-gradient(circle_at_top_right,_rgba(2,12,26,0.75),_transparent_32%)]',
  topGlow: 'bg-[radial-gradient(circle_at_top,_rgba(207,231,243,0.08),transparent_55%)]',
  cardGlass: 'bg-[linear-gradient(180deg,rgba(15,23,31,0.96),rgba(11,18,21,0.94))] border border-[#233342] hover:border-[#3C5568] hover:bg-[linear-gradient(180deg,rgba(16,27,36,0.98),rgba(11,18,21,0.98))]',
  button: 'bg-[#CFE7F3] text-[#011122] transition-all duration-300 hover:bg-[#A9C3D1] hover:shadow-[0_12px_32px_rgba(1,17,34,0.35)]',
  secondaryButton: 'bg-[#0F171F] text-[#D8E7EE] border-[#233342] hover:bg-[#161616] hover:border-[#3C5568] hover:text-[#F5FBFF]',
  techBadge: 'border-[#233342] bg-[#161616] text-[#D8E7EE]',
  chip: 'bg-[#161616] text-[#B8CAD6] border-[#233342]',
  iconGlow: 'bg-[#CFE7F3]/10',
  headingGradient: 'from-[#F2FAFF] via-[#CFE7F3] to-[#6F8FA3]',
  selection: 'selection:bg-[#233342] selection:text-[#F2FAFF]',
  heroGlowPrimary: 'bg-[radial-gradient(circle,_rgba(1,17,34,0.85),_transparent_68%)]',
  heroGlowSecondary: 'bg-[radial-gradient(circle,_rgba(15,23,31,0.95),_transparent_70%)]',
  heroEyebrow: 'bg-[#0F171F]/60',
  scrollCue: 'text-[#A9C3D1]',
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
    <div className={`min-h-screen font-display ${theme.selection} ${theme.bg} ${theme.text}`}>
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
