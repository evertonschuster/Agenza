import { useEffect, useRef, type SubmitEvent } from 'react';
import { useNavigate } from 'react-router';
import { useFieldArray, useForm, useWatch, type FieldErrors, type Path } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toFormErrors } from '@/shared/api/formErrors';
import { applyApiProblem } from '@/shared/form/applyApiProblem';
import { toast } from '@/shared/ui/toast';
import { clientsRepository } from '../../../api/clientsRepository';
import { ADULT_AGE_IN_YEARS } from '../../../model/birthDate';
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
  type ClientFormValues,
} from '../../../model/clientForm';
import type { UseClientFormPageResult } from './useClientFormPage.types';

const CLIENTS_PATH = '/pessoas';

function fieldPathsOf(values: ClientFormFieldValues): Path<ClientFormFieldValues>[] {
  return [
    ...CLIENT_FORM_FIELDS,
    ...values.guardians.flatMap((_, index) =>
      GUARDIAN_FORM_FIELDS.map((field) => `guardians.${index}.${field}` as const),
    ),
    ...values.referenceContacts.flatMap((_, index) =>
      REFERENCE_CONTACT_FORM_FIELDS.map((field) => `referenceContacts.${index}.${field}` as const),
    ),
  ];
}

export function useClientFormPage(): UseClientFormPageResult {
  const navigate = useNavigate();
  const isMountedRef = useRef(true);
  const addGuardianButtonRef = useRef<HTMLButtonElement>(null);

  const methods = useForm<ClientFormFieldValues, unknown, ClientFormValues>({
    resolver: zodResolver(clientFormSchema),
    defaultValues: toClientFormFieldValues(),
  });
  const guardians = useFieldArray({ control: methods.control, name: 'guardians' });
  const referenceContacts = useFieldArray({ control: methods.control, name: 'referenceContacts' });
  const birthDate = useWatch({ control: methods.control, name: 'birthDate' });

  const isSaving = methods.formState.isSubmitting;
  const age = ageFromBirthDate(birthDate);
  const isMinor = age !== null && age < ADULT_AGE_IN_YEARS;

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  async function onValid(values: ClientFormValues) {
    const result = await clientsRepository.create(values);

    if (result.ok) {
      toast.add({
        title: 'Pessoa cadastrada',
        description: `O cadastro de ${result.data.fullName} foi criado.`,
        type: 'success',
      });
      if (isMountedRef.current) void navigate(CLIENTS_PATH);
      return;
    }

    const paths = fieldPathsOf(methods.getValues());
    applyApiProblem<ClientFormFieldValues>(result.error, paths, methods.setError);

    const { fieldErrors } = toFormErrors(result.error, paths);
    const firstInvalid = paths.find((path) => fieldErrors[path]);
    if (firstInvalid) methods.setFocus(firstInvalid);
  }

  function onInvalid(errors: FieldErrors<ClientFormFieldValues>) {
    const onlyGuardianMissing = Object.keys(errors).join() === 'guardians';
    if (onlyGuardianMissing) addGuardianButtonRef.current?.focus();
  }

  function submit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isSaving) void methods.handleSubmit(onValid, onInvalid)(event);
  }

  return {
    methods,
    guardians,
    referenceContacts,
    age,
    isMinor,
    isSaving,
    addGuardianButtonRef,
    onSubmit: submit,
    addGuardian: () => guardians.append(emptyGuardian()),
    addReferenceContact: () => referenceContacts.append(emptyReferenceContact()),
  };
}
