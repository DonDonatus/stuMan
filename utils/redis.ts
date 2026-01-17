import redis from "../core/redis_client";
export async function getRedisUserHistory(userId: string) {
  const data = await redis?.get(userId);
  return data ? JSON.parse(data) : [];
}

// stores last 50 conversation for just 24 hours.
export async function addNewMessageAndUpdateHistory(
  userId: string,
  userMsg: string,
  assistantMsg: string,
  assistantRole: string,
  toolCallId?: string,
) {
  const history = await getRedisUserHistory(userId);
  history.push(
    { role: "user", content: userMsg },
    { role: assistantRole, content: assistantMsg, tool_call_id: toolCallId },
  );

  const recent = history.slice(-50);
  console.log("Conversation history for", userId, ":", JSON.stringify(recent));
  await redis?.setex(userId, 86400, JSON.stringify(recent));
}

export async function clearUserHistory(userId: string) {
  if (!redis) return { success: false, message: "Redis not available" };

  await redis.del(userId);
  console.log(`Cleared conversation for user: ${userId}`);
  return { success: true, message: "Conversation cleared" };
}
