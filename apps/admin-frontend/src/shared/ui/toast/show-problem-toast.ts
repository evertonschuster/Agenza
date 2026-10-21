import { toProblemView, type ApiProblem } from '@/shared/api/servicesFacade';
import { toast } from './toast-manager';

export function showProblemToast(title: string, problem: ApiProblem): void {
  const { message, code } = toProblemView(problem);
  toast.add({ title, description: message, data: { code }, type: 'error' });
}
