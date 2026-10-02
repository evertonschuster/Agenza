import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  CLIENT_FORM_FIELDS,
  GUARDIAN_FORM_FIELDS,
  REFERENCE_CONTACT_FORM_FIELDS,
  ageFromBirthDate,
  clientFormSchema,
  emptyGuardian,
  emptyReferenceContact,
  toClientFormFieldValues,
  type ClientFormFieldValues,
} from './clientForm';

const NOON_IN_SAO_PAULO = new Date('2026-10-02T15:00:00Z');

function values(overrides: Partial<ClientFormFieldValues> = {}): ClientFormFieldValues {
  return { ...toClientFormFieldValues(), fullName: 'Maria Souza', ...overrides };
}

function guardian(overrides: Partial<ReturnType<typeof emptyGuardian>> = {}) {
  return { ...emptyGuardian(), name: 'Ana Souza', relationship: 'Mãe', ...overrides };
}

function reference(overrides: Partial<ReturnType<typeof emptyReferenceContact>> = {}) {
  return {
    ...emptyReferenceContact(),
    name: 'Carlos Lima',
    relationship: 'Tio',
    purposes: ['emergency'],
    ...overrides,
  };
}

function issuesOf(input: ClientFormFieldValues): Record<string, string> {
  const result = clientFormSchema.safeParse(input);
  const firstMessageByPath: Record<string, string> = {};
  if (result.success) return firstMessageByPath;

  for (const issue of result.error.issues) {
    firstMessageByPath[issue.path.join('.')] ??= issue.message;
  }
  return firstMessageByPath;
}

beforeEach(() => {
  vi.useFakeTimers({ now: NOON_IN_SAO_PAULO, toFake: ['Date'] });
});

afterEach(() => {
  vi.useRealTimers();
});

