import React from "react";
import { Settings } from "lucide-react";

/**
 * Settings panel for typing animation preferences
 * Add this to your DashBoard or Settings page
 */
const TypingAnimationSettings = ({
  animationEnabled,
  setAnimationEnabled,
  typingSpeed,
  setTypingSpeed,
}) => {
  const [isOpen, setIsOpen] = React.useState(false);

  const speeds = [
    { value: 10, label: "Very Fast" },
    { value: 20, label: "Fast" },
    { value: 30, label: "Normal" },
    { value: 50, label: "Slow" },
    { value: 100, label: "Very Slow" },
  ];

  return (
    <div className="relative">
      {/* Settings Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
        title="Animation Settings"
      >
        <Settings className="w-5 h-5 text-gray-600" />
      </button>

      {/* Settings Dropdown */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />

          {/* Panel */}
          <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 z-20 p-4">
            <h3 className="font-semibold text-gray-800 mb-3">
              Animation Settings
            </h3>

            {/* Enable/Disable Toggle */}
            <div className="mb-4">
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-sm text-gray-700">Typing Animation</span>
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={animationEnabled}
                    onChange={(e) => setAnimationEnabled(e.target.checked)}
                    className="sr-only"
                  />
                  <div
                    className={`w-11 h-6 rounded-full transition-colors ${
                      animationEnabled ? "bg-blue-500" : "bg-gray-300"
                    }`}
                  >
                    <div
                      className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                        animationEnabled ? "translate-x-5" : ""
                      }`}
                    />
                  </div>
                </div>
              </label>
              <p className="text-xs text-gray-500 mt-1">
                {animationEnabled
                  ? "Messages will appear with typing effect"
                  : "Messages will appear instantly"}
              </p>
            </div>

            {/* Speed Selector */}
            {animationEnabled && (
              <div>
                <label className="block text-sm text-gray-700 mb-2">
                  Animation Speed
                </label>
                <select
                  value={typingSpeed}
                  onChange={(e) => setTypingSpeed(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {speeds.map((speed) => (
                    <option key={speed.value} value={speed.value}>
                      {speed.label} ({speed.value}ms)
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Lower = faster typing
                </p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

/**
 * USAGE EXAMPLE:
 *
 * In your DashBoard.jsx or parent component:
 *
 * const [animationEnabled, setAnimationEnabled] = useState(true);
 * const [typingSpeed, setTypingSpeed] = useState(20);
 *
 * // In your header or toolbar:
 * <TypingAnimationSettings
 *   animationEnabled={animationEnabled}
 *   setAnimationEnabled={setAnimationEnabled}
 *   typingSpeed={typingSpeed}
 *   setTypingSpeed={setTypingSpeed}
 * />
 *
 * // When adding AI messages:
 * const aiMsg = {
 *   id: response.data.id,
 *   role: 'assistant',
 *   content: response.data.content,
 *   shouldAnimate: animationEnabled,  // Use the setting
 *   typingSpeed: typingSpeed          // Pass custom speed
 * };
 *
 * // In MessageBubble.jsx, use the custom speed:
 * const speed = message.typingSpeed || TYPING_SPEED;
 */

export default TypingAnimationSettings;
