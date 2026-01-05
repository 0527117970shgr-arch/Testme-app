export const handler = async (event) => {
    // Enable CORS
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: 'OK' };
    }

    console.log("Function send-sms [Legacy GET w/ www] started");

    try {
        const body = JSON.parse(event.body);
        const { name, phone, cartype, service, date, time, customMessage, to } = body;

        // Configuration
        const API_KEY = "OFL4Wshku";
        const USER = "OFL4Wshku";
        const PASS = "OFL4Wshku";
        const SENDER = "TestMe"; // No spaces, Strict requirement

        // Admin Phone
        const ADMIN_PHONE = process.env.ADMIN_PHONE;

        const messages = [];

        // CASE 1: Custom Admin Message
        if (customMessage && to) {
            messages.push({
                to: to,
                msg: customMessage
            });
        }
        // CASE 2: New Order Standard Flow
        else {
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
        }

        // Helper to send single SMS via SMS4Free Legacy Interface
        const sendOne = async (data) => {
            let dest = data.to.replace(/\D/g, '');

            // Fix formatting to local 05X
            if (dest.startsWith('972')) {
                dest = '0' + dest.substring(3);
            }
            if (dest.length > 0 && !dest.startsWith('0')) {
                dest = '0' + dest;
            }

            // User Instruction: Use URL Params in GET request.
            // URLSearchParams handles encoding automatically (encodeURIComponent equivalent).
            const params = new URLSearchParams();
            params.append('key', API_KEY);
            params.append('user', USER);
            params.append('pass', PASS);
            params.append('sender', SENDER);
            params.append('dest', dest);
            params.append('msg', data.msg);

            // User Instruction: exact URL https://sms4free.co.il/ApiSMS/SendSMS.aspx
            const baseUrl = 'https://sms4free.co.il/ApiSMS/SendSMS.aspx';
            const url = `${baseUrl}?${params.toString()}`;

            console.log(`Sending SMS to ${dest}...`);

            // Log the URL structure (masked passwords) for debugging if needed
            console.log("URL:", url.replace(PASS, '***'));

            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    // Start with minimal headers for GET
                    'Accept': '*/*'
                }
            });

            if (!response.ok) {
                const text = await response.text();
                // If 404 here, it implies the User provided URL is unreachable/wrong.
                throw new Error(`SMS4Free HTTP ${response.status}: ${text}`);
            }
            return await response.text();
        };

        const results = [];
        for (const msg of messages) {
            try {
                const res = await sendOne(msg);
                results.push({ status: 'fulfilled', value: res });
            } catch (err) {
                console.error("SMS Failed:", err.message);
                results.push({ status: 'rejected', reason: err.message });
            }
        }

        const failures = results.filter(r => r.status === 'rejected');

        if (failures.length > 0) {
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({ success: false, errors: failures.map(f => f.reason) })
            };
        }

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ success: true, message: "Messages sent", responses: results.map(r => r.value) })
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
