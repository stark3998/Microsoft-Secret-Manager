import { createContext, useContext, useCallback, useState, useMemo, type ReactNode } from 'react';
import { Snackbar, Alert, type AlertColor, Slide, type SlideProps, IconButton } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

interface Toast {
  id: number;
  message: string;
  severity: AlertColor;
  duration?: number;
}

interface ToastContextValue {
  showToast: (message: string, severity?: AlertColor, duration?: number) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  warning: (message: string) => void;
  info: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue>({
  showToast: () => {},
  success: () => {},
  error: () => {},
  warning: () => {},
  info: () => {},
});

export function useToast() {
  return useContext(ToastContext);
}

function SlideTransition(props: SlideProps) {
  return <Slide {...props} direction="up" />;
}

let nextId = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, severity: AlertColor = 'info', duration = 5000) => {
    const id = ++nextId;
    setToasts((prev) => [...prev, { id, message, severity, duration }]);
  }, []);

  const handleClose = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const value = useMemo(() => ({
    showToast,
    success: (msg: string) => showToast(msg, 'success'),
    error: (msg: string) => showToast(msg, 'error'),
    warning: (msg: string) => showToast(msg, 'warning'),
    info: (msg: string) => showToast(msg, 'info'),
  }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {toasts.map((toast) => (
        <Snackbar
          key={toast.id}
          open
          autoHideDuration={toast.duration}
          onClose={() => handleClose(toast.id)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          TransitionComponent={SlideTransition}
          sx={{ mb: toasts.indexOf(toast) * 7 }}
        >
          <Alert
            severity={toast.severity}
            variant="filled"
            onClose={() => handleClose(toast.id)}
            action={
              <IconButton size="small" color="inherit" onClick={() => handleClose(toast.id)}>
                <CloseIcon fontSize="small" />
              </IconButton>
            }
            sx={{
              borderRadius: 1,
              fontSize: '0.8125rem',
              alignItems: 'center',
              minWidth: 300,
              boxShadow: '0 6.4px 14.4px 0 rgba(0,0,0,.22)',
            }}
          >
            {toast.message}
          </Alert>
        </Snackbar>
      ))}
    </ToastContext.Provider>
  );
}
