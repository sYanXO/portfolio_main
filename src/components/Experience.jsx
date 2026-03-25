import React from 'react';
import { Briefcase, Layers } from 'lucide-react';
import Reveal from './Reveal';
import { experiences } from '../data/index.jsx';

const Experience = ({ theme }) => {
    return (
        <section id="experience" className="py-20 md:py-24 lg:py-32 px-5 sm:px-6">
            <div className="max-w-5xl mx-auto">
                <Reveal>
                    <h2 className="text-3xl md:text-4xl font-bold mb-12 md:mb-14 lg:mb-16 flex items-center gap-4">
                        <Briefcase className={theme.accent} size={32} /> Experience
                    </h2>
                </Reveal>

                <div className="space-y-6 md:space-y-8">
                    {experiences.map((exp, idx) => (
                        <Reveal key={idx} delay={idx * 200}>
                            <div className={`group relative p-6 md:p-7 lg:p-8 rounded-3xl border transition-all duration-500 hover:shadow-2xl ${theme.cardGlass}`}>
                                <div className="flex flex-col md:flex-row gap-6 md:gap-8 items-start">
                                    <div className="md:w-1/4 flex-shrink-0 flex flex-col items-start">
                                        <span className={`text-4xl md:text-5xl font-black opacity-10 mb-2 select-none`}>0{idx + 1}</span>
                                        <span className={`inline-block px-4 py-2 rounded-full text-sm font-bold border tracking-wide border-[#333333] text-[#EDEDED] bg-[#111111]`}>
                                            {exp.period}
                                        </span>
                                    </div>

                                    <div className="md:w-3/4">
                                        <h3 className="text-xl sm:text-2xl md:text-3xl font-bold mb-2 group-hover:text-[#FFFFFF] transition-colors">{exp.role}</h3>
                                        <div className={`text-base md:text-lg font-semibold mb-4 md:mb-6 flex items-center gap-2 ${theme.accentSecondary}`}>
                                            <Layers size={18} /> {exp.company}
                                        </div>
                                        <p className={`leading-relaxed text-base md:text-lg ${theme.textMuted}`}>
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
