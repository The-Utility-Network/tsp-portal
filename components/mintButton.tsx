'use client';
import { useState, useEffect, useRef } from 'react';
import { ethers } from 'ethers';
import { useActiveAccount, useActiveWallet } from 'thirdweb/react';
import { contract } from '../primitives/TSPABI';
import { prepareContractCall, sendAndConfirmTransaction, createThirdwebClient, readContract, getContract } from 'thirdweb';
import { getBuyWithFiatQuote, getBuyWithFiatStatus } from 'thirdweb/pay';
import EsperanzaC from './Esperanza';
import { base } from 'thirdweb/chains';
import { getThirdwebClient } from '@/utils/createThirdwebClient';

// Constants
const USDC_ADDRESS = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"; // Base USDC
const USDC_DECIMALS = 6;
const MAX_USDC_PER_TX = 2500; // Maximum USD per onramp transaction
const USDC_ABI = [
  {
    "type": "function",
    "name": "balanceOf",
    "inputs": [{ "name": "account", "type": "address", "internalType": "address" }],
    "outputs": [{ "name": "", "type": "uint256", "internalType": "uint256" }],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "allowance",
    "inputs": [
      { "name": "owner", "type": "address", "internalType": "address" },
      { "name": "spender", "type": "address", "internalType": "address" }
    ],
    "outputs": [{ "name": "", "type": "uint256", "internalType": "uint256" }],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "approve",
    "inputs": [
      { "name": "spender", "type": "address", "internalType": "address" },
      { "name": "amount", "type": "uint256", "internalType": "uint256" }
    ],
    "outputs": [{ "name": "", "type": "bool", "internalType": "bool" }],
    "stateMutability": "nonpayable"
  }
] as const;
const client = getThirdwebClient();
const usdcContract = getContract({
  client,
  address: USDC_ADDRESS,
  chain: base,
  abi: USDC_ABI,
});

// Check environment variable for test mode
const IS_TEST_MODE = process.env.NEXT_PUBLIC_TEST_MODE === 'true';

// Utility to detect mobile devices
const isMobileDevice = () => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

