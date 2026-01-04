import React, { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';

const DocumentChat = () => {
    const { language } = useLanguage();
    const [documentText, setDocumentText] = useState('');
    const [query, setQuery] = useState('');
    const [answer, setAnswer] = useState('');
    const [citations, setCitations] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showChat, setShowChat] = useState(false);

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => setDocumentText(e.target.result);
            reader.readAsText(file);
        }
    };

    const handleAsk = async () => {
        if (!documentText || !query) return;
        setLoading(true);
        setAnswer('');
        setCitations([]);

        try {
            const response = await fetch('/.netlify/functions/smart-agent', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    query,
                    documentText,
                    mode: 'hybrid' // hybrid search
                })
            });

            const data = await response.json();
            if (response.ok) {
                setAnswer(data.answer);
                setCitations(data.citations || []);
            } else {
                setAnswer('Error fetching answer.');
            }
        } catch (error) {
            console.error("Chat Error:", error);
            setAnswer('Network error.');
        } finally {
            setLoading(false);
        }
    };

    // Translations for this component (inline for now or move to dictionary later)
    const t = {
        he: {
            title: '🤖 עוזר חכם למסמכים',
            subtitle: 'העלה מסמך או הדבק טקסט ושאל שאלות.',
            placeholder_text: 'הדבק טקסט כאן...',
            placeholder_query: 'שאל משהו על המסמך...',
            btn_ask: 'שאל',
            btn_upload: 'העלה קובץ טקסט',
            thinking: 'חושב...',
            answer: 'תשובה:',
            citations: 'מקורות:',
            toggle_open: "פתח צ'אט מסמכים 🤖",
            toggle_close: 'סגור'
        },
        en: {
            title: '🤖 AI Document Assistant',
            subtitle: 'Upload a document or paste text and ask questions.',
            placeholder_text: 'Paste text here...',
            placeholder_query: 'Ask something about the document...',
            btn_ask: 'Ask',
            btn_upload: 'Upload Text File',
            thinking: 'Thinking...',
            answer: 'Answer:',
            citations: 'Sources:',
            toggle_open: 'Open Doc Chat 🤖',
            toggle_close: 'Close'
        }
    }[language];

    return (
        <section style={{ padding: '2rem 5%', backgroundColor: '#f0f4f8', textAlign: 'center' }}>
            {!showChat ? (
                <button onClick={() => setShowChat(true)} style={{
                    padding: '10px 25px',
                    borderRadius: '50px',
                    border: '2px solid var(--color-primary)',
                    backgroundColor: 'white',
                    color: 'var(--color-primary)',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    fontSize: '1.2rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    margin: '0 auto'
                }}>
                    {t.toggle_open}
                </button>
            ) : (
                <div className="fade-in" style={{
                    maxWidth: '800px',
                    margin: '0 auto',
                    backgroundColor: 'white',
                    padding: '2rem',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                    position: 'relative'
                }}>
                    <button onClick={() => setShowChat(false)} style={{
                        position: 'absolute',
                        top: '10px',
                        right: language === 'he' ? 'auto' : '10px',
                        left: language === 'he' ? '10px' : 'auto',
                        border: 'none',
                        background: 'none',
                        fontSize: '1.5rem',
                        cursor: 'pointer'
                    }}>✕</button>

                    <h2 style={{ color: 'var(--color-primary)', marginBottom: '10px' }}>{t.title}</h2>
                    <p style={{ marginBottom: '20px', color: '#666' }}>{t.subtitle}</p>

                    <div style={{ marginBottom: '15px' }}>
                        <textarea
                            placeholder={t.placeholder_text}
                            value={documentText}
                            onChange={(e) => setDocumentText(e.target.value)}
                            style={{ width: '100%', minHeight: '150px', padding: '10px', borderRadius: '4px', border: '1px solid #ddd', fontFamily: 'inherit' }}
                        />
                        <div style={{ marginTop: '5px', textAlign: language === 'he' ? 'right' : 'left' }}>
                            <input type="file" accept=".txt,.md,.json" onChange={handleFileChange} />
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                        <input
                            type="text"
                            placeholder={t.placeholder_query}
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleAsk()}
                            style={{ flex: 1, padding: '10px', borderRadius: '4px', border: '1px solid #ddd' }}
                        />
                        <button onClick={handleAsk} disabled={loading} style={{
                            padding: '10px 20px',
                            backgroundColor: 'var(--color-primary)',
                            color: 'var(--color-secondary)',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            opacity: loading ? 0.7 : 1
                        }}>
                            {loading ? t.thinking : t.btn_ask}
                        </button>
                    </div>

                    {answer && (
                        <div style={{ textAlign: language === 'he' ? 'right' : 'left', backgroundColor: '#eef2f5', padding: '15px', borderRadius: '4px' }}>
                            <h4 style={{ color: '#333', marginBottom: '10px' }}>{t.answer}</h4>
                            <p style={{ whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>{answer}</p>

                            {citations.length > 0 && (
                                <div style={{ marginTop: '15px', paddingTop: '10px', borderTop: '1px solid #ddd' }}>
                                    <h5 style={{ fontSize: '0.9rem', color: '#666' }}>{t.citations}</h5>
                                    <ul style={{ listStyle: 'none', padding: 0, fontSize: '0.85rem', color: '#555' }}>
                                        {citations.map((c, i) => (
                                            <li key={i} style={{ marginBottom: '5px' }}>
                                                • {c.text}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
        </section>
    );
};

export default DocumentChat;
