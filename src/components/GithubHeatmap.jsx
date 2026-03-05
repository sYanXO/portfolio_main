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

    // Custom GitHub green palette
    const customTheme = {
        light: ['#161b22', '#0e4429', '#006d32', '#26a641', '#39d353'],
        dark: ['#161b22', '#0e4429', '#006d32', '#26a641', '#39d353'],
    };

    return (
        <section id="activity" className="py-20 px-6">
            <div className="max-w-5xl mx-auto">
                <Reveal>
                    <h2 className="text-3xl md:text-4xl font-bold mb-12 flex items-center gap-4">
                        <Github className={theme.accent} size={32} /> {currentYear} Contributions
                    </h2>
                </Reveal>

                <Reveal>
                    <div className={`p-4 md:p-8 rounded-3xl border transition-all duration-500 hover:shadow-2xl overflow-x-auto ${theme.cardGlass} flex justify-center`}>
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
                                    style={{ color: '#EDEDED' }}
                                />
                                <a
                                    href="https://github.com/sYanXO"
                                    target="_blank"
                                    rel="noreferrer"
                                    className="mt-4 inline-flex text-sm font-semibold underline underline-offset-4 interactive-focus"
                                >
                                    View full activity on GitHub
                                </a>
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
                                style={{ color: '#EDEDED' }}
                            />
                        )}
                    </div>
                </Reveal>
            </div>
        </section>
    );
};

export default GithubHeatmap;
