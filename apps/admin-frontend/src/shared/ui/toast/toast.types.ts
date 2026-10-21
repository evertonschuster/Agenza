export type ToastType = 'success' | 'info' | 'warning' | 'error' | 'loading';

export type ToastData = {
  code?: string | undefined;
};

export type ToastIconProps = {
  type: string | undefined;
};
