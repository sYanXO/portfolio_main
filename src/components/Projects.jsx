import React from 'react';
import { Code, ExternalLink, CircleDot } from 'lucide-react';
import Reveal from './Reveal';
import { projects } from '../data/index.jsx';

const statusConfig = {
    active: {
        label: 'Under Development',
        badgeClass: 'text-green-300 bg-green-500/15 border-green-500/40',
        dotClass: 'bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]'
    },
    completed: {
        label: 'Completed',
        badgeClass: 'text-orange-300 bg-orange-500/15 border-orange-500/40',
        dotClass: 'bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.6)]'
    },
    abandoned: {
        label: 'Abandoned',
        badgeClass: 'text-red-300 bg-red-500/15 border-red-500/40',
        dotClass: 'bg-red-500 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.6)]'
    }
};

const Projects = ({ theme }) => {
    return (
        <section id="projects" className="py-16 md:py-20 lg:py-24 px-5 sm:px-6">
            <div className="max-w-6xl mx-auto">
                <Reveal>
                    <h2 className="section-title mb-10 md:mb-12 lg:mb-14 flex items-center gap-4">
                        <Code className={theme.accent} size={32} /> Featured Projects
                    </h2>
                </Reveal>

                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-7 lg:gap-8">
                    {projects.map((project, idx) => {
                        const status = statusConfig[project.status] || statusConfig.completed;
                        const codeLink = project.githubLink || project.link;

                        return (
                            <Reveal key={idx} delay={idx * 100}>
                                <div className={`group relative p-6 md:p-7 lg:p-8 rounded-2xl flex flex-col h-full transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl ${theme.cardGlass}`}>
                                    <div className="mb-5 md:mb-6">
                                        <div className={`inline-flex p-3 md:p-4 rounded-xl mb-5 md:mb-6 transition-transform group-hover:scale-110 duration-500 ${theme.iconGlow}`}>
                                            {project.icon}
                                        </div>

                                        <div className="absolute top-5 right-5 md:top-6 md:right-6">
                                            <span className={`inline-flex items-center gap-2 text-xs font-semibold tracking-[0.06em] px-3 py-1 rounded-full border ${status.badgeClass}`}>
                                                <CircleDot size={12} /> {status.label}
                                            </span>
                                        </div>

                                        <h3 className="card-title text-xl sm:text-2xl mb-3 group-hover:text-[#F2FAFF] transition-colors">
                                            {project.title}
                                        </h3>
                                        <div className="flex flex-wrap gap-2 mb-5 md:mb-6">
                                            {project.tech.map((t) => (
                                                <span key={t} className={`text-xs font-semibold tracking-[0.08em] uppercase px-3 py-1 rounded-full ${theme.techBadge}`}>
                                                    {t}
                                                </span>
                                            ))}
                                        </div>
                                        <p
                                            className={`text-sm md:text-[0.96rem] leading-7 mb-6 md:mb-8 ${theme.textMuted}`}
                                            style={{
                                                display: '-webkit-box',
                                                WebkitLineClamp: 3,
                                                WebkitBoxOrient: 'vertical',
                                                overflow: 'hidden'
                                            }}
                                        >
                                            {project.desc}
                                        </p>
                                    </div>

                                    <div className={`mt-auto pt-5 md:pt-6 border-t ${theme.borderSoft} flex items-center gap-3 flex-wrap`}>
                                        {codeLink ? (
                                            <a
                                                href={codeLink}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="btn-secondary inline-flex items-center gap-2 text-sm font-semibold tracking-[-0.01em]"
                                            >
                                                View Code <ExternalLink size={16} />
                                            </a>
                                        ) : (
                                            <span className={`text-sm font-semibold opacity-60 ${theme.textMuted}`}>
                                                Code unavailable
                                            </span>
                                        )}
                                        {project.liveLink && (
                                            <a
                                                href={project.liveLink}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center gap-2 text-sm font-semibold tracking-[-0.01em] px-4 py-2 rounded-lg bg-[#CFE7F3] text-[#011122] hover:bg-[#F2FAFF] interactive-focus"
                                            >
                                                Live Demo <ExternalLink size={16} />
                                            </a>
                                        )}
                                    </div>
                                </div>
                            </Reveal>
                        );
                    })}
                </div>
            </div>
        </section>
    );
};

export default Projects;
