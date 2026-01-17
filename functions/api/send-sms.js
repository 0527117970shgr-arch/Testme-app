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

            // 5. Env Vars (Free4SMS config)
            const apiUser = env.FREE4_USER;
            const apiPass = env.FREE4_PASS;
            const apiSender = env.FREE4_SENDER || 'TestMe'; // Default sender

            if (!apiUser || !apiPass) {
                throw new Error("Missing Free4SMS Credentials (FREE4_USER/FREE4_PASS)");
            }

            // 6. Prepare Payload (Form Data)
            // Free4SMS (PHP interface) usually expects Query Params or Form Data
            const params = new URLSearchParams();
            params.append('user', apiUser);
            params.append('pass', apiPass);
            params.append('sender', apiSender);
            params.append('recipient', cleanPhone); // 'recipient' is common, check if 'dest' is needed? User said 'user, pass, msg'
            params.append('msg', message); // Auto-encoded by URLSearchParams

            // Use HTTPS if possible
            const url = "https://api.free4sms.co.il/send_sms.php";

            console.log(`Sending to ${cleanPhone} via ${url} with User: ${apiUser}`);

            // 7. Execute Request (POST x-www-form-urlencoded)
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: params
            });

            console.log("Upstream Status:", response.status);
            const responseText = await response.text();
            console.log("Upstream Data:", responseText);

            // Free4SMS usually returns numeric status or text info

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
};
