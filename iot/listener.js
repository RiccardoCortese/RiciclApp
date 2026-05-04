const mqtt = require('mqtt');

const client = mqtt.connect('mqtt://localhost:1883');

client.on('connect', () => {
  console.log('Listener connesso al broker MQTT');

  client.subscribe('bins/+/fill_level', (err) => {
    if (err) {
      console.error('Errore subscription:', err);
    } else {
      console.log('Sottoscritto a bins/+/fill_level');
    }
  });
});

client.on('message', (topic, message) => {
  const payload = message.toString();

  console.log(`Ricevuto: ${topic} -> ${payload}%`);
});
