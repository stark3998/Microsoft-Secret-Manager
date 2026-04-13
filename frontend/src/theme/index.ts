import { createTheme, type Theme } from '@mui/material';
import { lightPalette, darkPalette } from './palette';
import { getComponentOverrides } from './components';

const typography = {
  fontFamily: '"Segoe UI", "Segoe UI Web (West European)", -apple-system, BlinkMacSystemFont, Roboto, "Helvetica Neue", sans-serif',
  h4: { fontSize: '1.5rem', fontWeight: 600, letterSpacing: 0 },
  h5: { fontSize: '1.125rem', fontWeight: 600, letterSpacing: 0 },
  h6: { fontSize: '1rem', fontWeight: 600, letterSpacing: 0 },
  subtitle1: { fontSize: '0.875rem', fontWeight: 600 },
  body1: { fontSize: '0.875rem', lineHeight: 1.5 },
  body2: { fontSize: '0.8125rem', lineHeight: 1.5 },
  caption: { fontSize: '0.75rem', fontWeight: 400 },
};

const baseShadows = [
  'none',
  '0 1.6px 3.6px 0 rgba(0,0,0,.132), 0 0.3px 0.9px 0 rgba(0,0,0,.108)',
  '0 3.2px 7.2px 0 rgba(0,0,0,.132), 0 0.6px 1.8px 0 rgba(0,0,0,.108)',
  '0 6.4px 14.4px 0 rgba(0,0,0,.132), 0 1.2px 3.6px 0 rgba(0,0,0,.108)',
  '0 12.8px 28.8px 0 rgba(0,0,0,.132), 0 2.4px 7.2px 0 rgba(0,0,0,.108)',
  ...Array(20).fill('0 12.8px 28.8px 0 rgba(0,0,0,.132), 0 2.4px 7.2px 0 rgba(0,0,0,.108)'),
] as unknown as Theme['shadows'];

export function buildTheme(mode: 'light' | 'dark'): Theme {
  const palette = mode === 'light' ? lightPalette : darkPalette;
  return createTheme({
    palette: { mode, ...palette },
    typography,
    shape: { borderRadius: 2 },
    shadows: baseShadows,
    components: getComponentOverrides(mode),
  });
}
