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

        // Env vars (Free4SMS config)
        const apiUser = env.FREE4_USER;
        const apiPass = env.FREE4_PASS;
        const apiSender = env.FREE4_SENDER || 'TestMe';

        // Mock success if env vars are missing, but try to fetch if present
        if (!apiUser || !apiPass) {
          console.log(`[SMS Route] Missing credentials - mocking success`);
          return new Response(JSON.stringify({
            success: true,
            provider: 'Free4SMS',
            mocked: true,
            message: "SMS send mocked (missing credentials)",
            phone: cleanPhone,
            data: "MOCK_RESPONSE"
          }), {
            status: 200,
            headers: corsHeaders,
          });
        }

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
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body: params
        });

        const responseText = await response.text();
        console.log(`[SMS Route] Upstream response: ${responseText}`);

        return new Response(JSON.stringify({
          success: true,
          provider: 'Free4SMS',
          mocked: false,
          phone: cleanPhone,
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
