import React, { useState, useEffect } from 'react';
import { ArrowRightIcon } from '@heroicons/react/24/solid'; // Import Heroicons
import { useActiveAccount } from 'thirdweb/react'; // Import thirdweb's active account hook
import Wallet from './Connect';

interface SelectionBarProps {
  onPanelChange: (panel: string | null) => void;
  currentPanel: string | null;
}

const panelsLeft = ["Chat", "Learn"];
const panelsRight = ["Buy", "MySpot"];
const navigationDots = [
  { name: 'Contact Us', href: 'https://www.thelochnessbotanicalsociety.com/contact-us/', color: 'bg-brand-800' },
  { name: 'Vendors/Wholesale', href: 'https://app.leaflink.com/menu/ohm-grown/', color: 'bg-orangeSunset' },
  { name: 'About Us', href: 'https://www.thelochnessbotanicalsociety.com/', color: 'bg-brand-400' },
  { name: 'Loyalty Program', href: 'https://lab.alpineiq.com/wallet/3612', color: 'bg-brand-200' },
];

export default function SelectionBar({ onPanelChange, currentPanel }: SelectionBarProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [tapSoundEffect, setTapSoundEffect] = useState<HTMLAudioElement | null>(null);
  const activeAccount = useActiveAccount(); // Hook to check if wallet is connected

  useEffect(() => {
    const audio = new Audio('/static/sounds/tap.mp3');
    setTapSoundEffect(audio);
    return () => {
      audio.pause();
      audio.currentTime = 0;
    };
  }, []);

  const handleSelection = (panel: string) => {
    if (panel === currentPanel) {
      // If the same panel is clicked, hide it by setting currentPanel to null
      onPanelChange(null);
    } else {
      // Otherwise, show the clicked panel
      onPanelChange(panel);
    }
    setMenuOpen(false); // Close menu if it's open
  };

  const handleMedallionClick = () => {
    if (tapSoundEffect) {
      tapSoundEffect.play();
    }
    setMenuOpen(!menuOpen);
  };

  return (
    <div className="relative w-full z-50">
      {/* Selection Bar */}
      <div
        className="relative flex justify-center items-center py-0 px-6 w-full backdrop-filter backdrop-blur-md bg-brand-900 bg-opacity-30 shadow-lg rounded-t-lg"
        style={{
          boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.2)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          borderTop: '1px solid rgba(255,255,255,0.2)',
        }}
      >
        {activeAccount ? (
          <>
            {/* Left Panel Selection Buttons */}
            <div className="flex space-x-2">
              {panelsLeft.map((panel) => (
                <button
                  key={panel}
                  onClick={() => handleSelection(panel)}
                  className={`transition-all duration-300 ${panel === currentPanel
                      ? 'text-white text-base bg-brand-700 py-1 px-2 rounded-md'
                      : 'text-brand-100 text-sm py-1 px-2'
                    }`}
                  style={
                    panel === currentPanel
                      ? { transform: 'scale(1.05)', boxShadow: '0px 2px 5px rgba(0, 0, 0, 0.2)' }
                      : {}
                  }
                >
                  {panel}
                </button>
              ))}
            </div>

            {/* Medallion Button */}
            <div className="relative flex justify-center items-center mx-4" style={{ zIndex: 30 }}>
              <button
                onClick={handleMedallionClick}
                className="relative p-0 hover:ring-4 hover:ring-brand-500 rounded-full transition-all duration-300 transform hover:scale-105"
                style={{
                  top: '-10px', // Move the medallion up a bit
                  zIndex: 30, // Higher z-index to stay above the pop-up menu
                }}
              >
                <img src="/Medallions/TSPAum.png" alt="Medallion" className="h-14 w-14 rounded-full" />
              </button>
            </div>

            {/* Right Panel Selection Buttons */}
            <div className="flex space-x-2">
              {panelsRight.map((panel) => (
                <button
                  key={panel}
                  onClick={() => handleSelection(panel)}
                  className={`transition-all duration-300 ${panel === currentPanel
                      ? 'text-white text-base bg-brand-700 py-1 px-2 rounded-md'
                      : 'text-brand-100 text-sm py-1 px-2'
                    }`}
                  style={
                    panel === currentPanel
                      ? { transform: 'scale(1.05)', boxShadow: '0px 2px 5px rgba(0, 0, 0, 0.2)' }
                      : {}
                  }
                >
                  {panel}
                </button>
              ))}
            </div>
          </>
        ) : (
          <>
            {/* Message to connect wallet */}
            <div className="relative flex items-center justify-center">
              <div className="animate-side-bounce flex items-center space-x-2 absolute -left-40 pb-3 transform -translate-x-full">
                <p className="text-white text-sm">Click to Begin</p>
                <ArrowRightIcon className="text-white h-5 w-5 transform" /> {/* Heroicon Arrow */}
              </div>
              {/* Medallion Button */}
              <div className="relative flex justify-center items-center mx-4" style={{ zIndex: 20 }}>
                <button
                  onClick={handleMedallionClick}
                  className="relative p-0 hover:ring-4 hover:ring-brand-500 rounded-full transition-all duration-300 transform hover:scale-105"
                  style={{
                    top: '-10px', // Move the medallion up a bit
                    zIndex: 30, // Higher z-index to stay above the pop-up menu
                  }}
                >
                  <img src="/Medallions/TSPAum.png" alt="Medallion" className="h-14 w-14 rounded-full" />
                </button>
              </div>
            </div>
            <style jsx>{`
              @keyframes sideBounce {
                0%, 100% {
                  transform: translateX(25px);
                }
                50% {
                  transform: translateX(35px);
                }
              }
              .animate-side-bounce {
                animation: sideBounce 1s infinite;
              }
            `}</style>
          </>
        )}
      </div>

      {/* Pop-up menu for navigation dots */}
      {menuOpen && ( // Conditionally render the menu only when open
        <div
          className={`absolute left-1/2 transform -translate-x-1/2 bottom-20 z-10 transition-all duration-500 ease-in-out opacity-100 flex flex-col items-center space-y-4 backdrop-filter backdrop-blur-md bg-brand-900 bg-opacity-30 p-4 rounded-lg shadow-lg`}
          style={{
            boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.2)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
          }}
        >
          {/* Navigation Dots with Text */}
          <div className="flex flex-col items-start space-y-2">
            {navigationDots.map((dot, index) => (
              <a
                key={index}
                href={dot.href}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center space-x-2"
                title={dot.name}
              >
                <div className={`h-8 w-8 rounded-full ${dot.color} animate-accordion`} />
                <span className="text-white">{dot.name}</span>
              </a>
            ))}
          </div>

          {/* Wallet Button */}
          <div className="mt-4 pb-2">
            <Wallet />
          </div>
        </div>
      )}
    </div>
  );
}
