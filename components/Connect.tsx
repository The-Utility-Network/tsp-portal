'use client';

import {
  useSetActiveWallet,
  ConnectButton,
  darkTheme,
} from 'thirdweb/react';
import { inAppWallet, createWallet, walletConnect } from 'thirdweb/wallets';
import { base } from 'thirdweb/chains';
import { useEffect, useState } from 'react';

const wallets = [
  inAppWallet({
    auth: {
      options: [
        "google",
        "discord",
        "telegram",
        "farcaster",
        "email",
        "x",
        "passkey",
        "phone",
        "github",
        "twitch",
        "steam",
        "line",
        "facebook",
        "apple",
        "coinbase",
      ],
    },
  }),
  createWallet("io.rabby"),
  createWallet("io.metamask"),
  createWallet("com.coinbase.wallet"),
  createWallet("me.rainbow"),
  createWallet("io.zerion.wallet"),
];

export default function Wallet() {
  const setActiveAccount = useSetActiveWallet();
  const [walletAddress, setWalletAddress] = useState(null);
  const [client, setClient] = useState<any>(null);

  // Fetch the thirdweb client config from the server-side utility
  useEffect(() => {
    const fetchClientConfig = async () => {
      try {
        // Dynamically import the server-side function to fetch the client configuration
        const clientConfig = await import('../src/utils/createThirdwebClient');
        const thirdwebClient = clientConfig.getThirdwebClient();
        setClient(thirdwebClient);
      } catch (error) {
        console.error('Error fetching thirdweb client config:', error);
      }
    };

    fetchClientConfig();
  }, []);

  const handleConnect = async (account: any) => {
    await setActiveAccount(account);
    setWalletAddress(account);
  };

  if (!client) {
    return <div>Loading...</div>; // Add a loading state while the client is being fetched
  }

  return (
    <ConnectButton
      client={client}
      wallets={wallets}
      chain={base}
      detailsButton={{
        displayBalanceToken: {
          [base.id]: "0x389dfbCB6Ee872efa97bb5713d76DdA8419Af8CC", // token address to display balance for
        },
      }}
      supportedTokens={{
        [base.id]: [
          {
            address: "0x389dfbCB6Ee872efa97bb5713d76DdA8419Af8CC",
            name: "Machiavelli",
            symbol: "MKVLI",
            icon: "https://storage.googleapis.com/tgl_cdn/images/Medallions/MKVLI.png",
          },
        ],
      }}
      accountAbstraction={{
        chain: base,
        sponsorGas: true,
      }}
      theme={darkTheme({
        colors: {
          accentText: '#ff80ed',               // neon pink
          accentButtonBg: '#282a36',           // deep dark purple
          primaryButtonBg: 'rgba(255, 153, 0, 0.7)',  // transparent orange
          primaryButtonText: '#fffb96',        // soft neon yellow
          secondaryButtonText: '#f8f8f2',      // pale lavender
          secondaryText: '#8be9fd',            // neon cyan
          modalBg: 'rgba(40, 42, 54, 0.8)',    // transparent dark purple
          connectedButtonBg: 'rgba(255, 69, 0, 0.7)', // transparent vibrant red-orange
          borderColor: '#ff79c6',              // neon pink
      },        
      })}
      connectButton={{ label: "Enter The Portal" }}
      connectModal={{
        size: 'wide',
        titleIcon:
          'https://storage.googleapis.com/tgl_cdn/images/Medallions/TSPAum1.png',
        welcomeScreen: {
          title: 'Welcome to The Satellite Project Om!',
          subtitle: 'Sign in to begin your journey.',
          img: {
            src: 'https://storage.googleapis.com/tgl_cdn/images/Medallions/TSPAum1.png',
            width: 150,
            height: 150,
          },
        },
        showThirdwebBranding: false,
      }}
      onConnect={handleConnect}
    />
  );
}
