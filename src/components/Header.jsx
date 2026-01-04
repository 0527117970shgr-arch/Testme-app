import React from 'react';
import { useLanguage } from '../context/LanguageContext';

const Header = ({ onToggleChat }) => {
    const { language, toggleLanguage, t } = useLanguage();

    return (
        <header style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '1rem 5%',
            backgroundColor: 'var(--color-secondary)',
            color: 'var(--color-white)',
            position: 'sticky',
            top: 0,
            zIndex: 100,
            boxShadow: 'var(--shadow-md)'
        }}>
            <div className="logo" style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontWeight: 'bold'
            }}>
                <div style={{
                    backgroundColor: 'var(--color-primary)',
                    color: 'var(--color-secondary)',
                    padding: '5px 10px',
                    borderRadius: '8px',
                    lineHeight: '1',
                    textAlign: 'center',
                    display: 'flex',
                    flexDirection: 'column'
                }}>
                    <span style={{ fontSize: '1rem', letterSpacing: '1px' }}>{t('header.title').replace('me', '')}</span>
                    <span style={{ fontSize: '1.2rem', fontWeight: '800' }}>me</span>
                </div>
                <span style={{ fontSize: '1.5rem', color: 'var(--color-primary)' }}>{t('header.subtitle')}</span>
            </div>

            <nav style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
                <ul style={{ display: 'flex', gap: '2rem', listStyle: 'none', margin: 0, padding: 0 }}>
                    <li><a href="#services" style={{ fontWeight: '500', color: 'inherit', textDecoration: 'none' }}>{t('header.services')}</a></li>
                    <li><a href="#process" style={{ fontWeight: '500', color: 'inherit', textDecoration: 'none' }}>{t('header.process')}</a></li>
                    <li><button onClick={onToggleChat} style={{
                        background: 'none',
                        border: 'none',
                        color: 'inherit',
                        fontWeight: '500',
                        cursor: 'pointer',
                        fontSize: '1rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px'
                    }}>
                        🤖 {t('header.ai_assistant') || 'Assistant'}
                    </button></li>
                    <li><a href="#contact" style={{
                        backgroundColor: 'var(--color-primary)',
                        color: 'var(--color-secondary)',
                        padding: '0.5rem 1rem',
                        borderRadius: '20px',
                        fontWeight: 'bold',
                        textDecoration: 'none'
                    }}>{t('header.contact')}</a></li>
                </ul>

                <button
                    onClick={toggleLanguage}
                    style={{
                        background: 'none',
                        border: '1px solid var(--color-primary)',
                        borderRadius: '50%',
                        width: '35px',
                        height: '35px',
                        color: 'var(--color-primary)',
                        cursor: 'pointer',
                        fontSize: '1rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.3s'
                    }}
                    title="Switch Language"
                >
                    {language === 'he' ? 'EN' : 'עב'}
                </button>
            </nav>
        </header>
    );
};

export default Header;
