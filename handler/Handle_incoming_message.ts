import client from "../core/whatsapp_client";
import { handleMessageRequest } from "./groq_handler";
import { handle_tool } from "./tool_handler";

export const handleIncomingMessage = () =>
  client.on("message", async (message) => {
    console.log(" New message received from:", message.from);
    if (message.from === "233536287642@c.us") {
      console.log(" Received message:", message.body);
      const response = await handleMessageRequest(message.body);
      console.log(" Generated response:", response?.choices[0]);
      await handle_tool(response, message);
      return response;
    }
  });
