import { execute_tool } from "../utils/tool_registry";
import WAWebJS from "whatsapp-web.js";
import { sendMessage } from "../utils/whatsapp";

export const handle_tool = async (response: any, msg?: WAWebJS.Message) => {
  const toolCalls = response?.choices?.[0]?.message?.tool_calls;
  if (toolCalls && toolCalls.length > 0) {
    for (const tool of toolCalls) {
      const args = JSON.parse(tool.function.arguments);
      await execute_tool(tool.function.name, args, msg);
    }
  } else {
    msg?.reply(
      response.choices?.[0]?.message?.content || "Something went wrong"
    );
    return null;
  }
};
