'use client';

import React, { useEffect, useRef, useState } from 'react';
import Head from 'next/head';
import { Entity, Scene } from 'aframe-react';

interface InteractionStateSystem {
  userInteracting: boolean;
  lastInteractionTime: number;
}

interface VRSceneProps {
  onLoad: () => void;
  vrEnabled: boolean;
}

const CustomVRButton: React.FC = () => {
  const handleEnterVR = () => {
    const sceneEl = document.querySelector('a-scene');
    if (sceneEl && sceneEl.enterVR) {
      sceneEl.enterVR();
    }
  };

  return (
    <button onClick={handleEnterVR} className="custom-vr-button">
      Enter VR
    </button>
  );
};

const VRScene: React.FC<VRSceneProps> = ({ onLoad, vrEnabled }) => {
  const [isAframeLoaded, setIsAframeLoaded] = useState(false);
  const [countdown, setCountdown] = useState(10);
  const [showCountdown, setShowCountdown] = useState(true);
  const onLoadCalled = useRef(false);

  // Disable legacy WebVR polyfill.
  if (typeof AFRAME !== 'undefined') {
    (AFRAME as any).options = { disableWebVRPolyfill: true };
  }

  // Register a custom component to detect camera movement and run a countdown.
  useEffect(() => {
    if (typeof AFRAME !== 'undefined' && !(AFRAME as any).components['detect-camera-movement']) {
      AFRAME.registerComponent('detect-camera-movement', {
        init: function () {
          (this as any).startTime = Date.now();
          (this as any).initialRotationY = this.el.object3D.rotation.y;
          (this as any).detected = false;
        },
        tick: function () {
          const self = this as any;
          const elapsed = Date.now() - self.startTime;
          // After 5 seconds, check for a small change in y–rotation.
          if (!self.detected && elapsed > 5000) {
            const currentRotationY = this.el.object3D.rotation.y;
            const diff = Math.abs(currentRotationY - self.initialRotationY);
            if (diff > 0.001) {
              self.detected = true;
              if (!onLoadCalled.current) {
                onLoadCalled.current = true;
                onLoad();
              }
              setShowCountdown(false);
            }
          }
        }
      });
    }
  }, [onLoad]);

  // Start a 5-second countdown overlay.
  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          if (!onLoadCalled.current) {
            onLoadCalled.current = true;
            // Defer onLoad to next tick to prevent setState during render
            setTimeout(() => onLoad(), 0);
          }
          setShowCountdown(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [onLoad]);

  // Load A-Frame and register standard components.
  useEffect(() => {
    const loadAframe = async () => {
      try {
        const aframeModule = await import('aframe');
        const aframe = aframeModule.default;

        // Register the interaction state system.
        if (!aframe.systems['interactionState']) {
          aframe.registerSystem('interactionState', {
            init: function () {
              this.userInteracting = false;
              this.lastInteractionTime = Date.now();
            },
            userInteracting: false,
            lastInteractionTime: 0,
          });
        }

        // Register auto-rotate component.
        if (!aframe.components['auto-rotate']) {
          aframe.registerComponent('auto-rotate', {
            init: function () {
              this.el.object3D.rotation.y = 0;
            },
            tick: function () {
              const interactionState = this.el.sceneEl?.systems['interactionState'] as InteractionStateSystem | undefined;
              if (interactionState && vrEnabled) {
                const timeSinceLastInteraction = Date.now() - interactionState.lastInteractionTime;
                if (!interactionState.userInteracting || timeSinceLastInteraction > 30000) {
                  this.el.object3D.rotation.y += 0.001;
                }
              }
            },
          });
        }

        // Register detect-user-interaction component.
        if (!aframe.components['detect-user-interaction']) {
          aframe.registerComponent('detect-user-interaction', {
            init: function () {
              this.onUserInteraction = this.onUserInteraction.bind(this);
              this.el.sceneEl?.addEventListener('mousedown', this.onUserInteraction);
              this.el.sceneEl?.addEventListener('touchstart', this.onUserInteraction);
              this.el.sceneEl?.addEventListener('camera-set-active', (event: Event) => {
                const detailEvent = event as unknown as {
                  detail: { cameraEl: { addEventListener: (arg0: string, arg1: any) => void } };
                };
                if (detailEvent?.detail?.cameraEl) {
                  detailEvent.detail.cameraEl.addEventListener('trackpaddown', this.onUserInteraction);
                }
              });
            },
            onUserInteraction: function () {
              const interactionState = this.el.sceneEl?.systems['interactionState'] as InteractionStateSystem | undefined;
              if (interactionState) {
                interactionState.userInteracting = true;
                interactionState.lastInteractionTime = Date.now();
                setTimeout(() => {
                  interactionState.userInteracting = false;
                }, 30000);
              }
            },
          });
        }

        setIsAframeLoaded(true);
      } catch (error) {
        console.error('Error loading A-Frame:', error);
      }
    };

    loadAframe();
  }, [vrEnabled]);

  if (!isAframeLoaded) {
    return (
      <div className="loading-modal">
        {/* <p>Loading VR Environment...</p> */}
      </div>
    );
  }

  return (
    <>
      <Head>
        {/* Force light mode for system UI so that A-Frame’s permission modal uses light colors */}
        <meta name="color-scheme" content="light" />
      </Head>
      <Scene
        embedded
        detect-user-interaction
        vr-mode-ui="enabled: false"
        device-orientation-permission-ui="allowButtonText: 'ACTIVATE SENSORS'; denyButtonText: 'SKIP VR'; cancelButtonText: 'CANCEL'; deviceMotionMessage: 'SATELLITE INITIALIZATION: PLEASE ENABLE MOTION SENSORS FOR FULL SPATIAL IMMERSION.'; httpsMessage: 'SECURE CONNECTION REQUIRED FOR NEURAL LINK.'"
        background="color: #000000"
        style={{ width: '100%', height: '100vh' }}
      >
        <Entity
          primitive="a-sphere"
          src="/radio.jpg"
          radius="1000"
          segments-width="100"
          segments-height="100"
          position="0 0 0"
          scale="-1 1 1"
          material="side: double; src: url(/radio.jpg)"
          {...(vrEnabled ? { "auto-rotate": "" } : {})}
        />
        <Entity
          primitive="a-camera"
          position="0 0 0"
          detect-camera-movement=""
          // When VR is off, disable look-controls completely.
          look-controls={vrEnabled ? "enabled: true; touchEnabled: true" : "enabled: false"}
          wasd-controls-enabled="false"
        />
      </Scene>
      <CustomVRButton />
      {showCountdown && (
        <div className="countdown-overlay">
          <p className="countdown-text font-rajdhani">ORBITAL SYNC IN {countdown}…</p>
          <button className="skip-button font-rajdhani" onClick={() => {
            if (!onLoadCalled.current) {
              onLoadCalled.current = true;
              onLoad();
            }
            setShowCountdown(false);
          }}>
            INITIALIZE NOW
          </button>
        </div>
      )}
      <style jsx>{`
        .custom-vr-button {
          position: fixed;
          bottom: 20px;
          right: 20px;
          padding: 0.75rem 1.5rem;
          background-color: #00ccff;
          color: #000;
          border: 1px solid rgba(255, 255, 255, 0.4);
          border-radius: 4px;
          cursor: pointer;
          z-index: 9999;
          font-family: var(--font-rajdhani), sans-serif;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 1px;
          backdrop-filter: blur(10px);
          transition: all 0.3s ease;
        }
        .custom-vr-button:hover {
          background-color: #d813ff;
          color: #fff;
          box-shadow: 0 0 20px rgba(216, 19, 255, 0.5);
        }
        .loading-modal {
          position: fixed;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #000;
          color: #00ccff;
          font-family: var(--font-rajdhani), sans-serif;
          z-index: 9999;
        }
        .countdown-overlay {
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          background: rgba(0, 0, 0, 0.8);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border: 1px solid rgba(0, 204, 255, 0.3);
          padding: 2rem;
          border-radius: 12px;
          text-align: center;
          z-index: 10000;
          color: #00ccff;
          box-shadow: 0 0 30px rgba(0, 204, 255, 0.2);
        }
        .countdown-text {
          margin: 0 0 1.5rem 0;
          font-size: 1.5rem;
          font-weight: 700;
          letter-spacing: 2px;
        }
        .skip-button {
          padding: 0.75rem 1.5rem;
          border: 1px solid #00ccff;
          background-color: transparent;
          color: #00ccff;
          border-radius: 4px;
          cursor: pointer;
          font-weight: 600;
          transition: all 0.3s ease;
        }
        .skip-button:hover {
          background-color: #00ccff;
          color: #000;
        }
        /* Custom styles for the device-orientation-permission-ui dialog */
        .a-dialog-allow-button {
          background-color: #00ccff !important;
          color: #000 !important;
          font-family: var(--font-rajdhani), sans-serif !important;
          font-weight: 700 !important;
          border-radius: 4px !important;
          border: none !important;
          padding: 10px 20px !important;
          text-transform: uppercase !important;
        }
        .a-dialog-deny-button {
          background-color: transparent !important;
          color: #666 !important;
          font-family: var(--font-rajdhani), sans-serif !important;
          border-radius: 4px !important;
          border: 1px solid #333 !important;
          padding: 10px 20px !important;
          text-transform: uppercase !important;
        }
        .a-dialog-ok-button {
          background-color: #d813ff !important;
          color: #fff !important;
          font-family: var(--font-rajdhani), sans-serif !important;
          font-weight: 700 !important;
          border-radius: 4px !important;
          border: none !important;
          padding: 10px 20px !important;
        }
        /* Force the modal container to show with a visible background and auto height */
        .a-dialog {
          display: block !important;
          min-width: 300px;
          height: auto !important;
          background: rgba(5, 10, 20, 0.95) !important;
          backdrop-filter: blur(20px) !important;
          -webkit-backdrop-filter: blur(20px) !important;
          padding: 30px !important;
          border-radius: 12px;
          border: 1px solid rgba(0, 204, 255, 0.3) !important;
          box-shadow: 0 0 40px rgba(0,0,0,0.8), 0 0 20px rgba(0, 204, 255, 0.1) !important;
          color: #fff !important;
          top: 50% !important;
          left: 50% !important;
          transform: translate(-50%, -50%) !important;
        }
        /* Additional selectors for the modal text */
        .a-dialog-content {
          display: block !important;
          color: #fff !important;
          font-family: var(--font-rajdhani), sans-serif !important;
          font-size: 16px !important;
          line-height: 1.6 !important;
          padding: 0 !important;
          margin-bottom: 25px !important;
          opacity: 1 !important;
          visibility: visible !important;
          text-align: center !important;
          letter-spacing: 0.5px !important;
        }
        .a-dialog-buttons {
          display: flex !important;
          justify-content: space-between !important;
          gap: 10px !important;
        }
      `}</style>
    </>
  );
};

export default VRScene;
