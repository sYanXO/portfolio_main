import React from 'react';
import { Code, ExternalLink } from 'lucide-react';
import Reveal from './Reveal';
import { getProjects } from '../data/index.jsx';

const Projects = ({ theme }) => {
    const projects = getProjects();

    return (
        <section id="projects" className="py-32 px-6">
            <div className="max-w-6xl mx-auto">
                <Reveal>
                    <h2 className="text-3xl md:text-4xl font-bold mb-16 flex items-center gap-4">
                        <Code className={theme.accent} size={32} /> Featured Projects
                    </h2>
                </Reveal>

                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {projects.map((project, idx) => (
                        <Reveal key={idx} delay={idx * 100}>
                            <div className={`group relative p-8 rounded-2xl flex flex-col h-full transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl ${theme.cardGlass}`}>
                                <div className="mb-6">
                                    <div className={`inline-flex p-4 rounded-xl bg-opacity-10 mb-6 transition-transform group-hover:scale-110 duration-500 bg-[#FFFFFF]/5`}>
                                        {project.icon}
                                    </div>

                                    {/* Status Signal */}
                                    <div className="absolute top-6 right-6 flex items-center gap-3">
                                        {project.status === 'active' && (
                                            <span className={`text-xs font-medium text-green-400`}>
                                                Under development
                                            </span>
                                        )}
                                        {project.status === 'completed' && (
                                            <span className={`text-xs font-medium text-orange-400`}>
                                                Completed
                                            </span>
                                        )}
                                        {project.status === 'abandoned' && (
                                            <span className={`text-xs font-medium text-red-400`}>
                                                Abandoned
                                            </span>
                                        )}

                                        <div className={`w-3 h-3 rounded-full ${project.status === 'active' ? 'bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]' :
                                            project.status === 'abandoned' ? 'bg-red-500 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.6)]' :
                                                'bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.6)]'
                                            }`} />
                                    </div>
                                    <h3 className="text-2xl font-bold mb-3 group-hover:text-[#FFFFFF] transition-colors">
                                        {project.title}
                                    </h3>
                                    <div className="flex flex-wrap gap-2 mb-6">
                                        {project.tech.map((t) => (
                                            <span key={t} className={`text-xs font-bold tracking-wide uppercase px-3 py-1 rounded-full ${theme.techBadge}`}>
                                                {t}
                                            </span>
                                        ))}
                                    </div>
                                    <p className={`text-base leading-relaxed mb-8 ${theme.textMuted}`}>
                                        {project.desc}
                                    </p>
                                </div>

                                <div className={`mt-auto pt-6 border-t border-[#333333] flex justify-between items-center`}>
                                    <a
                                        href={project.link}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-sm font-bold flex items-center gap-2 hover:underline decoration-2 underline-offset-4"
                                    >
                                        View Code <ExternalLink size={16} />
                                    </a>
                                </div>
                            </div>
                        </Reveal>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default Projects;
