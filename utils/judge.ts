import { groq } from "../core/groq";
import { getRedisUserHistory } from "../utils/redis";
import { JUDGE_PROMPT } from "../prompts/judge_pro";
import { JudgetoolRegistry } from "./tool_registry";

const tools = Object.entries(JudgetoolRegistry).map(([name, data]) => ({
  type: "function" as const,
  function: {
    name,
    description: data.description,
    parameters: data.parameters,
  },
}));

const judge = async (userId: string, message: string) => {
  const userHistory = await getRedisUserHistory(userId);
  const response = await groq.chat.completions.create({
    model: "openai/gpt-oss-20b",
    messages: [
      { role: "system", content: JUDGE_PROMPT },
      ...userHistory,
      { role: "user", content: message },
    ],
    temperature: 0.7,
    max_tokens: 500,
    tools: tools,
    tool_choice: "auto",
  });
};
