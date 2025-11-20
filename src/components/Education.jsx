import React from 'react';
import { GraduationCap, BookOpen } from 'lucide-react';
import Reveal from './Reveal';
import { education } from '../data/index.jsx';

const Education = ({ theme, darkMode }) => {
    return (
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
                                        <span className="flex items-center gap-2"><BookOpen size={18} /> {edu.grade}</span>
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
    );
};

export default Education;
