const { MongoClient, ObjectId } = require("mongodb");
require("dotenv").config();

const uri = process.env.MONGO_URI;
const dbName = process.env.DB_NAME || "riciclapp";

if (!uri) {
  console.error("Errore: MONGO_URI non definita nel file .env");
  process.exit(1);
}

const client = new MongoClient(uri);

async function seed() {
  try {
    await client.connect();
    console.log("Connesso a MongoDB Atlas");

    const db = client.db(dbName);

    // 1. Collection
    const users = db.collection("users");
    const collectionCenters = db.collection("collection_centers");
    const bins = db.collection("bins");
    const products = db.collection("products");
    const disposalRules = db.collection("disposal_rules");
    const reports = db.collection("reports");
    const rewards = db.collection("rewards");
    const vouchers = db.collection("vouchers");
    const partners = db.collection("partners");
    const collectionEvents = db.collection("collection_events");
    const routes = db.collection("routes");
    const sensorReadings = db.collection("sensor_readings");

    // 2. Pulizia dati vecchi
    console.log("Pulizia database...");
    await users.deleteMany({});
    await collectionCenters.deleteMany({});
    await bins.deleteMany({});
    await products.deleteMany({});
    await disposalRules.deleteMany({});
    await reports.deleteMany({});
    await rewards.deleteMany({});
    await vouchers.deleteMany({});
    await partners.deleteMany({});
    await collectionEvents.deleteMany({});
    await routes.deleteMany({});
    await sensorReadings.deleteMany({});

    // 3. Creazione ID manuali per collegare i documenti
    const userMarioId = new ObjectId();
    const userAnnaId = new ObjectId();
    const operatorId = new ObjectId();
    const adminId = new ObjectId();

    const center1Id = new ObjectId();
    const center2Id = new ObjectId();

    const bin1Id = new ObjectId();
    const bin2Id = new ObjectId();
    const bin3Id = new ObjectId();

    const plasticRuleId = new ObjectId();
    const glassRuleId = new ObjectId();

    const reward1Id = new ObjectId();
    const partner1Id = new ObjectId();

    // 4. Users
    await users.insertMany([
      {
        _id: userMarioId,
        name: "Mario Rossi",
        email: "mario.rossi@email.com",
        passwordHash: "hashed_password",
        role: "registered_user",
        points: 120,
        createdAt: new Date()
      },
      {
        _id: userAnnaId,
        name: "Anna Bianchi",
        email: "anna.bianchi@email.com",
        passwordHash: "hashed_password",
        role: "registered_user",
        points: 80,
        createdAt: new Date()
      },
      {
        _id: operatorId,
        name: "Luca Verdi",
        email: "luca.verdi@riciclapp.it",
        passwordHash: "hashed_password",
        role: "operator",
        employeeCode: "OP001",
        assignedRouteId: null,
        createdAt: new Date()
      },
      {
        _id: adminId,
        name: "Admin RiciclApp",
        email: "admin@riciclapp.it",
        passwordHash: "hashed_password",
        role: "admin",
        accessLevel: 1,
        createdAt: new Date()
      }
    ]);

    // 5. Centri raccolta
    await collectionCenters.insertMany([
      {
        _id: center1Id,
        name: "Centro Raccolta Nord",
        address: "Via Roma 10",
        area: "Quartiere Nord",
        openingHours: "08:00-18:00"
      },
      {
        _id: center2Id,
        name: "Centro Raccolta Sud",
        address: "Via Napoli 25",
        area: "Quartiere Sud",
        openingHours: "09:00-17:00"
      }
    ]);

    // 6. Bidoni con sensore incorporato
    await bins.insertMany([
      {
        _id: bin1Id,
        binCode: "BIN001",
        wasteType: "plastica",
        fillLevel: 75,
        status: "PARTIALLY_FULL",
        centerId: center1Id,
        sensor: {
          sensorCode: "SENS001",
          batteryLevel: 88,
          lastUpdate: new Date()
        }
      },
      {
        _id: bin2Id,
        binCode: "BIN002",
        wasteType: "vetro",
        fillLevel: 40,
        status: "OK",
        centerId: center1Id,
        sensor: {
          sensorCode: "SENS002",
          batteryLevel: 92,
          lastUpdate: new Date()
        }
      },
      {
        _id: bin3Id,
        binCode: "BIN003",
        wasteType: "carta",
        fillLevel: 95,
        status: "FULL",
        centerId: center2Id,
        sensor: {
          sensorCode: "SENS003",
          batteryLevel: 70,
          lastUpdate: new Date()
        }
      }
    ]);

    // 7. Regole smaltimento
    await disposalRules.insertMany([
      {
        _id: plasticRuleId,
        material: "plastica",
        instructions: "Conferire negli appositi bidoni per plastica e imballaggi.",
        region: "default"
      },
      {
        _id: glassRuleId,
        material: "vetro",
        instructions: "Conferire nel bidone del vetro, senza sacchetti.",
        region: "default"
      }
    ]);

    // 8. Prodotti
    await products.insertMany([
      {
        name: "Bottiglia di plastica",
        barcode: "800000000001",
        category: "bevande",
        disposalRuleId: plasticRuleId
      },
      {
        name: "Barattolo di vetro",
        barcode: "800000000002",
        category: "alimentari",
        disposalRuleId: glassRuleId
      }
    ]);

    // 9. Segnalazioni
    await reports.insertMany([
      {
        authorId: userMarioId,
        binId: bin3Id,
        type: "BIDONE_PIENO",
        description: "Il bidone della carta risulta pieno.",
        photo: null,
        position: "Centro Raccolta Sud",
        status: "IN_ATTESA",
        createdAt: new Date()
      },
      {
        authorId: operatorId,
        binId: bin1Id,
        type: "GUASTO",
        description: "Il coperchio del bidone è danneggiato.",
        photo: null,
        position: "Centro Raccolta Nord",
        status: "IN_CORSO",
        createdAt: new Date()
      }
    ]);

    // 10. Partner
    await partners.insertMany([
      {
        _id: partner1Id,
        businessName: "EcoMarket",
        address: "Via Verde 5",
        active: true
      }
    ]);

    // 11. Premi
    await rewards.insertMany([
      {
        _id: reward1Id,
        name: "Sconto 10%",
        description: "Voucher sconto presso partner commerciale.",
        pointsCost: 100,
        availability: 20,
        partnerId: partner1Id
      }
    ]);

    // 12. Voucher
    await vouchers.insertMany([
      {
        code: "ECO-ABC123",
        userId: userMarioId,
        rewardId: reward1Id,
        partnerId: partner1Id,
        status: "ACTIVE",
        expirationDate: new Date("2026-12-31")
      }
    ]);

    // 13. Eventi raccolta
    await collectionEvents.insertMany([
      {
        name: "Pulizia Parco Centrale",
        description: "Evento di raccolta rifiuti in area urbana.",
        area: "Parco Centrale",
        createdBy: adminId,
        participants: [userMarioId, userAnnaId],
        startDate: new Date("2026-06-01T09:00:00Z"),
        endDate: new Date("2026-06-01T13:00:00Z"),
        bonusPoints: 20,
        status: "ACTIVE"
      }
    ]);

    // 14. Percorsi raccolta
    await routes.insertMany([
      {
        operatorId: operatorId,
        binIds: [bin1Id, bin3Id],
        estimatedTimeMinutes: 45,
        status: "ASSIGNED",
        createdAt: new Date()
      }
    ]);

    // 15. Letture sensori
    await sensorReadings.insertMany([
      {
        binId: bin1Id,
        sensorCode: "SENS001",
        fillLevel: 75,
        batteryLevel: 88,
        detectedAt: new Date()
      },
      {
        binId: bin2Id,
        sensorCode: "SENS002",
        fillLevel: 40,
        batteryLevel: 92,
        detectedAt: new Date()
      },
      {
        binId: bin3Id,
        sensorCode: "SENS003",
        fillLevel: 95,
        batteryLevel: 70,
        detectedAt: new Date()
      }
    ]);

    console.log("Seed completato correttamente");
  } catch (error) {
    console.error("Errore durante il seed:", error);
  } finally {
    await client.close();
    console.log("Connessione chiusa");
  }
}

seed();
