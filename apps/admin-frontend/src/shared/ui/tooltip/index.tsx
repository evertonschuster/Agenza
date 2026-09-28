import { Tooltip as TooltipPrimitive } from '@base-ui/react/tooltip';

import { TooltipProvider, TooltipTrigger } from './components/tooltip-primitives';
import { TooltipContent } from './components/tooltip-content';

function Tooltip({ ...props }: TooltipPrimitive.Root.Props) {
  return <TooltipPrimitive.Root data-slot="tooltip" {...props} />;
}

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider };
