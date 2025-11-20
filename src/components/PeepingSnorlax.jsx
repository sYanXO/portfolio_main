import React, { useState } from 'react';

const PeepingSnorlax = ({ darkMode }) => {
    const [message, setMessage] = useState("Zzz...");

    const messages = [
        "He writes code. I write Zzz's. We make a good team.",
        "Hire him. He promised to buy me a bigger beanbag.",
        "I reviewed his PRs... mostly while dreaming. LGTM.",
        "He handles concurrency. I handle dormancy.",
        "Is it a bug or a feature? I'm too tired to check...",
        "He knows how to center a div. But prefers microservices. Zzz...",
        "O(log n)? I prefer O(sleep n).",
        "He optimizes backends. I optimize napping.",
        "10x developer? No, I sleep 10x more than him.",
        "Wait, are you a recruiter? Do you have snacks?",
        "His code compiles... eventually. Zzz...",
        "He works hard so I don't have to.",
        "Checking for race conditions... *yawn*... looks safe.",
        "CAP theorem? I choose Consistency... in sleeping.",
        "He manages state. I remain stateless (and asleep)."
    ];

    const handleMouseEnter = () => {
        const randomIndex = Math.floor(Math.random() * messages.length);
        setMessage(messages[randomIndex]);
    };

    return (
        <div
            className="fixed bottom-0 right-5 z-50 group hidden md:block"
            onMouseEnter={handleMouseEnter}
        >
            {/* Floating Message Bubble */}
            <div className={`absolute bottom-32 right-0 w-64 p-4 rounded-2xl shadow-xl opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-8 group-hover:translate-y-0 pointer-events-none border-2 ${darkMode ? 'bg-[#1e1e2e] border-[#fab387] text-[#cdd6f4]' : 'bg-white border-[#fe640b] text-[#4c4f69]'}`}>
                <p className="text-sm font-bold italic leading-relaxed">
                    "{message}"
                </p>
                {/* Bubble Triangle */}
                <div className={`absolute -bottom-2 right-12 w-4 h-4 border-b-2 border-r-2 transform rotate-45 ${darkMode ? 'bg-[#1e1e2e] border-[#fab387]' : 'bg-white border-[#fe640b]'}`}></div>
            </div>

            {/* Snorlax GIF */}
            <img
                src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/animated/143.gif"
                alt="Snorlax Awake"
                className="w-32 h-32 object-contain filter drop-shadow-2xl cursor-pointer transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-2"
            />
        </div>
    );
};

export default PeepingSnorlax;
