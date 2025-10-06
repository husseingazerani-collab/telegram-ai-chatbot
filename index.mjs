import fetch from "node-fetch";
import { Client, Databases, ID } from "node-appwrite";

// --- Environment Variables ---
const {
  TELEGRAM_BOT_TOKEN,
  OPENROUTER_API_KEY,
  OPENROUTER_MODEL,
  APPWRITE_ENDPOINT,
  APPWRITE_PROJECT,
  APPWRITE_API_KEY,
  APPWRITE_DATABASE_ID,
  USERS_COLLECTION,
  CHATS_COLLECTION,
} = process.env;

// --- Initialize Appwrite Client ---
const client = new Client()
  .setEndpoint(APPWRITE_ENDPOINT)
  .setProject(APPWRITE_PROJECT)
  .setKey(APPWRITE_API_KEY);

const databases = new Databases(client);

// --- Helper: Send Message to Telegram ---
async function sendTelegramMessage(chatId, text) {
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
  await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text }),
  });
}

// --- Helper: Get AI Response from OpenRouter ---
async function getAIResponse(messages) {
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: OPENROUTER_MODEL,
      messages: messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      })),
    }),
  });

  const data = await response.json();
  return data.choices?.[0]?.message?.content || "پاسخی از مدل دریافت نشد.";
}

// --- Main Function ---
export default async ({ req, res }) => {
  try {
    const body = JSON.parse(req.body);
    const message = body?.message?.text;
    const chatId = body?.message?.chat?.id;
    const userId = body?.message?.from?.id;

    if (!message || !chatId || !userId) {
      return res.send("No valid Telegram message received.");
    }

    // Create or update user
    try {
      await databases.createDocument(APPWRITE_DATABASE_ID, USERS_COLLECTION, userId.toString(), {
        telegram_id: userId,
      });
    } catch (e) {
      // Ignore if user exists
    }

    // Save user message
    await databases.createDocument(APPWRITE_DATABASE_ID, CHATS_COLLECTION, ID.unique(), {
      user_id: userId,
      role: "user",
      content: message,
    });

    // Fetch last 10 messages
    const chatHistory = await databases.listDocuments(APPWRITE_DATABASE_ID, CHATS_COLLECTION, [
      `equal("user_id", ${userId})`,
      "orderDesc($createdAt)",
      "limit(10)",
    ]);

    const messages = chatHistory.documents
      .reverse()
      .map((doc) => ({ role: doc.role, content: doc.content }));

    // Get AI response
    const aiResponse = await getAIResponse(messages);

    // Save AI response
    await databases.createDocument(APPWRITE_DATABASE_ID, CHATS_COLLECTION, ID.unique(), {
      user_id: userId,
      role: "assistant",
      content: aiResponse,
    });

    // Send reply to Telegram
    await sendTelegramMessage(chatId, aiResponse);

    return res.json({ ok: true });
  } catch (error) {
    console.error("Error:", error);
    return res.json({ error: error.message });
  }
};
