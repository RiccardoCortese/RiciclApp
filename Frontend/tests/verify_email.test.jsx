// tests/verify_email.test.jsx
// Test di componente dello screen di verifica email (screens/verify_email.jsx).
// Copre i test case del file Test_cases.xlsx:
//   - Email Verification  TC 8 (codice corretto), TC 9 (codice non di 6 cifre), TC 10 (codice errato)
//
// L'email viene passata dalla registrazione tramite useLocalSearchParams.

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import axios from 'axios';
import { __router, useLocalSearchParams } from 'expo-router';

import VerifyScreen from '../screens/verify_email';

beforeEach(() => {
  // Simula l'email passata dalla schermata di registrazione.
  useLocalSearchParams.mockReturnValue({ email: 'prova@example.com' });
});

describe('Verify email screen', () => {
  test('TC8 — codice corretto: chiama /auth/verify-email e naviga al login', async () => {
    axios.post.mockResolvedValue({
      data: { message: 'Email verificata con successo! Ora puoi effettuare il login.' },
    });

    render(<VerifyScreen />);
    fireEvent.changeText(screen.getByPlaceholderText('123456'), '123456');
    fireEvent.press(screen.getByText('Verifica'));

    await waitFor(() => expect(axios.post).toHaveBeenCalled());
    expect(axios.post).toHaveBeenCalledWith(
      expect.stringContaining('/auth/verify-email'),
      { email: 'prova@example.com', code: '123456' }
    );
    await waitFor(() => expect(__router.replace).toHaveBeenCalledWith('/auth/login'));
  });

  test('TC9 — codice non di 6 cifre: alert e nessuna chiamata al backend', async () => {
    render(<VerifyScreen />);
    fireEvent.changeText(screen.getByPlaceholderText('123456'), '123');
    fireEvent.press(screen.getByText('Verifica'));

    expect(global.alert).toHaveBeenCalledWith('Il codice deve essere di 6 cifre');
    expect(axios.post).not.toHaveBeenCalled();
  });

  test('TC10 — codice errato: mostra il messaggio d’errore del backend', async () => {
    axios.post.mockRejectedValue({
      response: { status: 400, data: { message: 'Codice errato' } },
    });

    render(<VerifyScreen />);
    fireEvent.changeText(screen.getByPlaceholderText('123456'), '000000');
    fireEvent.press(screen.getByText('Verifica'));

    await waitFor(() => expect(global.alert).toHaveBeenCalledWith('Codice errato'));
    expect(__router.replace).not.toHaveBeenCalled();
  });
});
