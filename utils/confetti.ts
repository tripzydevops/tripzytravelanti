import confetti from 'canvas-confetti';

/**
 * Trigger a celebratory confetti animation
 * @param type - Type of confetti animation ('default' | 'burst' | 'rain')
 */
export const triggerConfetti = (type: 'default' | 'burst' | 'rain' = 'default') => {
    const duration = 3000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 9999 };

    const randomInRange = (min: number, max: number) => {
        return Math.random() * (max - min) + min;
    };

    if (type === 'burst') {
        // Single burst from center
        confetti({
            ...defaults,
            particleCount: 100,
            origin: { x: 0.5, y: 0.5 }
        });
    } else if (type === 'rain') {
        // Continuous rain effect
        const interval = setInterval(() => {
            const timeLeft = animationEnd - Date.now();

            if (timeLeft <= 0) {
                return clearInterval(interval);
            }

            const particleCount = 50 * (timeLeft / duration);

            confetti({
                ...defaults,
                particleCount,
                origin: { x: randomInRange(0.1, 0.9), y: Math.random() - 0.2 }
            });
        }, 250);
    } else {
        // Default: Multiple bursts from sides
        const interval = setInterval(() => {
            const timeLeft = animationEnd - Date.now();

            if (timeLeft <= 0) {
                return clearInterval(interval);
            }

            const particleCount = 50 * (timeLeft / duration);

            // Left side
            confetti({
                ...defaults,
                particleCount,
                origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 }
            });

            // Right side
            confetti({
                ...defaults,
                particleCount,
                origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 }
            });
        }, 250);
    }
};
