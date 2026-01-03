import React from 'react';

const Services = () => {
    const services = [
        {
            title: 'טסט שנתי',
            desc: 'נעבור אותו במקומך ביעילות ובמקצועיות.',
            icon: '🚗'
        },
        {
            title: 'שירותי מכונאות',
            desc: 'ניהול כל הטיפולים והתיקונים עבורך – עד הבית.',
            icon: '🛠️'
        },
        {
            title: 'שירותי פחחות',
            desc: 'ניהול תיקוני מרכב וצבע במחירים ללא תחרות.',
            icon: '🎨'
        }
    ];

    return (
        <section id="services" style={{ padding: '4rem 5%', backgroundColor: 'var(--color-bg-light)' }}>
            <h2 style={{ textAlign: 'center', marginBottom: '3rem', color: 'var(--color-secondary)' }}>השירותים שלנו</h2>
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: '2rem'
            }}>
                {services.map((service, index) => (
                    <div key={index} style={{
                        backgroundColor: 'var(--color-white)',
                        padding: '2rem',
                        borderRadius: 'var(--border-radius)',
                        boxShadow: 'var(--shadow-sm)',
                        textAlign: 'center',
                        transition: 'transform 0.3s',
                        cursor: 'default'
                    }}
                        onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-5px)'}
                        onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                    >
                        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>{service.icon}</div>
                        <h3 style={{ color: 'var(--color-primary)', marginBottom: '1rem' }}>{service.title}</h3>
                        <p>{service.desc}</p>
                    </div>
                ))}
            </div>
        </section>
    );
};

export default Services;
