import React from 'react';

const Header = () => {
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
                    <span style={{ fontSize: '1rem', letterSpacing: '1px' }}>test</span>
                    <span style={{ fontSize: '1.2rem', fontWeight: '800' }}>me</span>
                </div>
                <span style={{ fontSize: '1.5rem', color: 'var(--color-primary)' }}>שירותי רכב</span>
            </div>

            <nav>
                <ul style={{ display: 'flex', gap: '2rem' }}>
                    <li><a href="#services" style={{ fontWeight: '500' }}>שירותים</a></li>
                    <li><a href="#process" style={{ fontWeight: '500' }}>איך זה עובד</a></li>
                    <li><a href="#contact" style={{
                        backgroundColor: 'var(--color-primary)',
                        color: 'var(--color-secondary)',
                        padding: '0.5rem 1rem',
                        borderRadius: '20px',
                        fontWeight: 'bold'
                    }}>צור קשר</a></li>
                </ul>
            </nav>
        </header>
    );
};

export default Header;
