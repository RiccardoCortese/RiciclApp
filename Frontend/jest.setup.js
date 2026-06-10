// jest.setup.js
// Configurazione globale eseguita da Jest prima di ogni file di test del Frontend
// (vedi "setupFilesAfterEnv" in package.json). Mocka le dipendenze che i vari
// screen usano sempre: AsyncStorage, expo-router e la funzione globale alert().

/* eslint-disable no-undef */

// ── AsyncStorage ─────────────────────────────────────────────────────────────
// Mock ufficiale in memoria fornito dalla libreria: niente storage nativo.
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// ── expo-router ──────────────────────────────────────────────────────────────
// useRouter() restituisce sempre gli stessi spy (push/replace/back), così i test
// possono verificare la navigazione importando `__router` da 'expo-router'.
// useLocalSearchParams() di default è vuoto; i test possono sovrascriverlo con
// require('expo-router').useLocalSearchParams.mockReturnValue({ ... }).
jest.mock('expo-router', () => {
  const router = { push: jest.fn(), replace: jest.fn(), back: jest.fn() };
  return {
    __esModule: true,
    useRouter: () => router,
    useLocalSearchParams: jest.fn(() => ({})),
    useFocusEffect: jest.fn(),
    Link: 'Link',
    __router: router, // esposto solo per le asserzioni nei test
  };
});

// ── alert() globale ──────────────────────────────────────────────────────────
// Diversi screen (login, register, verify_email, elimina_account) usano la
// funzione globale alert(); la sostituiamo con uno spy per poterla verificare.
global.alert = jest.fn();

// Pulisce i dati delle chiamate ai mock dopo ogni test (mantiene le implementazioni).
afterEach(() => {
  jest.clearAllMocks();
});
