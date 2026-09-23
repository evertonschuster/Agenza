import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FormField } from './components/form-field';

describe('FormField', () => {
  it('links the label to the control id by default', () => {
    render(
      <FormField name="name" label="Nome">
        {(controlProps) => <input {...controlProps} />}
      </FormField>,
    );

    expect(screen.getByLabelText('Nome')).toHaveAttribute('id', 'field-name');
  });

  it('renders the label without htmlFor when labelHtmlFor is false', () => {
    render(
      <FormField name="color" label="Cor" labelHtmlFor={false}>
        {(controlProps) => <input {...controlProps} />}
      </FormField>,
    );

    expect(screen.getByText('Cor')).not.toHaveAttribute('for');
  });

  it('describes the control by the hint when there is no error', () => {
    render(
      <FormField name="name" label="Nome" hint="até 40 caracteres">
        {(controlProps) => <input {...controlProps} />}
      </FormField>,
    );

    const input = screen.getByLabelText('Nome');
    expect(input).toHaveAttribute('aria-describedby', 'field-name-hint');
    expect(input).toHaveAttribute('aria-invalid', 'false');
  });

  it('switches the description to the error, still showing the hint text visibly', () => {
    render(
      <FormField name="name" label="Nome" hint="até 40 caracteres" error="Obrigatório.">
        {(controlProps) => <input {...controlProps} />}
      </FormField>,
    );

    const input = screen.getByLabelText('Nome');
    expect(input).toHaveAttribute('aria-describedby', 'field-name-error');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByText('até 40 caracteres')).toBeInTheDocument();
    expect(screen.getByText('Obrigatório.')).toBeInTheDocument();
  });

  it('has no description when there is neither hint nor error', () => {
    render(
      <FormField name="name" label="Nome">
        {(controlProps) => <input {...controlProps} />}
      </FormField>,
    );

    expect(screen.getByLabelText('Nome')).not.toHaveAttribute('aria-describedby');
  });
});
