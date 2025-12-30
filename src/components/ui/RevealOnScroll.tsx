import React, { useEffect, useRef, useState } from 'react';

interface RevealOnScrollProps {
    children: React.ReactNode;
    threshold?: number;
    delay?: number;
    className?: string;
    direction?: 'up' | 'left' | 'right';
}

export const RevealOnScroll: React.FC<RevealOnScrollProps> = ({
    children,
    threshold = 0.1,
    delay = 0,
    className = "",
    direction = 'up'
}) => {
    const [isVisible, setIsVisible] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsVisible(true);
                    observer.unobserve(entry.target);
                }
            },
            {
                threshold,
                rootMargin: '0px 0px -50px 0px' // Trigger slightly before element is fully in view
            }
        );

        if (ref.current) {
            observer.observe(ref.current);
        }

        return () => {
            if (ref.current) {
                observer.unobserve(ref.current);
            }
        };
    }, [threshold]);

    const getTransformClass = () => {
        switch (direction) {
            case 'left': return '-translate-x-10';
            case 'right': return 'translate-x-10';
            default: return 'translate-y-10';
        }
    };

    return (
        <div
            ref={ref}
            className={`transition-all duration-1000 ease-out ${isVisible
                    ? 'opacity-100 translate-y-0 translate-x-0'
                    : `opacity-0 ${getTransformClass()}`
                } ${className}`}
            style={{ transitionDelay: `${delay}ms` }}
        >
            {children}
        </div>
    );
};
