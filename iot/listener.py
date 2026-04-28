import paho.mqtt.client as mqtt

BROKER = "localhost"
PORT = 1883


def on_connect(client, userdata, flags, rc):
    print("Listener connesso al broker MQTT")
    client.subscribe("bins/+/fill_level")


def on_message(client, userdata, msg):
    topic = msg.topic
    payload = msg.payload.decode()

    print(f"Ricevuto: {topic} -> {payload}%")


client = mqtt.Client()
client.on_connect = on_connect
client.on_message = on_message

client.connect(BROKER, PORT, 60)
client.loop_forever()
