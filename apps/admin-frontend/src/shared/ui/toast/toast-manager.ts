import { Toast as ToastPrimitive } from '@base-ui/react/toast';
import type { ToastData } from './toast.types';

export const toast = ToastPrimitive.createToastManager<ToastData>();
