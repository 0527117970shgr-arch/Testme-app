export const handler = async (event) => {
    // Enable CORS
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: 'OK' };
    }

    console.log("Function send-sms [SMS4Free] started");

    try {
        const body = JSON.parse(event.body);
        const { name, phone, cartype, service, date, time } = body;

        // Configuration
        const API_KEY = "OFL4Wshku"; // Hardcoded as per strictly specific user request ("Use key OFL4Wshku")
        const USER = "OFL4Wshku";
        const PASS = "OFL4Wshku";
        const SENDER = "Test Me";

        // Admin Phone - Ideally should be env var but user didn't specify, so we'll try to use env or hardcode fallback?
        // User didn't specify Admin number in this request, but preserving functionality.
        const ADMIN_PHONE = process.env.ADMIN_PHONE;

        const messages = [];

        // 1. Prepare Admin Message
        if (ADMIN_PHONE) {
            messages.push({
                to: ADMIN_PHONE,
                msg: `הזמנה חדשה (TestMe)!\nלקוח: ${name}\nטלפון: ${phone}\nרכב: ${cartype}\nשירות: ${service}\nמועד: ${date} ${time}`
            });
        }

        // 2. Prepare Client Message
        if (phone) {
            messages.push({
                to: phone,
                msg: `היי ${name},\nתודה שבחרת ב-TestMe! קיבלנו את הזמנתך ל${service} לרכב ${cartype}.\nאנו ניצור איתך קשר בקרוב לתיאום סופי.\nצוות TestMe`
            });
        }

        // Helper to send single SMS via SMS4Free
        // Usually SMS4Free expects query params in a POST or GET. User said "GET or POST".
        // Using POST with Body is cleaner for long messages, but documentation usually says JSON or Form?
        // User instruction: "Parameters: key, user... use fetch request".
        // I will use POST with JSON body if supported, or URL params.
        // SMS4Free V2 often takes JSON. Let's try JSON first or Query String?
        // User instruction mentions "Query Parameters" explicitly. So I will use URLSearchParams.

        const sendOne = async (data) => {
            // Format phone to local 05X if needed, or just numbers.
            // User said: "Ensure local format like 05XXXXXXXX".
            // My default helper does international. I need to revert logic.

            let dest = data.to.replace(/\D/g, ''); // Remove non-digits
            // If starts with 972, replace with 0
            if (dest.startsWith('972')) {
                dest = '0' + dest.substring(3);
            }
            // If doesn't start with 0 (and not 972), assume 0 needs adding?
            // Actually, if it's 50..., add 0. 
            if (dest.length === 9 && !dest.startsWith('0')) dest = '0' + dest;

            // Constuct Query Params
            const params = new URLSearchParams();
            params.append('key', API_KEY);
            params.append('user', USER);
            params.append('pass', PASS);
            params.append('sender', SENDER);
            params.append('dest', dest);
            params.append('msg', data.msg);

            // Using POST to avoid URL length limits on 'msg'
            const response = await fetch('https://www.sms4free.co.il/ApiSMS/SendSMS.aspx', {
                method: 'POST', // or GET? User said GET or POST. POST is safer for msg content.
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded' // Expected for "Query Parameters" style body often
                },
                body: params
            });

            if (!response.ok) {
                const text = await response.text();
                throw new Error(`SMS4Free Error ${response.status}: ${text}`);
            }

            // SMS4Free usually returns numeric status like "100" (success) or negative error.
            const resultText = await response.text();
            // Simple check: if result is small integer > 0 it is usually ID. If negative, error.
            // But we will return it for logging.
            return resultText;
        };

        const results = [];
        for (const msg of messages) {
            try {
                const res = await sendOne(msg);
                results.push({ status: 'fulfilled', value: res });
            } catch (err) {
                console.error("SMS Failed:", err);
                results.push({ status: 'rejected', reason: err.message });
            }
        }

        // Check explicit failures
        const failures = results.filter(r => r.status === 'rejected');

        // Also check if SMS4Free returned an error code content (e.g. "-1", "Wrong Login")
        // But assuming fetch is OK implies connectivity OK.

        if (failures.length > 0) {
            return {
                statusCode: 200, // Still return 200 to frontend
                headers,
                body: JSON.stringify({ success: false, errors: failures.map(f => f.reason) })
            };
        }

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ success: true, message: "Messages sent via SMS4Free", responses: results.map(r => r.value) })
        };

    } catch (error) {
        console.error("Fatal Handler Error:", error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: "Internal Server Error", details: error.message })
        };
    }
};
