// __mocks__/axios.js
// Mock manuale di axios usato in tutti i test del Frontend.
// Essendo axios un modulo di node_modules, questo mock viene applicato
// automaticamente da Jest. Ogni metodo è uno spy controllabile nei test con
// mockResolvedValue / mockRejectedValue. isAxiosError torna true così gli screen
// entrano nel ramo che mostra il messaggio d'errore del backend.
const axios = {
  post: jest.fn(),
  get: jest.fn(),
  patch: jest.fn(),
  delete: jest.fn(),
  isAxiosError: jest.fn(() => true),
};

// Gli screen usano `import axios from 'axios'` (default). Esponiamo lo stesso
// oggetto sia come default sia come named export per sicurezza.
module.exports = axios;
module.exports.default = axios;
module.exports.__esModule = true;
