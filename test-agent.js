import { handler } from './netlify/functions/smart-agent.js';

const mockEvent = {
    httpMethod: 'POST',
    body: JSON.stringify({
        query: "What does the AI do?",
        documentText: "The Celestial Quasar project is a web application for car services. It includes booking, admin dashboard, and now AI document reading capabilities. The AI checks credentials and analyzes docs to prevent hallucinations using a RAG pipeline."
    })
};

(async () => {
    console.log("Testing Smart Agent (Custom Vector Search)...");
    const response = await handler(mockEvent, {});
    console.log("Response Status:", response.statusCode);
    if (response.statusCode === 200) {
        console.log("Answer:", JSON.parse(response.body).answer);
    } else {
        console.log("Error Body:", response.body);
    }
})();
