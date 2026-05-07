import type { CreateLeadPayload, Lead } from '../services/api';

export const nativeLeadRequiredFieldOptions = [
  { key: 'name', label: 'Nome' },
  { key: 'phone', label: 'Telefone' },
  { key: 'email', label: 'E-mail' },
  { key: 'source', label: 'Origem' },
  { key: 'notes', label: 'Observacoes' },
] as const;

export type NativeLeadRequiredField = (typeof nativeLeadRequiredFieldOptions)[number]['key'];

export const nativeLeadRequiredFieldKeys = nativeLeadRequiredFieldOptions.map((field) => field.key) as string[];

export function isNativeLeadRequiredField(field: string): field is NativeLeadRequiredField {
  return nativeLeadRequiredFieldKeys.includes(field);
}

export function getRequiredCustomFields(requiredFields: string[]) {
  return requiredFields
    .map((field) => field.trim())
    .filter((field) => field && !isNativeLeadRequiredField(field));
}

export function getMissingLeadRequiredFields(
  lead: Pick<Lead, 'name' | 'email' | 'phone' | 'source' | 'notes' | 'customFields'>,
  requiredFields: string[],
) {
  const missing = new Set<string>();

  for (const field of requiredFields) {
    if (isNativeLeadRequiredField(field)) {
      if (!String(lead[field] || '').trim()) missing.add(field);
      continue;
    }

    const hasCustomField = lead.customFields.some(
      (customField) =>
        customField.label.trim().toLowerCase() === field.trim().toLowerCase() &&
        String(customField.value || '').trim(),
    );

    if (!hasCustomField) missing.add(field);
  }

  return Array.from(missing);
}

export function ensureRequiredCustomFields(
  customFields: CreateLeadPayload['customFields'],
  requiredFields: string[],
) {
  const existingLabels = new Set(customFields.map((field) => field.label.trim().toLowerCase()).filter(Boolean));
  const nextFields = [...customFields];

  for (const label of getRequiredCustomFields(requiredFields)) {
    if (!existingLabels.has(label.toLowerCase())) {
      nextFields.push({ label, value: '', type: 'text' });
      existingLabels.add(label.toLowerCase());
    }
  }

  return nextFields;
}
