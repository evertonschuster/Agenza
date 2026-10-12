export const CONTACT_PURPOSES = ['emergency', 'operationalSupport', 'dailyCommunication'] as const;

export type ContactPurpose = (typeof CONTACT_PURPOSES)[number];

export interface ContactPurposeOption {
  value: ContactPurpose;
  label: string;
}

export const CONTACT_PURPOSE_OPTIONS: readonly ContactPurposeOption[] = [
  { value: 'emergency', label: 'Emergência' },
  { value: 'operationalSupport', label: 'Apoio operacional' },
  { value: 'dailyCommunication', label: 'Comunicação cotidiana' },
];
