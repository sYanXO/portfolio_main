import React from 'react';
import { FileText, Github, Linkedin, Mail, Code, Trophy, ChevronDown } from 'lucide-react';
import Reveal from './Reveal';

const Hero = ({ theme, scrollToSection, darkMode }) => {
    return (
        <section id="home" className="pt-32 pb-20 px-6 min-h-screen flex flex-col justify-center relative overflow-hidden">
            {/* Background Decoration */}
            <div className={`absolute top-20 right-0 w-96 h-96 rounded-full blur-3xl opacity-20 -z-10 ${darkMode ? 'bg-[#fab387]' : 'bg-[#fe640b]'}`}></div>
            <div className={`absolute bottom-20 left-0 w-72 h-72 rounded-full blur-3xl opacity-20 -z-10 ${darkMode ? 'bg-[#89b4fa]' : 'bg-[#1e66f5]'}`}></div>

            <Reveal>
                <div className="max-w-4xl mx-auto w-full">
                    <div className={`inline-block px-3 py-1 mb-6 text-xs font-bold tracking-widest uppercase rounded-full border ${theme.border} ${theme.accentSecondary}`}>
                        Backend Systems Engineer
                    </div>
                    <h1 className="text-5xl md:text-8xl font-extrabold tracking-tight mb-8 leading-tight">
                        Building systems with <br />
                        <span className={`bg-clip-text text-transparent bg-gradient-to-r ${darkMode ? 'from-[#fab387] to-[#f38ba8]' : 'from-[#fe640b] to-[#d20f39]'}`}>
                            Math & Code.
                        </span>
                    </h1>
                    <p className={`text-lg md:text-xl max-w-2xl mb-12 leading-relaxed ${theme.textMuted}`}>
                        I'm a 2025 ECE Graduate and a Math Nerd who loves low-level systems.
                        Specializing in high-concurrency backends with <b>Golang</b>, data analysis with <b>Python</b>,
                        and scalable distributed systems.
                    </p>

                    <div className="flex flex-wrap gap-4 mb-16">
                        <a href="mailto:desreayan@gmail.com" className={`px-8 py-4 rounded-lg font-bold transition-all duration-300 hover:-translate-y-1 hover:shadow-lg ${theme.button}`}>
                            Contact Me
                        </a>
                        <a
                            href="https://drive.google.com/file/d/1uFmsvb5F8CCTGDQr2qcPn1dhgKxBBSXV/view?usp=sharing"
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`px-8 py-4 rounded-lg font-bold border transition-all duration-300 hover:-translate-y-1 hover:shadow-lg flex items-center gap-2 ${theme.border} hover:border-[#fab387] hover:bg-[#fab387]/10`}
                        >
                            <FileText size={18} /> View Resume
                        </a>
                    </div>

                    <div className="flex flex-wrap gap-6 items-center">
                        <a href="https://github.com/sYanXO" target="_blank" rel="noreferrer" className={`transition-transform duration-300 hover:scale-110 hover:text-[#fab387] ${theme.textMuted}`}>
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
                        <a href="https://leetcode.com/u/Sreayan/" target="_blank" rel="noreferrer" className={`flex items-center gap-2 text-sm font-bold transition-colors hover:text-[#fab387] ${theme.textMuted}`}>
                            <Code size={20} /> LeetCode
                        </a>
                        <a href="https://codeforces.com/profile/Sreayan" target="_blank" rel="noreferrer" className={`flex items-center gap-2 text-sm font-bold transition-colors hover:text-[#fab387] ${theme.textMuted}`}>
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
    );
};

export default Hero;
