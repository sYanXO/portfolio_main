import React from 'react';
import { GraduationCap, BookOpen } from 'lucide-react';
import Reveal from './Reveal';
import { education } from '../data/index.jsx';

const Education = ({ theme }) => {
    return (
        <section id="education" className="py-16 md:py-20 lg:py-24 px-5 sm:px-6">
            <div className="max-w-4xl mx-auto">
                <Reveal>
                    <h2 className="section-title mb-10 md:mb-12 lg:mb-14 flex items-center gap-4">
                        <GraduationCap className={theme.accent} size={32} /> Education
                    </h2>
                </Reveal>

                <div className="grid gap-6 md:gap-8">
                    {education.map((edu, idx) => (
                        <Reveal key={idx}>
                            <div className={`p-6 md:p-8 lg:p-10 rounded-3xl flex flex-col md:flex-row md:items-center justify-between gap-6 md:gap-8 transition-all duration-500 hover:shadow-2xl ${theme.cardGlass}`}>
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-2">
                                        <h3 className="card-title text-xl md:text-2xl">{edu.school}</h3>
                                    </div>
                                    <div className={`text-lg md:text-xl font-medium tracking-[-0.02em] mb-4 ${theme.accentSecondary}`}>{edu.degree}</div>
                                    <div className={`flex flex-wrap gap-4 md:gap-6 text-sm md:text-[0.96rem] leading-7 ${theme.textMuted}`}>
                                        <span className="flex items-center gap-2"><BookOpen size={18} /> {edu.grade}</span>
                                        <span className="flex items-center gap-2">📍 {edu.location}</span>
                                    </div>
                                </div>
                                <div className={`text-left md:text-right`}>
                                    <span className={`inline-block px-6 py-3 rounded-full text-sm font-semibold tracking-[0.08em] border shadow-lg ${theme.chip}`}>
                                        {edu.period}
                                    </span>
                                </div>
                            </div>
                        </Reveal>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default Education;
