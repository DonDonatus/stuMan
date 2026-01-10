import client from "../core/whatsapp_client";
import { handleMessageRequest } from "./groq_handler";
import { handle_tool } from "./tool_handler";

export const handleIncomingMessage = () =>
  client.on("message", async (message) => {
    if (message.from === "233536287642@c.us") {
      const response = await handleMessageRequest(message.from, message.body);
      await handle_tool(response, message);
      return response;
    }
  });
