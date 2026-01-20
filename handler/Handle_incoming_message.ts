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
        let messageBody;
        if (message.hasMedia) {
          const media = await message.downloadMedia();
          messageBody = `${message.body}\n[Media attached: type: ${media.mimetype}, data: ${media.data}]`;
        }

        const response = await handleMessageRequest(
          message.from,
          messageBody || message.body,
        );
        await handle_tool(response, message);
        const user = await findUserByWhatsappId(message.from);
        if (!user) {
          await createUser({ WhatsappId: message.from, Name: "unknown" });
        }
        const assistantMessage = response.choices?.[0]?.message;
        const deleteTool =
          assistantMessage && "tool_calls" in assistantMessage
            ? assistantMessage.tool_calls?.find(
                (tc: any) => tc.function.name === "delete_conversation_history",
              )
            : undefined;
        if (deleteTool) {
          complete = true;
          finalResponse = response;
        } else {
          const judgeResponse = await judge(message.from);
          const judgeToolCall = getJudgeTools(judgeResponse);
          complete = judgeToolCall === "task_complete";
          finalResponse = response;
        }
      }
      return finalResponse;
    }
  });
