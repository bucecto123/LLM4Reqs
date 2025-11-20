import React from "react";

const ThinkingIndicator = () => {
  return (
    <div className="flex justify-start mb-4">
      <div className="max-w-xs sm:max-w-sm md:max-w-md lg:max-w-lg xl:max-w-2xl px-4 py-3 rounded-lg shadow-sm bg-gray-100 text-gray-800 rounded-bl-none">
        <span
          className="fish-thinking inline-block"
          style={{ transform: "scaleX(-1)", fontSize: "1rem" }}
          aria-label="AI is thinking"
        >
          🐟
        </span>
      </div>
    </div>
  );
};

export default ThinkingIndicator;

