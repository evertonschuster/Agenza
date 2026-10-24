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
      '/calendar': { get: { responses: ok('CalendarResponse') } },
      '/slots': {
        parameters: [
          { name: 'window', in: 'query', schema: { $ref: '#/components/schemas/SlotWindow' } },
        ],
        post: { requestBody: json('SlotWindow'), responses: ok('PersonResponse') },
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
        CalendarResponse: {
          type: 'object',
          properties: {
            holidays: { type: ['null', 'array'], items: { type: 'string', format: 'date' } },
            window: { type: 'object', properties: { opensOn: { type: 'string', format: 'date' } } },
            renewedOn: { anyOf: [{ type: 'null' }, { type: 'string', format: 'date' }] },
            visitsLog: {
              type: 'array',
              items: { type: 'object', properties: { seenOn: { type: 'string', format: 'date' } } },
            },
          },
        },
        SlotWindow: {
          type: 'object',
          required: ['startsOn'],
          properties: { startsOn: { type: 'string', format: 'date' } },
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

async function typesOf(document = openApiDocument()) {
  return (await typesFromDocument(document)).types;
}

describe('typesFromDocument', () => {
  it('types a date in a request body as Date, whatever the schema is called', async () => {
    const types = await typesOf();

    expect(typeOf(types, 'CreatePersonRequest', 'birthDate')).toBe('null | Date');
    expect(typeOf(types, 'CreatePersonRequest', 'firstVisit')).toBe('Date');
  });

  it('follows $ref from the request body into nested schemas', async () => {
    const types = await typesOf();

    expect(typeOf(types, 'GuardianPayload', 'since')).toBe('Date');
  });

  it.each([
    ['a response', 'PersonResponse', 'birthDate', 'null | Date'],
    ['a schema used by a request and a response', 'EventBody', 'day', 'Date'],
  ])(
    'types the date of %s as Date, since reviveDates reads it',
    async (_, schema, property, expected) => {
      const types = await typesOf();

      expect(typeOf(types, schema, property)).toBe(expected);
    },
  );

  it('keeps the date of a schema a query parameter reaches as string, since a query string cannot carry a Date', async () => {
    const types = await typesOf();

    expect(typeOf(types, 'AgendaFilter', 'from')).toBe('string');
  });

  it('keeps the date of a schema a path-level parameter reaches as string too', async () => {
    const types = await typesOf();

    expect(typeOf(types, 'SlotWindow', 'startsOn')).toBe('string');
  });

  it('never maps an instant, even in a request body', async () => {
    const types = await typesOf();

    expect(typeOf(types, 'CreatePersonRequest', 'createdAt')).toBe('string');
  });

  it.each([
    ['an integer', 'visits', 'number'],
    ['a decimal', 'balance', 'number'],
    ['a nullable integer', 'rank', 'null | number'],
  ])(
    'types %s that ASP.NET also reads from text as a plain number',
    async (_, property, expected) => {
      const types = await typesOf();

      expect(typeOf(types, 'PersonResponse', property)).toBe(expected);
    },
  );

  it('types a numeric query parameter as a plain number', async () => {
    const types = await typesOf();

    expect(types).toMatch(/\bPage\?: number;/);
  });

  it.each([
    ['a plain integer', 'age', 'number'],
    ['a nullable string', 'nickname', 'null | string'],
  ])('leaves %s as it was', async (_, property, expected) => {
    const types = await typesOf();

    expect(typeOf(types, 'PersonResponse', property)).toBe(expected);
  });
});

describe('the date field names', () => {
  it('lists every property typed as Date, once and sorted, for reviveDates', async () => {
    const { dateFields } = await typesFromDocument(openApiDocument());

    expect(dateFields).toEqual([
      'birthDate',
      'day',
      'firstVisit',
      'holidays',
      'opensOn',
      'renewedOn',
      'seenOn',
      'since',
    ]);
  });

  it('types a list of dates and the dates of inline objects as Date, so the names above cover them', async () => {
    const types = await typesOf();

    expect(types).toMatch(/\bholidays\?: null \| Date\[\];/);
    expect(types).toMatch(/\bopensOn\?: Date;/);
    expect(types).toMatch(/\bseenOn\?: Date;/);
  });

  it('names a date offered as one member of anyOf, oneOf or allOf, as the type has it', async () => {
    const types = await typesOf();

    expect(types).toMatch(/\brenewedOn\?: null \| Date;/);
  });

  it('refuses a date inside a dictionary, which has no property name to match', async () => {
    const document = openApiDocument();
    document.components.schemas.CalendarResponse.properties.byRoom = {
      type: 'object',
      additionalProperties: { type: 'string', format: 'date' },
    };

    await expect(typesFromDocument(document)).rejects.toThrow(/dictionary/);
  });

  it('refuses a date name that another schema uses for something else', async () => {
    const document = openApiDocument();
    document.components.schemas.PersonResponse.properties.since = { type: ['null', 'string'] };

    await expect(typesFromDocument(document)).rejects.toThrow(/since/);
  });

  it('refuses a date name that a parameter schema keeps as string', async () => {
    const document = openApiDocument();
    document.components.schemas.AgendaFilter.properties.day = { type: 'string', format: 'date' };

    await expect(typesFromDocument(document)).rejects.toThrow(/day/);
  });
});
