// tests/profile.test.jsx
// Test di componente dello screen Profilo (screens/profile.jsx).
// Copre i test case del file Test_cases.xlsx:
//   - Visualizzazione Profilo  TC 18
//   - Modifica Username        TC 20, 22
//   - Cambio Password Sicuro   TC 23, 25, 26
//   - Password Recovery        TC 34, 35, 36, 38
//
// Lo screen usa Alert.alert (react-native) per i messaggi e moduli nativi pesanti
// (image picker, file system, icone): li mockiamo perché non servono a questi test.

import React from 'react';
import { Alert } from 'react-native';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Mock dei moduli nativi importati dallo screen ma non necessari ai test.
jest.mock('@expo/vector-icons', () => ({ Ionicons: 'Ionicons' }));
jest.mock('expo-image-picker', () => ({
  requestMediaLibraryPermissionsAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
  MediaTypeOptions: { Images: 'Images' },
}));
jest.mock('expo-file-system', () => ({
  documentDirectory: 'file://doc/',
  getInfoAsync: jest.fn(),
  makeDirectoryAsync: jest.fn(),
  copyAsync: jest.fn(),
  deleteAsync: jest.fn(),
}));
// L'immagine avatar di default: la rendiamo un valore qualsiasi.
jest.mock('../src/assets/Profile_image/User_image.png', () => 1, { virtual: true });

import ProfileScreen from '../screens/profile';

const defaultUser = {
  id: '1',
  name: 'Mario',
  email: 'mario@example.com',
  role: 'registered_user',
  points: 10,
};

let alertSpy;
beforeEach(() => {
  alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
});

// Renderizza lo screen con un utente autenticato e attende il caricamento del profilo.
async function renderLoaded(user = defaultUser) {
  await AsyncStorage.setItem('token', 'jwt-token');
  axios.get.mockResolvedValue({ data: { user } });
  render(<ProfileScreen />);
  await screen.findByText(user.email); // il profilo è caricato
}

