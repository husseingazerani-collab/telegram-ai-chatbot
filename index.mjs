import fetch from "node-fetch";
export default async function main(req, res) {
  try {
    const body = await req.json();
    console.log("▶ EXECUTE START");
    console.log("Request body:", JSON.stringify(body).slice(0,1000)); // کوتاه شده
    if (!body?.message) {
      console.log("No message in payload");
      return res.json({ ok: true, note: "no message" });
    }

    const chatId = body.message.chat.id;
    const text = body.message.text || "<no-text>";
    console.log("chatId:", chatId, "text:", text);

    // reply simple — از ENV متغیر صحیح استفاده کن
    const token = process.env.TELEGRAM_BOT_TOKEN || process.env.BOT_TOKEN;
    console.log("Using token present?:", !!token);

    // فقط لاگ کنیم قبل از ارسال
    console.log("About to call Telegram sendMessage...");

    // ارسال یک پیام ساده (GET هم کار می‌کند) — اگر می‌خوای POST از همان کد استفاده کن
    const resp = await fetch(
      `https://api.telegram.org/bot${token}/sendMessage?chat_id=${chatId}&text=${encodeURIComponent("Test reply: " + text)}`,
      { method: "GET" }
    );
    const respJson = await resp.json();
    console.log("Telegram API result:", JSON.stringify(respJson).slice(0,1000));

    console.log("▶ EXECUTE END");
    return res.json({ ok: true, telegramResult: respJson });
  } catch (err) {
    console.error("Handler error:", err);
    return res.json({ ok: false, error: String(err) });
  }
}
