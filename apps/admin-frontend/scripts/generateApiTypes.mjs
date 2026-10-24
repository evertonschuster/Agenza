import { writeFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import openapiTS, { astToString } from 'openapi-typescript';
import prettier from 'prettier';
import ts from 'typescript';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const GENERATED_DIR = path.join(__dirname, '..', 'src', 'shared', 'api', 'generated');
export const TYPES_PATH = path.join(GENERATED_DIR, 'services-api.d.ts');
export const DATE_FIELDS_PATH = path.join(GENERATED_DIR, 'dateFields.ts');
const OPENAPI_URL = process.env.SERVICES_API_OPENAPI_URL ?? 'http://localhost:5080/openapi/v1.json';

const HTTP_METHODS = ['get', 'put', 'post', 'delete', 'options', 'head', 'patch', 'trace'];

// The X-Tenant-Id header is attached by createApiClient's middleware from the auth session, not by
// call sites — drop it from the generated types so repositories never have to pass a placeholder.
function stripTenantHeaderParam(document) {
  for (const pathItem of Object.values(document.paths ?? {})) {
    for (const method of HTTP_METHODS) {
      const operation = pathItem[method];
      if (!Array.isArray(operation?.parameters)) continue;
      operation.parameters = operation.parameters.filter(
        (parameter) => !(parameter.in === 'header' && parameter.name === 'X-Tenant-Id'),
      );
    }
  }
  return document;
}

const SCHEMA_REF = '#/components/schemas/';

function schemaRefsIn(value, refs = new Set()) {
  if (Array.isArray(value)) {
    for (const item of value) schemaRefsIn(item, refs);
  } else if (value !== null && typeof value === 'object') {
    for (const [key, item] of Object.entries(value)) {
      if (key === '$ref' && typeof item === 'string' && item.startsWith(SCHEMA_REF)) {
        refs.add(item.slice(SCHEMA_REF.length));
      } else {
        schemaRefsIn(item, refs);
      }
    }
  }
  return refs;
}

function reachableSchemas(document, roots) {
  const reached = new Set();
  const pending = [...schemaRefsIn(roots)];
  while (pending.length > 0) {
    const name = pending.pop();
    if (reached.has(name)) continue;
    reached.add(name);
    pending.push(...schemaRefsIn(document.components?.schemas?.[name]));
  }
  return reached;
}

function operationsOf(document) {
  return Object.values(document.paths ?? {}).flatMap((pathItem) =>
    HTTP_METHODS.map((method) => pathItem[method]).filter(Boolean),
  );
}

// A query string carries a Date as text the backend cannot read, so a schema a parameter reaches
// keeps its dates as string. Bodies and responses get a Date: JSON.stringify writes it, reviveDates
// reads it.
function schemasReachedByParameters(document) {
  return reachableSchemas(
    document,
    operationsOf(document).map((operation) => operation.parameters),
  );
}

function resolveRef(schema, document) {
  if (typeof schema?.$ref !== 'string' || !schema.$ref.startsWith(SCHEMA_REF)) return schema;
  return document.components?.schemas?.[schema.$ref.slice(SCHEMA_REF.length)];
}

function holdsDate(schema, document) {
  const target = resolveRef(schema, document);
  if (target?.format === 'date') return true;
  return target?.items !== undefined && holdsDate(target.items, document);
}

function visitProperties(schema, document, visit) {
  if (schema === null || typeof schema !== 'object' || schema.$ref !== undefined) return;

  for (const [name, property] of Object.entries(schema.properties ?? {})) {
    visit(name, holdsDate(property, document));
    visitProperties(property, document, visit);
  }
  if (holdsDate(schema.additionalProperties, document)) {
    throw new Error('A date inside a dictionary has no property name for reviveDates to match.');
  }
  for (const part of [
    schema.items,
    ...(schema.allOf ?? []),
    ...(schema.anyOf ?? []),
    ...(schema.oneOf ?? []),
  ]) {
    visitProperties(part, document, visit);
  }
}

function dateFieldNames(document, parameterSchemas) {
  const dates = new Set();
  const others = new Set();
  for (const [schemaName, schema] of Object.entries(document.components?.schemas ?? {})) {
    visitProperties(schema, document, (property, isDate) => {
      (isDate && !parameterSchemas.has(schemaName) ? dates : others).add(property);
    });
  }

  const clashes = [...dates].filter((property) => others.has(property));
  if (clashes.length > 0) {
    throw new Error(
      `A date property shares its name with a non-date one: ${clashes.join(', ')}. ` +
        'reviveDates converts by name, so rename one of them in the contract.',
    );
  }
  return [...dates].sort();
}

function dateAsDate(parameterSchemas) {
  return (schemaObject, { path: schemaPath = '' }) => {
    const schemaName = schemaPath.startsWith(SCHEMA_REF)
      ? schemaPath.slice(SCHEMA_REF.length).split('/')[0]
      : undefined;
    if (schemaObject.format !== 'date' || schemaName === undefined) return undefined;
    if (parameterSchemas.has(schemaName)) return undefined;

    const date = ts.factory.createTypeReferenceNode('Date');
    if (!Array.isArray(schemaObject.type) || !schemaObject.type.includes('null')) return date;

    return ts.factory.createUnionTypeNode([
      ts.factory.createLiteralTypeNode(ts.factory.createNull()),
      date,
    ]);
  };
}

// ASP.NET publishes every number as `integer | string` (or `number | string`) because it also reads
// numbers from text, but it only ever writes a JSON number, so the TypeScript type is `number`.
function numberAcceptedAsText(schemaObject) {
  const types = schemaObject.type;
  if (!Array.isArray(types) || !types.includes('string')) return undefined;
  if (!types.includes('integer') && !types.includes('number')) return undefined;

  const number = ts.factory.createKeywordTypeNode(ts.SyntaxKind.NumberKeyword);
  if (!types.includes('null')) return number;

  return ts.factory.createUnionTypeNode([
    ts.factory.createLiteralTypeNode(ts.factory.createNull()),
    number,
  ]);
}

function firstTransformThatApplies(...transforms) {
  return (schemaObject, options) => {
    for (const transform of transforms) {
      const node = transform(schemaObject, options);
      if (node !== undefined) return node;
    }
    return undefined;
  };
}

export async function typesFromDocument(openApiDocument) {
  const document = stripTenantHeaderParam(openApiDocument);
  const parameterSchemas = schemasReachedByParameters(document);
  const ast = await openapiTS(document, {
    transform: firstTransformThatApplies(dateAsDate(parameterSchemas), numberAcceptedAsText),
  });
  return { types: astToString(ast), dateFields: dateFieldNames(document, parameterSchemas) };
}

function bannerFor(source) {
  return (
    '/**\n' +
    ' * GENERATED FILE — do not hand-edit. Regenerate with `npm run generate:api-types`.\n' +
    ' * Source: ' +
    source +
    '\n' +
    ' */\n\n'
  );
}

export async function generate() {
  const document = await fetch(new URL(OPENAPI_URL)).then((response) => response.json());
  const { types, dateFields } = await typesFromDocument(document);
  const prettierConfig = (await prettier.resolveConfig(__dirname)) ?? {};
  const format = (code) => prettier.format(code, { ...prettierConfig, parser: 'typescript' });
  const dateFieldsCode = `export const DATE_FIELDS: ReadonlySet<string> = new Set(${JSON.stringify(dateFields)});\n`;

  return {
    [TYPES_PATH]: bannerFor(OPENAPI_URL) + (await format(types)),
    [DATE_FIELDS_PATH]: bannerFor(OPENAPI_URL) + (await format(dateFieldsCode)),
  };
}

// String-concatenating `file://` breaks on Windows (backslashes, drive-letter encoding) —
// pathToFileURL() normalizes both sides so this entry-point check works cross-platform.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  for (const [outputPath, content] of Object.entries(await generate())) {
    await writeFile(outputPath, content, 'utf-8');
    console.log(`Generated ${outputPath} from ${OPENAPI_URL}`);
  }
}
