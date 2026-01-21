import React from 'react';
import { GitHubCalendar } from 'react-github-calendar';
import { Github } from 'lucide-react';
import Reveal from './Reveal';

const GithubHeatmap = ({ theme }) => {
    // Custom theme for 2026 - GitHub Green
    const customTheme = {
        light: ['#161b22', '#0e4429', '#006d32', '#26a641', '#39d353'],
        dark: ['#161b22', '#0e4429', '#006d32', '#26a641', '#39d353'],
    };

    return (
        <section id="activity" className="py-20 px-6">
            <div className="max-w-5xl mx-auto">
                <Reveal>
                    <h2 className="text-3xl md:text-4xl font-bold mb-12 flex items-center gap-4">
                        <Github className={theme.accent} size={32} /> 2026 Contributions
                    </h2>
                </Reveal>

                <Reveal>
                    <div className={`p-8 rounded-3xl border transition-all duration-500 hover:shadow-2xl overflow-x-auto ${theme.cardGlass} flex justify-center`}>
                        <div className="min-w-[800px]">
                            <GitHubCalendar
                                username="sYanXO"
                                year={2026}
                                theme={customTheme}
                                blockSize={14}
                                blockMargin={4}
                                fontSize={14}
                                showWeekdayLabels={true}
                                style={{
                                    color: '#EDEDED',
                                }}
                            />
                        </div>
                    </div>
                </Reveal>
            </div>
        </section>
    );
};

export default GithubHeatmap;
