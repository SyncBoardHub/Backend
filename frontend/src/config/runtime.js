export const runtimeConfig = {
  channel: import.meta.env.VITE_APP_ENV || 'beta',
  isBeta: (import.meta.env.VITE_APP_ENV || 'beta') === 'beta',
};
