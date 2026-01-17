export default {
    async fetch(request, env) {
        // 1. CORS Headers
        const headers = {
            'Access-Control-Allow-Origin': '*',
            'Content-Type': 'application/json',
            'Access-Control-Allow-Methods': 'POST, OPTIONS'
        };

        // 2. Handle Preflight
        if (request.method === 'OPTIONS') {
            return new Response('OK', { headers });
        }

        if (request.method !== 'POST') {
            return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
                status: 405,
                headers
            });
        }

        try {
            const body = await request.json();

            // 3. Input Mapping
            const phone = body.phone || body.to;
            let message = body.message || body.customMessage;

            // Fallback message creation
            if (!message && body.name) {
                message = `New Booking: ${body.name} - ${body.service} (${body.cartype})`;
            }

            if (!phone) throw new Error("Missing Phone Number");

            // 4. Clean Phone Number
            const cleanPhone = phone.replace(/\D/g, '');

            // 5. Env Vars from 'env' object (Worker standard)
            const payload = {
                key: env.SMS_KEY,
                user: env.SMS_USER,
                pass: env.SMS_PASS,
                sender: env.SMS_SENDER || "TestMe",
                dest: cleanPhone,
                msg: message || "Test Message"
            };

            const url = "https://api.sms4free.co.il/ApiSMS/v2/SendSMS";

            console.log(`Sending to ${cleanPhone} via ${url}`);

            // 6. Execute Request
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            console.log("Upstream Status:", response.status);

            // 7. Handle Response
            let responseData;
            const contentType = response.headers.get("content-type");
            if (contentType && contentType.includes("application/json")) {
                responseData = await response.json();
            } else {
                responseData = await response.text();
            }

            if (!response.ok) {
                return new Response(JSON.stringify({
                    success: false,
                    error: `Upstream Error ${response.status}`,
                    details: responseData
                }), { status: 200, headers });
            }

            return new Response(JSON.stringify({
                success: true,
                data: responseData
            }), { status: 200, headers });

        } catch (error) {
            console.error("Worker Error:", error);
            return new Response(JSON.stringify({
                success: false,
                error: error.message,
                stack: error.stack
            }), { status: 200, headers }); // Return 200 to allow frontend to handle gracefully
        }
    }
};
