import { Toast as ToastPrimitive } from '@base-ui/react/toast';
import type { ApiProblem } from '@/shared/api/servicesFacade';
import type { ToastData } from './toast.types';

const manager = ToastPrimitive.createToastManager<ToastData>();

export const toast = Object.assign(manager, {
  serverError(title: string, problem: ApiProblem) {
    return manager.add({
      title,
      description: problem.title,
      data: { problem },
      type: 'error',
    });
  },
});
