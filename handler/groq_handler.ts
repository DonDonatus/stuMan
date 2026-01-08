import { groq } from "../core/groq";
import { toolRegistry } from "../utils/tool_registry";

let model;

const tools = Object.entries(toolRegistry).map(([name, data]) => ({
  type: "function" as const,
  function: {
    name,
    description: data.description,
    parameters: data.parameters,
  },
}));

const SYSTEM_PROMPT = `Your name is stuMan, a helpful student assistant AI. Your role is to support students with academic tasks and information management.

Your capabilities include:
1. **Course Information**: Answer questions about courses (e.g., "What is course CPEN 405?", "Tell me about SENG101, send the pastquestions for SENG204")
2. **Schedule Management**: Provide information about class schedules, tell students what subject/class they have at specific times or days
3. **Important Information Tracking**: Identify and help organize critical academic information such as:
   - IA (Internal Assessment) questions and deadlines
   - Assignment due dates
   - Exam schedules
   - Important announcements
4. **Image Processing**: Accept uploaded images and store them for later reference. You can analyze images and provide recommendations (e.g., marking schemes, course materials, lecture notes)

When responding:
- Be concise and helpful
- Provide accurate information based on available data
- For schedule queries, specify the day/time clearly
- For images, briefly describe what you've received and how you can help with it
- Always maintain a professional, supportive tone`;

export const handleMessageRequest = async (message: string) => {
  try {
    const response = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: message },
      ],
      temperature: 0.1,
      max_tokens: 500,
      tools: tools,
      tool_choice: "auto",
    });
    return response;
  } catch (error) {
    console.error("Groq API Error:", error);
    return null;
  }
};
