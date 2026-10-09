import { Popover as PopoverPrimitive } from '@base-ui/react/popover';

import { PopoverTrigger } from './components/popover-primitives';
import { PopoverContent } from './components/popover-content';

function Popover({ ...props }: PopoverPrimitive.Root.Props) {
  return <PopoverPrimitive.Root data-slot="popover" {...props} />;
}

export { Popover, PopoverTrigger, PopoverContent };
