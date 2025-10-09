import { Client, Databases, ID } from "node-appwrite";
import fetch from "node-fetch";

// این تابع باید حتماً export default داشته باشه
export default async function handler(req, res) {
  try {
    // 1️⃣ دریافت پیام از تلگرام
    const body = req.body;

    if (!body.message || !body.message.text) {
      return res.json({ ok: true }); // اگر پیام متنی نبود، فقط پاس 200 بده
    }

    const chatId = body.message.chat.id;
    const text = body.message.text;

    // 2️⃣ مقداردهی Appwrite Client
    const client = new Client()
      .setEndpoint(process.env.APPWRITE_ENDPOINT)
      .setProject(process.env.APPWRITE_PROJECT)
      .setKey(process.env.APPWRITE_API_KEY);

    const db = new Databases(client);

    // 3️⃣ ذخیره پیام کاربر در collection chats
    await db.createDocument(
      process.env.APPWRITE_DATABASE_ID,
      process.env.CHATS_COLLECTION,
      ID.unique(),
      {
        chatId,
        role: "user",
        text,
        createdAt: new Date().toISOString()
      }
    );

    // 4️⃣ بازیابی 10 پیام آخر همان چت
    const response = await db.listDocuments(
      process.env.APPWRITE_DATABASE_ID,
      process.env.CHATS_COLLECTION,
      [
        `chatId=${chatId}`
      ],
      10,
      0,
      "DESC"
    );

    const lastMessages = response.documents
      .map(doc => ({ role: doc.role, content: doc.text }));

    // 5️⃣ درخواست به OpenRouter
    const openRouterRes = await fetch(`https://api.openrouter.ai/v1/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`
      },
      body: JSON.stringify({
        model: process.env.OPENROUTER_MODEL,
        messages: lastMessages
      })
    });

    const openRouterData = await openRouterRes.json();
    const aiReply = openRouterData.choices?.[0]?.message?.content || "متاسفم، پاسخی دریافت نشد.";

    // 6️⃣ ذخیره پاسخ AI در collection chats
    await db.createDocument(
      process.env.APPWRITE_DATABASE_ID,
      process.env.CHATS_COLLECTION,
      ID.unique(),
      {
        chatId,
        role: "assistant",
        text: aiReply,
        createdAt: new Date().toISOString()
      }
    );

    // 7️⃣ ارسال پاسخ به تلگرام
    await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: aiReply
      })
    });

    // 8️⃣ پاس 200 به تلگرام
    res.json({ ok: true });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}
