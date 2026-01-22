export default {
  async fetch(request, env) {
    // 👇👇👇 רק כאן אתה משנה! בתוך הגרשיים הצהובים 👇👇👇
    const myUser = "0549941435";   // מחק את העברית וכתוב את השם משתמש שלך
    const myPass = "36916531";       // מחק את העברית וכתוב את הסיסמה שלך
    const mySender = "TestMe";        // זה נשאר TestMe (או השם שאושר לך)
    // 👆👆👆 זהו! אל תיגע בשאר הקוד 👆👆👆

    const url = new URL(request.url);
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    if (url.pathname.includes("/api/send-sms")) {
      try {
        const data = await request.json();
        const message = `הזמנה חדשה:
שם: ${data.name || '-'}
טלפון: ${data.phone || '-'}
רכב: ${data.carNumber || '-'}
תאריך: ${data.date || '-'}`;

        const providerUrl = `https://www.free4sms.co.il/api/send?user=${myUser}&pass=${myPass}&sender=${mySender}&recipient=0527117970&msg=${encodeURIComponent(message)}`;

        console.log("Sending SMS...");
        const response = await fetch(providerUrl);
        const result = await response.text();

        return new Response(JSON.stringify({ success: true, result: result }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), {
          status: 500, headers: corsHeaders
        });
      }
    }

    return new Response("Not found", { status: 404, headers: corsHeaders });
  },
};