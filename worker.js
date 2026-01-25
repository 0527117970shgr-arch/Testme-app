export default {
  async fetch(request, env) {
    // SMS Credentials
    const myUser = "0549941435";
    const myPass = "36916531";
    const mySender = "TestMe";

    const url = new URL(request.url);
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    // ===== SMS API =====
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

    // ===== OCR ANALYZE LICENSE API =====
    if (url.pathname.includes("/api/analyze-license")) {
      try {
        const { imageBase64, fileType, fileName } = await request.json();

        console.log(`📄 Processing: ${fileName || 'Unknown'}, Type: ${fileType}`);

        if (!env.OPENAI_API_KEY) {
          return new Response(JSON.stringify({ error: "Missing OPENAI_API_KEY in environment" }), {
            status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }

        if (!imageBase64) {
          return new Response(JSON.stringify({ error: "Missing image data" }), {
            status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }

        // Call OpenAI Vision
        const prompt = `אתה מומחה OCR לרישיונות רכב ישראליים.
חלץ את השדות הבאים והחזר JSON בלבד:
- licensePlate: מספר רכב (7-8 ספרות)
- name: שם הבעלים
- licenseExpiry: תוקף (DD/MM/YYYY)
- carType: דגם הרכב
- testDate: תאריך מבחן

אם לא ניתן לזהות, החזר: {"error": "לא ניתן לזהות רישיון"}`;

        const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${env.OPENAI_API_KEY}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            model: "gpt-4-turbo",
            messages: [{
              role: "user",
              content: [
                { type: "text", text: prompt },
                { type: "image_url", image_url: { url: `data:${fileType || 'image/jpeg'};base64,${imageBase64}` } }
              ]
            }],
            max_tokens: 500
          })
        });

        const openaiData = await openaiResponse.json();
        console.log("OpenAI Response:", JSON.stringify(openaiData));

        if (!openaiResponse.ok) {
          return new Response(JSON.stringify({ error: "OpenAI API Error", details: openaiData }), {
            status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }

        const content = openaiData.choices?.[0]?.message?.content || "{}";
        const cleanedContent = content.replace(/```json/g, '').replace(/```/g, '').trim();

        let extracted;
        try {
          extracted = JSON.parse(cleanedContent);
        } catch {
          extracted = { error: "Failed to parse AI response" };
        }

        return new Response(JSON.stringify({
          text: "Analyzed via OpenAI",
          extracted
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });

      } catch (err) {
        console.error("OCR Error:", err);
        return new Response(JSON.stringify({ error: err.message }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
    }

    // ===== SMART AGENT API =====
    if (url.pathname.includes("/api/smart-agent")) {
      try {
        const { query, documentText, imageBase64 } = await request.json();

        if (!env.OPENAI_API_KEY) {
          return new Response(JSON.stringify({ error: "Missing OPENAI_API_KEY" }), {
            status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }

        let messages = [];
        if (imageBase64) {
          messages = [{
            role: "user",
            content: [
              { type: "text", text: query || "נתח את המסמך הזה" },
              { type: "image_url", image_url: { url: `data:image/jpeg;base64,${imageBase64}` } }
            ]
          }];
        } else {
          messages = [{
            role: "user",
            content: `מסמך:\n${documentText}\n\nשאלה: ${query}`
          }];
        }

        const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${env.OPENAI_API_KEY}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            model: imageBase64 ? "gpt-4-turbo" : "gpt-4o-mini",
            messages,
            max_tokens: 1000
          })
        });

        const data = await openaiResponse.json();
        const answer = data.choices?.[0]?.message?.content || "לא הצלחתי לענות";

        return new Response(JSON.stringify({ answer, citations: [] }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });

      } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
    }

    // Default: Serve static assets
    if (env.ASSETS) {
      return env.ASSETS.fetch(request);
    }

    return new Response("Not found", { status: 404, headers: corsHeaders });
  },
};