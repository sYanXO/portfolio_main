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

export const getProjects = (darkMode) => [
    {
        title: "DB Uploader",
        tech: ["Golang", "Concurrency", "PostgreSQL"],
        desc: "High-performance Go application designed to efficiently read large JSON datasets and upload them to a database using concurrent workers.",
        link: "https://github.com/sreayan-oss/db-uploader",
        status: "active",
        icon: <Database className={darkMode ? "text-[#cba6f7]" : "text-[#8839ef]"} /> // Purple
    },
    {
        title: "Go-Arbitrage-Bot",
        tech: ["Golang", "Concurrency", "WebSockets"],
        desc: "High-concurrency CLI tool detecting price anomalies across Binance & Coinbase. Implemented Fan-In/Fan-Out patterns to handle asynchronous data streams without lock contention.",
        link: "https://github.com/sreayan-oss/arb-bot",
        status: "completed",
        icon: <Cpu className={darkMode ? "text-[#f38ba8]" : "text-[#d20f39]"} /> // Red
    },
    {
        title: "Market-Neutral Quant Strategy",
        tech: ["Python", "Pandas", "Finance", "ML"],
        desc: "Backtested mean reversion strategy on 60+ tickers achieving 13.46% cumulative return. Implemented dynamic stop-loss (ATR-based) and regime filtering.",
        link: "https://github.com/sYanXO/NSE-meanReversion-strategy",
        status: "completed",
        icon: <TrendingUp className={darkMode ? "text-[#a6e3a1]" : "text-[#40a02b]"} /> // Green
    },
    {
        title: "Vercel Clone",
        tech: ["React", "AWS S3", "Redis", "Docker"],
        desc: "Automated deployment platform for static sites. Uses SQS for decoupling builds and S3 for storage, mimicking core Vercel architecture.",
        link: "#",
        status: "abandoned",
        icon: <Server className={darkMode ? "text-[#89b4fa]" : "text-[#1e66f5]"} /> // Blue
    }
];

export const skills = [
    { category: "Languages", items: ["Golang", "C++", "Python", "TypeScript", "JavaScript"] },
    { category: "Backend & Cloud", items: ["AWS S3", "Redis", "PostgreSQL", "MongoDB", "Node.js"] },
    { category: "Frontend", items: ["React.js", "Tailwind", "HTML/CSS"] },
    { category: "Data & ML", items: ["Pandas", "NumPy", "PyTorch", "Matplotlib"] },
];
