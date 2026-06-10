// tests/elimina_account.test.jsx
// Test di componente dello screen di eliminazione account (screens/elimina_account.jsx).
// Copre il test case del file Test_cases.xlsx:
//   - Eliminazione Account  TC 11

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { __router } from 'expo-router';

import EliminaAccountScreen from '../screens/elimina_account';

describe('Elimina account screen', () => {
  test('TC11 — account eliminato: chiama DELETE /user/delete, alert e naviga a register', async () => {
    await AsyncStorage.setItem('token', 'jwt-token'); // utente autenticato
    axios.delete.mockResolvedValue({ data: { message: 'Account eliminato con successo' } });

    render(<EliminaAccountScreen />);
    // "Elimina Account" compare sia come titolo sia come testo del pulsante:
    // premiamo l'ultimo (il pulsante).
    const matches = screen.getAllByText('Elimina Account');
    fireEvent.press(matches[matches.length - 1]);

    await waitFor(() => expect(axios.delete).toHaveBeenCalled());
    expect(axios.delete).toHaveBeenCalledWith(
      expect.stringContaining('/user/delete'),
      expect.objectContaining({
        headers: { Authorization: 'Bearer jwt-token' },
      })
    );
    await waitFor(() => expect(global.alert).toHaveBeenCalledWith('Account eliminato con successo'));
    expect(__router.push).toHaveBeenCalledWith('/auth/register');
  });

  test('Senza token: avvisa di rifare il login e non chiama il backend', async () => {
    await AsyncStorage.clear(); // nessun token salvato

    render(<EliminaAccountScreen />);
    // "Elimina Account" compare sia come titolo sia come testo del pulsante:
    // premiamo l'ultimo (il pulsante).
    const matches = screen.getAllByText('Elimina Account');
    fireEvent.press(matches[matches.length - 1]);

    await waitFor(() =>
      expect(global.alert).toHaveBeenCalledWith('Token non trovato. Effettua di nuovo il login.')
    );
    expect(axios.delete).not.toHaveBeenCalled();
  });
});