function Minting({
  Batch,
  tokens,
  whitelist,
  referral,
  batchPrice,
  scrollToTop
}: {
  Batch: number,
  tokens: number,
  whitelist: boolean,
  referral: string,
  batchPrice: number,
  scrollToTop: () => void // Function to scroll the form to the top
}) {
  const wallet = useActiveWallet()?.getAccount();
  const address = useActiveAccount()?.address;
  const [modalIsOpen, setModalIsOpen] = useState(false);
  const [step, setStep] = useState<'init' | 'checking_balance' | 'insufficient_balance' | 'onramping' | 'checking_allowance' | 'approving' | 'minting' | 'success' | 'error'>('init');
  const [errorMessage, setErrorMessage] = useState('');
  const [transactionHash, setTransactionHash] = useState<string | null>(null);
  const [tokenContractAddress, setTokenContractAddress] = useState<string | null>(null);
  const [onrampProgress, setOnrampProgress] = useState<{ current: number; total: number }>({ current: 0, total: 0 });
  const [showConfirmClose, setShowConfirmClose] = useState(false);
  const [onrampLink, setOnrampLink] = useState<string | null>(null); // Store the onramp link for manual opening
  const isMounted = useRef(true);
  const [balanceChecked, setBalanceChecked] = useState(false);
  const onrampLinkRef = useRef<HTMLAnchorElement | null>(null);

  const client = createThirdwebClient({ clientId: "ab6db417866cf9cebd35c31f790e9806" });

  useEffect(() => {
    isMounted.current = true;
    if (modalIsOpen && step === 'init') {
      IS_TEST_MODE ? startTestModeProcess() : startTransactionProcess();
    }
    return () => {
      isMounted.current = false;
    };
  }, [modalIsOpen]);

  const makeAPICall = async (url: string, requestBody: { referralCode: any; customerWallet: string; tokenAmount: string; status: string }) => {
    try {
      await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });
    } catch (error) {
      console.error('Error making API call:', error);
    }
  };

  const pollStatus = async (intentId: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      const checkStatus = async () => {
        if (!isMounted.current) {
          reject(new Error("Modal closed"));
          return;
        }
        const fiatStatus = await getBuyWithFiatStatus({ client, intentId });
        if (fiatStatus.status === "ON_RAMP_TRANSFER_COMPLETED") {
          resolve();
        } else if (fiatStatus.status === "PAYMENT_FAILED" || fiatStatus.status === "ON_RAMP_TRANSFER_FAILED") {
          reject(new Error(`Onramp failed with status: ${fiatStatus.status}`));
        } else {
          setTimeout(checkStatus, 5000);
        }
      };
      checkStatus();
    });
  };

  const startTransactionProcess = async () => {
    if (!address || !wallet) {
      setErrorMessage("Please connect your wallet");
      setStep('error');
      return;
    }

    const confirmedURL = 'https://mint.thelochnessbotanicalsociety.com/referralPostback.php';
    if (referral) {
      await makeAPICall(confirmedURL, {
        referralCode: referral,
        customerWallet: address,
        tokenAmount: tokens.toString(),
        status: "0"
      });
    }

    setStep('checking_balance');
    try {
      const totalUSDC = BigInt(batchPrice) * BigInt(tokens);
      const balance = await readContract({
        contract: usdcContract,
        method: "balanceOf",
        params: [address],
      });

      setBalanceChecked(true);
      setStep('checking_balance');

      if (BigInt(balance) < totalUSDC) {
        await new Promise(resolve => setTimeout(resolve, 500));
        setStep('insufficient_balance');
        const usdcToOnramp = totalUSDC - BigInt(balance);
        const usdToOnramp = Number(usdcToOnramp) / 10 ** USDC_DECIMALS;
        const numTransactions = Math.ceil(usdToOnramp / MAX_USDC_PER_TX);
        setOnrampProgress({ current: 0, total: numTransactions });

        for (let i = 0; i < numTransactions; i++) {
          const chunkUSD = Math.min(MAX_USDC_PER_TX, usdToOnramp - (i * MAX_USDC_PER_TX));
          const chunkUSDC = BigInt(Math.round(chunkUSD * 10 ** USDC_DECIMALS));
          const quote = await getBuyWithFiatQuote({
            client,
            fromCurrencySymbol: "USD",
            toChainId: base.id,
            toAmount: ethers.formatUnits(chunkUSDC, USDC_DECIMALS),
            toTokenAddress: USDC_ADDRESS,
            toAddress: address,
            fromAddress: address,
          });
          if (!quote || !quote.onRampLink) {
            throw new Error(`Unable to fetch fiat quote or onRampLink for chunk ${i + 1}`);
          }
          console.log(`Onramp Link for chunk ${i + 1}:`, quote.onRampLink); // Debug log

          // Store the onramp link for manual opening
          setOnrampLink(quote.onRampLink);

          // Attempt to open the onramp link
          if (isMobileDevice()) {
            // On mobile, use window.open as a fallback
            const newWindow = window.open(quote.onRampLink, '_blank');
            if (!newWindow) {
              console.warn('Failed to open onramp link on mobile. Providing manual button.');
            }
          } else {
            // On desktop, use the hidden <a> tag
            if (onrampLinkRef.current) {
              onrampLinkRef.current.href = quote.onRampLink;
              onrampLinkRef.current.click();
            } else {
              console.warn('onrampLinkRef is not set. Falling back to window.open.');
              window.open(quote.onRampLink, '_blank');
            }
          }

          setStep('onramping');
          await pollStatus(quote.intentId);
          setOnrampProgress(prev => ({ ...prev, current: prev.current + 1 }));
          setOnrampLink(null); // Clear the link after completion
        }
      } else {
        await new Promise(resolve => setTimeout(resolve, 500));
        setStep('checking_allowance');
      }

      const allowance = await readContract({
        contract: usdcContract,
        method: "allowance",
        params: [address, contract.address],
      });
      if (BigInt(allowance) < totalUSDC) {
        await new Promise(resolve => setTimeout(resolve, 500));
        setStep('approving');
        await handleApproval(totalUSDC);
      }

      await new Promise(resolve => setTimeout(resolve, 500));
      setStep('minting');
      await handleMinting();
      setStep('success');
    } catch (error: any) {
      if (isMounted.current) {
        setErrorMessage(error.message || "An error occurred");
        setStep('error');
      }
    }
  };

  const handleApproval = async (amount: bigint) => {
    try {
      const transaction = prepareContractCall({
        contract: usdcContract,
        method: "approve",
        params: [contract.address, amount],
      });
      const receipt = await sendAndConfirmTransaction({ transaction, account: wallet! });
      if (receipt) setStep('minting');
    } catch (error: any) {
      throw new Error("Approval failed: " + (error.message || "Unknown error"));
    }
  };

  const handleMinting = async () => {
    const params: [bigint] = [BigInt(tokens)];
    const confirmedURL = 'https://mint.thelochnessbotanicalsociety.com/referralPostback.php';
    try {
      const transaction = prepareContractCall({ contract, method: "mint", params });
      const receipt = await sendAndConfirmTransaction({ transaction, account: wallet! });
      if (receipt && receipt.transactionHash) {
        setTransactionHash(receipt.transactionHash);
        setTokenContractAddress(receipt.to);
        if (referral) {
          await makeAPICall(confirmedURL, {
            referralCode: referral,
            customerWallet: address!,
            tokenAmount: tokens.toString(),
            status: "1"
          });
        }
      }
    } catch (error: any) {
      throw new Error("Minting failed: " + (error.message || "Unknown error"));
    }
  };

  const startTestModeProcess = async () => {
    if (!isMounted.current) return;

    setStep('checking_balance');
    await new Promise(resolve => setTimeout(resolve, 1000));
    setBalanceChecked(true);

    setStep('insufficient_balance');
    await new Promise(resolve => setTimeout(resolve, 1000));
    setOnrampProgress({ current: 0, total: 2 });
    setStep('onramping');
    for (let i = 0; i < 2; i++) {
      await new Promise(resolve => setTimeout(resolve, 1500));
      setOnrampProgress(prev => ({ ...prev, current: prev.current + 1 }));
    }

    setStep('checking_allowance');
    await new Promise(resolve => setTimeout(resolve, 1000));

    setStep('approving');
    await new Promise(resolve => setTimeout(resolve, 1500));

    setStep('minting');
    await new Promise(resolve => setTimeout(resolve, 1500));

    setTransactionHash('0xTestTransactionHash123');
    setTokenContractAddress('0xTestContractAddress456');
    setStep('success');
  };

  const transactionSteps = [
    { name: 'Check Balance', step: 'checking_balance' },
    { name: 'Onramp Funds', step: 'onramping' },
    { name: 'Check Allowance', step: 'checking_allowance' },
    { name: 'Approve', step: 'approving' },
    { name: 'Mint NFT', step: 'minting' },
  ];

  const renderProgressIndicator = () => {
    const currentIndex = transactionSteps.findIndex(s => s.step === step);
    const totalSteps = transactionSteps.length;
    const isBalanceChecked = step === 'checking_balance' && balanceChecked;
    const isComplete = step === 'success';

    const effectiveIndex = isComplete ? totalSteps - 1 : currentIndex;
    const completedWidth = effectiveIndex >= 0 ? ((effectiveIndex + 1) / totalSteps) * 100 : 0;
    const currentStepSegmentWidth = (1 / (totalSteps - 1)) * 100;

    return (
      <div className="w-full mb-8 pb-8 sm:mb-8 flex justify-center relative">
        <div className="relative w-[90%] max-w-[350px] sm:max-w-[400px]">
          <div className={`relative ${isComplete ? 'blur-sm' : ''}`}>
            <div
              className="absolute left-0 right-0 h-2 bg-gray-600 z-0"
              style={{ top: '12px' }}
            />
            <div
              className="absolute left-0 h-2 transition-all duration-500 ease-in-out z-1"
              style={{
                width: `${completedWidth}%`,
                backgroundColor: '#FF1493',
                top: '12px',
              }}
            />
            {effectiveIndex >= 0 && effectiveIndex < totalSteps - 1 && !isComplete && (
              <div
                className="absolute h-2 transition-all duration-500 ease-in-out z-2"
                style={{
                  left: `${(effectiveIndex / (totalSteps - 1)) * 100}%`,
                  width: `${currentStepSegmentWidth}%`,
                  backgroundColor: '#00B7EB',
                  top: '12px',
                }}
              />
            )}
            <div className="relative">
              {transactionSteps.map((s, index) => {
                const isActive = step === s.step;
                const isCompleted = index <= effectiveIndex || (index === 0 && isBalanceChecked);
                const position = (index / (totalSteps - 1)) * 100;
                return (
                  <div
                    key={index}
                    className="absolute flex flex-col items-center z-10"
                    style={{
                      left: `${position}%`,
                      transform: 'translateX(-50%)',
                      width: '50px',
                    }}
                  >
                    <div
                      className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs sm:text-sm font-semibold transition-all duration-300 ${isActive ? 'bg-[#00B7EB] text-white shadow-lg scale-110' : isCompleted ? 'bg-[#FF1493] text-white' : 'bg-gray-500 text-gray-200'
                        }`}
                    >
                      {isCompleted ? (
                        <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        index + 1
                      )}
                    </div>
                    <p className={`text-[10px] sm:text-xs mt-3 sm:mt-4 text-center ${isActive ? 'text-[#00B7EB] font-semibold' : isCompleted ? 'text-[#FF1493]' : 'text-gray-300'}`}>
                      {s.name}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
          {isComplete && (
            <div
              className="absolute inset-0 flex items-center justify-center backdrop-blur-md bg-black bg-opacity-30 rounded-lg z-20"
              style={{
                boxShadow: '0 0 20px rgba(0, 183, 235, 0.5)',
              }}
            >
              <span
                className="text-[#00B7EB] text-xl sm:text-2xl mt-6 sm:mt-8 font-bold animate-glow-ripple"
                style={{
                  textShadow: '0 0 10px #00B7EB, 0 0 20px #00B7EB, 0 0 30px #00B7EB',
                }}
              >
                Complete
              </span>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderModalContent = () => {
    switch (step) {
      case 'init':
        return <p className="text-center text-gray-100 text-base sm:text-lg pt-6 sm:pt-8">Starting transaction...</p>;
      case 'checking_balance':
        return <p className="text-center text-gray-100 text-base sm:text-lg pt-6 sm:pt-8">Checking your USDC balance...</p>;
      case 'insufficient_balance':
        return <p className="text-center text-gray-100 text-base sm:text-lg pt-6 sm:pt-8">Insufficient USDC balance. Preparing onramp...</p>;
      case 'onramping':
        return (
          <div className="text-center pt-6 sm:pt-8">
            <p className="text-gray-100 text-sm sm:text-md">
              {IS_TEST_MODE ? "Simulating payment..." : "Please complete the payment in the new tab."}
            </p>
            <p className="text-gray-300 text-xs sm:text-sm mt-2">
              Waiting for confirmation... Payment {onrampProgress.current} of {onrampProgress.total}
            </p>
            {onrampLink && !IS_TEST_MODE && (
              <div className="mt-4">
                <p className="text-gray-300 text-xs sm:text-sm mb-2">
                  If the payment page did not open, click below:
                </p>
                <a
                  href={onrampLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-blue-600 text-white px-4 py-2 rounded"
                >
                  Open Payment Page
                </a>
              </div>
            )}
          </div>
        );
      case 'checking_allowance':
        return <p className="text-center text-gray-100 text-base sm:text-lg pt-6 sm:pt-8">Checking USDC allowance...</p>;
      case 'approving':
        return (
          <div className="text-center pt-6 sm:pt-8">
            <p className="text-gray-100 text-base sm:text-lg">Approve USDC spending</p>
            <p className="text-gray-300 text-xs sm:text-sm mt-2">
              {IS_TEST_MODE ? "Simulating approval..." : "Please confirm the approval transaction in your wallet."}
            </p>
          </div>
        );
      case 'minting':
        return (
          <div className="text-center pt-6 sm:pt-8">
            <p className="text-gray-100 text-base sm:text-lg">Minting your NFT</p>
            <p className="text-gray-300 text-xs sm:text-sm mt-2">
              {IS_TEST_MODE ? "Simulating minting..." : "Please confirm the mint transaction in your wallet."}
            </p>
          </div>
        );
      case 'success':
        return (
          <div className="flex flex-col items-center space-y-4 pt-4 sm:pt-6 bg-black bg-opacity-30 backdrop-blur-md p-4 rounded-lg w-full">
            <p className="text-gray-100 text-base sm:text-lg">Congratulations on Minting a Grow Spot at</p>
            <img src="/tspomtm.png" alt="The Satellite Project Om Logo" className="w-64 sm:w-84 h-auto" />
            {transactionHash && (
              <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
                <a
                  href={IS_TEST_MODE ? "#" : `https://basescan.org/tx/${transactionHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-col items-center bg-[rgba(0,0,0,.5)] text-[0.5rem] sm:text-[0.5rem] text-[#00ccff] px-4 py-2 rounded-xl w-32"
                >
                  <img src="/etherscan.svg" alt="BaseScan" className="w-30 sm:w-25 h-auto mb-1 mt-1" />
                  <span>{IS_TEST_MODE ? "VIEW TRANSACTION" : "VIEW TRANSACTION"}</span>
                </a>
                <a
                  href={IS_TEST_MODE ? "#" : `https://digibazaar.io/base/collection/${tokenContractAddress}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-col items-center bg-[rgba(0,0,0,.5)] text-[0.5rem] sm:text-[0.5rem] text-[#F54029] px-4 py-2 rounded-xl w-32"
                >
                  <img src="/dbw.png" alt="DigiBazaar" className="w-30 sm:w-25 h-auto mb-1 mt-1" />
                  <span>{IS_TEST_MODE ? "VIEW COLLECTION" : "VIEW COLLECTION"}</span>
                </a>
              </div>
            )}
            {/* <EsperanzaC /> */}
          </div>
        );
      case 'error':
        return (
          <div className="flex flex-col items-center space-y-4 pt-6 sm:pt-8">
            <h2 className="text-gray-100 text-xl sm:text-2xl font-bold">Transaction Failed</h2>
            <p className="text-gray-100 text-base sm:text-lg">{errorMessage}</p>
            <button onClick={() => setModalIsOpen(false)} className="bg-orange-700 text-white px-4 py-2 rounded">
              Close
            </button>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col items-center justify-center p-0 sm:p-1">
      <button
        className="transaction-button"
        onClick={() => {
          scrollToTop(); // Scroll to the top of the form
          setModalIsOpen(true);
        }}
        disabled={modalIsOpen}
        style={{
          boxShadow: '0 0 10px #00ccff',
          minWidth: 'auto',
          padding: '0rem 1rem',
          height: '30px',
          color: 'white',
          opacity: '1',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          borderRadius: '5px',
        }}
      >
        Mint Now{IS_TEST_MODE ? " (Test Mode)" : ""}
      </button>

      <a
        ref={onrampLinkRef}
        href="#"
        target="_blank"
        rel="noopener noreferrer"
        style={{ display: 'none' }}
      >
        Onramp Link
      </a>

      {modalIsOpen && (
        <div
          className="fixed z-50 inset-0 min-h-400 flex flex-col justify-center items-center"
          style={{
            backdropFilter: 'blur(30px)',
            WebkitBackdropFilter: 'blur(30px)',
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
          }}
        >
          <div className="relative rounded-lg shadow-xl w-full max-w-[90%] sm:max-w-md mx-auto p-4 sm:p-6 bg-brand-500 bg-opacity-30 flex flex-col items-center max-h-[80vh] overflow-y-auto">
            {step !== 'success' && !showConfirmClose && (
              <button
                onClick={() => setShowConfirmClose(true)}
                className="absolute top-2 right-2 bg-brand-500 text-white rounded-full p-1"
                style={{ backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', backgroundColor: 'rgba(255, 255, 255, 0.1)' }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
            {step !== 'error' && renderProgressIndicator()}
            <div className="w-full flex-1 flex flex-col justify-center">
              {renderModalContent()}
            </div>
            {showConfirmClose && (
              <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-70">
                <div className="bg-brand-500 bg-opacity-70 p-4 rounded-lg text-white">
                  <p>Are you sure you want to cancel the transaction?</p>
                  <div className="flex justify-end space-x-2 mt-4">
                    <button onClick={() => setShowConfirmClose(false)} className="bg-blue-600 px-4 py-2 rounded">
                      No
                    </button>
                    <button
                      onClick={() => {
                        isMounted.current = false;
                        setModalIsOpen(false);
                        setShowConfirmClose(false);
                        setStep('init');
                        setErrorMessage('');
                        setOnrampProgress({ current: 0, total: 0 });
                      }}
                      className="bg-red-500 text-white px-4 py-2 rounded"
                    >
                      Yes
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default Minting;