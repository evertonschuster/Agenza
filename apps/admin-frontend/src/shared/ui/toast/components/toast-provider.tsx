import { Toast as ToastPrimitive } from '@base-ui/react/toast';

function ToastProvider({ ...props }: ToastPrimitive.Provider.Props) {
  return <ToastPrimitive.Provider {...props} />;
}

export { ToastProvider };
