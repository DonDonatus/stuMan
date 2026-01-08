import qrcode from "qrcode-terminal";
import { client } from "./core/whatsapp_client.js";

export function initializeWhatsApp() {
  console.log("Initializing WhatsApp connection...\n");
  client.on("qr", (qr) => {
    console.log("\n🔐 Scan this QR code with WhatsApp:\n");
    qrcode.generate(qr, { small: true });
    console.log(
      "\n📱 Open WhatsApp > Settings > Linked Devices > Link a Device\n"
    );
  });

  client.on("ready", () => {
    console.log("✅ WhatsApp Bot is ready!");
    console.log("📨 Send messages or images to your bot\n");
  });

  client.on("auth_failure", (msg) => {
    console.error("❌ Authentication failed:", msg);
  });

  client.on("disconnected", (reason) => {
    console.log("📴 WhatsApp disconnected:", reason);
  });

  client.initialize();
  return client;
}
