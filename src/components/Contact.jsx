import React from 'react';
import { Mail } from 'lucide-react';
import Reveal from './Reveal';

const Contact = ({ theme }) => {
    const currentYear = new Date().getFullYear();

    return (
        <section id="contact" className={`py-16 md:py-20 lg:py-24 px-5 sm:px-6 mt-4 md:mt-6 border-t ${theme.borderSoft}`}>
            <Reveal>
                <div className="max-w-4xl mx-auto text-center">
                    <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-semibold tracking-[-0.04em] mb-6 md:mb-8">Let's Build Something Scalable.</h2>
                    <p className={`body-copy mb-8 md:mb-10 max-w-xl mx-auto text-lg md:text-[1.2rem] ${theme.textMuted}`}>
                        I'm currently looking for SDE roles. If you have a challenging problem involving distributed systems or backend engineering, I'd love to chat.
                    </p>

                    <a
                        href="mailto:desreayan@gmail.com"
                        className={`inline-flex items-center gap-3 px-8 py-4 md:px-10 md:py-5 rounded-xl font-semibold tracking-[-0.02em] text-lg md:text-xl transition-all duration-300 hover:scale-105 hover:shadow-xl interactive-focus ${theme.button}`}
                    >
                        <Mail size={24} /> Say Hello
                    </a>

                    <div className={`mt-14 md:mt-16 text-sm font-medium ${theme.textMuted}`}>
                        <p>&copy; {currentYear} Sreayan. Built with React & Tailwind.</p>
                    </div>
                </div>
            </Reveal>
        </section>
    );
};

export default Contact;
