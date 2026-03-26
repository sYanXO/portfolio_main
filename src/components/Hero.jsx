import React from 'react';
import { FileText, Github, Linkedin, Mail, Code, Trophy, ChevronDown } from 'lucide-react';
import Reveal from './Reveal';

const Hero = ({ theme, scrollToSection }) => {
    return (
        <section id="home" className="pt-24 md:pt-28 lg:pt-32 pb-16 md:pb-20 px-5 sm:px-6 min-h-[92vh] lg:min-h-screen flex flex-col justify-center relative overflow-hidden">
            {/* Background Decoration */}
            <div className={`absolute top-20 right-0 w-96 h-96 rounded-full blur-3xl opacity-10 -z-10 bg-[#FFFFFF]`}></div>
            <div className={`absolute bottom-20 left-0 w-72 h-72 rounded-full blur-3xl opacity-5 -z-10 bg-[#888888]`}></div>

            <Reveal>
                <div className="max-w-4xl mx-auto w-full">
                    <div className={`eyebrow-copy inline-block px-3 py-1 mb-5 md:mb-6 rounded-full border ${theme.border} text-[#888888]`}>
                        Backend Systems Engineer
                    </div>
                    <h1 className="font-display text-4xl sm:text-5xl md:text-6xl lg:text-8xl font-semibold tracking-[-0.05em] mb-6 md:mb-8 leading-[0.94]">
                        Building systems with <br />
                        <span className={`bg-clip-text text-transparent bg-gradient-to-r from-[#EDEDED] to-[#666666]`}>
                            Math & Code.
                        </span>
                    </h1>
                    <p className={`body-copy sm:text-lg lg:text-[1.3rem] max-w-2xl mb-10 md:mb-12 ${theme.textMuted}`}>
                        I'm a 2025 ECE Graduate and a Math Nerd who loves low-level systems.
                        Specializing in high-concurrency backends with <b>Golang</b>, data analysis with <b>Python</b>,
                        and scalable distributed systems.
                    </p>

                    <div className="flex flex-wrap gap-3 md:gap-4 mb-12 md:mb-16">
                        <a href="mailto:desreayan@gmail.com" className={`px-6 py-3.5 md:px-8 md:py-4 rounded-lg font-semibold tracking-[-0.02em] transition-all duration-300 hover:-translate-y-1 hover:shadow-lg interactive-focus ${theme.button}`}>
                            Contact Me
                        </a>
                        <a
                            href="https://drive.google.com/file/d/1gTS-aQkdQ7ij4GWpq2uo_RnFFHRIZO0C/view?usp=sharing"
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`px-6 py-3.5 md:px-8 md:py-4 rounded-lg font-semibold tracking-[-0.02em] border transition-all duration-300 hover:-translate-y-1 hover:shadow-lg flex items-center gap-2 interactive-focus ${theme.border} hover:bg-[#333333] hover:text-[#FFFFFF] text-[#EDEDED]`}
                        >
                            <FileText size={18} /> View Resume
                        </a>
                    </div>

                    <div className="flex flex-wrap gap-4 md:gap-6 items-center">
                        <a href="https://github.com/sYanXO" target="_blank" rel="noreferrer" className={`transition-transform duration-300 hover:scale-110 hover:text-[#FFFFFF] interactive-focus ${theme.textMuted}`}>
                            <Github size={28} />
                        </a>
                        <a href="https://www.linkedin.com/in/sreayande/" target="_blank" rel="noreferrer" className={`transition-transform duration-300 hover:scale-110 hover:text-[#FFFFFF] interactive-focus ${theme.textMuted}`}>
                            <Linkedin size={28} />
                        </a>
                        <a href="mailto:desreayan@gmail.com" className={`transition-transform duration-300 hover:scale-110 hover:text-[#FFFFFF] interactive-focus ${theme.textMuted}`}>
                            <Mail size={28} />
                        </a>
                        {/* Separator */}
                        <div className={`hidden sm:block h-7 md:h-8 w-px ${theme.border} bg-current opacity-20 mx-1 md:mx-2`}></div>
                        {/* CP Profiles */}
                        <a href="https://leetcode.com/u/Sreayan/" target="_blank" rel="noreferrer" className={`flex items-center gap-2 text-sm font-semibold tracking-[-0.01em] transition-colors hover:text-[#FFFFFF] interactive-focus ${theme.textMuted}`}>
                            <Code size={20} /> LeetCode
                        </a>
                        <a href="https://codeforces.com/profile/Sreayan" target="_blank" rel="noreferrer" className={`flex items-center gap-2 text-sm font-semibold tracking-[-0.01em] transition-colors hover:text-[#FFFFFF] interactive-focus ${theme.textMuted}`}>
                            <Trophy size={20} /> CodeForces
                        </a>
                    </div>
                </div>
            </Reveal>

            {/* Scroll Indicator */}
            <div className="absolute bottom-6 md:bottom-10 left-1/2 transform -translate-x-1/2 animate-bounce opacity-50 cursor-pointer text-[#EDEDED]" onClick={() => scrollToSection('experience')}>
                <ChevronDown size={32} />
            </div>
        </section>
    );
};

export default Hero;
