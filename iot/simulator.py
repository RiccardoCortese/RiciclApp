import random
import time
import paho.mqtt.client as mqtt

BROKER = "localhost"
PORT = 1883

bins = [1, 2, 3]

client = mqtt.Client()
client.connect(BROKER, PORT, 60)

print("Simulatore avviato...")

while True:
    for bin_id in bins:
        fill = random.randint(0, 100)

        topic = f"bins/{bin_id}/fill_level"
        client.publish(topic, str(fill))

        print(f"Inviato: {topic} -> {fill}%")

    time.sleep(5)
