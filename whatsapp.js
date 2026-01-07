const { Client, LocalAuth } = require("whatsapp-web.js");
const qrcode = require("qrcode-terminal");
const fs = require("fs").promises;
const path = require("path");

let client;

function initializeWhatsApp(onMessageCallback, onMediaCallback) {
    client = new Client({
        authStrategy: new LocalAuth(),
        puppeteer: {
            headless: true,
            args: ["--no-sandbox", "--disable-setuid-sandbox"],
        },
    });

    client.on("qr", (qr) => {
        console.log("\n🔐 Scan this QR code with WhatsApp:\n");
        qrcode.generate(qr, { small: true });
        console.log(
            "\n📱 Open WhatsApp > Settings > Linked Devices > Link a Device\n"
        );
    });

    client.on("ready", () => {
        console.log("✅ WhatsApp Bot is ready!");
        console.log("📱 Send messages or images to your bot\n");
    });

    client.on("message", async (message) => {
        if (message.from.includes("@g.us") || message.fromMe) return;

        console.log(`📩 Message from ${message.from}: ${message.body}`);

        const contact = await message.getContact();
        const userName = contact.pushname || contact.name || "Student";

        // Handle media (images/documents)
        if (message.hasMedia) {
            console.log("📎 Media received, processing...");
            const media = await message.downloadMedia();
            await onMediaCallback(message, userName, media);
        } else {
            await onMessageCallback(message, userName);
        }
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

async function sendMessage(to, message) {
    if (!client) throw new Error("WhatsApp client not initialized");

    try {
        await client.sendMessage(to, message);
        console.log(`✉️ Sent message to ${to}`);
    } catch (error) {
        console.error("Error sending message:", error.message);
    }
}

async function sendImage(to, filePath, caption = "") {
    if (!client) throw new Error("WhatsApp client not initialized");

    try {
        const media = await MessageMedia.fromFilePath(filePath);
        await client.sendMessage(to, media, { caption });
        console.log(`📸 Sent image to ${to}`);
    } catch (error) {
        console.error("Error sending image:", error.message);
    }
}

module.exports = {
    initializeWhatsApp,
    sendMessage,
    sendImage,
};
