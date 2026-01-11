import "dotenv/config.js";
import { initializeWhatsApp } from "./whatsapp.js";
import { handleIncomingMessage } from "./handler/Handle_incoming_message.js";
import { connectToMongoDB } from "./core/mongodb.js";

connectToMongoDB()
  .then(() => {
    initializeWhatsApp();
    handleIncomingMessage();
  })
  .catch((err) => {
    console.error("Failed to connect to MongoDB:", err);
  });