describe('clientFormSchema', () => {
  it('accepts a person described only by the full name', () => {
    const result = clientFormSchema.safeParse(values());

    expect(result.success).toBe(true);
    expect(result.data).toEqual({
      fullName: 'Maria Souza',
      birthDate: null,
      phone: null,
      email: null,
      cpf: null,
      administrativeNotes: null,
      guardians: [],
      referenceContacts: [],
    });
  });

  it('trims and normalizes every field to the shape the backend takes', () => {
    const result = clientFormSchema.safeParse(
      values({
        fullName: '  Maria Souza  ',
        birthDate: '20/05/1990',
        phone: '  (11) 99999-0000 ',
        email: '  Maria.Souza@Example.COM ',
        cpf: '529.982.247-25',
        administrativeNotes: '  Prefere contato pela manhã.  ',
        guardians: [
          guardian({ name: ' Ana Souza ', phone: ' 11 98888-0000', cpf: '123.456.789-09' }),
        ],
        referenceContacts: [reference({ purposes: ['emergency', 'dailyCommunication'] })],
      }),
    );

    expect(result.success).toBe(true);
    expect(result.data).toEqual({
      fullName: 'Maria Souza',
      birthDate: '1990-05-20',
      phone: '(11) 99999-0000',
      email: 'maria.souza@example.com',
      cpf: '52998224725',
      administrativeNotes: 'Prefere contato pela manhã.',
      guardians: [
        { name: 'Ana Souza', relationship: 'Mãe', phone: '11 98888-0000', cpf: '12345678909' },
      ],
      referenceContacts: [
        {
          name: 'Carlos Lima',
          relationship: 'Tio',
          phone: null,
          purposes: ['emergency', 'dailyCommunication'],
        },
      ],
    });
  });

  it('turns blank optional fields into null', () => {
    const result = clientFormSchema.safeParse(
      values({ birthDate: '  ', phone: '   ', email: '  ', cpf: ' ', administrativeNotes: '   ' }),
    );

    expect(result.data).toMatchObject({
      birthDate: null,
      phone: null,
      email: null,
      cpf: null,
      administrativeNotes: null,
    });
  });

  describe('full name', () => {
    it('is required', () => {
      expect(issuesOf(values({ fullName: '   ' }))['fullName']).toBe(
        'O nome completo é obrigatório.',
      );
    });

    it('needs at least two characters after trimming', () => {
      expect(issuesOf(values({ fullName: ' A ' }))['fullName']).toBe(
        'O nome completo deve ter pelo menos 2 caracteres.',
      );
    });

    it('allows up to 150 characters after trimming', () => {
      expect(issuesOf(values({ fullName: ` ${'a'.repeat(150)} ` }))).toEqual({});
      expect(issuesOf(values({ fullName: 'a'.repeat(151) }))['fullName']).toBe(
        'O nome completo deve ter no máximo 150 caracteres.',
      );
    });
  });

  describe('birth date', () => {
    it.each([
      ['10/03', 'Informe uma data válida no formato dd/mm/aaaa.'],
      ['31/02/2020', 'Informe uma data válida no formato dd/mm/aaaa.'],
      ['02/10/2026', 'A data de nascimento deve estar no passado.'],
      ['03/10/2026', 'A data de nascimento deve estar no passado.'],
      ['01/01/2030', 'A data de nascimento deve estar no passado.'],
      ['02/10/1905', 'A data de nascimento não pode indicar idade superior a 120 anos.'],
    ] as const)('rejects %j', (birthDate, message) => {
      expect(issuesOf(values({ birthDate, guardians: [guardian()] }))['birthDate']).toBe(message);
    });

    it('accepts a date in the past within 120 years', () => {
      expect(issuesOf(values({ birthDate: '01/10/2026', guardians: [guardian()] }))).toEqual({});
      expect(issuesOf(values({ birthDate: '02/10/1906' }))).toEqual({});
    });
  });

  describe('guardian required for minors', () => {
    it('does not ask anything when there is no birth date', () => {
      expect(issuesOf(values({ birthDate: '', guardians: [] }))).toEqual({});
    });

    it('requires a guardian when the birth date indicates a minor', () => {
      expect(issuesOf(values({ birthDate: '10/03/2015', guardians: [] }))['guardians']).toBe(
        'Informe ao menos um responsável para pessoas menores de 18 anos.',
      );
    });

    it('is satisfied by a guardian', () => {
      expect(issuesOf(values({ birthDate: '10/03/2015', guardians: [guardian()] }))).toEqual({});
    });

    it('is not required for adults, including on the eighteenth birthday', () => {
      expect(issuesOf(values({ birthDate: '20/05/1990', guardians: [] }))).toEqual({});
      expect(issuesOf(values({ birthDate: '02/10/2008', guardians: [] }))).toEqual({});
    });

    it('still requires one the day before the eighteenth birthday', () => {
      expect(
        issuesOf(values({ birthDate: '03/10/2008', guardians: [] }))['guardians'],
      ).toBeDefined();
    });

    it('does not require one when the birth date itself is invalid', () => {
      expect(
        issuesOf(values({ birthDate: '01/01/2030', guardians: [] }))['guardians'],
      ).toBeUndefined();
    });

    it('counts the São Paulo day, not the UTC day', () => {
      vi.setSystemTime(new Date('2026-10-03T01:00:00Z'));

      expect(
        issuesOf(values({ birthDate: '03/10/2008', guardians: [] }))['guardians'],
      ).toBeDefined();
    });
  });

  describe('contact details', () => {
    it('rejects an invalid phone', () => {
      expect(issuesOf(values({ phone: 'telefone' }))['phone']).toContain(
        'Informe um telefone válido',
      );
      expect(issuesOf(values({ phone: '1'.repeat(21) }))['phone']).toContain(
        'Informe um telefone válido',
      );
    });

    it('rejects an invalid e-mail', () => {
      expect(issuesOf(values({ email: 'maria@example' }))['email']).toBe(
        'Informe um e-mail válido.',
      );
    });

    it('rejects an e-mail longer than 254 characters', () => {
      expect(issuesOf(values({ email: `${'a'.repeat(250)}@example.com` }))['email']).toBe(
        'O e-mail deve ter no máximo 254 caracteres.',
      );
    });

    it('rejects an invalid CPF', () => {
      expect(issuesOf(values({ cpf: '529.982.247-24' }))['cpf']).toBe('Informe um CPF válido.');
    });

    it('limits the administrative notes to 500 characters', () => {
      expect(issuesOf(values({ administrativeNotes: 'n'.repeat(500) }))).toEqual({});
      expect(
        issuesOf(values({ administrativeNotes: 'n'.repeat(501) }))['administrativeNotes'],
      ).toBe('As observações administrativas devem ter no máximo 500 caracteres.');
    });
  });

  describe('linked contacts', () => {
    it('reports guardian problems on the guardian field', () => {
      const issues = issuesOf(
        values({
          guardians: [
            guardian(),
            guardian({ name: '', relationship: '', phone: 'tel', cpf: '123' }),
          ],
        }),
      );

      expect(issues['guardians.1.name']).toBe('O nome do responsável é obrigatório.');
      expect(issues['guardians.1.relationship']).toBe('O vínculo do responsável é obrigatório.');
      expect(issues['guardians.1.phone']).toContain('Informe um telefone válido');
      expect(issues['guardians.1.cpf']).toBe('Informe um CPF válido.');
      expect(Object.keys(issues).some((path) => path.startsWith('guardians.0'))).toBe(false);
    });

    it('requires at least one purpose on a reference contact', () => {
      const issues = issuesOf(values({ referenceContacts: [reference({ purposes: [] })] }));

      expect(issues['referenceContacts.0.purposes']).toBe(
        'Informe ao menos uma finalidade para a pessoa de referência.',
      );
    });

    it('reports reference contact problems on the contact field', () => {
      const issues = issuesOf(
        values({ referenceContacts: [reference({ name: ' ', relationship: ' ', phone: 'tel' })] }),
      );

      expect(issues['referenceContacts.0.name']).toBe(
        'O nome da pessoa de referência é obrigatório.',
      );
      expect(issues['referenceContacts.0.relationship']).toBe(
        'O vínculo da pessoa de referência é obrigatório.',
      );
      expect(issues['referenceContacts.0.phone']).toContain('Informe um telefone válido');
    });

    it('limits how many contacts can be added', () => {
      const issues = issuesOf(
        values({
          guardians: Array.from({ length: 11 }, () => guardian()),
          referenceContacts: Array.from({ length: 11 }, () => reference()),
        }),
      );

      expect(issues['guardians']).toBe('Informe no máximo 10 responsáveis.');
      expect(issues['referenceContacts']).toBe('Informe no máximo 10 pessoas de referência.');
    });
  });
});

