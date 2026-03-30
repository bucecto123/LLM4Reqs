import React, { useEffect, useState } from "react";

/**
 * Wraps children with a staggered entrance animation.
 * Each child gets a delay based on its index.
 * Props:
 *   delayMs (default 50) — delay per item
 *   direction ('up'|'left'|'right'|'scale') — default 'up'
 *   duration (default 300)
 *   stagger (default true) — whether to stagger children
 *   className — passed to wrapper
 */
export const AnimateIn = ({
  children,
  delayMs = 50,
  direction = "up",
  duration = 300,
  stagger = true,
  className = "",
  style: wrapperStyle = {},
}) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const directionStyles = {
    up: { transform: "translateY(16px)", opacity: 0 },
    left: { transform: "translateX(-16px)", opacity: 0 },
    right: { transform: "translateX(16px)", opacity: 0 },
    scale: { transform: "scale(0.95)", opacity: 0 },
  };

  const childrenArray = React.Children.toArray(children);
  const animStyle = visible ? { transform: "none", opacity: 1 } : directionStyles[direction];

  const child = (index) => (
    <div
      key={index}
      style={{
        ...animStyle,
        transition: `transform ${duration}ms cubic-bezier(0.34, 1.56, 0.64, 1), opacity ${duration}ms ease-out`,
        transitionDelay: stagger ? `${index * delayMs}ms` : "0ms",
      }}
    >
      {childrenArray[index]}
    </div>
  );

  return (
    <div className={className} style={wrapperStyle}>
      {childrenArray.map((_, i) => child(i))}
    </div>
  );
};
