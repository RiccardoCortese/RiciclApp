// tests/register.test.jsx
// Test di componente dello screen di Registrazione (screens/register.jsx).
// Copre i test case del file Test_cases.xlsx:
//   - Registrazione  TC 1-7
//
// Lo screen non valida i campi lato client: invia la richiesta e, in caso di
// errore, mostra via alert() il messaggio restituito dal backend. Verifichiamo
// quindi la chiamata API, la navigazione alla verifica email e i messaggi d'errore.

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import axios from 'axios';
import { __router } from 'expo-router';

import Register from '../screens/register';

function compileForm({ username = 'username', email = 'prova@example.com', password = 'password' } = {}) {
  fireEvent.changeText(screen.getByPlaceholderText('Username'), username);
  fireEvent.changeText(screen.getByPlaceholderText('Email'), email);
  fireEvent.changeText(screen.getByPlaceholderText('Password'), password);
  fireEvent.press(screen.getByText('Registrati'));
}

describe('Register screen', () => {
  test('Renderizza i campi e il pulsante Registrati', () => {
    render(<Register />);
    expect(screen.getByPlaceholderText('Username')).toBeTruthy();
    expect(screen.getByPlaceholderText('Email')).toBeTruthy();
    expect(screen.getByPlaceholderText('Password')).toBeTruthy();
    expect(screen.getByText('Registrati')).toBeTruthy();
  });

  test('TC1 — registrazione valida: chiama /auth/register e naviga alla verifica email', async () => {
    axios.post.mockResolvedValue({ status: 201, data: { message: 'Utente registrato con successo' } });

    render(<Register />);
    compileForm();

    await waitFor(() => expect(axios.post).toHaveBeenCalled());
    expect(axios.post).toHaveBeenCalledWith(
      expect.stringContaining('/auth/register'),
      { username: 'username', email: 'prova@example.com', password: 'password' }
    );
    // Reindirizza alla pagina di inserimento codice, passando l'email.
    expect(__router.push).toHaveBeenCalledWith(
      expect.objectContaining({
        pathname: '/auth/verify_email',
        params: { email: 'prova@example.com' },
      })
    );
  });

  // TC2-7: la validazione avviene lato backend. Lo screen mostra il messaggio
  // del server tramite alert(). Un solo percorso di codice, più messaggi.
  test.each([
    ['TC2 — email non valida', 'Email non valida'],
    ['TC3 — password troppo corta', 'La password deve essere lunga almeno 6 caratteri'],
    ['TC4 — email già registrata', 'Utente già registrato'],
    ['TC5/6/7 — campi mancanti', 'Compila tutti i campi'],
  ])('%s: mostra il messaggio del backend e non naviga', async (_label, backendMessage) => {
    axios.post.mockRejectedValue({ response: { data: { message: backendMessage } } });

    render(<Register />);
    compileForm();

    await waitFor(() => expect(global.alert).toHaveBeenCalledWith(backendMessage));
    expect(__router.push).not.toHaveBeenCalledWith(
      expect.objectContaining({ pathname: '/auth/verify_email' })
    );
  });
});
