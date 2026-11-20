// @vitest-environment jsdom
import { afterEach, describe, expect, test, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { Check } from '../src/lib/geometry/checks';

const zipSpy = vi.fn(() => new Uint8Array([1, 2, 3]));
vi.mock('../src/lib/export/zip', () => ({ buildExportZip: zipSpy }));
const { ExportBar } = await import('../src/components/ExportBar');

afterEach(() => {
  cleanup();
  zipSpy.mockClear();
});

const green: Check[] = [
  { id: 'manifold', ok: true, message: '' },
  { id: 'minStroke', ok: true, message: '' },
];
const weight = { total: 100, byZone: { body: 60, cap: 30, accent: 7, text: 3 } };

describe('ExportBar', () => {
  test('un controllo rosso disabilita il pulsante e mostra il messaggio', () => {
    const checks: Check[] = [
      green[0],
      { id: 'minStroke', ok: false, message: '', data: { faces: 'front' } },
    ];
    render(<ExportBar parts={[]} checks={checks} weight={weight} blocked lang="it" />);
    expect(screen.getByRole('button', { name: /scarica/i })).toHaveProperty('disabled', true);
    expect(screen.getByRole('alert').textContent).toMatch(/0,8 mm/);
  });

  test('tutto verde: il pulsante scarica lo zip', () => {
    const create = vi.fn(() => 'blob:x');
    const revoke = vi.fn();
    Object.assign(URL, { createObjectURL: create, revokeObjectURL: revoke });
    render(<ExportBar parts={[]} checks={green} weight={weight} blocked={false} lang="it" />);
    const btn = screen.getByRole('button', { name: /scarica/i });
    expect(btn).toHaveProperty('disabled', false);
    fireEvent.click(btn);
    expect(zipSpy).toHaveBeenCalledOnce();
    expect(create).toHaveBeenCalledOnce();
    expect(screen.getByText(/100 g/)).toBeTruthy();
  });

  test('in inglese', () => {
    render(<ExportBar parts={[]} checks={green} weight={weight} blocked={false} lang="en" />);
    expect(screen.getByRole('button', { name: /download/i })).toBeTruthy();
  });
});
