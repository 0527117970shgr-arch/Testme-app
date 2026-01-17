export default {
    async fetch(request, env) {
        const url = new URL(request.url);

        // API Handling: /api/send-sms
        if (url.pathname === '/api/send-sms') {
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

                // 5. Env Vars (Free4SMS config)
                const apiUser = env.FREE4_USER;
                const apiPass = env.FREE4_PASS;
                const apiSender = env.FREE4_SENDER || 'TestMe';

                if (!apiUser || !apiPass) {
                    throw new Error("Missing Free4SMS Credentials (FREE4_USER/FREE4_PASS)");
                }

                // 6. Prepare Payload (Form Data)
                const params = new URLSearchParams();
                params.append('user', apiUser);
                params.append('pass', apiPass);
                params.append('sender', apiSender);
                params.append('recipient', cleanPhone);
                params.append('msg', message);

                // Use HTTPS
                const apiUrl = "https://api.free4sms.co.il/send_sms.php";

                console.log(`Sending to ${cleanPhone} via ${apiUrl}`);

                // 7. Execute Request
                const response = await fetch(apiUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded'
                    },
                    body: params
                });

                const responseText = await response.text();
                console.log("Upstream Data:", responseText);

                return new Response(JSON.stringify({
                    success: true,
                    provider: 'Free4SMS',
                    data: responseText
                }), { status: 200, headers });

            } catch (error) {
                console.error("Worker Error:", error);
                return new Response(JSON.stringify({
                    success: false,
                    error: error.message,
                    stack: error.stack
                }), { status: 200, headers });
            }
        }

        // Default: Serve Static Website (Cloudflare Workers Assets)
        // When using 'wrangler deploy ... --assets=./dist', the assets are bound to env.ASSETS by default.
        return env.ASSETS.fetch(request);
    }
};
