require("dotenv").config();
const { Client } = require("discord.js-selfbot-v13");


const client = new Client();
let fetch;

(async () => {
  fetch = (await import('node-fetch')).default;
})();

// Load token and webhook URL from .env
const webhookUrl = process.env.WEBHOOK_URL;
const token = process.env.DISCORD_TOKEN;

// Server ID to monitor
const monitoredServerId = "1256841409135247401";

client.on("ready", () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
});

client.on("messageCreate", async (message) => {
  if (message.author.bot || message.guild?.id !== monitoredServerId) return;

  const logEmbed = {
    title: "📥 New Message Logged",
    fields: [
      { name: "Username", value: message.author.username, inline: true },
      { name: "User ID", value: message.author.id, inline: true },
      { name: "Channel", value: `#${message.channel.name} (${message.channel.id})`, inline: true },
      { name: "Message", value: message.content?.trim() || "*[Empty Message]*", inline: false },
    ],
    thumbnail: {
      url: message.author.displayAvatarURL({ dynamic: true }),
    },
    timestamp: new Date().toISOString(),
    color: 0x2f3136,
  };

  // Handle attachments
  if (message.attachments.size > 0) {
    const attachments = message.attachments.map(att => att.url).join("\n");
    logEmbed.fields.push({ name: "Attachments", value: attachments });
  }

  // Handle embeds
  if (message.embeds.length > 0) {
    message.embeds.forEach((embed, index) => {
      const embedContent = {
        title: embed.title || "",
        description: embed.description || "",
        url: embed.url || "",
      };
      logEmbed.fields.push({
        name: `Embed ${index + 1}`,
        value: `Title: ${embedContent.title}\nDescription: ${embedContent.description}\nURL: ${embedContent.url}`.trim() || "[Empty Embed]",
        inline: false
      });
    });
  }

  // Handle message reference (forwarded/replied messages)
  if (message.reference) {
    try {
      if (!message.channel.isText()) {
        throw new Error('Channel is not a text channel');
      }
      
      // Check if the reference is from the same guild
      if (message.reference.guildId !== message.guild.id) {
        logEmbed.fields.push({
          name: "Referenced Message",
          value: "*[Cross-Server Reference - Cannot Access]*",
          inline: false
        });
        return;
      }
      
      const referencedMessage = await message.fetchReference().catch(err => {
        throw new Error(`Failed to fetch reference: ${err.message}`);
      });
      
      if (referencedMessage) {
        let refValue = `From: ${referencedMessage.author.username}\n`;

        // Add content if exists
        if (referencedMessage.content?.trim()) {
          refValue += `Content: ${referencedMessage.content.trim()}\n`;
        }

        // Add attachments
        if (referencedMessage.attachments.size > 0) {
          const attachUrls = referencedMessage.attachments.map(att => att.url).join('\n');
          refValue += `Attachments:\n${attachUrls}\n`;
        }

        // Add embeds
        if (referencedMessage.embeds.length > 0) {
          referencedMessage.embeds.forEach((embed, i) => {
            refValue += `\nEmbed ${i + 1}:`;
            if (embed.title) refValue += `\nTitle: ${embed.title}`;
            if (embed.description) refValue += `\nDescription: ${embed.description}`;
            if (embed.url) refValue += `\nURL: ${embed.url}`;
          });
        }

        logEmbed.fields.push({
          name: "Referenced Message",
          value: refValue.trim(),
          inline: false
        });
      }
    } catch (err) {
      console.error("Reference fetch error:", err);
      logEmbed.fields.push({
        name: "Referenced Message",
        value: "*[Message Unavailable - May be deleted or inaccessible]*",
        inline: false
      });
    }
  }

  const payload = {
    username: message.author.username,
    avatar_url: message.author.displayAvatarURL({ dynamic: true }),
    embeds: [logEmbed],
  };

  try {
    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    console.error("❌ Failed to send log via webhook:", err);
  }
});

client.login(token);
