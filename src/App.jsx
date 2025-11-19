import React, { useState, useEffect, useRef } from 'react';
import { 
  Github, 
  Linkedin, 
  Mail, 
  FileText, 
  Moon, 
  Sun, 
  Code, 
  Database, 
  Server, 
  Terminal, 
  ExternalLink, 
  Cpu, 
  TrendingUp,
  Layers,
  BookOpen,
  Menu,
  X,
  GraduationCap,
  Trophy,
  ChevronDown
} from 'lucide-react';

// Catppuccin Palette Constants
// Dark Mode (Mocha): BG: #1e1e2e, FG: #cdd6f4
// Light Mode (Latte): BG: #eff1f5, FG: #4c4f69

const Reveal = ({ children, delay = 0 }) => {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(ref.current);
        }
      },
      {
        threshold: 0.1,
        rootMargin: "0px 0px -50px 0px"
      }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => {
      if (ref.current) observer.disconnect();
    };
  }, []);

  return (
    <div
      ref={ref}
      style={{ transitionDelay: `${delay}ms` }}
      className={`transition-all duration-1000 ease-out transform ${
        isVisible 
          ? 'opacity-100 translate-y-0' 
          : 'opacity-0 translate-y-10'
      }`}
    >
      {children}
    </div>
  );
};

