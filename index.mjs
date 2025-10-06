import { Client, Databases, ID, Query } from "appwrite";
import fetch from "node-fetch";

// تابع اصلی
export default async function (req, res) {

  // 1️⃣ دریافت payload تلگرام از body
  let payload = {};
  try {
    payload = JSON.parse(await new Promise((resolve, reject) => {
      let body = "";
      req.on("data", chunk => body += chunk.toString());
      req.on("end", () => resolve(body));
      req.on("error", err => reject(err));
    }));
  } catch (err) {
    console.error("Invalid payload", err);
    res.status(400).send("Invalid payload");
    return;
  }

  const message = payload.message;
  if (!message) {
    res.status(200).send("No message");
    return;
  }

  const chatId = message.chat.id;
  const userId = message.from.id;
  const text = message.text || "";

  // 2️⃣ اتصال به Appwrite
  const client = new Client();
  client.setEndpoint(process.env.APPWRITE_ENDPOINT)
        .setProject(process.env.APPWRITE_PROJECT)
        .setKey(process.env.APPWRITE_API_KEY);
  const databases = new Databases(client);
  const DB_ID = process.env.APPWRITE_DATABASE_ID;
  const USERS_COLLECTION = process.env.USERS_COLLECTION;
  const CHATS_COLLECTION = process.env.CHATS_COLLECTION;

  // 3️⃣ ثبت کاربر اگر وجود نداشت
  try {
    await databases.getDocument(DB_ID, USERS_COLLECTION, String(userId));
  } catch {
    await databases.createDocument(DB_ID, USERS_COLLECTION, ID.unique(), {
      userId,
      firstName: message.from.first_name,
      lastName: message.from.last_name || "",
      username: message.from.username || "",
      usage: 0,
    });
  }

  // 4️⃣ ذخیره پیام کاربر
  await databases.createDocument(DB_ID, CHATS_COLLECTION, ID.unique(), {
    userId,
    role: "user",
    text,
    chatId,
  });

  // 5️⃣ دریافت آخرین ۱۰ پیام
  const lastMessagesRes = await databases.listDocuments(DB_ID, CHATS_COLLECTION, [
    Query.equal("userId", userId),
    Query.limit(10),
  ]);
  const lastMessages = lastMessagesRes.documents.map(doc => ({ role: doc.role, content: doc.text }));

  // 6️⃣ ارسال به OpenRouter
  const aiRes = await fetch("https://api.openrouter.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENROUTER_MODEL,
      messages: lastMessages,
    }),
  });
  const aiData = await aiRes.json();
  const aiText = aiData.choices?.[0]?.message?.content || "متاسفم، پاسخ آماده نیست.";

  // 7️⃣ ارسال پاسخ به تلگرام
  await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text: aiText }),
  });

  // 8️⃣ ذخیره پاسخ AI
  await databases.createDocument(DB_ID, CHATS_COLLECTION, ID.unique(), {
    userId,
    role: "assistant",
    text: aiText,
    chatId,
  });

  res.status(200).send("ok");
}
