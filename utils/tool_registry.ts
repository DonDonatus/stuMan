import client from "../core/whatsapp_client";
import WAWebJS from "whatsapp-web.js";
import { sendMessage } from "./whatsapp";
import { clearUserHistory } from "./redis";

export const toolRegistry: {
  [key: string]: {
    function: (args: any, msg?: WAWebJS.Message) => Promise<any>;
    description: string;
    parameters: any;
  };
} = {
  send_whatsapp_message: {
    function: async (args: any, msg?: WAWebJS.Message) => {
      if (!msg?.from) {
        return { error: "Unable to determine recipient" };
      }
      await sendMessage(msg.from, args.message);
      return { "sent this text": args.message };
    },
    description:
      "Send a message back to WhatsApp to the user if no tool call is needed. Use this tool to respond to user messages directly.",
    parameters: {
      type: "object",
      properties: {
        message: { type: "string" },
      },
      required: ["message"],
    },
  },
  do_nothing: {
    function: async (args: any) => {
      return;
    },
    description:
      "Does nothing. Use this tool when a tool call is unneccessary because the response that was returned already satisfies user request. Not a game, dont suggest to the user.",
    parameters: {
      type: "object",
      properties: {},
      required: [],
    },
  },
  delete_conversation_history: {
    function: async (args: any, msg?: WAWebJS.Message) => {
      if (!msg?.from) {
        return { error: "Unable to determine recipient" };
      }
      await clearUserHistory(msg.from);
      return { Deleted: args.text };
    },
    description:
      "Delete the conversation history for the user. Use this tool when the user requests to clear their chat history.BEFORE DELETING, CONFIRM WITH THE USER THAT THEY WANT TO DELETE THEIR HISTORY.",
    parameters: {
      type: "object",
      properties: {
        text: { type: "string" },
      },
      required: ["text"],
    },
  },
};

export const JudgetoolRegistry: {
  [key: string]: {
    function: (args: any, msg?: WAWebJS.Message) => Promise<any>;
    description: string;
    parameters: any;
  };
} = {
  task_complete: {
    function: async () => {
      const complete = true;
      return complete;
    },
    description:
      "Indicates that the assistant's response has satisfied the user's query.",
    parameters: {
      type: "object",
      properties: {},
      required: [],
    },
  },
  task_incomplete: {
    function: async () => {
      const complete = false;
      return complete;
    },
    description:
      "Indicates that the assistant's response has NOT satisfied the user's query.",
    parameters: {
      type: "object",
      properties: {},
      required: [],
    },
  },
};

export const execute_tool = (
  toolName: string,
  args: any,
  msg?: WAWebJS.Message
) => {
  const tool = toolRegistry[toolName];
  if (!tool) {
    throw new Error(`Tool ${toolName} not found in registry.`);
  }
  return tool.function(args, msg);
};

export const execute_judge_tool = (
  toolName: string,
  args: any,
  msg?: WAWebJS.Message
) => {
  const tool = JudgetoolRegistry[toolName];
  if (!tool) {
    throw new Error(`Tool ${toolName} not found in registry.`);
  }
  return tool.function(args, msg);
};
