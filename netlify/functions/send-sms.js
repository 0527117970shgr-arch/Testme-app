import axios from 'axios';

export const handler = async (event) => {
    try {
        const body = JSON.parse(event.body);

        // Note: User snippet expects { phone, message }. 
        // Existing frontend calls with { name, service, date... } or { customMessage }.
        // We Map inputs to 'message' to prevent undefined content.
        const phone = body.phone || body.to;
        let message = body.message || body.customMessage;

        if (!message && body.name) {
            // Fallback for Booking Form
            message = `New Booking: ${body.name} - ${body.service} (${body.cartype})`;
        }

        // User's Exact URL and Logic
        const url = "https://api.sms4free.co.il/ApiSMS/v2/SendSMS";
        const data = {
            key: "OFL4Wshku", user: "OFL4Wshku", pass: "OFL4Wshku",
            sender: "TestMe",
            recipient: phone ? phone.replace(/\D/g, '') : '',
            msg: message || "Test Message"
        };

        console.log("Sending SMS via Axios to:", url);

        const res = await axios.post(url, data); // Default content-type is json

        return { statusCode: 200, body: JSON.stringify({ success: true, data: res.data }) };
    } catch (e) {
        console.error("Axios Error:", e.message);
        return { statusCode: 500, body: JSON.stringify({ error: e.message }) };
    }
};
