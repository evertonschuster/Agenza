import type * as React from 'react';

function VisuallyHidden({ ...props }: React.ComponentProps<'span'>) {
  return <span data-slot="visually-hidden" className="sr-only" {...props} />;
}

export { VisuallyHidden };
