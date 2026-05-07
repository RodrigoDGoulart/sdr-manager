import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import AddLeadDialog from './AddLeadDialog';
import type { CreateLeadPayload } from '../../services/api';

function renderDialog(
  onSubmit = vi.fn<(lead: CreateLeadPayload) => Promise<void>>().mockResolvedValue(undefined),
  requiredFields: string[] = [],
) {
  render(
    <AddLeadDialog
      open
      loading={false}
      error=""
      requiredFields={requiredFields}
      onClose={vi.fn()}
      onSubmit={onSubmit}
    />,
  );

  return { onSubmit };
}

function fillLeadFields() {
  fireEvent.change(screen.getByLabelText(/nome/i), { target: { value: 'Maria Souza' } });
  fireEvent.change(screen.getByLabelText(/e-mail/i), { target: { value: 'maria@empresa.com' } });
  fireEvent.change(screen.getByLabelText(/telefone/i), { target: { value: '11999999999' } });
  fireEvent.change(screen.getByLabelText(/empresa/i), { target: { value: 'Acme' } });
  fireEvent.change(screen.getByLabelText(/cargo/i), { target: { value: 'Diretora' } });
  fireEvent.change(screen.getByLabelText(/origem do lead/i), { target: { value: 'LinkedIn' } });
  fireEvent.change(screen.getByLabelText(/observacoes/i), { target: { value: 'Lead pediu contato pela manha.' } });
}

describe('AddLeadDialog', () => {
  it('validates configured required lead fields before submit', async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderDialog(undefined, ['name']);

    await user.click(screen.getByRole('button', { name: /salvar/i }));

    expect(screen.getByText(/preencha os campos obrigatorios/i)).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('submits lead with custom additional information', async () => {
    const { onSubmit } = renderDialog();
    const user = userEvent.setup();
    fillLeadFields();

    await user.click(screen.getByRole('button', { name: /adicionar informacao/i }));
    fireEvent.change(screen.getByLabelText(/rotulo/i), { target: { value: 'Quantidade de unidades' } });
    await user.click(screen.getByLabelText(/tipo/i));
    await user.click(screen.getByRole('option', { name: /123/i }));
    fireEvent.change(screen.getByLabelText(/^informacao$/i), { target: { value: '12' } });
    await user.click(screen.getByRole('button', { name: /salvar/i }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));

    const payload = onSubmit.mock.calls[0][0] as CreateLeadPayload;
    expect(payload).toMatchObject({
      name: 'Maria Souza',
      email: 'maria@empresa.com',
      phone: '11999999999',
      company: 'Acme',
      role: 'Diretora',
      source: 'LinkedIn',
      notes: 'Lead pediu contato pela manha.',
      customFields: [
        {
          label: 'Quantidade de unidades',
          type: 'number',
          value: '12',
        },
      ],
    });
  });
});
