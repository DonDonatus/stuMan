import client from "../core/whatsapp_client";
import { handleMessageRequest } from "./groq_handler";
import { handle_tool } from "./tool_handler";
import { createUser, findUserByWhatsappId } from "../repository/user_repo";

export const handleIncomingMessage = () =>
  client.on("message", async (message) => {
    if (message.from === "233536287642@c.us") {
      const response = await handleMessageRequest(message.from, message.body);
      await handle_tool(response, message);
      const user = await findUserByWhatsappId(message.from);
      if (!user) {
        await createUser({ WhatsappId: message.from, Name: "unknown" });
      }

      return response;
    }
  });
