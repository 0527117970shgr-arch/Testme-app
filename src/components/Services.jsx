import React from 'react';
import { useLanguage } from '../context/LanguageContext';
import testServiceImg from '../assets/test-service.png';
import mechanicServiceImg from '../assets/mechanic-service.png';
import bodyworkServiceImg from '../assets/bodywork-service.png';

const Services = () => {
    const { t } = useLanguage();

    const services = [
        {
            title: t('services.test.title'),
            desc: t('services.test.desc'),
            image: testServiceImg
        },
        {
            title: t('services.mechanic.title'),
            desc: t('services.mechanic.desc'),
            image: mechanicServiceImg
        },
        {
            title: t('services.bodywork.title'),
            desc: t('services.bodywork.desc'),
            image: bodyworkServiceImg
        }
    ];

    return (
        <section id="services" style={{ padding: '4rem 5%', backgroundColor: 'var(--color-bg-light)' }}>
            <h2 style={{ textAlign: 'center', marginBottom: '3rem', color: 'var(--color-secondary)' }}>{t('services.title')}</h2>
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: '2rem'
            }}>
                {services.map((service, index) => (
                    <div key={index} style={{
                        backgroundColor: 'var(--color-white)',
                        padding: '0',
                        borderRadius: 'var(--border-radius)',
                        boxShadow: 'var(--shadow-sm)',
                        textAlign: 'center',
                        transition: 'transform 0.3s',
                        cursor: 'default'
                    }}
                        onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-5px)'}
                        onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                    >
                        <div style={{ height: '200px', overflow: 'hidden', borderRadius: 'var(--border-radius) var(--border-radius) 0 0', marginBottom: '1rem' }}>
                            <img src={service.image} alt={service.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        </div>
                        <h3 style={{ color: 'var(--color-primary)', marginBottom: '1rem' }}>{service.title}</h3>
                        <p style={{ padding: '0 1rem 1rem' }}>{service.desc}</p>
                    </div>
                ))}
            </div>
        </section>
    );
};

export default Services;
