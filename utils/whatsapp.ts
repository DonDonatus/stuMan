import { client } from "../core/whatsapp_client.ts";

export async function sendImage(to: string, filePath: string, caption = "") {
  if (!client) throw new Error("WhatsApp client not initialized");

  try {
    // will fetch image from database later
  } catch (error) {}
}

export async function sendMessage(to: string, message: string) {
  if (!client) throw new Error("WhatsApp client not initialized");

  try {
    await client.sendMessage(to, message);
    console.log(`✉️ Sent message to ${to}`);
  } catch (error) {
    console.error(
      "Error sending message:",
      "error instanceof Error ? error.message : error",
      error
    );
  }
}