describe('Profile screen', () => {
  test('TC18 — visualizza i dati del profilo (username, email, ruolo, punti)', async () => {
    await renderLoaded();
    expect(screen.getByText('Mario')).toBeTruthy();
    expect(screen.getByText('mario@example.com')).toBeTruthy();
    expect(screen.getByText('registered_user')).toBeTruthy();
    expect(screen.getByText('10')).toBeTruthy();
  });

  // ── Modifica Username ──────────────────────────────────────────────────────
  test('TC20 — nuovo username valido: chiama PATCH /user/profile/name e conferma', async () => {
    await renderLoaded();
    axios.patch.mockResolvedValue({ data: { user: { ...defaultUser, name: 'NuovoNome' } } });

    fireEvent.press(screen.getByText('Cambia username'));
    fireEvent.changeText(screen.getByPlaceholderText('Inserisci nuovo username'), 'NuovoNome');
    fireEvent.press(screen.getByText('Salva username'));

    await waitFor(() => expect(axios.patch).toHaveBeenCalled());
    expect(axios.patch).toHaveBeenCalledWith(
      expect.stringContaining('/user/profile/name'),
      { username: 'NuovoNome' },
      expect.any(Object)
    );
    await waitFor(() =>
      expect(alertSpy).toHaveBeenCalledWith('Successo', 'Username aggiornato con successo')
    );
  });

  test('TC22 — username vuoto: alert e nessuna chiamata al backend', async () => {
    await renderLoaded();

    fireEvent.press(screen.getByText('Cambia username'));
    fireEvent.changeText(screen.getByPlaceholderText('Inserisci nuovo username'), '');
    fireEvent.press(screen.getByText('Salva username'));

    expect(alertSpy).toHaveBeenCalledWith('Errore', 'Lo username deve contenere almeno 2 caratteri');
    expect(axios.patch).not.toHaveBeenCalled();
  });

  // ── Cambio Password ────────────────────────────────────────────────────────
  test('TC23 — cambio password valido: chiama PATCH /user/profile/password e conferma', async () => {
    await renderLoaded();
    axios.patch.mockResolvedValue({ data: {} });

    fireEvent.press(screen.getByText('Cambia password'));
    fireEvent.changeText(screen.getByPlaceholderText('Vecchia password'), 'vecchiaPassword');
    fireEvent.changeText(screen.getByPlaceholderText('Nuova password'), 'nuovaPassword');
    fireEvent.press(screen.getByText('Salva password'));

    await waitFor(() => expect(axios.patch).toHaveBeenCalled());
    expect(axios.patch).toHaveBeenCalledWith(
      expect.stringContaining('/user/profile/password'),
      { oldPassword: 'vecchiaPassword', newPassword: 'nuovaPassword' },
      expect.any(Object)
    );
    await waitFor(() =>
      expect(alertSpy).toHaveBeenCalledWith('Successo', 'Password aggiornata con successo')
    );
  });

  test('TC25 — nuova password troppo corta: alert e nessuna chiamata', async () => {
    await renderLoaded();

    fireEvent.press(screen.getByText('Cambia password'));
    fireEvent.changeText(screen.getByPlaceholderText('Vecchia password'), 'vecchiaPassword');
    fireEvent.changeText(screen.getByPlaceholderText('Nuova password'), '123');
    fireEvent.press(screen.getByText('Salva password'));

    expect(alertSpy).toHaveBeenCalledWith('Errore', 'La nuova password deve essere lunga almeno 6 caratteri');
    expect(axios.patch).not.toHaveBeenCalled();
  });

  test('TC26 — campi password vuoti: alert e nessuna chiamata', async () => {
    await renderLoaded();

    fireEvent.press(screen.getByText('Cambia password'));
    fireEvent.press(screen.getByText('Salva password'));

    expect(alertSpy).toHaveBeenCalledWith('Errore', 'Inserisci vecchia e nuova password');
    expect(axios.patch).not.toHaveBeenCalled();
  });

  // ── Password Recovery ──────────────────────────────────────────────────────
  test('TC34 — richiesta reset: chiama POST /user/profile/request-password-reset', async () => {
    await renderLoaded();
    axios.post.mockResolvedValue({ data: {} });

    fireEvent.press(screen.getByText('Reimposta password'));

    await waitFor(() => expect(axios.post).toHaveBeenCalled());
    expect(axios.post).toHaveBeenCalledWith(
      expect.stringContaining('/user/profile/request-password-reset'),
      expect.any(Object),
      expect.any(Object)
    );
    await waitFor(() => expect(alertSpy).toHaveBeenCalledWith('Codice inviato', expect.any(String)));
  });

  test('TC36 — reset con due password diverse: alert "non coincidono", nessun reset', async () => {
    await renderLoaded();
    axios.post.mockResolvedValue({ data: {} });

    // Apre il form di reset (richiesta codice).
    fireEvent.press(screen.getByText('Reimposta password'));
    await screen.findByText('Salva nuova password');

    fireEvent.changeText(screen.getByPlaceholderText('Nuova password'), 'aaaaaa');
    fireEvent.changeText(screen.getByPlaceholderText('Conferma nuova password'), 'bbbbbb');
    fireEvent.changeText(screen.getByPlaceholderText('Codice ricevuto via email'), '123456');
    fireEvent.press(screen.getByText('Salva nuova password'));

    expect(alertSpy).toHaveBeenCalledWith('Errore', 'Le due password non coincidono');
    // Solo la chiamata di richiesta codice, nessuna chiamata di reset-password.
    expect(axios.post).not.toHaveBeenCalledWith(
      expect.stringContaining('/user/profile/reset-password'),
      expect.any(Object),
      expect.any(Object)
    );
  });

  test('TC38 — reset con campi vuoti: alert "Compila tutti i campi"', async () => {
    await renderLoaded();
    axios.post.mockResolvedValue({ data: {} });

    fireEvent.press(screen.getByText('Reimposta password'));
    await screen.findByText('Salva nuova password');

    fireEvent.press(screen.getByText('Salva nuova password'));

    expect(alertSpy).toHaveBeenCalledWith('Errore', 'Compila tutti i campi');
  });

  test('TC35 — reset valido: chiama POST /user/profile/reset-password e conferma', async () => {
    await renderLoaded();
    axios.post.mockResolvedValue({ data: {} });

    fireEvent.press(screen.getByText('Reimposta password'));
    await screen.findByText('Salva nuova password');

    fireEvent.changeText(screen.getByPlaceholderText('Nuova password'), 'nuovaPassword');
    fireEvent.changeText(screen.getByPlaceholderText('Conferma nuova password'), 'nuovaPassword');
    fireEvent.changeText(screen.getByPlaceholderText('Codice ricevuto via email'), '123456');
    fireEvent.press(screen.getByText('Salva nuova password'));

    await waitFor(() =>
      expect(axios.post).toHaveBeenCalledWith(
        expect.stringContaining('/user/profile/reset-password'),
        { newPassword: 'nuovaPassword', code: '123456' },
        expect.any(Object)
      )
    );
    await waitFor(() =>
      expect(alertSpy).toHaveBeenCalledWith('Successo', 'Password reimpostata con successo')
    );
  });
});
