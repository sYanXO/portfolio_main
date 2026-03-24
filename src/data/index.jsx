import React from 'react';
import {
    Layers,
    BookOpen,
    GraduationCap,
    Cpu,
    TrendingUp,
    Server,
    Database
} from 'lucide-react';

export const experiences = [
    {
        company: "CipherByte Technologies",
        role: "Full Stack Developer Intern",
        period: "Aug 2024 - Dec 2024",
        desc: "Engineered the backend architecture for a scalable e-commerce platform. Optimized database indexing and API response times to support 100+ concurrent users and high-volume transaction flows.",
        icon: <Layers size={20} />
    },
    {
        company: "Jadavpur University",
        role: "Research Intern (Deep Learning)",
        period: "May 2023 - Aug 2023",
        desc: "Achieved 95% accuracy in handwritten Indic script recognition using Deep Neural Networks. Co-authored a conference paper on fine-tuning model parameters.",
        icon: <BookOpen size={20} />
    }
];

export const education = [
    {
        school: "B.P Poddar Institute of Management and Technology",
        degree: "B.Tech in Electronics and Communication Engineering",
        period: "Aug 2021 - July 2025",
        grade: "CGPA: 7.4",
        location: "Kolkata, West Bengal",
        icon: <GraduationCap size={20} />
    }
];

export const projects = [
    {
        title: "Stake IPL",
        tech: ["Next.js 15", "React 19", "TypeScript", "Prisma", "PostgreSQL"],
        desc: "Full-stack IPL prediction platform with fictional coins, admin-managed markets, and live leaderboards.",
        githubLink: "https://github.com/sYanXO/Steak",
        liveLink: "https://steak-hjli.vercel.app/",
        status: "active",
        icon: <Database className="text-[#EDEDED]" />
    },
    {
        title: "OptiShrink",
        tech: ["REACT", "VITE", "Javascript"],
        desc: "Client-side image compressor built to hit strict file-size targets with no uploads or backend dependency.",
        githubLink: "https://github.com/sYanXO/Opti-Shrink",
        liveLink: "https://opti-shrink.vercel.app/",
        status: "active",
        icon: <Layers className="text-[#EDEDED]" />
    },
    {
        title: "DB Uploader",
        tech: ["Golang", "Concurrency", "PostgreSQL"],
        desc: "High-throughput Go uploader for ingesting large JSON datasets into PostgreSQL with concurrent workers.",
        link: "https://github.com/sYanXO/db-uploader",
        status: "active",
        icon: <Database className="text-[#EDEDED]" />
    },
    {
        title: "Go-Arbitrage-Bot",
        tech: ["Golang", "Concurrency", "WebSockets"],
        desc: "Concurrent CLI bot that monitors exchange feeds and detects arbitrage gaps across Binance and Coinbase.",
        link: "https://github.com/sYanXO/arb-bot",
        status: "completed",
        icon: <Cpu className="text-[#EDEDED]" />
    },
    {
        title: "Market-Neutral Quant Strategy",
        tech: ["Python", "Pandas", "Finance", "ML"],
        desc: "Backtested mean reversion strategy with regime filters and ATR-based risk controls across 60+ tickers.",
        link: "https://github.com/sYanXO/NSE-meanReversion-strategy",
        status: "completed",
        icon: <TrendingUp className="text-[#EDEDED]" />
    },
    {
        title: "Vercel Clone",
        tech: ["React", "AWS S3", "Redis", "Docker"],
        desc: "Static-site deployment platform exploring queued builds, object storage, and Vercel-style architecture.",
        link: null,
        status: "abandoned",
        icon: <Server className="text-[#EDEDED]" />
    }
];

export const skills = [
    { category: "Languages", items: ["Golang", "C++", "Python", "TypeScript", "JavaScript"] },
    { category: "Backend & Cloud", items: ["AWS S3", "Redis", "PostgreSQL", "MongoDB", "Node.js"] },
    { category: "Frontend", items: ["React.js", "Tailwind", "HTML/CSS"] },
    { category: "Data & ML", items: ["Pandas", "NumPy", "PyTorch", "Matplotlib"] },
];
