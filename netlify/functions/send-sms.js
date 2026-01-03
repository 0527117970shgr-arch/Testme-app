exports.handler = async (event) => {
    // Only allow POST requests
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    const { name, phone, cartype, address, service, date, time } = JSON.parse(event.body);

    const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
    const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
    const TWILIO_FROM_PHONE = process.env.TWILIO_FROM_PHONE;
    const ADMIN_PHONE = process.env.ADMIN_PHONE; // The admin who receives the SMS

    if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_FROM_PHONE || !ADMIN_PHONE) {
        return { statusCode: 500, body: JSON.stringify({ error: "Missing server configuration" }) };
    }

    const messageBody = `הזמנה חדשה ב-TestMe!\nשם: ${name}\nטלפון: ${phone}\nרכב: ${cartype}\nכתובת: ${address}\nשירות: ${service}\nמועד: ${date} ${time}`;

    console.log("Sending SMS via Netlify Function...");

    try {
        const params = new URLSearchParams();
        params.append('To', ADMIN_PHONE);
        params.append('From', TWILIO_FROM_PHONE);
        params.append('Body', messageBody);

        const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`, {
            method: 'POST',
            headers: {
                'Authorization': 'Basic ' + btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`),
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: params
        });

        const result = await response.json();

        if (!response.ok) {
            console.error("Twilio Error:", result);
            return {
                statusCode: response.status,
                body: JSON.stringify({ error: result.message || "Failed to send SMS" })
            };
        }

        return {
            statusCode: 200,
            body: JSON.stringify({ success: true, message: "SMS sent successfully", data: result })
        };

    } catch (error) {
        console.error("Function Error:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: "Internal Server Error" })
        };
    }
};
