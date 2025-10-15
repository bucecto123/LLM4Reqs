// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      keyframes: {
        fadein: { '0%': { opacity: 0 }, '100%': { opacity: 1 } },
        slideup: { '0%': { opacity: 0, transform: 'translateY(40px)' }, '100%': { opacity: 1, transform: 'translateY(0)' } },
        'pulse-slow': { '0%, 100%': { opacity: 0.1 }, '50%': { opacity: 0.3 } },
        'bounce-in': { '0%': { transform: 'scale(0.7)' }, '80%': { transform: 'scale(1.1)' }, '100%': { transform: 'scale(1)' } },
      },
      animation: {
        fadein: 'fadein 0.8s ease',
        'slideup-fadein': 'slideup 0.7s cubic-bezier(.4,2,.3,1)',
        'pulse-slow': 'pulse-slow 3s ease-in-out infinite',
        'bounce-in': 'bounce-in 0.5s',
        'tab-indicator': 'fadein 0.3s',
      },
    },
  },
};