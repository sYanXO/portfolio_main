import React from 'react';
import { GraduationCap, BookOpen, MapPin } from 'lucide-react';
import Reveal from './Reveal';
import { education } from '../data/index.jsx';

const Education = ({ theme }) => {
    return (
        <section id="education" className="px-5 py-16 sm:px-6 md:py-20 lg:py-24">
            <div className="max-w-4xl mx-auto">
                <Reveal>
                    <div className="mb-10 border-b border-[#222222] pb-6 md:mb-12 lg:mb-14">
                        <div className="eyebrow-copy text-[#999999]">[ EDUCATION ]</div>
                        <h2 className="section-title mt-3 flex items-center gap-4">
                            <GraduationCap className={theme.accent} size={28} /> Academic Record
                        </h2>
                    </div>
                </Reveal>

                <div className="grid gap-6 md:gap-8">
                    {education.map((edu, idx) => (
                        <Reveal key={idx}>
                            <div className={`flex flex-col justify-between gap-6 border p-6 md:flex-row md:items-center md:gap-8 md:p-8 lg:p-10 ${theme.cardGlass}`}>
                                <div className="flex-1">
                                    <div className="label-copy text-[#666666]">INSTITUTION</div>
                                    <h3 className="card-title mt-2 text-xl text-[#FFFFFF] md:text-2xl">{edu.school}</h3>
                                    <div className={`mb-4 mt-3 text-lg md:text-xl tracking-[-0.02em] ${theme.accentSecondary}`}>{edu.degree}</div>
                                    <div className={`flex flex-wrap gap-4 md:gap-6 text-sm md:text-[0.96rem] leading-7 ${theme.textMuted}`}>
                                        <span className="flex items-center gap-2"><BookOpen size={18} /> {edu.grade}</span>
                                        <span className="flex items-center gap-2"><MapPin size={18} /> {edu.location}</span>
                                    </div>
                                </div>
                                <div className="text-left md:text-right">
                                    <span className={`inline-flex border px-4 py-3 font-label text-[11px] uppercase tracking-[0.08em] ${theme.chip}`}>
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
