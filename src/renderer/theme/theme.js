import { createTheme } from '@mui/material/styles'

/**
 * Palette Catppuccin Mocha — thème sombre professionnel
 * https://github.com/catppuccin/catppuccin
 */
const palette = {
  base:      '#1e1e2e',
  mantle:    '#181825',
  crust:     '#11111b',
  surface0:  '#313244',
  surface1:  '#45475a',
  surface2:  '#585b70',
  overlay0:  '#6c7086',
  overlay1:  '#7f849c',
  overlay2:  '#9399b2',
  subtext0:  '#a6adc8',
  subtext1:  '#bac2de',
  text:      '#cdd6f4',
  lavender:  '#b4befe',
  blue:      '#89b4fa',
  sapphire:  '#74c7ec',
  sky:       '#89dceb',
  teal:      '#94e2d5',
  green:     '#a6e3a1',
  yellow:    '#f9e2af',
  peach:     '#fab387',
  maroon:    '#eba0ac',
  red:       '#f38ba8',
  mauve:     '#cba6f7',
  pink:      '#f5c2e7',
  flamingo:  '#f2cdcd',
  rosewater: '#f5e0dc',
}

export const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: palette.blue,
      light: palette.sapphire,
      dark: palette.lavender,
      contrastText: palette.base,
    },
    secondary: {
      main: palette.mauve,
      contrastText: palette.base,
    },
    success: {
      main: palette.green,
      contrastText: palette.base,
    },
    warning: {
      main: palette.yellow,
      contrastText: palette.base,
    },
    error: {
      main: palette.red,
      contrastText: palette.base,
    },
    info: {
      main: palette.sapphire,
    },
    background: {
      default: palette.base,
      paper: palette.mantle,
    },
    text: {
      primary: palette.text,
      secondary: palette.subtext1,
      disabled: palette.overlay0,
    },
    divider: palette.surface0,
    action: {
      hover: `${palette.surface0}80`,
      selected: `${palette.surface1}80`,
    },
  },

  typography: {
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
    fontSize: 14,
    h1: { fontSize: '2rem', fontWeight: 700, letterSpacing: '-0.5px' },
    h2: { fontSize: '1.5rem', fontWeight: 600 },
    h3: { fontSize: '1.25rem', fontWeight: 600 },
    h4: { fontSize: '1.1rem', fontWeight: 600 },
    h5: { fontSize: '1rem', fontWeight: 600 },
    h6: { fontSize: '0.875rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: palette.overlay1 },
    body1: { fontSize: '0.9rem', lineHeight: 1.6 },
    body2: { fontSize: '0.8rem', lineHeight: 1.5, color: palette.subtext1 },
    caption: { fontSize: '0.75rem', color: palette.overlay1 },
    button: { fontWeight: 500, fontSize: '0.875rem', textTransform: 'none' },
    code: { fontFamily: "'JetBrains Mono', 'Fira Code', monospace", fontSize: '0.8rem' },
  },

  shape: {
    borderRadius: 8,
  },

  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          scrollbarWidth: 'thin',
          scrollbarColor: `${palette.surface1} ${palette.mantle}`,
        },
      },
    },

    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 6,
          padding: '8px 20px',
          fontWeight: 500,
        },
        contained: {
          boxShadow: 'none',
          '&:hover': { boxShadow: `0 0 0 2px ${palette.blue}40` },
        },
      },
    },

    MuiCard: {
      styleOverrides: {
        root: {
          backgroundColor: palette.mantle,
          backgroundImage: 'none',
          border: `1px solid ${palette.surface0}`,
        },
      },
    },

    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          backgroundColor: palette.mantle,
        },
      },
    },

    MuiTextField: {
      defaultProps: { size: 'small', variant: 'outlined' },
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            backgroundColor: palette.base,
            '& fieldset': { borderColor: palette.surface1 },
            '&:hover fieldset': { borderColor: palette.overlay0 },
            '&.Mui-focused fieldset': { borderColor: palette.blue },
          },
        },
      },
    },

    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: 6,
          '&.Mui-selected': {
            backgroundColor: `${palette.blue}20`,
            borderLeft: `3px solid ${palette.blue}`,
            '&:hover': { backgroundColor: `${palette.blue}30` },
          },
          '&:hover': { backgroundColor: palette.surface0 },
        },
      },
    },

    MuiChip: {
      styleOverrides: {
        root: { borderRadius: 4 },
      },
    },

    MuiLinearProgress: {
      styleOverrides: {
        root: { borderRadius: 4, height: 6 },
      },
    },
  },
})

// Couleurs sémantiques pour les statuts de tests
export const testColors = {
  Passed: palette.green,
  Failed: palette.red,
  Blocked: palette.yellow,
  NotExecuted: palette.overlay0,
  NotApplicable: palette.overlay0,
  Inconclusive: palette.peach,
}

export { palette }
