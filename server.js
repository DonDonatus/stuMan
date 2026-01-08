import "dotenv/config.js";
import { initializeWhatsApp } from "./whatsapp.js";
import { handleIncomingMessage } from "./handler/Handle_incoming_message.js";
import { handle_tool } from "./handler/tool_handler.js";

initializeWhatsApp();
handleIncomingMessage();
