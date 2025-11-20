import React from 'react';
import { Mail } from 'lucide-react';
import Reveal from './Reveal';

const Contact = ({ theme }) => {
    return (
        <section id="contact" className={`py-32 px-6 mt-10 border-t ${theme.border}`}>
            <Reveal>
                <div className="max-w-4xl mx-auto text-center">
                    <h2 className="text-4xl md:text-5xl font-bold mb-8">Let's Build Something Scalable.</h2>
                    <p className={`mb-12 max-w-xl mx-auto text-xl leading-relaxed ${theme.textMuted}`}>
                        I'm currently looking for SDE roles. If you have a challenging problem involving distributed systems or backend engineering, I'd love to chat.
                    </p>

                    <a
                        href="mailto:desreayan@gmail.com"
                        className={`inline-flex items-center gap-3 px-10 py-5 rounded-xl font-bold text-xl transition-all duration-300 hover:scale-105 hover:shadow-xl ${theme.button}`}
                    >
                        <Mail size={24} /> Say Hello
                    </a>

                    <div className={`mt-24 text-sm font-medium ${theme.textMuted}`}>
                        <p>&copy; 2025 Sreayan. Built with React & Tailwind.</p>
                    </div>
                </div>
            </Reveal>
        </section>
    );
};

export default Contact;
