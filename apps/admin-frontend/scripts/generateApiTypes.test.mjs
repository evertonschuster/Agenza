import { describe, expect, it } from 'vitest';
import { typesFromDocument } from './generateApiTypes.mjs';

function json(schemaName) {
  return {
    content: { 'application/json': { schema: { $ref: `#/components/schemas/${schemaName}` } } },
  };
}

function ok(schemaName) {
  return { 200: { description: 'OK', ...json(schemaName) } };
}

function openApiDocument() {
  return {
    openapi: '3.1.1',
    info: { title: 'fixture', version: 'v1' },
    paths: {
      '/people': {
        post: { requestBody: json('CreatePersonRequest'), responses: ok('PersonResponse') },
      },
      '/events/{id}': {
        put: { requestBody: json('EventBody'), responses: ok('EventBody') },
      },
      '/agenda': {
        get: {
          parameters: [
            { name: 'filter', in: 'query', schema: { $ref: '#/components/schemas/AgendaFilter' } },
            { name: 'Page', in: 'query', schema: { type: ['integer', 'string'], format: 'int32' } },
          ],
          responses: ok('PersonResponse'),
        },
        post: { requestBody: json('AgendaFilter'), responses: ok('PersonResponse') },
      },
    },
    components: {
      schemas: {
        CreatePersonRequest: {
          type: 'object',
          required: ['birthDate', 'firstVisit', 'guardian', 'createdAt'],
          properties: {
            birthDate: { type: ['null', 'string'], format: 'date' },
            firstVisit: { type: 'string', format: 'date' },
            guardian: { $ref: '#/components/schemas/GuardianPayload' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        GuardianPayload: {
          type: 'object',
          required: ['since'],
          properties: { since: { type: 'string', format: 'date' } },
        },
        PersonResponse: {
          type: 'object',
          required: ['birthDate', 'visits', 'balance', 'rank', 'age', 'nickname'],
          properties: {
            birthDate: { type: ['null', 'string'], format: 'date' },
            visits: { type: ['integer', 'string'], format: 'int32', pattern: '^-?(?:0|[1-9]\d*)$' },
            balance: { type: ['number', 'string'], format: 'double' },
            rank: { type: ['null', 'integer', 'string'], format: 'int32' },
            age: { type: 'integer', format: 'int32' },
            nickname: { type: ['null', 'string'] },
          },
        },
        EventBody: {
          type: 'object',
          required: ['day'],
          properties: { day: { type: 'string', format: 'date' } },
        },
        AgendaFilter: {
          type: 'object',
          required: ['from'],
          properties: { from: { type: 'string', format: 'date' } },
        },
      },
    },
  };
}

function typeOf(types, schemaName, property) {
  const block = types.match(new RegExp(`\\b${schemaName}: \\{([^}]*)\\}`))?.[1] ?? '';
  return block.match(new RegExp(`\\b${property}\\??: ([^;]+);`))?.[1];
}

describe('typesFromDocument', () => {
  it('types a date sent only in a request body as Date, whatever the schema is called', async () => {
    const types = await typesFromDocument(openApiDocument());

    expect(typeOf(types, 'CreatePersonRequest', 'birthDate')).toBe('null | Date');
    expect(typeOf(types, 'CreatePersonRequest', 'firstVisit')).toBe('Date');
  });

  it('follows $ref from the request body into nested schemas', async () => {
    const types = await typesFromDocument(openApiDocument());

    expect(typeOf(types, 'GuardianPayload', 'since')).toBe('Date');
  });

  it('keeps a date in a response as string, since JSON cannot return a Date', async () => {
    const types = await typesFromDocument(openApiDocument());

    expect(typeOf(types, 'PersonResponse', 'birthDate')).toBe('null | string');
  });

  it.each([
    ['a schema also used by a response', 'EventBody', 'day'],
    ['a schema also used by a parameter', 'AgendaFilter', 'from'],
  ])('keeps the date of %s as string', async (_, schemaName, property) => {
    const types = await typesFromDocument(openApiDocument());

    expect(typeOf(types, schemaName, property)).toBe('string');
  });

  it('never maps an instant, even in a request body', async () => {
    const types = await typesFromDocument(openApiDocument());

    expect(typeOf(types, 'CreatePersonRequest', 'createdAt')).toBe('string');
  });

  it.each([
    ['an integer', 'visits', 'number'],
    ['a decimal', 'balance', 'number'],
    ['a nullable integer', 'rank', 'null | number'],
  ])(
    'types %s that ASP.NET also reads from text as a plain number',
    async (_, property, expected) => {
      const types = await typesFromDocument(openApiDocument());

      expect(typeOf(types, 'PersonResponse', property)).toBe(expected);
    },
  );

  it('types a numeric query parameter as a plain number', async () => {
    const types = await typesFromDocument(openApiDocument());

    expect(types).toMatch(/\bPage\?: number;/);
  });

  it.each([
    ['a plain integer', 'age', 'number'],
    ['a nullable string', 'nickname', 'null | string'],
  ])('leaves %s as it was', async (_, property, expected) => {
    const types = await typesFromDocument(openApiDocument());

    expect(typeOf(types, 'PersonResponse', property)).toBe(expected);
  });
});
