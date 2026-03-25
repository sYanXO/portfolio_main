import React from 'react';
import { Mail } from 'lucide-react';
import Reveal from './Reveal';

const Contact = ({ theme }) => {
    const currentYear = new Date().getFullYear();

    return (
        <section id="contact" className={`py-20 md:py-24 lg:py-32 px-5 sm:px-6 mt-8 md:mt-10 border-t border-[#333333]`}>
            <Reveal>
                <div className="max-w-4xl mx-auto text-center">
                    <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6 md:mb-8">Let's Build Something Scalable.</h2>
                    <p className={`mb-10 md:mb-12 max-w-xl mx-auto text-lg md:text-xl leading-relaxed ${theme.textMuted}`}>
                        I'm currently looking for SDE roles. If you have a challenging problem involving distributed systems or backend engineering, I'd love to chat.
                    </p>

                    <a
                        href="mailto:desreayan@gmail.com"
                        className={`inline-flex items-center gap-3 px-8 py-4 md:px-10 md:py-5 rounded-xl font-bold text-lg md:text-xl transition-all duration-300 hover:scale-105 hover:shadow-xl interactive-focus ${theme.button}`}
                    >
                        <Mail size={24} /> Say Hello
                    </a>

                    <div className={`mt-20 md:mt-24 text-sm font-medium ${theme.textMuted}`}>
                        <p>&copy; {currentYear} Sreayan. Built with React & Tailwind.</p>
                    </div>
                </div>
            </Reveal>
        </section>
    );
};

export default Contact;
