import { Client, Databases, ID } from "node-appwrite";
import fetch from "node-fetch";

export default async function handler(req, res) {
  try {
    const body = req.body;

    // فقط یک مثال پاسخ ساده
    console.log("Received body:", body);

    // پاسخ 200 به تلگرام
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}
