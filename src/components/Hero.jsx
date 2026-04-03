import React from 'react';
import { FileText, Github, Linkedin, Mail, Code, Trophy, ChevronDown } from 'lucide-react';
import Reveal from './Reveal';

const Hero = ({ theme, scrollToSection }) => {
    return (
        <section id="home" className="relative flex min-h-[88vh] flex-col justify-center overflow-hidden px-5 pb-12 pt-24 sm:px-6 md:pb-16 md:pt-28 lg:min-h-[92vh] lg:pt-32">
            <Reveal>
                <div className="mx-auto w-full max-w-6xl">
                    <div className="grid gap-10 border border-[#222222] bg-[#111111] p-6 md:grid-cols-[minmax(0,1.4fr)_minmax(280px,0.8fr)] md:p-10 lg:p-12">
                        <div>
                            <div className={`eyebrow-copy mb-6 inline-flex items-center gap-3 ${theme.textMuted}`}>
                                <span>[ SYSTEM PROFILE ]</span>
                                <span className="hidden text-[#666666] sm:inline">BACKEND SYSTEMS ENGINEER</span>
                            </div>

                            <h1 className="font-display text-[3.25rem] leading-[0.9] tracking-[-0.05em] text-[#FFFFFF] sm:text-[4.5rem] md:text-[5.5rem] lg:text-[6.5rem]">
                                BUILDING
                                <br />
                                SYSTEMS
                            </h1>

                            <div className="mt-4 font-body text-xl tracking-[-0.03em] text-[#E8E8E8] md:text-2xl">
                                With math, code, and low-level discipline.
                            </div>

                            <p className={`body-copy mt-8 max-w-2xl ${theme.textMuted}`}>
                                2025 ECE graduate focused on high-concurrency backends, distributed systems, and pragmatic
                                engineering. Primary tools: <span className="text-[#FFFFFF]">Golang</span>,
                                <span className="text-[#FFFFFF]"> Python</span>, and <span className="text-[#FFFFFF]"> TypeScript</span>.
                            </p>

                            <div className="mt-8 flex flex-wrap gap-3 md:gap-4">
                                <a
                                    href="mailto:desreayan@gmail.com"
                                    className={`interactive-focus inline-flex min-h-11 items-center justify-center rounded-full px-6 py-3 font-label text-[13px] uppercase tracking-[0.08em] ${theme.button}`}
                                >
                                    [ Contact ]
                                </a>
                                <a
                                    href="https://drive.google.com/file/d/1j5ZqrJQD6dl32i5z0Rc9J27M_F5zzyeS/view?usp=sharing"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={`interactive-focus inline-flex min-h-11 items-center justify-center gap-2 rounded-full border px-6 py-3 font-label text-[13px] uppercase tracking-[0.08em] ${theme.secondaryButton}`}
                                >
                                    <FileText size={16} /> [ Resume ]
                                </a>
                            </div>
                        </div>

                        <div className="border border-[#333333] bg-[#000000] p-5 md:p-6">
                            <div className="label-copy text-[#999999]">[ LIVE PANEL ]</div>

                            <div className="mt-6 grid gap-6">
                                <div className="border-b border-[#222222] pb-5">
                                    <div className="label-copy text-[#666666]">PRIMARY STACK</div>
                                    <div className="mt-2 font-body text-2xl text-[#FFFFFF]">GO / PY / TS</div>
                                </div>

                                <div className="border-b border-[#222222] pb-5">
                                    <div className="label-copy text-[#666666]">FOCUS</div>
                                    <div className="mt-2 font-body text-base leading-7 text-[#E8E8E8]">
                                        Concurrent services, data-intensive tooling, and system design with clear tradeoffs.
                                    </div>
                                </div>

                                <div>
                                    <div className="label-copy text-[#666666]">LINKS</div>
                                    <div className="mt-3 grid gap-3">
                                        <a
                                            href="https://github.com/sYanXO"
                                            target="_blank"
                                            rel="noreferrer"
                                            className="interactive-focus inline-flex items-center justify-between border-b border-[#222222] pb-3 font-label uppercase tracking-[0.08em] text-[#E8E8E8] hover:text-[#FFFFFF]"
                                        >
                                            <span className="inline-flex items-center gap-2"><Github size={16} /> Github</span>
                                            <span>[ OPEN ]</span>
                                        </a>
                                        <a
                                            href="https://www.linkedin.com/in/sreayande/"
                                            target="_blank"
                                            rel="noreferrer"
                                            className="interactive-focus inline-flex items-center justify-between border-b border-[#222222] pb-3 font-label uppercase tracking-[0.08em] text-[#E8E8E8] hover:text-[#FFFFFF]"
                                        >
                                            <span className="inline-flex items-center gap-2"><Linkedin size={16} /> LinkedIn</span>
                                            <span>[ OPEN ]</span>
                                        </a>
                                        <a
                                            href="mailto:desreayan@gmail.com"
                                            className="interactive-focus inline-flex items-center justify-between border-b border-[#222222] pb-3 font-label uppercase tracking-[0.08em] text-[#E8E8E8] hover:text-[#FFFFFF]"
                                        >
                                            <span className="inline-flex items-center gap-2"><Mail size={16} /> Email</span>
                                            <span>[ OPEN ]</span>
                                        </a>
                                        <a
                                            href="https://leetcode.com/u/Sreayan/"
                                            target="_blank"
                                            rel="noreferrer"
                                            className="interactive-focus inline-flex items-center justify-between border-b border-[#222222] pb-3 font-label uppercase tracking-[0.08em] text-[#E8E8E8] hover:text-[#FFFFFF]"
                                        >
                                            <span className="inline-flex items-center gap-2"><Code size={16} /> LeetCode</span>
                                            <span>[ OPEN ]</span>
                                        </a>
                                        <a
                                            href="https://codeforces.com/profile/Sreayan"
                                            target="_blank"
                                            rel="noreferrer"
                                            className="interactive-focus inline-flex items-center justify-between font-label uppercase tracking-[0.08em] text-[#E8E8E8] hover:text-[#FFFFFF]"
                                        >
                                            <span className="inline-flex items-center gap-2"><Trophy size={16} /> Codeforces</span>
                                            <span>[ OPEN ]</span>
                                        </a>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </Reveal>

            <div
                className={`absolute bottom-6 left-1/2 -translate-x-1/2 transform cursor-pointer opacity-60 transition-colors hover:text-[#FFFFFF] md:bottom-10 ${theme.scrollCue}`}
                onClick={() => scrollToSection('experience')}
            >
                <ChevronDown size={32} />
            </div>
        </section>
    );
};

export default Hero;
