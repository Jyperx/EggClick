import React, { useEffect, useState, useRef } from 'react';

interface AnimatedCounterProps {
  value: number;
  className?: string;
}

export default function AnimatedCounter({ value, className = '' }: AnimatedCounterProps) {
  const [displayValue, setDisplayValue] = useState(value);
  const targetValueRef = useRef(value);

  useEffect(() => {
    targetValueRef.current = value;
  }, [value]);

  useEffect(() => {
    let animationFrameId: number;
    let lastTime = performance.now();

    const animate = (currentTime: number) => {
      const target = targetValueRef.current;
      
      // Diferencia entre el mostrado y el real
      const diff = target - displayValue;

      if (diff > 0) {
        // Velocidad de la ruleta: avanza un porcentaje de la diferencia, o mínimo 1.
        // Mientras más grande la diferencia, más rápido gira.
        const speed = Math.max(1, Math.ceil(diff * 0.1));
        setDisplayValue(prev => Math.min(prev + speed, target));
      } else if (diff < 0) {
        // En caso de que baje (no debería en este juego, pero por si acaso)
        const speed = Math.max(1, Math.ceil(Math.abs(diff) * 0.1));
        setDisplayValue(prev => Math.max(prev - speed, target));
      }

      animationFrameId = requestAnimationFrame(animate);
    };

    animationFrameId = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(animationFrameId);
  }, [displayValue]);

  return (
    <span className={className}>
      {displayValue.toLocaleString()}
    </span>
  );
}
