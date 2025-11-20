import React from 'react';
import { Cpu } from 'lucide-react';
import Reveal from './Reveal';
import { skills } from '../data/index.jsx';

const Skills = ({ theme, darkMode }) => {
    return (
        <section id="skills" className="py-32 px-6">
            <div className="max-w-4xl mx-auto">
                <Reveal>
                    <h2 className="text-3xl md:text-4xl font-bold mb-16 flex items-center gap-4">
                        <Cpu className={theme.accent} size={32} /> Technical Arsenal
                    </h2>
                </Reveal>

                <div className="grid md:grid-cols-2 gap-8">
                    {skills.map((skillGroup, idx) => (
                        <Reveal key={idx} delay={idx * 100}>
                            <div className={`p-8 rounded-2xl h-full transition-all duration-300 hover:bg-opacity-80 ${theme.cardGlass}`}>
                                <h3 className={`text-xl font-bold mb-6 border-b ${darkMode ? 'border-[#cdd6f4]/20' : 'border-[#4c4f69]/20'} pb-4`}>{skillGroup.category}</h3>
                                <div className="flex flex-wrap gap-3">
                                    {skillGroup.items.map((skill) => (
                                        <span
                                            key={skill}
                                            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all hover:scale-105 ${darkMode ? 'bg-[#45475a] text-[#cdd6f4] hover:bg-[#fab387] hover:text-[#1e1e2e]' : 'bg-[#bcc0cc]/50 text-[#4c4f69] hover:bg-[#fe640b] hover:text-[#eff1f5]'}`}
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
