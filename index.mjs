import fetch from "node-fetch";

/**
 * Appwrite Serverless Function
 * Test Telegram bot connection
 * Node.js 22
 */

export default async function main(req, res) {
  try {
    // خواندن body درخواست
    const body = await req.json();

    // بررسی اینکه آیا پیام تلگرام وجود دارد
    if (body.message && body.message.text) {
      const chatId = body.message.chat.id;
      const userMessage = body.message.text;

      console.log("Received message:", userMessage);

      // پاسخ تستی
      const replyText = `✅ پیام شما دریافت شد:\n${userMessage}`;

      // ارسال پاسخ به کاربر در تلگرام
      const telegramResponse = await fetch(
        `https://api.telegram.org/bot${process.env.BOT_TOKEN}/sendMessage`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            chat_id: chatId,
            text: replyText,
          }),
        }
      );

      const telegramResult = await telegramResponse.json();
      console.log("Telegram response:", telegramResult);

      // برگرداندن پاسخ موفق به Appwrite
      return res.json({ success: true, message: "Reply sent to Telegram" });
    }

    // اگر هیچ پیام معتبری نبود
    return res.json({ success: false, message: "No Telegram message found" });
  } catch (error) {
    console.error("Error occurred:", error);
    return res.json({ success: false, error: error.message });
  }
}
