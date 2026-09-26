import path from 'node:path';
import { RuleTester } from 'eslint';
import { afterAll, describe, it } from 'vitest';
import { layerBoundaries } from './layerBoundaries.js';

RuleTester.afterAll = afterAll;
RuleTester.describe = describe;
RuleTester.it = it;
RuleTester.itOnly = it.only;

const srcDir = path.resolve('src');
const options = [
  { srcDir, layers: ['app', 'features', 'widgets', 'shared'], slicedLayers: ['features'] },
];

function at(file, code) {
  return { code, filename: path.join(srcDir, file), options };
}

function rejected(file, code, messageId) {
  return { ...at(file, code), errors: [{ messageId }] };
}

new RuleTester().run('layer-boundaries', layerBoundaries, {
  valid: [
    at('app/routes.tsx', "import { TagListPage } from '@/features/tags';"),
    at('app/routes.tsx', "import('@/features/tags');"),
    at('app/App.tsx', "import { router } from './routes';"),
    at('features/tags/ui/pages/P/useP.ts', "import { x } from '../../../api/tagsRepository';"),
    at('features/tags/index.ts', "export { P } from './ui/pages/P/P';"),
    at(
      'features/tags/ui/pages/P/P.tsx',
      "import { ConfirmDialog } from '@/widgets/confirm-dialog';",
    ),
    at('features/tags/ui/pages/P/P.tsx', "import { toast } from '@/shared/ui/toast';"),
    at('features/tags/ui/pages/P/useP.ts', "import { useAuth } from '../../../../auth';"),
    at('features/tags/ui/pages/P/useP.ts', "import { useAuth } from '../../../../auth/index';"),
    at('widgets/confirm-dialog/index.tsx', "import { toast } from '../../shared/ui/toast';"),
    at('widgets/confirm-dialog/index.tsx', "import { ListSection } from '../list-section';"),
    at('shared/form/fields/index.tsx', "import { x } from '../applyApiProblem';"),
    at('shared/ui/button/index.tsx', "import { useState } from 'react';"),
    at('main.tsx', "import { App } from './app/App';"),
  ],
  invalid: [
    rejected('shared/api/formErrors.ts', "import { x } from '@/features/tags';", 'upward'),
    rejected('shared/ui/button/index.tsx', "import { r } from '../../../app/routes';", 'upward'),
    rejected(
      'shared/ui/button/index.tsx',
      "import { W } from '@/widgets/confirm-dialog';",
      'upward',
    ),
    rejected(
      'widgets/list-section/index.tsx',
      "import { T } from '../../features/tags';",
      'upward',
    ),
    rejected(
      'features/tags/ui/pages/P/useP.ts',
      "import { r } from '../../../../../app/routes';",
      'upward',
    ),
    rejected('shared/index.ts', "export { x } from '@/features/tags';", 'upward'),
    rejected('shared/index.ts', "export * from '../app/App';", 'upward'),
    rejected('shared/lazy.ts', "import('../app/routes');", 'upward'),
    rejected('app/routes.tsx', "import { P } from '@/features/tags/ui/pages/P/P';", 'pastBarrel'),
    rejected('app/routes.tsx', "import('@/features/tags/ui/pages/P/P');", 'pastBarrel'),
    rejected(
      'features/tags/ui/x.ts',
      "import { useAuth } from '../../auth/ui/useAuth';",
      'pastBarrel',
    ),
  ],
});
