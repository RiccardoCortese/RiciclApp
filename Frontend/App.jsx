import { useState } from 'react';
import HomeScreen from './screens/App';
import InformationsScreen from './screens/informations';
//import RegisterScreen from './screens/register';

export default function App() {
  const [screen, setScreen] = useState('Home');
  const navigate = (target) => setScreen(target);

  switch (screen) {
    case 'Informations': return <InformationsScreen navigate={navigate} />;
    default:             return <HomeScreen navigate={navigate} />;
  }
}
