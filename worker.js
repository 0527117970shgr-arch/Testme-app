export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    
    // Handle CORS (allow requests from the website)
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        },
      });
    }

    // CORS headers for all responses
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Content-Type": "application/json",
    };

    // Check for the SMS route (checking pathname explicitly)
    if (url.pathname === "/api/send-sms" || url.pathname.endsWith("/api/send-sms")) {
      console.log(`[SMS Route] Request received: ${request.method} ${url.pathname}`);
      
      // Only allow POST for actual SMS sending
      if (request.method !== "POST") {
        return new Response(JSON.stringify({ error: "Method Not Allowed" }), {
          status: 405,
          headers: corsHeaders,
        });
      }

      try {
        const body = await request.json();
        console.log(`[SMS Route] Body received:`, JSON.stringify(body));

        // Input mapping
        const phone = body.phone || body.to;
        let message = body.message || body.customMessage;

        // Fallback message creation
        if (!message && body.name) {
          message = `New Booking: ${body.name} - ${body.service} (${body.cartype})`;
        }

        if (!phone) {
          throw new Error("Missing Phone Number");
        }

        // Clean phone number
        const cleanPhone = phone.replace(/\D/g, '');
        console.log(`[SMS Route] Sending to: ${cleanPhone}`);

        // Hardcoded Free4SMS credentials
        const apiUser = "השם_משתמש_שלך";
        const apiPass = "הסיסמה_שלך";
        const apiSender = "שם_השולח_שלך";

        // Prepare payload (Form Data)
        const params = new URLSearchParams();
        params.append('user', apiUser);
        params.append('pass', apiPass);
        params.append('sender', apiSender);
        params.append('recipient', cleanPhone);
        params.append('msg', message);

        const apiUrl = "https://api.free4sms.co.il/send_sms.php";
        console.log(`[SMS Route] Calling Free4SMS API: ${apiUrl}`);

        // Execute request
        console.log(`[SMS Route] Calling Free4SMS API with params:`, {
          user: apiUser,
          sender: apiSender,
          recipient: cleanPhone,
          msgLength: message?.length || 0
        });

        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body: params
        });

        const responseText = await response.text();
        console.log(`[SMS Route] Upstream status: ${response.status}`);
        console.log(`[SMS Route] Upstream response: ${responseText}`);

        // Check if the response indicates success or failure
        const isSuccess = response.ok && (
          responseText.toLowerCase().includes('ok') || 
          responseText.toLowerCase().includes('success') ||
          response.status === 200
        );

        return new Response(JSON.stringify({
          success: isSuccess,
          provider: 'Free4SMS',
          mocked: false,
          phone: cleanPhone,
          message: message,
          httpStatus: response.status,
          data: responseText
        }), {
          status: 200,
          headers: corsHeaders,
        });

      } catch (error) {
        console.error(`[SMS Route] Error:`, error.message, error.stack);
        return new Response(JSON.stringify({
          success: false,
          error: error.message,
          stack: error.stack
        }), {
          status: 200,
          headers: corsHeaders,
        });
      }
    }

    // Fallback to static assets
    return env.ASSETS.fetch(request);
  }
};
