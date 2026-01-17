import { groq } from "../core/groq";
import { getRedisUserHistory } from "../utils/redis";
import { JUDGE_PROMPT } from "../prompts/judge_pro";
import { JudgetoolRegistry } from "./tool_registry";
import { handle_Judge_tool } from "../handler/tool_handler";

const tools = Object.entries(JudgetoolRegistry).map(([name, data]) => ({
  type: "function" as const,
  function: {
    name,
    description: data.description,
    parameters: data.parameters,
  },
}));

export const judge = async (userId: string) => {
  const userHistory = await getRedisUserHistory(userId);
  const response = await groq.chat.completions.create({
    model: "openai/gpt-oss-120b",
    messages: [{ role: "system", content: JUDGE_PROMPT }, ...userHistory],
    temperature: 0.2,
    max_tokens: 500,
    tools: tools,
    tool_choice: "auto",
  });
  await handle_Judge_tool(response);
  console.log("Judge Response:", response.choices[0].message);
  return response;
};

export const getJudgeTools = (judgeResponse: any) => {
  const toolCall =
    judgeResponse?.choices?.[0]?.message?.tool_calls[0].function.name;
  console.log("Tool Call:", toolCall);
  return toolCall;
};
