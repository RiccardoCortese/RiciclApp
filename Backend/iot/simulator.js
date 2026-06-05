require("dotenv").config();
const mqtt = require("mqtt");

const MQTT_BROKER = process.env.MQTT_BROKER || "mqtt://localhost:1883";

// Connessione al broker
const client = mqtt.connect(MQTT_BROKER);

// Lista bidoni
const NUMBER_OF_BINS = 5;

const bins = Array.from(
  { length: NUMBER_OF_BINS },
  (_, i) => i + 1
);

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
