# Simulazione Sensori IoT - RiciclApp

## Descrizione

Questo modulo implementa una simulazione di sensori IoT per i bidoni intelligenti del progetto RiciclApp. 
Il sistema simula il comportamento di sensori installati sui bidoni, inviando periodicamente dati relativi al livello di riempimento tramite protocollo MQTT. 
Un listener MQTT riceve i messaggi pubblicati dal simulatore e aggiorna automaticamente i dati presenti nel database MongoDB.

---

# Architettura del sistema

simulator.js->MQTT Broker->listener.js->MongoDB (collection bins)

## Componenti

Il file simulator.js simula i sensori IoT dei bidoni. Il simulatore genera livelli di riempimento casuali, 
determina automaticamente lo stato del bidone e pubblica periodicamente messaggi MQTT contenenti le informazioni aggiornate.

Ogni bidone simulato invia:

livello di riempimento (fillLevel);
stato (status);
timestamp di aggiornamento.
listener.js

Il file listener.js riceve i messaggi MQTT e aggiorna MongoDB. Il listener si sottoscrive ai topic MQTT, 
interpreta i messaggi ricevuti e aggiorna automaticamente la collection bins nel database.

-Tecnologie utilizzate
Node.js
MongoDB
MQTT
MQTT.js
Dotenv
Mongoose
Requisiti

# Come usare

Prima dell’esecuzione è necessario avere installato:

Node.js
MongoDB
un broker MQTT (ad esempio Mosquitto)
Installazione

-Entrare nella cartella iot:

cd iot

-Installare le dipendenze:

npm install
Configurazione

-Creare un file .env nella cartella iot.

Esempio di configurazione:

MONGO_URI=your_mongodb_connection_string
DB_NAME=riciclapp
MQTT_BROKER=mqtt://localhost:1883
Avvio del sistema
Avvio listener MQTT
npm run listener

Il listener si connette al broker MQTT, riceve i dati inviati dal simulatore e aggiorna automaticamente MongoDB.

## Avvio simulatore

-Aprire un secondo terminale ed eseguire:

npm run simulator

Il simulatore inizierà a pubblicare dati casuali relativi ai bidoni intelligenti.

Struttura dei messaggi MQTT
Topic
bins/<id_bidone>

Esempio:

bins/1
Payload JSON

Esempio di messaggio MQTT:

{
  "fillLevel": 72,
  "status": "medium"
}
Aggiornamenti database

Il listener aggiorna automaticamente i seguenti campi nella collection bins:

fillLevel
status
sensor.lastUpdate
Stati del bidone

Gli stati vengono determinati automaticamente in base al livello di riempimento:

Fill Level	Stato
0 - 39	low
40 - 79	medium
80 - 100	full

# Obiettivo del modulo

Questo modulo permette di simulare:

raccolta dati da sensori IoT;
comunicazione tramite protocollo MQTT;
aggiornamento realtime del database.

L’obiettivo è rappresentare il comportamento di bidoni intelligenti in un contesto smart city.

# Note

Il simulatore genera dati casuali esclusivamente a scopo di testing e sviluppo.
