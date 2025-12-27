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
  const [needsPermission, setNeedsPermission] = useState(false);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const onLoadCalled = useRef(false);

  // Disable legacy WebVR polyfill.
  if (typeof AFRAME !== 'undefined') {
    (AFRAME as any).options = { disableWebVRPolyfill: true };
  }

  // Detect iOS permission requirement
  useEffect(() => {
    if (typeof window !== 'undefined' &&
      typeof DeviceMotionEvent !== 'undefined' &&
      typeof (DeviceMotionEvent as any).requestPermission === 'function') {
      setNeedsPermission(true);
    } else {
      setPermissionGranted(true);
    }
  }, []);

  const handleRequestPermission = async () => {
    try {
      const response = await (DeviceMotionEvent as any).requestPermission();
      if (response === 'granted') {
        setPermissionGranted(true);
      } else {
        alert('Motion permission is required for the VR experience.');
      }
    } catch (error) {
      console.error('Error requesting motion permission:', error);
    }
  };

  const handleSkipPermission = () => {
    setPermissionGranted(true);
    // VR remains active but motion won't work on iOS unless granted
  };

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

  // Start a 10-second countdown overlay.
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
        <meta name="color-scheme" content="dark" />
      </Head>
      <Scene
        embedded
        detect-user-interaction
        vr-mode-ui="enabled: false"
        device-orientation-permission-ui="enabled: false"
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
          look-controls={vrEnabled ? "enabled: true; touchEnabled: true" : "enabled: false"}
          wasd-controls-enabled="false"
        />
      </Scene>

      <CustomVRButton />

      {needsPermission && !permissionGranted && (
        <div className="permission-modal">
          <div className="permission-content">
            <h2 className="permission-title">SATELLITE INITIALIZATION</h2>
            <p className="permission-message">
              PLEASE ACTIVATE MOTION SENSORS FOR FULL SPATIAL IMMERSION WITHIN THE OM ECOSYSTEM.
            </p>
            <div className="permission-buttons">
              <button
                className="permission-btn primary"
                onClick={handleRequestPermission}
              >
                ACTIVATE SENSORS
              </button>
              <button
                className="permission-btn secondary"
                onClick={handleSkipPermission}
              >
                SKIP VR
              </button>
            </div>
            <p className="permission-footer">SECURE CONNECTION ESTABLISHED</p>
          </div>
        </div>
      )}

      {showCountdown && (!needsPermission || permissionGranted) && (
        <div className="countdown-overlay">
          <p className="countdown-text">ORBITAL SYNC IN {countdown}…</p>
          <button className="skip-button" onClick={() => {
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
        .permission-modal {
          position: fixed;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(0, 5, 10, 0.9);
          backdrop-filter: blur(25px);
          -webkit-backdrop-filter: blur(25px);
          z-index: 20000;
          padding: 20px;
        }
        .permission-content {
          max-width: 400px;
          width: 100%;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(0, 204, 255, 0.3);
          border-radius: 16px;
          padding: 40px 30px;
          text-align: center;
          box-shadow: 0 0 50px rgba(0, 204, 255, 0.15), inset 0 0 20px rgba(0, 204, 255, 0.05);
          font-family: var(--font-rajdhani), sans-serif;
        }
        .permission-title {
          color: #00ccff;
          font-size: 1.8rem;
          font-weight: 700;
          letter-spacing: 4px;
          margin-bottom: 25px;
          text-shadow: 0 0 15px rgba(0, 204, 255, 0.5);
        }
        .permission-message {
          color: #fff;
          font-size: 1.1rem;
          line-height: 1.6;
          margin-bottom: 35px;
          opacity: 0.9;
          letter-spacing: 1px;
        }
        .permission-buttons {
          display: flex;
          flex-direction: column;
          gap: 15px;
          margin-bottom: 25px;
        }
        .permission-btn {
          padding: 16px;
          border-radius: 8px;
          font-family: inherit;
          font-weight: 700;
          font-size: 1rem;
          letter-spacing: 2px;
          cursor: pointer;
          transition: all 0.3s ease;
          text-transform: uppercase;
        }
        .permission-btn.primary {
          background: #00ccff;
          color: #000;
          border: none;
          box-shadow: 0 0 20px rgba(0, 204, 255, 0.3);
        }
        .permission-btn.primary:hover {
          background: #d813ff;
          color: #fff;
          box-shadow: 0 0 30px rgba(216, 19, 255, 0.5);
        }
        .permission-btn.secondary {
          background: transparent;
          color: rgba(255, 255, 255, 0.5);
          border: 1px solid rgba(255, 255, 255, 0.1);
        }
        .permission-btn.secondary:hover {
          border-color: #fff;
          color: #fff;
        }
        .permission-footer {
          color: #00ccff;
          font-size: 0.7rem;
          opacity: 0.5;
          letter-spacing: 2px;
        }
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
          font-family: var(--font-rajdhani), sans-serif;
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
          font-family: inherit;
        }
        .skip-button:hover {
          background-color: #00ccff;
          color: #000;
        }
      `}</style>
    </>
  );
};

export default VRScene;
