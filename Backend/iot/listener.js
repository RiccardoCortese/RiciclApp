const mqtt = require("mqtt");
const { MongoClient } = require("mongodb");
require("dotenv").config();

const MQTT_BROKER = process.env.MQTT_BROKER || "mqtt://localhost:1883";
const MONGO_URI = process.env.MONGO_URI;
const DB_NAME = process.env.DB_NAME || "riciclapp";

if (!MONGO_URI) {
  console.error("Errore: MONGO_URI non definita nel file .env");
  process.exit(1);
}

// Connessione al broker MQTT

const mqttClient = mqtt.connect(MQTT_BROKER);
const mongoClient = new MongoClient(MONGO_URI);

let binsCollection;

async function connectMongo() {
  await mongoClient.connect();
  const db = mongoClient.db(DB_NAME);
  binsCollection = db.collection("bins");
  console.log("Connesso a MongoDB Atlas");
}

mqttClient.on("connect", () => {
  console.log("Listener connesso al broker MQTT");
  // Sottoscrizione ai topic dei sensori dei bidoni
  mqttClient.subscribe("bins/+/fill_level", (err) => {
    if (err) {
      console.error("Errore durante la sottoscrizione MQTT:", err);
    } else {
      console.log("Sottoscritto a bins/+/fill_level");
    }
  });
});

// Gestione dei messaggi ricevuti dai sensori

mqttClient.on("message", async (topic, message) => {
  try {
    const payload = message.toString();

    const match = topic.match(/^bins\/(\d+)\/fill_level$/);
    if (!match) {
      console.warn(`Topic non riconosciuto: ${topic}`);
      return;
    }

    const binCode = `BIN${match[1].padStart(3, "0")}`;
    const fillLevel = Number(payload);

    if (Number.isNaN(fillLevel)) {
      console.warn(`Valore non valido ricevuto: ${payload}`);
      return;
    }

    let status = "OK";

    if (fillLevel >= 90) {
      status = "PIENO";
    }

    // Aggiorna il livello di riempimento del bidone nel database

    await binsCollection.updateOne(
      { binCode: binCode },
      {
        $set: {
          fillLevel: fillLevel,
          status: status,
          "sensor.lastUpdate": new Date()
        }
      }
    );

    console.log(`Aggiornato ${binCode}: fillLevel=${fillLevel}, status=${status}`);
  } catch (error) {
    console.error("Errore gestione messaggio MQTT:", error);
  }
});

async function start() {
  try {
    await connectMongo();
    console.log("Listener pronto");
  } catch (error) {
    console.error("Errore connessione MongoDB:", error);
    process.exit(1);
  }
}

start();

process.on("SIGINT", async () => {
  console.log("\nChiusura listener...");
  await mongoClient.close();
  mqttClient.end();
  process.exit(0);
});
