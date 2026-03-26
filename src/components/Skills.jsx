import React from 'react';
import { Cpu } from 'lucide-react';
import Reveal from './Reveal';
import { skills } from '../data/index.jsx';

const Skills = ({ theme }) => {
    return (
        <section id="skills" className="py-20 md:py-24 lg:py-32 px-5 sm:px-6">
            <div className="max-w-4xl mx-auto">
                <Reveal>
                    <h2 className="section-title mb-12 md:mb-14 lg:mb-16 flex items-center gap-4">
                        <Cpu className={theme.accent} size={32} /> Technical Arsenal
                    </h2>
                </Reveal>

                <div className="grid md:grid-cols-2 gap-6 md:gap-8">
                    {skills.map((skillGroup, idx) => (
                        <Reveal key={idx} delay={idx * 100}>
                            <div className={`p-6 md:p-8 rounded-2xl h-full transition-all duration-300 hover:bg-opacity-80 ${theme.cardGlass}`}>
                                <h3 className={`card-title text-lg md:text-xl mb-5 md:mb-6 border-b border-[#333333] pb-4`}>{skillGroup.category}</h3>
                                <div className="flex flex-wrap gap-3">
                                    {skillGroup.items.map((skill) => (
                                        <span
                                            key={skill}
                                            className={`px-3.5 py-2 rounded-lg text-sm font-semibold tracking-[-0.01em] transition-all hover:scale-105 bg-[#333333] text-[#888888] hover:bg-[#EDEDED] hover:text-[#000000]`}
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
