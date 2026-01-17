import pkg from "whatsapp-web.js";

const { Client, LocalAuth } = pkg;

export const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: {
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  },
  webVersionCache: {
    type: "remote",
    remotePath:
      "https://raw.githubusercontent.com/wppconnect-team/wa-version/refs/heads/main/html/2.3000.1031490220-alpha.html",
  },
});

export default client;
