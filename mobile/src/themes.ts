export type ThemeChoice = 'system' | 'graphite' | 'paper';
export const palettes = {
  graphite: { base: '#17191C', panel: '#292C30', raised: '#32363A', accent: '#B9C99F', text: '#F0F1EC', muted: '#AEB3AB', border: '#41463F', accentText: '#202A19', danger: '#F4A49A', dark: true },
  paper: { base: '#F1F0EA', panel: '#FBFAF6', raised: '#E4E5DB', accent: '#4D6536', text: '#262A25', muted: '#626A5B', border: '#C9CEC0', accentText: '#FFFFFF', danger: '#A33D32', dark: false },
};
/** Chrome colours while the active tab is private; applied over the chosen palette. */
export const privatePalette = { base: '#2A2438', panel: '#352D47', raised: '#41385A', accent: '#C9B8FF', text: '#EEE9FF', muted: '#B7ADD6', border: '#4A4160', accentText: '#2A2438', dark: true };
