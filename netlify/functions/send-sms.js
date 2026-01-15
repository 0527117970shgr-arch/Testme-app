// Native Fetch Implementation (Zero Dependencies)
// Based on User's Correct Configuration:
// URL: https://api.sms4free.co.il/ApiSMS/v2/SendSMS
// Method: POST
// Content-Type: application/json

export const handler = async (event) => {
    // 1. CORS Headers
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
    };

    // 2. Handle Preflight
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: 'OK' };
    }

    console.log("Starting SMS Function (Native Fetch Clean Rewrite)");

    // Debug: Check if Env Vars are loaded
    console.log("Auth Config Check:");
    console.log("- SMS_KEY:", process.env.SMS_KEY ? "LOADED" : "MISSING");
    console.log("- SMS_USER:", process.env.SMS_USER ? "LOADED" : "MISSING");
    console.log("- SMS_PASS:", process.env.SMS_PASS ? "LOADED" : "MISSING");

    try {
        // 3. Parse Body
        if (!event.body) throw new Error("Missing Request Body");
        const body = JSON.parse(event.body);

        // 4. Input Mapping
        const phone = body.phone || body.to;
        let message = body.message || body.customMessage;

        // Fallback message creation if not provided directly
        if (!message && body.name) {
            message = `New Booking: ${body.name} - ${body.service} (${body.cartype})`;
        }

        if (!phone) throw new Error("Missing Phone Number");

        // 5. Clean Phone Number
        const cleanPhone = phone.replace(/\D/g, '');

        // 6. Prepare Payload (Environment Variables)
        const payload = {
            key: process.env.SMS_KEY,
            user: process.env.SMS_USER,
            pass: process.env.SMS_PASS,
            sender: "TestMe",
            recipient: cleanPhone,
            msg: message || "Test Message"
        };

        const url = "https://api.sms4free.co.il/ApiSMS/v2/SendSMS";

        console.log(`Sending to ${cleanPhone} via ${url}`);

        // 7. Execute Request using Native Fetch
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        // 8. Handle Response
        console.log("Upstream Status:", response.status);

        let responseData;
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.indexOf("application/json") !== -1) {
            responseData = await response.json();
        } else {
            responseData = await response.text();
        }

        console.log("Upstream Data:", responseData);

        if (!response.ok) {
            return {
                statusCode: 200, // Return 200 to Frontend so it can display error gracefully
                headers,
                body: JSON.stringify({ success: false, error: `Upstream Error ${response.status}`, details: responseData })
            };
        }

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ success: true, data: responseData })
        };

    } catch (error) {
        console.error("Critical Function Error:", error);
        // Return 200 with error details to prevent 502/Crash Generic Page
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: false,
                error: "Function Crashed",
                message: error.message,
                stack: error.stack
            })
        };
    }
};
