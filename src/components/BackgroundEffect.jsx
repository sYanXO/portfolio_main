import React, { useEffect, useRef, useState } from 'react';

const BackgroundEffect = ({ darkMode }) => {
    const canvasRef = useRef(null);
    const mouseRef = useRef({ x: -1000, y: -1000 });
    const [isActive, setIsActive] = useState(false);

    useEffect(() => {
        if (darkMode) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        let animationFrameId;
        let particles = [];

        const resizeCanvas = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            if (isActive) {
                initParticles();
            }
        };

        const colors = ['#1e66f5', '#209fb5', '#179299', '#04a5e5']; // Blue/Teal shades

        class Particle {
            constructor() {
                this.x = Math.random() * canvas.width;
                this.y = Math.random() * canvas.height;
                this.size = Math.random() * 1.5 + 0.5; // Smaller size: 0.5px - 2px
                this.speedX = Math.random() * 0.4 - 0.2; // Slower, gentler float
                this.speedY = Math.random() * 0.4 - 0.2;
                this.color = colors[Math.floor(Math.random() * colors.length)];
                this.baseX = this.x;
                this.baseY = this.y;
                this.density = (Math.random() * 40) + 5; // Increased density factor for interaction
            }

            draw() {
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                ctx.closePath();
                ctx.fillStyle = this.color;
                ctx.fill();
            }

            update() {
                // Mouse interaction (Repulsion)
                let dx = mouseRef.current.x - this.x;
                let dy = mouseRef.current.y - this.y;
                let distance = Math.sqrt(dx * dx + dy * dy);
                let maxDistance = 120; // Slightly smaller interaction radius
                let forceDirectionX = dx / distance;
                let forceDirectionY = dy / distance;
                let force = (maxDistance - distance) / maxDistance;
                let directionX = forceDirectionX * force * this.density;
                let directionY = forceDirectionY * force * this.density;

                if (distance < maxDistance) {
                    this.x -= directionX * 2; // Gentler repulsion
                    this.y -= directionY * 2;
                } else {
                    // Return to original gentle floating path
                    if (this.x !== this.baseX) {
                        let dx = this.x - this.baseX;
                        this.x -= dx / 20; // Slower return
                    }
                    if (this.y !== this.baseY) {
                        let dy = this.y - this.baseY;
                        this.y -= dy / 20;
                    }
                }

                // Constant gentle float
                this.baseX += this.speedX;
                this.baseY += this.speedY;

                // Wrap around screen
                if (this.baseX > canvas.width) { this.baseX = 0; this.x = 0; }
                if (this.baseX < 0) { this.baseX = canvas.width; this.x = canvas.width; }
                if (this.baseY > canvas.height) { this.baseY = 0; this.y = 0; }
                if (this.baseY < 0) { this.baseY = canvas.height; this.y = canvas.height; }

                this.draw();
            }
        }

        const initParticles = () => {
            particles = [];
            // Significantly reduced density: divide by 45000 instead of 15000
            const numberOfParticles = (canvas.width * canvas.height) / 45000;
            for (let i = 0; i < numberOfParticles; i++) {
                particles.push(new Particle());
            }
        };

        const animate = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            for (let i = 0; i < particles.length; i++) {
                particles[i].update();
            }
            animationFrameId = requestAnimationFrame(animate);
        };

        const handleMouseMove = (e) => {
            mouseRef.current = { x: e.clientX, y: e.clientY };
            if (!isActive) {
                setIsActive(true);
            }
        };

        window.addEventListener('resize', resizeCanvas);
        window.addEventListener('mousemove', handleMouseMove);

        resizeCanvas();
        if (isActive) {
            if (particles.length === 0) initParticles();
            animate();
        }

        return () => {
            window.removeEventListener('resize', resizeCanvas);
            window.removeEventListener('mousemove', handleMouseMove);
            cancelAnimationFrame(animationFrameId);
        };
    }, [darkMode, isActive]);

    if (darkMode) return null;

    return (
        <canvas
            ref={canvasRef}
            className={`fixed inset-0 z-0 pointer-events-none transition-opacity duration-1000 ${isActive ? 'opacity-100' : 'opacity-0'}`}
            style={{ background: '#eff1f5' }}
        />
    );
};

export default BackgroundEffect;
