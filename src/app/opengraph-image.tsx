import { ImageResponse } from 'next/og';
import { readFileSync } from 'fs';
import { join } from 'path';

export const runtime = 'nodejs';

export const alt = 'The Satellite Project - Molecular Cannabis Intelligence';
export const size = { width: 2400, height: 1260 };
export const contentType = 'image/png';

const THEME = '#00ccff';

export default async function Image() {
    let bgBase64 = '';
    let medallionBase64 = '';

    try {
        const bgData = readFileSync(join(process.cwd(), 'public', 'radio.jpg'));
        bgBase64 = `data:image/jpeg;base64,${bgData.toString('base64')}`;

        const medallionData = readFileSync(join(process.cwd(), 'public', 'Medallions', 'TSPAum.png'));
        medallionBase64 = `data:image/png;base64,${medallionData.toString('base64')}`;
    } catch (e) {
        console.error('Error loading images for OG:', e);
    }

    return new ImageResponse(
        (
            <div style={{
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#000000',
                position: 'relative',
                fontFamily: 'sans-serif'
            }}>
                {/* 1. Base Background */}
                {bgBase64 && (
                    <img
                        src={bgBase64}
                        style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                            opacity: 1
                        }}
                    />
                )}
                <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)' }} />

                {/* Left Wing - QUOTE */}
                <div style={{
                    position: 'absolute',
                    left: 200,
                    top: 480,
                    width: 800,
                    height: 320,
                    borderRadius: '40px 0 0 40px',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-end',
                    justifyContent: 'center',
                    padding: '40px 260px 40px 40px',
                    boxShadow: 'inset 2px 2px 20px rgba(0,204,255,0.2)',
                    background: 'rgba(0,0,0,0.6)',
                    border: '1px solid rgba(0,204,255,0.3)',
                    borderRight: 'none'
                }}>
                    <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', zIndex: '10' }}>
                        <div style={{ fontSize: 40, fontWeight: 700, color: 'white', lineHeight: 1.2, textAlign: 'right', textShadow: '0 4px 30px rgba(0,0,0,0.9)' }}>
                            “To find the secrets of the universe, think in terms of energy, frequency and vibration.”
                        </div>
                        <div style={{
                            fontSize: 24,
                            fontWeight: 700,
                            color: THEME,
                            marginTop: 16,
                            textTransform: 'uppercase',
                            letterSpacing: '0.1em',
                            textShadow: '0 2px 20px black'
                        }}>
                            — Nikola Tesla
                        </div>
                    </div>
                </div>

                {/* Right Wing */}
                <div style={{
                    position: 'absolute',
                    right: 100,
                    top: 480,
                    width: 920,
                    height: 320,
                    borderRadius: '0 40px 40px 0',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    justifyContent: 'center',
                    padding: '40px 40px 40px 240px',
                    boxShadow: 'inset -2px 2px 20px rgba(0,204,255,0.2)',
                    background: 'rgba(0,0,0,0.6)',
                    border: '1px solid rgba(0,204,255,0.3)',
                    borderLeft: 'none'
                }}>
                    <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', zIndex: '10' }}>
                        <div style={{ fontSize: 50, color: 'white', fontWeight: 800, lineHeight: 1.1, display: 'flex', flexDirection: 'column', maxWidth: 640, textShadow: '0 4px 30px rgba(0,0,0,0.9)', letterSpacing: '-0.02em' }}>
                            <span>THE SATELLITE</span>
                            <span>PROJECT OM</span>
                        </div>
                        <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 8, borderLeft: `6px solid ${THEME}`, paddingLeft: 30 }}>
                            <span style={{ fontSize: 24, color: '#D1D5DB', letterSpacing: '0.15em', fontWeight: 500, textShadow: '0 2px 10px black' }}>MOLECULAR CANNABIS INTELLIGENCE</span>
                            <span style={{ fontSize: 20, color: THEME, letterSpacing: '0.1em', fontWeight: 700, textShadow: '0 2px 10px black' }}>tsp.thelochnessbotanicalsociety.com</span>
                        </div>
                    </div>
                </div>

                {/* Center Medallion Ring */}
                <div style={{
                    position: 'absolute',
                    left: 810,
                    top: 240,
                    width: 780,
                    height: 780,
                    borderRadius: '50%',
                    overflow: 'hidden',
                    display: 'flex',
                    zIndex: '40',
                    boxShadow: '0 0 60px rgba(0,204,255,0.4)',
                    border: `4px solid ${THEME}`,
                    background: 'rgba(0,0,0,0.8)'
                }}>
                </div>

                {/* Visual Medallion */}
                <div style={{
                    position: 'absolute',
                    left: 850,
                    top: 280,
                    width: 700,
                    height: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: '50'
                }}>
                    <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: `4px solid ${THEME}`, boxShadow: `0 0 50px ${THEME}60`, display: 'flex' }} />
                    {medallionBase64 && (
                        <img src={medallionBase64} width={700} height={700} style={{ position: 'relative', width: 700, height: 700, objectFit: 'cover', borderRadius: '50%' }} />
                    )}
                </div>

                {/* FRAME BARS */}
                <div style={{ position: 'absolute', left: 40, top: 40, width: 2320, height: 40, overflow: 'hidden', borderRadius: '24px 24px 0 0', display: 'flex', zIndex: '5', background: 'rgba(0,204,255,0.1)', border: '1px solid rgba(0,204,255,0.3)', borderBottom: 'none' }} />
                <div style={{ position: 'absolute', left: 40, top: 1180, width: 2320, height: 40, overflow: 'hidden', borderRadius: '0 0 24px 24px', display: 'flex', zIndex: '5', background: 'rgba(0,204,255,0.1)', border: '1px solid rgba(0,204,255,0.3)', borderTop: 'none' }} />
                <div style={{ position: 'absolute', left: 40, top: 80, width: 40, height: 1100, overflow: 'hidden', display: 'flex', zIndex: '5', background: 'rgba(0,204,255,0.1)', border: '1px solid rgba(0,204,255,0.3)', borderTop: 'none', borderBottom: 'none' }} />
                <div style={{ position: 'absolute', left: 2320, top: 80, width: 40, height: 1100, overflow: 'hidden', display: 'flex', zIndex: '5', background: 'rgba(0,204,255,0.1)', border: '1px solid rgba(0,204,255,0.3)', borderTop: 'none', borderBottom: 'none' }} />

                {/* HUD Corners */}
                <div style={{ position: 'absolute', top: 60, left: 60, width: 80, height: 80, borderTop: `8px solid ${THEME}`, borderLeft: `8px solid ${THEME}`, borderRadius: '24px 0 0 0', display: 'flex' }} />
                <div style={{ position: 'absolute', top: 60, right: 60, width: 80, height: 80, borderTop: `8px solid ${THEME}`, borderRight: `8px solid ${THEME}`, borderRadius: '0 24px 0 0', display: 'flex' }} />
                <div style={{ position: 'absolute', bottom: 60, left: 60, width: 80, height: 80, borderBottom: `8px solid ${THEME}`, borderLeft: `8px solid ${THEME}`, borderRadius: '0 0 0 24px', display: 'flex' }} />
                <div style={{ position: 'absolute', bottom: 60, right: 60, width: 80, height: 80, borderBottom: `8px solid ${THEME}`, borderRight: `8px solid ${THEME}`, borderRadius: '0 0 24px 0', display: 'flex' }} />

            </div>
        ),
        { ...size }
    );
}
