import React from 'react';
import { Briefcase, Layers } from 'lucide-react';
import Reveal from './Reveal';
import { experiences } from '../data/index.jsx';

const Experience = ({ theme, darkMode }) => {
    return (
        <section id="experience" className="py-32 px-6">
            <div className="max-w-5xl mx-auto">
                <Reveal>
                    <h2 className="text-3xl md:text-4xl font-bold mb-16 flex items-center gap-4">
                        <Briefcase className={theme.accent} size={32} /> Experience
                    </h2>
                </Reveal>

                <div className="space-y-8">
                    {experiences.map((exp, idx) => (
                        <Reveal key={idx} delay={idx * 200}>
                            <div className={`group relative p-8 rounded-3xl border transition-all duration-500 hover:shadow-2xl ${theme.cardGlass} ${darkMode ? 'border-[#cdd6f4]/5 hover:border-[#fab387]/50' : 'border-[#4c4f69]/5 hover:border-[#fe640b]/50'}`}>
                                <div className="flex flex-col md:flex-row gap-8 items-start">
                                    {/* Date / Index Section */}
                                    <div className="md:w-1/4 flex-shrink-0 flex flex-col items-start">
                                        <span className={`text-5xl font-black opacity-10 mb-2 select-none`}>0{idx + 1}</span>
                                        <span className={`inline-block px-4 py-2 rounded-full text-sm font-bold border tracking-wide ${darkMode ? 'border-[#fab387] text-[#fab387] bg-[#fab387]/10' : 'border-[#fe640b] text-[#fe640b] bg-[#fe640b]/10'}`}>
                                            {exp.period}
                                        </span>
                                    </div>

                                    {/* Content Section */}
                                    <div className="md:w-3/4">
                                        <h3 className="text-2xl md:text-3xl font-bold mb-2 group-hover:text-[#fab387] dark:group-hover:text-[#fe640b] transition-colors">{exp.role}</h3>
                                        <div className={`text-lg font-semibold mb-6 flex items-center gap-2 ${theme.accentSecondary}`}>
                                            <Layers size={18} /> {exp.company}
                                        </div>
                                        <p className={`leading-relaxed text-lg ${theme.textMuted}`}>
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
