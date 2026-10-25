interface FormFooterBaseProps {
  isSaving: boolean;
  canSubmit?: boolean;
}

export type DialogFormFooterProps = FormFooterBaseProps;

export interface PageFormFooterProps extends FormFooterBaseProps {
  onCancel: () => void;
}

export type FormSubmitButtonProps = Required<FormFooterBaseProps>;
