// tests/login.test.jsx
// Test di componente dello screen di Login (screens/login.jsx).
// Copre i test case del file Test_cases.xlsx:
//   - Login JWT      TC 14-17
//   - Multi utenza   TC 23-25 (login con ruoli diversi)
//
// La validazione dei campi è lato backend: lo screen invia la richiesta e mostra
// il messaggio d'errore restituito dal server tramite alert(). Qui verifichiamo
// la chiamata API, il salvataggio del token e la navigazione.

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { __router } from 'expo-router';

import Login from '../screens/login';

describe('Login screen', () => {
  test('Renderizza i campi email/password e il pulsante Accedi', () => {
    render(<Login />);
    expect(screen.getByPlaceholderText('Email')).toBeTruthy();
    expect(screen.getByPlaceholderText('Password')).toBeTruthy();
    expect(screen.getByText('Accedi')).toBeTruthy();
  });

  test('TC14 — credenziali corrette: chiama /auth/login, salva il token e naviga', async () => {
    axios.post.mockResolvedValue({
      data: { token: 'jwt-token', user: { id: '1', role: 'registered_user' } },
    });

    render(<Login />);
    fireEvent.changeText(screen.getByPlaceholderText('Email'), 'prova@example.com');
    fireEvent.changeText(screen.getByPlaceholderText('Password'), 'password');
    fireEvent.press(screen.getByText('Accedi'));

    await waitFor(() => expect(axios.post).toHaveBeenCalled());

    // Chiamata all'endpoint corretto con email e password.
    expect(axios.post).toHaveBeenCalledWith(
      expect.stringContaining('/auth/login'),
      { email: 'prova@example.com', password: 'password' }
    );
    // Token e dati utente salvati nel dispositivo.
    await waitFor(() => expect(AsyncStorage.setItem).toHaveBeenCalledWith('token', 'jwt-token'));
    // Redirect alla home.
    expect(__router.push).toHaveBeenCalledWith('/');
  });

  test('TC15 — password errata: mostra il messaggio d’errore del backend', async () => {
    axios.post.mockRejectedValue({
      response: { data: { message: 'Email o password non validi' } },
    });

    render(<Login />);
    fireEvent.changeText(screen.getByPlaceholderText('Email'), 'prova@example.com');
    fireEvent.changeText(screen.getByPlaceholderText('Password'), 'sbagliata');
    fireEvent.press(screen.getByText('Accedi'));

    await waitFor(() => expect(global.alert).toHaveBeenCalledWith('Email o password non validi'));
    expect(__router.push).not.toHaveBeenCalledWith('/');
  });

  test('TC25 — login Admin: salva il ruolo admin in AsyncStorage', async () => {
    axios.post.mockResolvedValue({
      data: { token: 'jwt-admin', user: { id: '9', role: 'admin' } },
    });

    render(<Login />);
    fireEvent.changeText(screen.getByPlaceholderText('Email'), 'admin@example.com');
    fireEvent.changeText(screen.getByPlaceholderText('Password'), 'adminpassword');
    fireEvent.press(screen.getByText('Accedi'));

    await waitFor(() => expect(AsyncStorage.setItem).toHaveBeenCalledWith('userRole', 'admin'));
  });
});
