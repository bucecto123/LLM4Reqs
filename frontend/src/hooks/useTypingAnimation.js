import { useState, useEffect, useRef } from "react";

/**
 * Custom hook for client-side typing animation
 * @param {string} fullText - The complete text to type out
 * @param {number} speed - Milliseconds per character (default: 20)
 * @param {boolean} shouldStart - Whether to start the animation (default: true)
 * @returns {Object} { displayedText, isTyping, reset }
 */
export const useTypingAnimation = (
  fullText = "",
  speed = 20,
  shouldStart = true
) => {
  const [displayedText, setDisplayedText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const hasStarted = useRef(false);
  const timeoutRef = useRef(null);

  useEffect(() => {
    // Clean up previous timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Don't start if not ready or already started
    if (!shouldStart || !fullText || hasStarted.current) {
      return;
    }

    hasStarted.current = true;
    setIsTyping(true);
    setDisplayedText("");

    let currentIndex = 0;

    const typeNextChar = () => {
      if (currentIndex < fullText.length) {
        setDisplayedText(fullText.substring(0, currentIndex + 1));
        currentIndex++;
        timeoutRef.current = setTimeout(typeNextChar, speed);
      } else {
        setIsTyping(false);
      }
    };

    typeNextChar();

    // Cleanup function
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [fullText, speed, shouldStart]);

  const reset = () => {
    hasStarted.current = false;
    setDisplayedText("");
    setIsTyping(false);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  };

  return {
    displayedText,
    isTyping,
    reset,
  };
};

export default useTypingAnimation;
