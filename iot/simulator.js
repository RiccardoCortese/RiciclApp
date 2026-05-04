const mqtt = require('mqtt');

// Connessione al broker
const client = mqtt.connect('mqtt://localhost:1883');

// Lista bidoni
const bins = [1, 2, 3];

client.on('connect', () => {
  console.log('Simulatore connesso al broker MQTT');

  // Ogni 5 secondi invia dati
  setInterval(() => {
    bins.forEach((id) => {
      const fill = Math.floor(Math.random() * 100);

      const topic = `bins/${id}/fill_level`;

      client.publish(topic, fill.toString());

      console.log(`Inviato: ${topic} -> ${fill}%`);
    });
  }, 5000);
});
