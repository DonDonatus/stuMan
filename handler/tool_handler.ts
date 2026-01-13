import { execute_tool, execute_judge_tool } from "../utils/tool_registry";
import WAWebJS from "whatsapp-web.js";

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

export const handle_Judge_tool = async (
  response: any,
  msg?: WAWebJS.Message
) => {
  const toolCalls = response?.choices?.[0]?.message?.tool_calls;
  if (toolCalls && toolCalls.length > 0) {
    for (const tool of toolCalls) {
      const args = JSON.parse(tool.function.arguments);
      await execute_judge_tool(tool.function.name, args, msg);
    }
  } else {
    msg?.reply(
      response.choices?.[0]?.message?.content || "Something went wrong"
    );
    return null;
  }
};
