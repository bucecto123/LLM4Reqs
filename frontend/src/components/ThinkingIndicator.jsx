import React from "react";

const ThinkingIndicator = ({ size = "medium" }) => {
  const sizeClasses = {
    small: { fish: "text-lg", container: "gap-1", dot: "w-1.5 h-1.5" },
    medium: { fish: "text-2xl", container: "gap-1.5", dot: "w-2 h-2" },
    large: { fish: "text-4xl", container: "gap-2", dot: "w-2.5 h-2.5" },
  };
  const { fish, container, dot } = sizeClasses[size] || sizeClasses.medium;

  return (
    <div className="flex items-center gap-3 px-4 py-3">
      {/* Animated fish group */}
      <div className="relative flex items-center">
        <div
          className={`${fish} transition-all duration-300`}
          style={{
            animation: "fishWiggle 1.2s ease-in-out infinite",
            display: "inline-block",
          }}
        >
          🐟
        </div>
        {/* Bubble trail */}
        <div className="absolute -top-1 left-5 flex gap-1">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className={`${dot} rounded-full bg-blue-300 opacity-60`}
              style={{
                animation: `bubbleFloat 1.5s ease-in infinite`,
                animationDelay: `${i * 0.4}s`,
              }}
            />
          ))}
        </div>
      </div>

      {/* Thinking dots */}
      <div className={`flex ${container} items-center`}>
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className={`${dot} bg-indigo-400 rounded-full`}
            style={{
              animation: `thinkingBounce 1.2s ease-in-out infinite`,
              animationDelay: `${i * 0.2}s`,
            }}
          />
        ))}
      </div>

      {/* Wave decoration */}
      <div className="flex items-center gap-0.5 ml-1">
        {[0, 1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="w-0.5 bg-indigo-200 rounded-full"
            style={{
              height: "6px",
              animation: `waveOscillate 0.8s ease-in-out infinite`,
              animationDelay: `${i * 0.1}s`,
            }}
          />
        ))}
      </div>
    </div>
  );
};

export default ThinkingIndicator;





