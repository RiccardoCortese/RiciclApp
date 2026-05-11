import { useState } from 'react';
import HomeScreen from './src/files/App';
import InformationsScreen from './src/files/Informations';

export default function App() {
  const [screen, setScreen] = useState('Home');
  const navigate = (target) => setScreen(target);

  switch (screen) {
    case 'Informations': return <InformationsScreen navigate={navigate} />;
    default:             return <HomeScreen navigate={navigate} />;
  }
}
