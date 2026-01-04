import React from 'react';
import { useLanguage } from '../context/LanguageContext';

const Hero = () => {
    const { t } = useLanguage();

    return (
        <section style={{
            height: '80vh',
            backgroundImage: 'linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.5)), url(https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?ixlib=rb-1.2.1&auto=format&fit=crop&w=1950&q=80)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            color: 'var(--color-white)',
            textAlign: 'center',
            padding: '0 5%'
        }}>
            <h1 className="fade-in" style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>{t('hero.title')}</h1>
            <p className="fade-in" style={{ fontSize: '1.5rem', marginBottom: '2rem', maxWidth: '800px' }}>{t('hero.subtitle')}</p>
            <a href="#booking" className="fade-in" style={{
                backgroundColor: 'var(--color-primary)',
                color: 'var(--color-secondary)',
                padding: '1rem 2rem',
                borderRadius: '50px',
                fontSize: '1.2rem',
                fontWeight: 'bold',
                textDecoration: 'none',
                transition: 'transform 0.3s'
            }}>
                {t('hero.cta')}
            </a>
        </section>
    );
};

export default Hero;
