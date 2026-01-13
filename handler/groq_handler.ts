// This  uses groqs endpoint to handle chat completions with tools, manage memory,context, and process user messages

import { groq } from "../core/groq";
import {
  getRedisUserHistory,
  addNewMessageAndUpdateHistory,
} from "../utils/redis";
import { toolRegistry } from "../utils/tool_registry";
import { SYSTEM_PROMPT } from "../prompts/sys_pro";

let model;

const tools = Object.entries(toolRegistry).map(([name, data]) => ({
  type: "function" as const,
  function: {
    name,
    description: data.description,
    parameters: data.parameters,
  },
}));

export const handleMessageRequest = async (userId: string, message: string) => {
  try {
    const userHistory = await getRedisUserHistory(userId);
    const response = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        ...userHistory,
        { role: "user", content: message },
      ],
      temperature: 0.7,
      max_tokens: 500,
      tools: tools,
      tool_choice: "auto",
    });

    const assistantResponse = response.choices[0].message;
    console.log("Assistant Response:", assistantResponse);

    // If there is a function called delete... don't save the conversation otherwise the AI would still have context from before and keep using the previous.
    const deleteTool = assistantResponse.tool_calls?.find(
      (tc) => tc.function.name === "delete_conversation_history"
    );

    if (!deleteTool) {
      const assistantMessage = assistantResponse.content || "";
      await addNewMessageAndUpdateHistory(userId, message, assistantMessage);
    } else {
      console.log("conversation was cleared");
    }
    return response;
  } catch (error) {
    console.error("Groq API Error:", error);
    return {
      choices: [
        {
          message: {
            role: "assistant",
            content:
              "Sorry, I'm having trouble connecting. Please try again in a moment.",
          },
        },
      ],
    };
  }
};
