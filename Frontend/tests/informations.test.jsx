// tests/informations.test.jsx
// Test di componente dello screen Info Prodotto (screens/informations.jsx).
// Copre i test case del file Test_cases.xlsx:
//   - Inserimeno Codice Enumerativo  TC 27 (codice valido), TC 28-29 (codice non valido)
//
// La fotocamera (expo-camera) è mockata: qui testiamo solo l'inserimento manuale
// del codice e la ricerca prodotto tramite il backend ZX_API.

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import axios from 'axios';

// Mock dei moduli nativi non necessari ai test di ricerca.
jest.mock('expo-camera', () => ({
  CameraView: 'CameraView',
  useCameraPermissions: () => [{ granted: true }, jest.fn()],
}));
jest.mock('expo-status-bar', () => ({ StatusBar: 'StatusBar' }));

import Informations from '../screens/informations';

function search(code) {
  fireEvent.changeText(screen.getByPlaceholderText('es. 8076809513364'), code);
  fireEvent.press(screen.getByText('Cerca'));
}

describe('Informations screen — ricerca prodotto', () => {
  test('TC27 — codice valido: chiama /zx/scan e mostra prodotto e categoria', async () => {
    axios.get.mockResolvedValue({
      data: {
        status: 1,
        product: { product_name: 'Acqua Minerale', brands: 'AcquaTest', countries: 'Italia' },
        disposal: [{ label: 'Plastica', bin: 'Bidone Giallo', color: '#F9A825', icon: '♻️' }],
      },
    });

    render(<Informations />);
    search('8000815303206');

    await waitFor(() => expect(axios.get).toHaveBeenCalled());
    expect(axios.get).toHaveBeenCalledWith(
      expect.stringContaining('/zx/scan/8000815303206'),
      expect.any(Object)
    );
    // I dettagli del prodotto e la categoria di smaltimento vengono mostrati.
    expect(await screen.findByText('Acqua Minerale')).toBeTruthy();
    expect(screen.getByText('Plastica')).toBeTruthy();
  });

  test('TC28 — codice inesistente: mostra il messaggio di errore', async () => {
    axios.get.mockResolvedValue({
      data: { status: 0, error: 'Prodotto non trovato. Verifica il codice e riprova.' },
    });

    render(<Informations />);
    search('80008153032060000');

    expect(
      await screen.findByText('Prodotto non trovato. Verifica il codice e riprova.')
    ).toBeTruthy();
  });

  test('TC29 — codice non numerico: mostra il messaggio di errore', async () => {
    axios.get.mockResolvedValue({
      data: { status: 0, error: 'Prodotto non trovato. Verifica il codice e riprova.' },
    });

    render(<Informations />);
    search('8042f0r815303206gf00');

    expect(
      await screen.findByText('Prodotto non trovato. Verifica il codice e riprova.')
    ).toBeTruthy();
  });
});