const PeepingSnorlax = ({ darkMode }) => {
  const [message, setMessage] = useState("Zzz...");
  
  const messages = [
    "He writes code. I write Zzz's. We make a good team.",
    "Hire him. He promised to buy me a bigger beanbag.",
    "I reviewed his PRs... mostly while dreaming. LGTM.",
    "He handles concurrency. I handle dormancy.",
    "Is it a bug or a feature? I'm too tired to check...",
    "He knows how to center a div. I think. Zzz...",
    "O(log n)? I prefer O(sleep n).",
    "He optimizes backends. I optimize napping.",
    "10x developer? No, I sleep 10x more than him.",
    "Wait, are you a recruiter? Do you have snacks?",
    "His code compiles... eventually. Zzz...",
    "He works hard so I don't have to.",
    "Checking for race conditions... *yawn*... looks safe."
  ];

  const handleMouseEnter = () => {
    const randomIndex = Math.floor(Math.random() * messages.length);
    setMessage(messages[randomIndex]);
  };

  return (
    <div 
      className="fixed bottom-0 right-5 z-50 group hidden md:block"
      onMouseEnter={handleMouseEnter}
    >
      {/* Floating Message Bubble */}
      <div className={`absolute bottom-32 right-0 w-64 p-4 rounded-2xl shadow-xl opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-8 group-hover:translate-y-0 pointer-events-none border-2 ${darkMode ? 'bg-[#1e1e2e] border-[#fab387] text-[#cdd6f4]' : 'bg-white border-[#fe640b] text-[#4c4f69]'}`}>
        <p className="text-sm font-bold italic leading-relaxed">
          "{message}"
        </p>
        {/* Bubble Triangle */}
        <div className={`absolute -bottom-2 right-12 w-4 h-4 border-b-2 border-r-2 transform rotate-45 ${darkMode ? 'bg-[#1e1e2e] border-[#fab387]' : 'bg-white border-[#fe640b]'}`}></div>
      </div>

      {/* Snorlax GIF */}
      <img 
        src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/animated/143.gif"
        alt="Snorlax"
        className="w-32 h-32 object-contain filter drop-shadow-2xl cursor-pointer transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-2"
      />
    </div>
  );
};

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

  const experiences = [
    {
      company: "CipherByte Technologies",
      role: "Full Stack Developer Intern",
      period: "Aug 2024 - Dec 2024",
      desc: "Built a scalable e-commerce platform supporting 100+ products and concurrent users. Integrated secure payment gateways and optimized the MERN stack for performance.",
      icon: <Layers size={20} />
    },
    {
      company: "Jadavpur University",
      role: "Research Intern (Deep Learning)",
      period: "May 2023 - Aug 2023",
      desc: "Achieved 95% accuracy in handwritten Indic script recognition using Deep Neural Networks. Co-authored a conference paper on fine-tuning model parameters.",
      icon: <BookOpen size={20} />
    }
  ];

  const education = [
    {
      school: "B.P Poddar Institute of Management and Technology",
      degree: "B.Tech in Electronics and Communication Engineering",
      period: "Aug 2021 - July 2025",
      grade: "CGPA: 7.4",
      location: "Kolkata, West Bengal",
      icon: <GraduationCap size={20} />
    }
  ];

  const projects = [
    {
      title: "Go-Arbitrage-Bot",
      tech: ["Golang", "Concurrency", "WebSockets"],
      desc: "High-concurrency CLI tool detecting price anomalies across Binance & Coinbase. Implemented Fan-In/Fan-Out patterns to handle asynchronous data streams without lock contention.",
      link: "https://github.com/sreayan-oss/arb-bot",
      icon: <Cpu className={darkMode ? "text-[#f38ba8]" : "text-[#d20f39]"} /> // Red
    },
    {
      title: "Market-Neutral Quant Strategy",
      tech: ["Python", "Pandas", "Finance", "ML"],
      desc: "Backtested mean reversion strategy on 60+ tickers achieving 13.46% cumulative return. Implemented dynamic stop-loss (ATR-based) and regime filtering.",
      link: "https://github.com/sYanXO/NSE-meanReversion-strategy",
      icon: <TrendingUp className={darkMode ? "text-[#a6e3a1]" : "text-[#40a02b]"} /> // Green
    },
    {
      title: "Vercel Clone",
      tech: ["React", "AWS S3", "Redis", "Docker"],
      desc: "Automated deployment platform for static sites. Uses SQS for decoupling builds and S3 for storage, mimicking core Vercel architecture.",
      link: "#", // No link provided in resume for this one, kept as placeholder or #
      icon: <Server className={darkMode ? "text-[#89b4fa]" : "text-[#1e66f5]"} /> // Blue
    }
  ];

  const skills = [
    { category: "Languages", items: ["Golang", "C++", "Python", "TypeScript", "JavaScript"] },
    { category: "Backend & Cloud", items: ["AWS S3", "Redis", "PostgreSQL", "MongoDB", "Node.js"] },
    { category: "Frontend", items: ["React.js", "Tailwind", "HTML/CSS"] },
    { category: "Data & ML", items: ["Pandas", "NumPy", "PyTorch", "Matplotlib"] },
  ];

  return (
    <div className={`min-h-screen transition-colors duration-500 font-sans selection:bg-[#fab387] selection:text-[#1e1e2e] ${theme.bg} ${theme.text}`}>
      
      <PeepingSnorlax darkMode={darkMode} />

      {/* Navigation */}
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

      {/* Hero Section */}
      <section id="home" className="pt-32 pb-20 px-6 min-h-screen flex flex-col justify-center relative overflow-hidden">
        {/* Background Decoration */}
        <div className={`absolute top-20 right-0 w-96 h-96 rounded-full blur-3xl opacity-20 -z-10 ${darkMode ? 'bg-[#fab387]' : 'bg-[#fe640b]'}`}></div>
        <div className={`absolute bottom-20 left-0 w-72 h-72 rounded-full blur-3xl opacity-20 -z-10 ${darkMode ? 'bg-[#89b4fa]' : 'bg-[#1e66f5]'}`}></div>

        <Reveal>
          <div className="max-w-4xl mx-auto w-full">
            <div className={`inline-block px-3 py-1 mb-6 text-xs font-bold tracking-widest uppercase rounded-full border ${theme.border} ${theme.accentSecondary}`}>
              Software Development Engineer
            </div>
            <h1 className="text-5xl md:text-8xl font-extrabold tracking-tight mb-8 leading-tight">
              Building systems with <br/>
              <span className={`bg-clip-text text-transparent bg-gradient-to-r ${darkMode ? 'from-[#fab387] to-[#f38ba8]' : 'from-[#fe640b] to-[#d20f39]'}`}>
                Math & Code.
              </span>
            </h1>
            <p className={`text-lg md:text-xl max-w-2xl mb-12 leading-relaxed ${theme.textMuted}`}>
              I'm a 2025 ECE Graduate and a Math Nerd who loves low-level systems. 
              Specializing in high-concurrency backends with <b>Golang</b>, data analysis with <b>Python</b>, 
              and full-stack applications.
            </p>
            
            <div className="flex flex-wrap gap-4 mb-16">
              <a href="mailto:desreayan@gmail.com" className={`px-8 py-4 rounded-lg font-bold transition-all duration-300 hover:-translate-y-1 hover:shadow-lg ${theme.button}`}>
                Contact Me
              </a>
              <a 
                href="https://drive.google.com/file/d/1ajiIHv59wznABwcxGCdEqORMLrZ6xjA7/view?usp=sharing" 
                target="_blank" 
                rel="noopener noreferrer"
                className={`px-8 py-4 rounded-lg font-bold border transition-all duration-300 hover:-translate-y-1 hover:shadow-lg flex items-center gap-2 ${theme.border} hover:border-[#fab387] hover:bg-[#fab387]/10`}
              >
                <FileText size={18} /> View Resume
              </a>
            </div>

            <div className="flex flex-wrap gap-6 items-center">
              <a href="https://github.com/sreayan-oss" target="_blank" rel="noreferrer" className={`transition-transform duration-300 hover:scale-110 hover:text-[#fab387] ${theme.textMuted}`}>
                <Github size={28} />
              </a>
              <a href="https://www.linkedin.com/in/sreayande/" target="_blank" rel="noreferrer" className={`transition-transform duration-300 hover:scale-110 hover:text-[#fab387] ${theme.textMuted}`}>
                <Linkedin size={28} />
              </a>
              <a href="mailto:desreayan@gmail.com" className={`transition-transform duration-300 hover:scale-110 hover:text-[#fab387] ${theme.textMuted}`}>
                <Mail size={28} />
              </a>
              {/* Separator */}
              <div className={`hidden sm:block h-8 w-px ${theme.border} bg-current opacity-20 mx-2`}></div>
              {/* CP Profiles */}
              <a href="https://leetcode.com/u/spaceCadet22/" target="_blank" rel="noreferrer" className={`flex items-center gap-2 text-sm font-bold transition-colors hover:text-[#fab387] ${theme.textMuted}`}>
                <Code size={20} /> LeetCode
              </a>
              <a href="https://codeforces.com/profile/EigenYan" target="_blank" rel="noreferrer" className={`flex items-center gap-2 text-sm font-bold transition-colors hover:text-[#fab387] ${theme.textMuted}`}>
                <Trophy size={20} /> CodeForces
              </a>
            </div>
          </div>
        </Reveal>

        {/* Scroll Indicator */}
        <div className="absolute bottom-10 left-1/2 transform -translate-x-1/2 animate-bounce opacity-50 cursor-pointer" onClick={() => scrollToSection('experience')}>
          <ChevronDown size={32} />
        </div>
      </section>

      {/* Experience Section */}
      <section id="experience" className="py-32 px-6">
        <div className="max-w-4xl mx-auto">
          <Reveal>
            <h2 className="text-3xl md:text-4xl font-bold mb-16 flex items-center gap-4">
              <Layers className={theme.accent} size={32} /> Experience
            </h2>
          </Reveal>
          
          <div className={`relative border-l-2 ${darkMode ? 'border-[#45475a]' : 'border-[#bcc0cc]'} ml-3 space-y-16`}>
            {experiences.map((exp, idx) => (
              <div key={idx} className="relative pl-8 md:pl-16">
                <Reveal delay={idx * 200}>
                  {/* Timeline Dot */}
                  <div className={`absolute -left-[9px] top-0 w-4 h-4 rounded-full border-2 shadow-[0_0_10px_rgba(250,179,135,0.5)] ${theme.bg} ${darkMode ? 'border-[#fab387] bg-[#fab387]' : 'border-[#fe640b] bg-[#fe640b]'}`} />
                  
                  <div className={`p-8 rounded-2xl transition-all duration-500 hover:translate-y-[-5px] hover:shadow-2xl ${theme.cardGlass}`}>
                    <div className="flex flex-col md:flex-row md:items-center justify-between mb-4">
                      <h3 className="text-2xl font-bold">{exp.role}</h3>
                      <span className={`text-sm font-mono font-bold px-3 py-1 rounded-full ${darkMode ? 'bg-[#45475a] text-[#fab387]' : 'bg-[#bcc0cc]/30 text-[#fe640b]'}`}>{exp.period}</span>
                    </div>
                    <div className={`text-lg font-bold mb-6 ${theme.accentSecondary}`}>{exp.company}</div>
                    <p className={`leading-relaxed text-lg ${theme.textMuted}`}>
                      {exp.desc}
                    </p>
                  </div>
                </Reveal>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Projects Section */}
      <section id="projects" className="py-32 px-6">
        <div className="max-w-6xl mx-auto">
          <Reveal>
            <h2 className="text-3xl md:text-4xl font-bold mb-16 flex items-center gap-4">
              <Code className={theme.accent} size={32} /> Featured Projects
            </h2>
          </Reveal>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {projects.map((project, idx) => (
              <Reveal key={idx} delay={idx * 100}>
                <div className={`group relative p-8 rounded-2xl flex flex-col h-full transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl ${theme.cardGlass}`}>
                  <div className="mb-6">
                    <div className={`inline-flex p-4 rounded-xl bg-opacity-10 mb-6 transition-transform group-hover:scale-110 duration-500 ${darkMode ? 'bg-[#cdd6f4]/5' : 'bg-[#4c4f69]/5'}`}>
                      {project.icon}
                    </div>
                    <h3 className="text-2xl font-bold mb-3 group-hover:text-[#fab387] dark:group-hover:text-[#fe640b] transition-colors">
                      {project.title}
                    </h3>
                    <div className="flex flex-wrap gap-2 mb-6">
                      {project.tech.map((t) => (
                        <span key={t} className={`text-xs font-bold tracking-wide uppercase px-3 py-1 rounded-full ${theme.techBadge}`}>
                          {t}
                        </span>
                      ))}
                    </div>
                    <p className={`text-base leading-relaxed mb-8 ${theme.textMuted}`}>
                      {project.desc}
                    </p>
                  </div>
                  
                  <div className={`mt-auto pt-6 border-t ${darkMode ? 'border-[#cdd6f4]/10' : 'border-[#4c4f69]/10'} flex justify-between items-center`}>
                    <a 
                      href={project.link} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-sm font-bold flex items-center gap-2 hover:underline decoration-2 underline-offset-4"
                    >
                      View Code <ExternalLink size={16} />
                    </a>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Skills Section */}
      <section id="skills" className="py-32 px-6">
        <div className="max-w-4xl mx-auto">
          <Reveal>
            <h2 className="text-3xl md:text-4xl font-bold mb-16 flex items-center gap-4">
              <Cpu className={theme.accent} size={32} /> Technical Arsenal
            </h2>
          </Reveal>
          
          <div className="grid md:grid-cols-2 gap-8">
            {skills.map((skillGroup, idx) => (
              <Reveal key={idx} delay={idx * 100}>
                <div className={`p-8 rounded-2xl h-full transition-all duration-300 hover:bg-opacity-80 ${theme.cardGlass}`}>
                  <h3 className={`text-xl font-bold mb-6 border-b ${darkMode ? 'border-[#cdd6f4]/20' : 'border-[#4c4f69]/20'} pb-4`}>{skillGroup.category}</h3>
                  <div className="flex flex-wrap gap-3">
                    {skillGroup.items.map((skill) => (
                      <span 
                        key={skill} 
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all hover:scale-105 ${darkMode ? 'bg-[#45475a] text-[#cdd6f4] hover:bg-[#fab387] hover:text-[#1e1e2e]' : 'bg-[#bcc0cc]/50 text-[#4c4f69] hover:bg-[#fe640b] hover:text-[#eff1f5]'}`}
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Education Section */}
      <section id="education" className="py-32 px-6">
        <div className="max-w-4xl mx-auto">
          <Reveal>
            <h2 className="text-3xl md:text-4xl font-bold mb-16 flex items-center gap-4">
              <GraduationCap className={theme.accent} size={32} /> Education
            </h2>
          </Reveal>
          
          <div className="grid gap-8">
            {education.map((edu, idx) => (
              <Reveal key={idx}>
                <div className={`p-10 rounded-3xl flex flex-col md:flex-row md:items-center justify-between gap-8 transition-all duration-500 hover:shadow-2xl ${theme.cardGlass}`}>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-2xl font-bold">{edu.school}</h3>
                    </div>
                    <div className={`text-xl font-medium mb-4 ${theme.accentSecondary}`}>{edu.degree}</div>
                    <div className={`flex flex-wrap gap-6 text-base ${theme.textMuted}`}>
                      <span className="flex items-center gap-2"><BookOpen size={18}/> {edu.grade}</span>
                      <span className="flex items-center gap-2">📍 {edu.location}</span>
                    </div>
                  </div>
                  <div className={`text-left md:text-right`}>
                    <span className={`inline-block px-6 py-3 rounded-full text-sm font-bold border shadow-lg ${darkMode ? 'border-[#fab387] text-[#fab387] bg-[#fab387]/10' : 'border-[#fe640b] text-[#fe640b] bg-[#fe640b]/10'}`}>
                      {edu.period}
                    </span>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Contact / Footer */}
      <section id="contact" className={`py-32 px-6 mt-10 border-t ${theme.border}`}>
        <Reveal>
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-4xl md:text-5xl font-bold mb-8">Let's Build Something Scalable.</h2>
            <p className={`mb-12 max-w-xl mx-auto text-xl leading-relaxed ${theme.textMuted}`}>
              I'm currently looking for SDE roles. If you have a challenging problem involving distributed systems or backend engineering, I'd love to chat.
            </p>
            
            <a 
              href="mailto:desreayan@gmail.com" 
              className={`inline-flex items-center gap-3 px-10 py-5 rounded-xl font-bold text-xl transition-all duration-300 hover:scale-105 hover:shadow-xl ${theme.button}`}
            >
              <Mail size={24} /> Say Hello
            </a>

            <div className={`mt-24 text-sm font-medium ${theme.textMuted}`}>
              <p>&copy; 2025 Sreayan De. Built with React & Tailwind.</p>
            </div>
          </div>
        </Reveal>
      </section>

    </div>
  );
};

export default App;