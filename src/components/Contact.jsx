import React from 'react';

const Contact = () => {
    return (
        <section id="contact" style={{ padding: '4rem 5%', backgroundColor: 'var(--color-primary)', color: 'var(--color-secondary)', textAlign: 'center' }}>
            <h2 style={{ marginBottom: '2rem' }}>צרו קשר עכשיו</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'center', fontSize: '1.2rem' }}>

                <a href="tel:02-6404000" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 'bold' }}>
                    <span>📞</span> חייג עכשיו: 02-6404000
                </a>

                <a href="https://wa.me/97226404000" target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 'bold' }}>
                    <span>✅</span> וואטסאפ: 02-6404000
                </a>

                <a href="mailto:testme026404000@gmail.com" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 'bold' }}>
                    <span>📧</span> מייל: testme026404000@gmail.com
                </a>

            </div>
            <footer style={{ marginTop: '3rem', fontSize: '0.9rem', opacity: '0.8' }}>
                &copy; {new Date().getFullYear()} TestMe. כל הזכויות שמורות.
            </footer>
        </section>
    );
};

export default Contact;
