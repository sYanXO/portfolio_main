import React from 'react';
import { Briefcase, Layers } from 'lucide-react';
import Reveal from './Reveal';
import { experiences } from '../data/index.jsx';

const Experience = ({ theme }) => {
    return (
        <section id="experience" className="px-5 py-16 sm:px-6 md:py-20 lg:py-24">
            <div className="max-w-5xl mx-auto">
                <Reveal>
                    <div className="mb-10 border-b border-[#222222] pb-6 md:mb-12 lg:mb-14">
                        <div className="eyebrow-copy text-[#999999]">[ EXPERIENCE ]</div>
                        <h2 className="section-title mt-3 flex items-center gap-4">
                            <Briefcase className={theme.accent} size={28} /> Selected Work
                        </h2>
                    </div>
                </Reveal>

                <div className="space-y-6 md:space-y-8">
                    {experiences.map((exp, idx) => (
                        <Reveal key={idx} delay={idx * 200}>
                            <div className={`group relative border p-6 md:p-7 lg:p-8 ${theme.cardGlass}`}>
                                <div className="flex flex-col gap-6 md:flex-row md:gap-8">
                                    <div className="md:w-[180px] md:flex-shrink-0">
                                        <div className="font-display text-5xl leading-none tracking-[-0.05em] text-[#333333] md:text-6xl">
                                            0{idx + 1}
                                        </div>
                                        <span className={`mt-4 inline-flex border px-3 py-2 font-label text-[11px] uppercase tracking-[0.08em] ${theme.chip}`}>
                                            {exp.period}
                                        </span>
                                    </div>

                                    <div className="flex-1">
                                        <div className="label-copy text-[#666666]">ROLE</div>
                                        <h3 className="card-title mt-2 text-xl text-[#FFFFFF] sm:text-2xl md:text-3xl">{exp.role}</h3>
                                        <div className={`mt-3 flex items-center gap-2 text-base tracking-[-0.02em] md:text-lg ${theme.accentSecondary}`}>
                                            <Layers size={18} /> {exp.company}
                                        </div>
                                        <p className={`body-copy mt-5 border-t border-[#222222] pt-5 ${theme.textMuted}`}>
                                            {exp.desc}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </Reveal>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default Experience;
