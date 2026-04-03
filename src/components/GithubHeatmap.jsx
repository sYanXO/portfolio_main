import React, { useEffect, useState } from 'react';
import { GitHubCalendar } from 'react-github-calendar';
import { Github } from 'lucide-react';
import Reveal from './Reveal';

const GithubHeatmap = ({ theme }) => {
    const [isMobile, setIsMobile] = useState(false);
    const currentYear = new Date().getFullYear();

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    const customTheme = {
        light: ['#111111', '#333333', '#666666', '#999999', '#FFFFFF'],
        dark: ['#111111', '#333333', '#666666', '#999999', '#FFFFFF'],
    };

    return (
        <section id="activity" className="px-5 py-16 sm:px-6 md:py-20">
            <div className="max-w-5xl mx-auto">
                <Reveal>
                    <div className="mb-10 border-b border-[#222222] pb-6 md:mb-12">
                        <div className="eyebrow-copy text-[#999999]">[ ACTIVITY ]</div>
                        <h2 className="section-title mt-3 flex items-center gap-4">
                            <Github className={theme.accent} size={28} /> {currentYear} Contributions
                        </h2>
                    </div>
                </Reveal>

                <Reveal>
                    <div className={`overflow-x-auto border p-4 md:p-8 ${theme.cardGlass}`}>
                        <div className="mb-5 flex items-center justify-between gap-4 border-b border-[#222222] pb-4">
                            <div>
                                <div className="label-copy text-[#666666]">SOURCE</div>
                                <div className="mt-2 font-body text-base text-[#E8E8E8]">github.com/sYanXO</div>
                            </div>
                            <a
                                href="https://github.com/sYanXO"
                                target="_blank"
                                rel="noreferrer"
                                className="interactive-focus inline-flex min-h-11 items-center border px-4 py-2 font-label text-[12px] uppercase tracking-[0.08em] text-[#E8E8E8] hover:border-[#FFFFFF] hover:text-[#FFFFFF]"
                            >
                                [ Open Profile ]
                            </a>
                        </div>
                        {isMobile ? (
                            <div className="w-full">
                                <GitHubCalendar
                                    username="sYanXO"
                                    year={currentYear}
                                    theme={customTheme}
                                    blockSize={10}
                                    blockMargin={3}
                                    fontSize={11}
                                    showWeekdayLabels={false}
                                    style={{ color: '#E8E8E8' }}
                                />
                            </div>
                        ) : (
                            <GitHubCalendar
                                username="sYanXO"
                                year={currentYear}
                                theme={customTheme}
                                blockSize={14}
                                blockMargin={4}
                                fontSize={14}
                                showWeekdayLabels={true}
                                style={{ color: '#E8E8E8' }}
                            />
                        )}
                    </div>
                </Reveal>
            </div>
        </section>
    );
};

export default GithubHeatmap;
