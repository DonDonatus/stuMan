require("dotenv").config();
const Groq = require("groq-sdk");

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// Extract quiz information
async function extractQuizInfo(message) {
  const today = new Date().toISOString().split("T")[0];
  const prompt = `You are a quiz information extractor. Current date: ${today}

User message: "${message}"

Extract and return ONLY valid JSON:
{
  "subject": "subject name or null",
  "date": "YYYY-MM-DD format or null",
  "time": "HH:MM format (24h) or null",
  "topic": "chapter/topic or null",
  "confidence": 0.0 to 1.0
}

Rules: If "tomorrow", use tomorrow's date. Handle "next week", day names (Monday, etc). 
Accept abbreviations (tmrw, math, chem, etc).`;
}

// Analyze image content (for documents, marking schemes, etc)
async function analyzeImage(base64Image, prompt) {
  try {
    const response = await groq.chat.completions.create({
      model: "llama-3.2-90b-vision-preview",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${base64Image}`,
              },
            },
          ],
        },
      ],
      temperature: 0.1,
      max_tokens: 2000,
    });

    return response.choices[0].message.content.trim();
  } catch (error) {
    console.error("Groq Vision API Error:", error.message);
    return null;
  }
}

// Identify important information from conversation
async function extractImportantInfo(conversationText) {
  const prompt = `Analyze this conversation and extract important academic information.

Conversation:
"${conversationText}"

Return ONLY valid JSON with arrays (can be empty):
{
  "assignments": [{"course": "CODE", "title": "...", "dueDate": "YYYY-MM-DD", "description": "..."}],
  "ia_questions": [{"course": "CODE", "question": "...", "date": "YYYY-MM-DD or null"}],
  "quizzes": [{"course": "...", "date": "YYYY-MM-DD", "topic": "..."}],
  "general_notes": ["note1", "note2"]
}

Only include items explicitly mentioned. If nothing found, return empty arrays.`;

  try {
    const response = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.1,
      max_tokens: 1500,
    });

    const content = response.choices[0].message.content
      .trim()
      .replace(/```json\n?|\n?```/g, "");
    return JSON.parse(content);
  } catch (error) {
    console.error("Groq API Error:", error.message);
    return null;
  }
}

// Parse course/schedule input
async function parseCourseInput(message) {
  const prompt = `Extract course/schedule information from this message:
"${message}"

Return ONLY valid JSON:
{
  "type": "course" or "schedule",
  "courseCode": "XXX" or null,
  "courseName": "..." or null,
  "instructor": "..." or null,
  "day": "Monday/Tuesday/etc" or null,
  "startTime": "HH:MM" or null,
  "endTime": "HH:MM" or null,
  "location": "..." or null
}`;

  try {
    const response = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
      max_tokens: 500,
    });

    const content = response.choices[0].message.content
      .trim()
      .replace(/```json\n?|\n?```/g, "");
    return JSON.parse(content);
  } catch (error) {
    console.error("Groq API Error:", error.message);
    return null;
  }
}

// Generate study tip
async function generateStudyTip(subject, topic) {
  const prompt = `Give a brief motivating study tip for ${subject}${
    topic ? ` on ${topic}` : ""
  }. Under 50 words.`;

  try {
    const response = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_tokens: 200,
    });

    return response.choices[0].message.content.trim();
  } catch (error) {
    return "Good luck with your studies! Review your notes and stay confident! 💪";
  }
}

// Answer general questions using database context
async function answerQuestion(question, context) {
  const prompt = `You are an AI study assistant. Answer the student's question using the provided context from their database.

Question: "${question}"

Context:
${context}

Instructions:
- Give a helpful, conversational response
- Use emojis appropriately
- If the context doesn't contain the answer, politely say you don't have that information
- Keep responses concise (under 150 words)
- Format lists with bullet points when appropriate`;

  try {
    const response = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.5,
      max_tokens: 500,
    });

    return response.choices[0].message.content.trim();
  } catch (error) {
    console.error("Groq API Error:", error.message);
    return "🤔 Sorry, I'm having trouble processing that right now. Try using specific commands like /courses or /schedule!";
  }
}

module.exports = {
  extractQuizInfo,
  analyzeImage,
  extractImportantInfo,
  parseCourseInput,
  generateStudyTip,
  answerQuestion,
};
