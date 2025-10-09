import { Client, Databases, ID } from "node-appwrite";
import fetch from "node-fetch";

export default async function handler(req, res) {
  try {
    // لاگ پیام دریافتی از تلگرام
    console.log("Received body:", req.body);

    // پاسخ 200 به تلگرام حتماً باید باشه
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}
