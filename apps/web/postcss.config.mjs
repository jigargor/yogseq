/**
 * Tailwind v4 via PostCSS so both `next build --webpack` (production/OpenNext)
 * and `next dev --turbopack` process `@import "tailwindcss"`. The previous
 * Turbopack-only loader left production CSS without any utility classes.
 */
const config = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};

export default config;
