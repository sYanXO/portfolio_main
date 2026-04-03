import React from 'react';
import { Mail } from 'lucide-react';
import Reveal from './Reveal';

const Contact = ({ theme }) => {
    const currentYear = new Date().getFullYear();

    return (
        <section id="contact" className={`mt-4 border-t px-5 py-16 sm:px-6 md:mt-6 md:py-20 lg:py-24 ${theme.borderSoft}`}>
            <Reveal>
                <div className="mx-auto max-w-4xl border border-[#222222] bg-[#111111] p-6 md:p-10">
                    <div className="eyebrow-copy text-[#999999]">[ CONTACT ]</div>
                    <h2 className="font-display mt-4 text-[2.75rem] leading-[0.92] tracking-[-0.05em] text-[#FFFFFF] md:text-[4rem]">
                        LET&apos;S BUILD
                        <br />
                        SOMETHING REAL.
                    </h2>
                    <p className={`body-copy mt-6 max-w-2xl text-lg md:text-[1.1rem] ${theme.textMuted}`}>
                        I&apos;m currently looking for SDE roles. If you have a backend-heavy problem, distributed systems work,
                        or a product that needs disciplined engineering, get in touch.
                    </p>

                    <div className="mt-8 flex flex-wrap gap-3">
                        <a
                            href="mailto:desreayan@gmail.com"
                            className={`interactive-focus inline-flex min-h-11 items-center gap-3 rounded-full px-8 py-4 font-label text-[13px] uppercase tracking-[0.08em] ${theme.button}`}
                        >
                            <Mail size={18} /> [ Say Hello ]
                        </a>
                    </div>

                    <div className={`mt-14 border-t border-[#222222] pt-6 text-sm font-label uppercase tracking-[0.08em] ${theme.textMuted}`}>
                        <p>&copy; {currentYear} Sreayan. Built with React & Tailwind.</p>
                    </div>
                </div>
            </Reveal>
        </section>
    );
};

export default Contact;
