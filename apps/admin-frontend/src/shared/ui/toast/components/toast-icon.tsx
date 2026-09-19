import type { ReactNode } from 'react';
import {
  CircleCheckIcon,
  InfoIcon,
  TriangleAlertIcon,
  OctagonXIcon,
  Loader2Icon,
} from 'lucide-react';
import type { ToastIconProps, ToastType } from '../toast.types';

const TOAST_ICONS: Record<ToastType, ReactNode> = {
  success: <CircleCheckIcon className="text-success" aria-hidden="true" />,
  info: <InfoIcon aria-hidden="true" />,
  warning: <TriangleAlertIcon aria-hidden="true" />,
  error: <OctagonXIcon className="text-destructive" aria-hidden="true" />,
  loading: <Loader2Icon className="animate-spin" aria-hidden="true" />,
};

function isToastType(type: string | undefined): type is ToastType {
  return type !== undefined && Object.hasOwn(TOAST_ICONS, type);
}

function ToastIcon({ type }: ToastIconProps) {
  if (!isToastType(type)) {
    return null;
  }

  return (
    <span
      data-slot="toast-icon"
      className="shrink-0 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4"
    >
      {TOAST_ICONS[type]}
    </span>
  );
}

export { ToastIcon };
