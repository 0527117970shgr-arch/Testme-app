export async function onRequestPost(context) {
    const { request, env } = context;
  
    // הגדרות CORS
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };
  
    try {
      const data = await request.json();
      
      // פרטי Free4SMS שלך (שנשמרים בטוח בתוך הקוד כאן)
      const myUser = "0549941435"; 
      const myPass = "36916531";
      const mySender = "TestMe";
  
      const message = `הזמנה חדשה:
  שם: ${data.name || '-'}
  טלפון: ${data.phone || '-'}
  רכב: ${data.carNumber || '-'}
  תאריך: ${data.date || '-'}`;
  
      const providerUrl = `https://www.free4sms.co.il/api/send?user=${myUser}&pass=${myPass}&sender=${mySender}&recipient=0527117970&msg=${encodeURIComponent(message)}`;
  
      const response = await fetch(providerUrl);
      const result = await response.text();
  
      return new Response(JSON.stringify({ success: true, result: result }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
  
    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), {
        status: 500,
        headers: corsHeaders
      });
    }
  }
  
  // טיפול ב-OPTIONS עבור CORS
  export async function onRequestOptions() {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  }