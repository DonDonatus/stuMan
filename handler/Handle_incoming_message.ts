import client from "../core/whatsapp_client";
import { handleMessageRequest } from "./groq_handler";
import { handle_tool } from "./tool_handler";
import { createUser, findUserByWhatsappId } from "../repository/user_repo";
import { getJudgeTools, judge } from "../utils/judge";
import { clearUserHistory } from "../utils/redis";

export const handleIncomingMessage = () =>
  client.on("message", async (message) => {
    if (message.from === "233536287642@c.us") {
      // await clearUserHistory(message.from);
      let complete = false;
      let finalResponse;
      while (!complete) {
        const response = await handleMessageRequest(message.from, message.body);
        await handle_tool(response, message);
        const user = await findUserByWhatsappId(message.from);
        if (!user) {
          await createUser({ WhatsappId: message.from, Name: "unknown" });
        }
        const judgeResponse = await judge(message.from);
        const judgeToolCall = getJudgeTools(judgeResponse);
        judgeToolCall === "task_complete"
          ? (complete = true)
          : (complete = false);
        finalResponse = response;
      }
      return finalResponse;
    }
  });
