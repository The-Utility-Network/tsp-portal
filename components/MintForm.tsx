'use client';
import Image from 'next/image';
import { ethers } from 'ethers';
import { useActiveAccount } from 'thirdweb/react';
import { useState, useEffect, useRef, ChangeEvent } from 'react';
import Minting from './mintButton';
import { getCurrentSupply, getBatchDetails } from '../primitives/TSPABI';
import ChevronDownIcon from '@heroicons/react/24/outline/ChevronDownIcon';
import MinusIcon from '@heroicons/react/24/outline/MinusIcon';
import PlusIcon from '@heroicons/react/24/outline/PlusIcon';

// Contract configuration
const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_MINT_CONTRACT;
const USDC_DECIMALS = 6;

// Parse the environment variable
const mintOpeningSoon = process.env.NEXT_PUBLIC_MINT_SOON === 'true';

export default function Form() {
  const activeAccount = useActiveAccount();
  const accountDisplay = activeAccount
    ? `${activeAccount.address.slice(0, 4)}...${activeAccount.address.slice(-4)}`
    : '';

  // State variables
  const [batch, setBatch] = useState<bigint | null>(null);
  const [tokens, setTokens] = useState<number>(1);
  const [pricePerToken, setPricePerToken] = useState<number>(0);
  const [referralCode, setReferralCode] = useState<string>('');
  const [whitelist, setWhitelist] = useState<boolean>(false);
  const [currentSupply, setCurrentSupply] = useState<number>(0);
  const [nfts, setNfts] = useState<any[]>([]);
  const [collectionDetails, setCollectionDetails] = useState<any>(null);
  const [batches, setBatches] = useState<BatchDetails[]>([]);
  const [isLoadingBatches, setIsLoadingBatches] = useState<boolean>(true);
  const [isLoadingPrice, setIsLoadingPrice] = useState<boolean>(false);
  const [isLoadingNfts, setIsLoadingNfts] = useState<boolean>(true);
  const [error, setError] = useState<string>('');


  // Ref for scrolling to the top
  const formRef = useRef<HTMLDivElement>(null);

  // Use useRef to manage the tap sound effect
  const tapSoundEffectRef = useRef<HTMLAudioElement | null>(null);

  // Function to scroll to the top of the form
  const scrollToTop = () => {
    if (formRef.current) {
      formRef.current.scrollTo(0, 0);
    }
  };

  // Initialize tap sound effect
  useEffect(() => {
    try {
      tapSoundEffectRef.current = new Audio('/static/sounds/tap.mp3');
    } catch (error) {
      console.error('Error loading tap sound effect:', error);
    }
  }, []);

  // Fetch NFTs and collection details using Alchemy API
  useEffect(() => {
    async function fetchNFTs() {
      if (!CONTRACT_ADDRESS) {
        setIsLoadingNfts(false);
        return;
      }

      try {
        // Fetch NFTs from Alchemy
        const response = await fetch(`/api/alchemy/collection?address=${CONTRACT_ADDRESS}`);
        if (response.ok) {
          const data = await response.json();
          // Transform Alchemy response to match expected format
          const nftData = (data.nfts || []).slice(0, 6).map((nft: any) => ({
            token: {
              tokenId: nft.tokenId,
              name: nft.name || nft.title || `Token #${nft.tokenId}`,
              image: nft.image?.cachedUrl || nft.image?.originalUrl || nft.raw?.metadata?.image || '',
            }
          }));
          setNfts(nftData);
        }

        // Fetch collection metadata from Alchemy
        const collectionResponse = await fetch(`/api/alchemy/metadata?address=${CONTRACT_ADDRESS}`);
        if (collectionResponse.ok) {
          const collectionData = await collectionResponse.json();
          setCollectionDetails({
            name: collectionData.name || collectionData.contractMetadata?.name || 'Collection',
            supply: collectionData.totalSupply || collectionData.contractMetadata?.totalSupply || '0',
            ownerCount: collectionData.contractMetadata?.deployedBlockNumber ? 'N/A' : 'N/A',
            floorAsk: { price: { amount: { usd: null } } } // Floor price not available from Alchemy
          });
        }
      } catch (error) {
        console.error('Error fetching NFTs or collection data:', error);
      } finally {
        setIsLoadingNfts(false);
      }
    }

    fetchNFTs();
  }, []);

  interface BatchDetails {
    id: number;
    maxSupply: number;
    currentSupply: number;
    price: number;
    isActive: boolean;
  }

  // Fetch batches
  useEffect(() => {
    async function fetchBatches() {
      try {
        let i = 0;
        let batchDetails = await getBatchDetails(BigInt(i));
        const batchDetailsArray: BatchDetails[] = [];

        while (batchDetails && batchDetails.maxSupply !== 0) {
          batchDetailsArray.push({
            id: i,
            maxSupply: Number(batchDetails.maxSupply),
            currentSupply: Number(batchDetails.currentSupply),
            price: Number(batchDetails.price),
            isActive: batchDetails.isActive,
          });
          i++;
          batchDetails = await getBatchDetails(BigInt(i));
        }
        console.log(batchDetailsArray);
        if (batchDetailsArray.length > 0) {
          console.log('Batch 1 Price (USDC wei):', batchDetailsArray[0].price);
        }

        setBatches(batchDetailsArray);

        const firstActiveBatch = batchDetailsArray.find(
          (batch) => batch.isActive && batch.currentSupply < batch.maxSupply
        );
        if (firstActiveBatch) {
          setBatch(BigInt(firstActiveBatch.id));
        }
      } catch (error) {
        console.error('Error fetching batches:', error);
        setError('Failed to load batches.');
      } finally {
        setIsLoadingBatches(false);
      }
    }

    fetchBatches();
  }, []);

  // Fetch current supply
  useEffect(() => {
    let isMounted = true;

    async function fetchCurrentSupply() {
      try {
        const supply = await getCurrentSupply();
        if (typeof supply === 'number' && isMounted) {
          setCurrentSupply(supply);
        }
      } catch (error) {
        if (isMounted) {
          console.error('Error getting current supply:', error);
          setError('Failed to get current supply.');
        }
      }
    }

    fetchCurrentSupply();

    return () => {
      isMounted = false;
    };
  }, []);

  // Fetch price per token
  useEffect(() => {
    async function fetchPricePerToken() {
      if (batch === null) return;

      setIsLoadingPrice(true);
      try {
        const batchDetails = await getBatchDetails(batch);
        if (batchDetails) {
          setPricePerToken(Number(batchDetails.price));
        } else {
          setPricePerToken(0);
          console.warn(`No details found for batch ${batch.toString()}`);
        }
      } catch (error) {
        console.error('Error fetching price per token:', error);
        setError('Failed to fetch price per token.');
        setPricePerToken(0);
      } finally {
        setIsLoadingPrice(false);
      }
    }

    if (batch !== null) {
      fetchPricePerToken();
    }
  }, [batch]);

  // Event handlers
  const handleWhitelistChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (tapSoundEffectRef.current) {
      tapSoundEffectRef.current.play().catch((error) => {
        console.error('Error playing tap sound:', error);
      });
    }
    setWhitelist(event.target.checked);
  };

  const incrementTokens = () => {
    if (tapSoundEffectRef.current) {
      tapSoundEffectRef.current.play().catch((error) => {
        console.error('Error playing tap sound:', error);
      });
    }
    setTokens((prevTokens) => prevTokens + 1);
  };

  const decrementTokens = () => {
    if (tapSoundEffectRef.current) {
      tapSoundEffectRef.current.play().catch((error) => {
        console.error('Error playing tap sound:', error);
      });
    }
    setTokens((prevTokens) => Math.max(1, prevTokens - 1));
  };

  function handleBatchChange(event: ChangeEvent<HTMLSelectElement>): void {
    const selectedBatchId = Number(event.target.value);
    setBatch(BigInt(selectedBatchId));
  }

  const getImageUrl = (url: string): string => {
    if (!url) return '/fallback-image.png';
    if (url.startsWith('ipfs://')) {
      return url.replace('ipfs://', 'https://ipfs.io/ipfs/');
    }
    return url;
  };

  // Format price with 2 decimal places
  const formatPrice = (wei: bigint) => {
    const formatted = ethers.formatUnits(wei, USDC_DECIMALS);
    return Number(formatted).toFixed(2);
  };

  return (
    <div
      ref={formRef}
      className="isolate space-y-3 sm:space-y-4 rounded-2xl shadow-2xl bg-brand-950/50 p-3 sm:p-4 md:p-6 w-full mx-auto border border-brand-500/20"
      style={{
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        maxHeight: '80vh',
        overflowY: 'auto',
      }}
    >
      {error && (
        <div className="bg-accent/80 text-white p-2 rounded-xl text-sm">{error}</div>
      )}

      {mintOpeningSoon ? (
        <div className="flex flex-col items-center space-y-6 pb-2 h-100">
          <div className="w-full h-[232px] sm:h-[342px] bg-black rounded-xl flex items-center justify-center">
            <iframe
              className="w-full h-full rounded-xl"
              src="https://www.youtube.com/embed/c_d5OMuLU04?controls=1"
              title="YouTube video player"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            ></iframe>
          </div>
          <div className="text-xl sm:text-2xl font-bold text-white text-center">
            Mint Opening Soon!
          </div>
          <button
            className="bg-accent hover:bg-accent/80 text-white py-3 px-6 rounded-xl shadow-[0_0_15px_rgba(255,105,180,0.4)] transition-all"
            onClick={() =>
              window.open(
                'https://docs.thelochnessbotanicalsociety.com',
                '_blank'
              )
            }
          >
            Read the Whitepaper
          </button>
        </div>
      ) : (
        <>
          <div className="relative rounded-xl px-3 pb-1.5 pt-2.5 ring-1 ring-inset ring-brand-300 focus-within:z-10 focus-within:ring-2 focus-within:ring-brand-500 flex flex-col sm:flex-row justify-between items-center space-y-2 sm:space-y-0">
            <div className="text-center sm:text-left">
              <label
                htmlFor="account"
                className="block text-xs sm:text-sm font-medium text-brand-100"
              >
                Account
              </label>
              <div
                id="account"
                className="block w-full border-0 bg-transparent text-brand-100 placeholder:text-brand-400 text-sm sm:text-base"
              >
                {activeAccount ? accountDisplay : '--'}
              </div>
            </div>
            <div className="text-center">
              <label
                htmlFor="mintedTokens"
                className="block text-xs sm:text-sm font-medium text-brand-100"
              >
                Minted Tokens
              </label>
              <div
                id="mintedTokens"
                className="block w-full border-0 bg-transparent text-brand-100 placeholder:text-brand-400 text-sm sm:text-base"
              >
                {currentSupply} / 1460
              </div>
            </div>
            <div className="text-center sm:text-right">
              <label
                htmlFor="batches"
                className="block text-xs sm:text-sm font-medium text-brand-100"
              >
                Batches
              </label>
              <div className="flex space-x-2 py-2">
                {batches.map((batchItem) => (
                  <div
                    key={batchItem.id}
                    className="h-2 w-2 rounded-full"
                    style={{
                      backgroundColor:
                        batchItem.isActive &&
                          batchItem.currentSupply < batchItem.maxSupply
                          ? '#00ccff'
                          : '#ff69b4',
                    }}
                    title={`Batch ${batchItem.id} ${batchItem.currentSupply === batchItem.maxSupply
                      ? '(Sold Out)'
                      : batchItem.isActive
                        ? ''
                        : '(Coming Soon)'
                      }`}
                  ></div>
                ))}
              </div>
            </div>
          </div>

          {/* NFT Gallery with skeleton loaders */}
          <div className="flex space-x-4 overflow-x-auto py-2 min-h-[160px] sm:min-h-[180px]">
            {isLoadingNfts ? (
              // Skeleton loaders
              [...Array(6)].map((_, index) => (
                <div
                  key={index}
                  className="flex-shrink-0 flex flex-col items-center justify-center bg-brand-900/50 rounded-xl p-2 w-32 sm:w-40 md:w-48 animate-pulse"
                >
                  <div className="w-full aspect-square bg-brand-700/50 rounded-lg" />
                  <div className="h-4 bg-brand-700/50 rounded w-3/4 mt-2" />
                  <div className="h-3 bg-brand-700/50 rounded w-1/2 mt-1" />
                </div>
              ))
            ) : nfts.length > 0 ? (
              nfts.map((nft, index) => (
                <a
                  key={index}
                  href={`https://digibazaar.io/base/asset/${CONTRACT_ADDRESS}:${nft.token.tokenId}?tab=info`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-shrink-0 flex flex-col items-center justify-center bg-brand-900 rounded-xl p-2 shadow-lg transition-transform transform hover:scale-105 w-32 sm:w-40 md:w-48"
                >
                  <img
                    src={getImageUrl(nft.token.image) || '/fallback-image.png'}
                    alt={nft.token.name || `NFT ${nft.token.tokenId}`}
                    width="120"
                    height="120"
                    className="w-full h-full object-cover rounded-lg grayscale hover:grayscale-0"
                    loading="lazy"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/fallback-image.png';
                    }}
                  />
                  <div
                    className="text-brand-100 mt-2 text-center truncate w-full text-xs sm:text-sm"
                    title={nft.token.name}
                  >
                    {nft.token.name}
                  </div>
                  <div className="flex justify-between w-full px-2 mt-1">
                    <span className="text-brand-100 text-xs flex items-center">
                      <span className="h-2 w-2 bg-brand-400 rounded-full mr-1"></span>
                      Live
                    </span>
                    <span className="text-brand-100 text-xs">
                      ID: {nft.token.tokenId}
                    </span>
                  </div>
                </a>
              ))
            ) : (
              // Empty state
              <div className="flex items-center justify-center w-full text-brand-400 text-sm">
                No NFTs found
              </div>
            )}
          </div>

          {collectionDetails && (
            <div className="flex flex-col justify-between items-center mt-4 px-3 pb-1.5 pt-2.5 ring-1 ring-inset ring-brand-300 rounded-xl">
              <div className="flex flex-col sm:flex-row justify-between w-full space-y-2 sm:space-y-0">
                <div className="text-brand-100 text-center sm:text-left text-xs sm:text-sm">
                  <span>Holders: {collectionDetails.ownerCount}</span>
                </div>
                <div className="text-brand-100 text-center text-xs sm:text-sm">
                  <span>Collection Size: {collectionDetails.supply}</span>
                </div>
                <div className="text-brand-100 text-center sm:text-right text-xs sm:text-sm">
                  <span>
                    Floor Price:{' '}
                    {collectionDetails.floorAsk?.price?.amount?.usd
                      ? `$${Number(
                        collectionDetails.floorAsk.price.amount.usd
                      ).toFixed(2)}`
                      : 'N/A'}
                  </span>
                </div>
              </div>
              <div className="flex flex-col w-full justify-center mt-4 space-y-2">
                <a
                  href={`https://digibazaar.io/base/collection/${CONTRACT_ADDRESS}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:bg-brand-800 text-white py-2 px-4 sm:px-6 rounded-full hover:bg-opacity-60 ring-1 ring-inset ring-brand-300 hover:ring-brand-100 flex items-center space-x-2 transition-colors duration-200 justify-center min-w-0"
                >
                  <img
                    src="/dbw.png"
                    alt="DigiBazaar Logo"
                    className="h-5 sm:h-6"
                  />
                  <span
                    className="text-brand-100 truncate flex-0 text-xs sm:text-sm"
                    title={`Shop the Collection: ${collectionDetails.name}`}
                  >
                    Shop the Collection: {collectionDetails.name}
                  </span>
                </a>
                <a
                  href={`https://basescan.org/address/${CONTRACT_ADDRESS}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:bg-brand-800 text-white py-2 px-4 sm:px-6 rounded-full hover:bg-opacity-60 ring-1 ring-inset ring-brand-300 hover:ring-brand-100 flex items-center space-x-2 transition-colors duration-200 justify-center"
                >
                  <img
                    src="/etherscan.svg"
                    alt="BaseScan Logo"
                    className="h-5 sm:h-6"
                  />
                  <span className="text-brand-100 text-xs sm:text-sm">View on BaseScan</span>
                </a>
              </div>
            </div>
          )}

          <div className="relative rounded-xl px-3 pb-1.5 pt-2.5 ring-1 ring-inset ring-brand-300 focus-within:z-10 focus-within:ring-2 focus-within:ring-brand-500">
            <label
              htmlFor="batch"
              className="block text-center text-xs sm:text-sm font-medium text-brand-100"
            >
              Batch
            </label>
            <div
              className="relative"
              onClick={() => {
                if (tapSoundEffectRef.current) {
                  tapSoundEffectRef.current.play().catch((error) => {
                    console.error('Error playing tap sound:', error);
                  });
                }
              }}
            >
              <select
                name="batch"
                id="batch"
                className="block w-full border-0 bg-brand-800 bg-opacity-60 text-brand-100 placeholder:text-brand-400 focus:ring-0 text-sm sm:text-base rounded-lg appearance-none pr-8"
                onChange={handleBatchChange}
                value={batch !== null ? batch.toString() : ''}
                disabled={isLoadingBatches}
              >
                <option value="" disabled>
                  Select a Batch
                </option>
                {batches.map((batchItem) => (
                  <option
                    key={batchItem.id}
                    value={batchItem.id}
                    disabled={
                      !batchItem.isActive ||
                      batchItem.currentSupply >= batchItem.maxSupply
                    }
                  >
                    {`Batch ${batchItem.id} ${batchItem.currentSupply >= batchItem.maxSupply
                      ? '(Sold Out)'
                      : batchItem.isActive
                        ? ''
                        : '(Coming Soon)'
                      }`}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-white">
                <ChevronDownIcon className="h-4 w-4 sm:h-5 sm:w-5" />
              </div>
            </div>
            {isLoadingBatches && (
              <div className="text-brand-100 text-xs sm:text-sm mt-2">
                Loading batches...
              </div>
            )}
          </div>

          <div className="relative rounded-xl px-3 pb-1.5 pt-2.5 ring-1 ring-inset ring-brand-300 focus-within:z-10 focus-within:ring-2 focus-within:ring-brand-500">
            <label
              htmlFor="tokens"
              className="block text-center text-xs sm:text-sm font-medium text-brand-100"
            >
              Number of Tokens
            </label>
            <div className="relative">
              <input
                type="number"
                name="tokens"
                id="tokens"
                className="block w-full border-0 bg-brand-800 bg-opacity-60 text-brand-100 placeholder:text-brand-400 focus:ring-0 text-sm sm:text-base rounded-lg text-center"
                placeholder="1"
                value={tokens}
                onChange={(e) => {
                  const value = Number(e.target.value);
                  if (value >= 1 && value <= 10) {
                    setTokens(value);
                  }
                }}
                min={1}
                max={10}
              />
              <button
                type="button"
                className="absolute top-0 left-0 mt-2.5 ml-2 text-brand-100"
                onClick={decrementTokens}
                aria-label="Decrement Tokens"
              >
                <MinusIcon className="h-4 w-4 sm:h-5 sm:w-5" />
              </button>
              <button
                type="button"
                className="absolute top-0 right-0 mt-2.5 mr-2 text-brand-100"
                onClick={incrementTokens}
                aria-label="Increment Tokens"
              >
                <PlusIcon className="h-4 w-4 sm:h-5 sm:w-5" />
              </button>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row justify-between items-stretch space-y-2 sm:space-y-0 sm:space-x-4">
            <div className="flex-grow relative rounded-xl px-3 pb-1.5 pt-2.5 ring-1 ring-inset ring-brand-300 focus-within:z-10 focus-within:ring-2 focus-within:ring-brand-500">
              <label
                htmlFor="referral"
                className="block text-center text-xs sm:text-sm font-medium text-brand-100"
              >
                Referral Code
              </label>
              <input
                id="referral"
                className="block w-full h-auto border-0 bg-brand-800 bg-opacity-60 text-brand-100 placeholder:text-brand-400 focus:ring-0 text-sm sm:text-base rounded-lg"
                placeholder="Enter Code"
                value={referralCode}
                onChange={(e) => setReferralCode(e.target.value)}
              />
            </div>
            <div className="flex-grow relative rounded-xl px-3 pb-1.5 pt-2.5 ring-1 ring-inset ring-brand-300">
              <label
                htmlFor="price"
                className="block text-center text-xs sm:text-sm font-medium text-brand-100"
              >
                Price
              </label>
              <input
                id="price"
                className="block w-full h-auto text-brand-100 text-sm sm:text-base rounded-lg font-bold bg-brand-800 bg-opacity-60 p-2 pr-2 text-right"
                type="text"
                readOnly
                value={
                  isLoadingPrice
                    ? 'Loading...'
                    : pricePerToken > 0
                      ? `${formatPrice(BigInt(tokens * pricePerToken))}`
                      : 'N/A'
                }
              />
              <img
                src="/usdc.svg"
                alt="USDC symbol"
                className="absolute top-1/2 translate-y-1/4 left-6 transform h-4 w-4"
              />
            </div>
          </div>

          <div className="relative rounded-lg flex items-center px-3 pb-1.5 pt-1.5 ring-1 ring-inset ring-brand-300 focus-within:z-10 focus-within:ring-2 focus-within:ring-brand-500">
            <input
              type="checkbox"
              name="whitelist"
              id="whitelist"
              className="h-4 w-4 rounded border-brand-300 text-brand-600 focus:ring-0 rounded-lg"
              checked={whitelist}
              onChange={handleWhitelistChange}
            />
            <label
              htmlFor="whitelist"
              className="ml-3 block text-xs sm:text-sm font-medium text-brand-100"
            >
              Whitelist
            </label>
          </div>

          <div className="flex flex-row justify-center flex-nowrap rounded-2xl">
            <div className="w-auto p-2 text-xs sm:text-sm md:text-base rounded-2xl">
              <Minting
                Batch={batch !== null ? Number(batch) : 0}
                tokens={tokens}
                whitelist={whitelist}
                referral={referralCode}
                batchPrice={pricePerToken}
                scrollToTop={scrollToTop} // Pass the scrollToTop function to Minting
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}