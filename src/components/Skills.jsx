import React from 'react';
import { Cpu } from 'lucide-react';
import Reveal from './Reveal';
import { skills } from '../data/index.jsx';

const Skills = ({ theme }) => {
    return (
        <section id="skills" className="px-5 py-16 sm:px-6 md:py-20 lg:py-24">
            <div className="max-w-4xl mx-auto">
                <Reveal>
                    <div className="mb-10 border-b border-[#222222] pb-6 md:mb-12 lg:mb-14">
                        <div className="eyebrow-copy text-[#999999]">[ STACK ]</div>
                        <h2 className="section-title mt-3 flex items-center gap-4">
                            <Cpu className={theme.accent} size={28} /> Tools & Technologies
                        </h2>
                    </div>
                </Reveal>

                <div className="grid md:grid-cols-2 gap-6 md:gap-8">
                    {skills.map((skillGroup, idx) => (
                        <Reveal key={idx} delay={idx * 100}>
                            <div className={`h-full border p-6 md:p-8 ${theme.cardGlass}`}>
                                <div className="label-copy text-[#666666]">CATEGORY</div>
                                <h3 className={`card-title mt-2 mb-5 border-b pb-4 text-lg text-[#FFFFFF] md:mb-6 md:text-xl ${theme.borderSoft}`}>
                                    {skillGroup.category}
                                </h3>
                                <div className="flex flex-wrap gap-3">
                                    {skillGroup.items.map((skill) => (
                                        <span
                                            key={skill}
                                            className={`border px-3.5 py-2 font-label text-[11px] uppercase tracking-[0.08em] ${theme.techBadge}`}
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
    );
};

export default Skills;
