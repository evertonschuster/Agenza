import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FormField } from './components/form-field';

describe('FormField', () => {
  it('links the label to the control by default', () => {
    render(<FormField label="Nome">{(controlProps) => <input {...controlProps} />}</FormField>);

    expect(screen.getByLabelText('Nome')).toBeInTheDocument();
  });

  it('gives each instance its own id, so two fields with the same label never collide', () => {
    render(
      <>
        <FormField label="Nome">{(controlProps) => <input {...controlProps} />}</FormField>
        <FormField label="Nome">{(controlProps) => <input {...controlProps} />}</FormField>
      </>,
    );

    const [first, second] = screen.getAllByLabelText('Nome');
    expect(first?.id).toBeTruthy();
    expect(first?.id).not.toBe(second?.id);
  });

  it('renders the label without htmlFor when labelHtmlFor is false', () => {
    render(
      <FormField label="Cor" labelHtmlFor={false}>
        {(controlProps) => <input {...controlProps} />}
      </FormField>,
    );

    expect(screen.getByText('Cor')).not.toHaveAttribute('for');
  });

  it('describes the control by the hint when there is no error', () => {
    render(
      <FormField label="Nome" hint="até 40 caracteres">
        {(controlProps) => <input {...controlProps} />}
      </FormField>,
    );

    const input = screen.getByLabelText('Nome');
    expect(input).toHaveAccessibleDescription('até 40 caracteres');
    expect(input).toHaveAttribute('aria-invalid', 'false');
  });

  it('switches the description to the error, still showing the hint text visibly', () => {
    render(
      <FormField label="Nome" hint="até 40 caracteres" error="Obrigatório.">
        {(controlProps) => <input {...controlProps} />}
      </FormField>,
    );

    const input = screen.getByLabelText('Nome');
    expect(input).toHaveAccessibleDescription('Obrigatório.');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByText('até 40 caracteres')).toBeInTheDocument();
  });

  it('has no description when there is neither hint nor error', () => {
    render(<FormField label="Nome">{(controlProps) => <input {...controlProps} />}</FormField>);

    expect(screen.getByLabelText('Nome')).not.toHaveAttribute('aria-describedby');
  });
});