describe('ageFromBirthDate', () => {
  it.each([
    ['10/03/2015', 11],
    ['03/10/2008', 17],
    ['02/10/2008', 18],
    ['20/05/1990', 36],
    ['01/10/2026', 0],
    ['02/10/1906', 120],
  ] as const)('reads %j as %i years old today', (birthDate, expected) => {
    expect(ageFromBirthDate(birthDate)).toBe(expected);
  });

  it.each(['', '10/03', '31/02/2020', '02/10/2026', '01/01/2030', '02/10/1905'])(
    'has no age for %j',
    (birthDate) => {
      expect(ageFromBirthDate(birthDate)).toBeNull();
    },
  );
});

describe('form field lists', () => {
  it('names every field the backend can report on', () => {
    expect(CLIENT_FORM_FIELDS).toEqual([
      'fullName',
      'birthDate',
      'phone',
      'email',
      'cpf',
      'administrativeNotes',
      'guardians',
      'referenceContacts',
    ]);
    expect(GUARDIAN_FORM_FIELDS).toEqual(['name', 'relationship', 'phone', 'cpf']);
    expect(REFERENCE_CONTACT_FORM_FIELDS).toEqual(['name', 'relationship', 'phone', 'purposes']);
  });

  it('starts empty so nothing is asked up front', () => {
    expect(toClientFormFieldValues()).toEqual({
      fullName: '',
      birthDate: '',
      phone: '',
      email: '',
      cpf: '',
      administrativeNotes: '',
      guardians: [],
      referenceContacts: [],
    });
  });
});
