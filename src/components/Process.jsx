import React from 'react';

const Process = () => {
    return (
        <section id="process" style={{ padding: '4rem 5%', backgroundColor: 'var(--color-secondary)', color: 'var(--color-white)', textAlign: 'center' }}>
            <h2 style={{ marginBottom: '3rem', color: 'var(--color-primary)' }}>איך זה עובד?</h2>
            <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                justifyContent: 'center',
                gap: '2rem',
                maxWidth: '1000px',
                margin: '0 auto'
            }}>
                <div style={{ flex: '1 1 250px' }}>
                    <div style={{ height: '150px', marginBottom: '1rem' }}>
                        <img src="https://images.unsplash.com/photo-1560252829-804f1aedf1be?auto=format&fit=crop&w=400&q=80" alt="Pickup" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '8px' }} />
                    </div>
                    <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--color-primary)', marginBottom: '0.5rem' }}>1</div>
                    <h3>איסוף מהבית</h3>
                    <p>אנחנו נגיע אליך הביתה או למשרד ונאסוף את הרכב.</p>
                </div>
                <div style={{ flex: '1 1 250px' }}>
                    <div style={{ height: '150px', marginBottom: '1rem' }}>
                        <img src="https://images.unsplash.com/photo-1487754180451-c456f719a1fc?auto=format&fit=crop&w=400&q=80" alt="Service" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '8px' }} />
                    </div>
                    <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--color-primary)', marginBottom: '0.5rem' }}>2</div>
                    <h3>טיפול ומקצועיות</h3>
                    <p>נדאג לכל התיקונים, הטסט או הטיפולים הנדרשים במוסכים מורשים.</p>
                </div>
                <div style={{ flex: '1 1 250px' }}>
                    <div style={{ height: '150px', marginBottom: '1rem' }}>
                        <img src="https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?auto=format&fit=crop&w=400&q=80" alt="Return" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '8px' }} />
                    </div>
                    <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--color-primary)', marginBottom: '0.5rem' }}>3</div>
                    <h3>חזרה אליך</h3>
                    <p>נחזיר את הרכב אליך תקין, נקי ובטוח לנסיעה.</p>
                </div>
            </div>
            <p style={{ marginTop: '3rem', fontSize: '1.2rem', fontWeight: '500' }}>
                שקיפות מלאה ובלי הפתעות – מהמחיר והשירות כן תופתעו!
            </p>
        </section>
    );
};

export default Process;
