import type { Components, Theme } from '@mui/material';

export function getComponentOverrides(mode: 'light' | 'dark'): Components<Theme> {
  const isLight = mode === 'light';
  const cardBorder = isLight ? '#EDEBE9' : '#3E3E42';
  const headerBg = isLight ? '#FAFAFA' : '#2D2D30';
  const headerText = isLight ? '#605E5C' : '#A0A0A0';
  const rowHover = isLight ? '#F3F2F1' : '#2A2A2D';
  const textPrimary = isLight ? '#323130' : '#E0E0E0';
  const textSecondary = isLight ? '#605E5C' : '#A0A0A0';
  const borderColor = isLight ? '#8A8886' : '#555558';
  const bodyBg = isLight ? '#FAF9F8' : '#1E1E1E';
  const scrollThumb = isLight ? '#C8C6C4' : '#555558';
  const tooltipBg = isLight ? '#323130' : '#E0E0E0';

  return {
    MuiCssBaseline: {
      styleOverrides: {
        body: { backgroundColor: bodyBg, margin: 0, padding: 0 },
        '::-webkit-scrollbar': { width: 8, height: 8 },
        '::-webkit-scrollbar-thumb': { backgroundColor: scrollThumb, borderRadius: 4 },
        '::-webkit-scrollbar-track': { backgroundColor: 'transparent' },
      },
    },
    MuiCard: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: {
          border: `1px solid ${cardBorder}`,
          borderRadius: 2,
          boxShadow: isLight
            ? '0 1.6px 3.6px 0 rgba(0,0,0,.132), 0 0.3px 0.9px 0 rgba(0,0,0,.108)'
            : '0 1.6px 3.6px 0 rgba(0,0,0,.4), 0 0.3px 0.9px 0 rgba(0,0,0,.3)',
        },
      },
    },
    MuiPaper: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: { border: `1px solid ${cardBorder}`, borderRadius: 2 },
      },
    },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: {
          textTransform: 'none' as const,
          fontWeight: 600,
          fontSize: '0.8125rem',
          borderRadius: 2,
          padding: '6px 20px',
          lineHeight: 1.5,
          minHeight: 32,
        },
        contained: {
          backgroundColor: isLight ? '#0078D4' : '#4DA3E8',
          color: '#fff',
          '&:hover': { backgroundColor: isLight ? '#106EBE' : '#3A8FD4' },
          '&:active': { backgroundColor: isLight ? '#005A9E' : '#2D7BC0' },
        },
        containedError: {
          backgroundColor: isLight ? '#D13438' : '#F1707B',
          color: '#fff',
          '&:hover': { backgroundColor: isLight ? '#A4262C' : '#D9555F' },
        },
        outlined: {
          borderColor: borderColor,
          color: textPrimary,
          backgroundColor: isLight ? '#FFFFFF' : '#2D2D30',
          '&:hover': { borderColor: textPrimary, backgroundColor: rowHover },
        },
        text: {
          color: isLight ? '#0078D4' : '#4DA3E8',
          '&:hover': { backgroundColor: rowHover },
        },
        sizeSmall: {
          padding: '4px 12px',
          fontSize: '0.75rem',
          minHeight: 28,
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          borderRadius: 2,
          color: textSecondary,
          '&:hover': { backgroundColor: rowHover, color: textPrimary },
        },
        sizeSmall: { padding: 4 },
      },
    },
    MuiTableHead: {
      styleOverrides: {
        root: {
          '& .MuiTableCell-head': {
            backgroundColor: headerBg,
            color: headerText,
            fontSize: '0.75rem',
            fontWeight: 600,
            borderBottom: `2px solid ${cardBorder}`,
            padding: '8px 12px',
            whiteSpace: 'nowrap' as const,
          },
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: { borderBottom: `1px solid ${isLight ? '#F3F2F1' : '#3E3E42'}`, padding: '8px 12px', fontSize: '0.8125rem', color: textPrimary },
      },
    },
    MuiTableRow: {
      styleOverrides: {
        root: {
          '&:hover': { backgroundColor: rowHover },
          '&:last-child td': { borderBottom: 0 },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { fontWeight: 600, fontSize: '0.6875rem', height: 24, borderRadius: 2 },
        sizeSmall: { height: 20 },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 2,
          border: `1px solid ${cardBorder}`,
          boxShadow: '0 25.6px 57.6px 0 rgba(0,0,0,.22), 0 4.8px 14.4px 0 rgba(0,0,0,.18)',
        },
      },
    },
    MuiTextField: {
      defaultProps: { variant: 'outlined' as const },
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            fontSize: '0.8125rem',
            borderRadius: 2,
            '& fieldset': { borderColor: borderColor },
            '&:hover fieldset': { borderColor: textPrimary },
            '&.Mui-focused fieldset': { borderColor: isLight ? '#0078D4' : '#4DA3E8', borderWidth: 2 },
          },
          '& .MuiInputLabel-root': { fontSize: '0.8125rem' },
          '& .MuiFormHelperText-root': { fontSize: '0.75rem', marginTop: 4 },
        },
      },
    },
    MuiSelect: {
      styleOverrides: {
        root: { borderRadius: 2 },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: 'none' as const,
          fontWeight: 400,
          fontSize: '0.875rem',
          minHeight: 44,
          color: textSecondary,
          padding: '12px 16px',
          '&.Mui-selected': { color: textPrimary, fontWeight: 600 },
          '&:hover': { backgroundColor: rowHover },
        },
      },
    },
    MuiTabs: {
      styleOverrides: {
        root: {
          minHeight: 44,
          borderBottom: `1px solid ${cardBorder}`,
          '& .MuiTabs-indicator': { height: 2, backgroundColor: isLight ? '#0078D4' : '#4DA3E8' },
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: { borderRadius: 2, fontSize: '0.8125rem' },
      },
    },
    MuiSwitch: {
      styleOverrides: {
        root: { padding: 8 },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: { borderRadius: 2, fontSize: '0.75rem', backgroundColor: tooltipBg },
      },
    },
    MuiDivider: {
      styleOverrides: {
        root: { borderColor: cardBorder },
      },
    },
  };
}
