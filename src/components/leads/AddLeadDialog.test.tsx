import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import AddLeadDialog from './AddLeadDialog';
import type { CreateLeadPayload } from '../../services/api';

function renderDialog(onSubmit = vi.fn<(lead: CreateLeadPayload) => Promise<void>>().mockResolvedValue(undefined)) {
  render(
    <AddLeadDialog
      open
      loading={false}
      error=""
      onClose={vi.fn()}
      onSubmit={onSubmit}
    />,
  );

  return { onSubmit };
}

function fillRequiredLeadFields() {
  fireEvent.change(screen.getByLabelText(/nome/i), { target: { value: 'Maria Souza' } });
  fireEvent.change(screen.getByLabelText(/e-mail/i), { target: { value: 'maria@empresa.com' } });
  fireEvent.change(screen.getByLabelText(/telefone/i), { target: { value: '11999999999' } });
  fireEvent.change(screen.getByLabelText(/empresa/i), { target: { value: 'Acme' } });
  fireEvent.change(screen.getByLabelText(/cargo/i), { target: { value: 'Diretora' } });
  fireEvent.change(screen.getByLabelText(/origem do lead/i), { target: { value: 'LinkedIn' } });
  fireEvent.change(screen.getByLabelText(/observações/i), { target: { value: 'Lead pediu contato pela manhã.' } });
}

describe('AddLeadDialog', () => {
  it('validates required lead fields before submit', async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderDialog();

    await user.click(screen.getByRole('button', { name: /salvar/i }));

    expect(screen.getByText(/preencha todos os campos obrigatórios/i)).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('submits lead with custom additional information', async () => {
    const { onSubmit } = renderDialog();
    const user = userEvent.setup();
    fillRequiredLeadFields();

    await user.click(screen.getByRole('button', { name: /adicionar informação/i }));
    fireEvent.change(screen.getByLabelText(/rótulo/i), { target: { value: 'Quantidade de unidades' } });
    await user.click(screen.getByLabelText(/tipo/i));
    await user.click(screen.getByRole('option', { name: /123/i }));
    fireEvent.change(screen.getByLabelText(/^informação$/i), { target: { value: '12' } });
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
      notes: 'Lead pediu contato pela manhã.',
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
