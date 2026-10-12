interface FormFooterBaseProps {
  isSaving: boolean;
  canSubmit?: boolean;
}

export type DialogFormFooterProps = FormFooterBaseProps;

export interface PageFormFooterProps extends FormFooterBaseProps {
  cancelTo: string;
}

export type FormSubmitButtonProps = Required<FormFooterBaseProps>;
