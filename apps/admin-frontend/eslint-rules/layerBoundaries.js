import path from 'node:path';

const SOURCE_EXTENSION = /\.(?:[cm]?[jt]sx?)$/;

function locate(file, srcDir, layers) {
  const relative = path.relative(srcDir, file);
  if (relative.startsWith('..') || path.isAbsolute(relative)) return null;
  const [layer, slice] = relative.split(path.sep);
  return layers.includes(layer) ? { layer, slice } : null;
}

function resolveSource(source, file, srcDir) {
  if (source.startsWith('@/')) return path.join(srcDir, source.slice(2));
  if (source.startsWith('./') || source.startsWith('../')) {
    return path.resolve(path.dirname(file), source);
  }
  return null;
}

function isBarrel(target, srcDir, layer, slice) {
  const sliceRoot = path.join(srcDir, layer, slice);
  const withoutExtension = target.replace(SOURCE_EXTENSION, '');
  return withoutExtension === sliceRoot || withoutExtension === path.join(sliceRoot, 'index');
}

export const layerBoundaries = {
  meta: {
    type: 'problem',
    schema: [
      {
        type: 'object',
        properties: {
          srcDir: { type: 'string' },
          layers: { type: 'array', items: { type: 'string' } },
          slicedLayers: { type: 'array', items: { type: 'string' } },
        },
        required: ['srcDir', 'layers', 'slicedLayers'],
        additionalProperties: false,
      },
    ],
    messages: {
      upward:
        '`{{from}}/` must not import from `{{to}}/`: dependencies only point down ({{order}}).',
      pastBarrel:
        'Import `{{layer}}/{{slice}}` through its public API (`@/{{layer}}/{{slice}}`), not its internals.',
    },
  },
  create(context) {
    const { srcDir, layers, slicedLayers } = context.options[0];
    const importer = locate(context.filename, srcDir, layers);
    if (!importer) return {};

    function check(node) {
      if (typeof node.value !== 'string') return;
      const target = resolveSource(node.value, context.filename, srcDir);
      if (!target) return;
      const imported = locate(target, srcDir, layers);
      if (!imported) return;

      if (layers.indexOf(imported.layer) < layers.indexOf(importer.layer)) {
        context.report({
          node,
          messageId: 'upward',
          data: { from: importer.layer, to: imported.layer, order: layers.join(' → ') },
        });
        return;
      }

      const sameSlice = importer.layer === imported.layer && importer.slice === imported.slice;
      if (
        slicedLayers.includes(imported.layer) &&
        imported.slice &&
        !sameSlice &&
        !isBarrel(target, srcDir, imported.layer, imported.slice)
      ) {
        context.report({
          node,
          messageId: 'pastBarrel',
          data: { layer: imported.layer, slice: imported.slice },
        });
      }
    }

    return {
      ImportDeclaration: (node) => check(node.source),
      ExportNamedDeclaration: (node) => node.source && check(node.source),
      ExportAllDeclaration: (node) => check(node.source),
      ImportExpression: (node) => node.source.type === 'Literal' && check(node.source),
    };
  },
};
