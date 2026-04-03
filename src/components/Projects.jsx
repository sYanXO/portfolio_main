import React from 'react';
import { Code, ExternalLink, CircleDot } from 'lucide-react';
import Reveal from './Reveal';
import { projects } from '../data/index.jsx';

const statusConfig = {
    active: {
        label: '[ ACTIVE ]',
        badgeClass: 'text-[#4A9E5C] border-[#4A9E5C]'
    },
    completed: {
        label: '[ COMPLETE ]',
        badgeClass: 'text-[#D4A843] border-[#D4A843]'
    },
    abandoned: {
        label: '[ ARCHIVED ]',
        badgeClass: 'text-[#D71921] border-[#D71921]'
    }
};

const Projects = ({ theme }) => {
    return (
        <section id="projects" className="px-5 py-16 sm:px-6 md:py-20 lg:py-24">
            <div className="max-w-6xl mx-auto">
                <Reveal>
                    <div className="mb-10 border-b border-[#222222] pb-6 md:mb-12 lg:mb-14">
                        <div className="eyebrow-copy text-[#999999]">[ PROJECTS ]</div>
                        <h2 className="section-title mt-3 flex items-center gap-4">
                            <Code className={theme.accent} size={28} /> Build Log
                        </h2>
                    </div>
                </Reveal>

                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-7 lg:gap-8">
                    {projects.map((project, idx) => {
                        const status = statusConfig[project.status] || statusConfig.completed;
                        const codeLink = project.githubLink || project.link;

                        return (
                            <Reveal key={idx} delay={idx * 100}>
                                <div className={`group relative flex h-full flex-col border p-6 md:p-7 lg:p-8 ${theme.cardGlass}`}>
                                    <div className="mb-5 md:mb-6">
                                        <div className={`mb-5 inline-flex border border-[#222222] p-3 md:mb-6 md:p-4 ${theme.iconGlow}`}>
                                            {project.icon}
                                        </div>

                                        <div className="absolute top-5 right-5 md:top-6 md:right-6">
                                            <span className={`inline-flex items-center gap-2 border px-3 py-1 font-label text-[11px] uppercase tracking-[0.08em] ${status.badgeClass}`}>
                                                <CircleDot size={12} /> {status.label}
                                            </span>
                                        </div>

                                        <div className="label-copy text-[#666666]">PROJECT</div>
                                        <h3 className="card-title mb-3 mt-2 text-xl text-[#FFFFFF] sm:text-2xl">
                                            {project.title}
                                        </h3>
                                        <div className="flex flex-wrap gap-2 mb-5 md:mb-6">
                                            {project.tech.map((t) => (
                                                <span key={t} className={`border px-3 py-1 font-label text-[11px] uppercase tracking-[0.08em] ${theme.techBadge}`}>
                                                    {t}
                                                </span>
                                            ))}
                                        </div>
                                        <p
                                            className={`mb-6 border-t border-[#222222] pt-5 text-sm leading-7 md:mb-8 md:text-[0.96rem] ${theme.textMuted}`}
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
                                                className="interactive-focus inline-flex min-h-11 items-center gap-2 border px-4 py-2 font-label text-[12px] uppercase tracking-[0.08em] text-[#E8E8E8] hover:border-[#FFFFFF] hover:text-[#FFFFFF]"
                                            >
                                                <ExternalLink size={16} /> [ Code ]
                                            </a>
                                        ) : (
                                            <span className={`font-label text-[12px] uppercase tracking-[0.08em] opacity-60 ${theme.textMuted}`}>
                                                [ Code unavailable ]
                                            </span>
                                        )}
                                        {project.liveLink && (
                                            <a
                                                href={project.liveLink}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="interactive-focus inline-flex min-h-11 items-center gap-2 rounded-full bg-[#FFFFFF] px-4 py-2 font-label text-[12px] uppercase tracking-[0.08em] text-[#000000] hover:bg-[#E8E8E8]"
                                            >
                                                <ExternalLink size={16} /> [ Live ]
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
