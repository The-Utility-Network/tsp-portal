'use client';

import React, { useState, useEffect, useRef } from "react";
import cytoscape from "cytoscape";
import { ethers } from "ethers";
import { getFacets } from "../primitives/Diamond";
import {
  ArrowUpIcon,
  ArrowDownIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  PlusIcon,
  MinusIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/solid";
import Directory from "./Directory"; // Import the Directory component
import Mythology from "./Mythology"; // Import the Mythology component
import Principles from "./Principles"; // Import the Principles component
import Reserve from "./Reserve"; // Import the Reserve component
import SignatureBuilder from "./SignatureBuilder"; // Import the SignatureBuilder component
import { styled } from "@mui/material";
import { getContract, readContract } from "thirdweb";
import { base } from "thirdweb/chains";
import { useActiveAccount } from "thirdweb/react";
import { getThirdwebClient } from "../src/utils/createThirdwebClient";
import { diamondAddress } from "../primitives/Diamond";

// Define the structure of a Facet
interface Facet {
  facetAddress: string;
  selectors: string[];
}

// Throttle helper: creates a delay
function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Helper to manage localStorage cache
const cacheKey = "facetCache";

export function readCache() {
  const cache = localStorage.getItem(cacheKey);
  return cache ? JSON.parse(cache) : { contractNames: {}, methodNames: {}, abis: {} };
}

export function writeCache(cache: any) {
  localStorage.setItem(cacheKey, JSON.stringify(cache));
}

// Classify methods into read or write
function classifyMethods(abi: any[], selectors: string[]) {
  const readMethods: string[] = [];
  const writeMethods: string[] = [];

  const iface = new ethers.Interface(abi);
  for (const selector of selectors) {
    try {
      const method = iface.getFunction(selector);
      if (method) {
        if (method.stateMutability === "view" || method.stateMutability === "pure") {
          readMethods.push(method.name);
        } else {
          writeMethods.push(method.name);
        }
      }
    } catch (error) {
      console.error(`Error classifying selector ${selector}:`, error);
    }
  }

  return { readMethods, writeMethods };
}

// Fetch ABI and Contract Name Functions (With LocalStorage Cache)
async function fetchABIFromBaseScan(address: string, apiKey: string, cache: any) {
  if (cache.abis[address]) return cache.abis[address];

  await delay(600); // Increased delay to 600ms to further prevent rate limits
  try {
    const response = await fetch(
      `https://api.etherscan.io/v2/api?chainid=8453&module=contract&action=getabi&address=${address}&apikey=${apiKey}`
    );
    const data = await response.json();
    if (data.status === "1") {
      try {
        const abi = JSON.parse(data.result);
        cache.abis[address] = abi;
        writeCache(cache);
        return abi;
      } catch (parseError) {
        console.error(`Error parsing ABI for ${address}:`, parseError);
        return null;
      }
    } else if (data.status === "0") {
      console.error(`Error fetching ABI for ${address}: ${data.result}`);
    }
  } catch (error) {
    console.error(`Network error fetching ABI for ${address}:`, error);
  }
  return null;
}

async function fetchContractNameFromBaseScan(
  address: string,
  apiKey: string,
  cache: any
) {
  console.log(`Fetching contract name for address: ${address}`); // Log address

  if (cache.contractNames[address]) {
    console.log(`Contract name found in cache for address: ${address}`);
    return cache.contractNames[address];
  }

  try {
    await delay(600); // Increased delay to 600ms
    const response = await fetch(
      `https://api.etherscan.io/v2/api?chainid=8453&module=contract&action=getsourcecode&address=${address}&apikey=${apiKey}`
    );
    const data = await response.json();

    console.log(
      `Response from BaseScan for address ${address}:`,
      data
    ); // Log the full API response

    if (
      data.status === "1" &&
      data.result &&
      Array.isArray(data.result) &&
      data.result[0]?.ContractName
    ) {
      const contractName = data.result[0].ContractName;
      cache.contractNames[address] = contractName; // Cache the contract name
      writeCache(cache); // Persist cache
      return contractName;
    } else {
      console.error(
        `Error: Unexpected response or missing contract name for ${address}. Result: ${JSON.stringify(data.result)}`
      );
    }
  } catch (error) {
    console.error(
      `Error fetching contract name from BaseScan for ${address}:`,
      error
    );
  }

  return "Unknown Contract"; // Return default if no contract name is found
}

// Generate a random color
function getRandomColor() {
  const letters = "0123456789ABCDEF";
  let color = "#";
  for (let i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 16)];
  }
  return color;
}

async function processFacets(
  formattedFacets: Facet[],
  apiKey: string,
  cache: any
) {
  const methodNamesLookup: {
    [key: string]: { readMethods: string[]; writeMethods: string[] };
  } = {};
  const facetNamesLookup: { [key: string]: string } = {};

  for (let i = 0; i < formattedFacets.length; i++) {
    const facet = formattedFacets[i];
    const facetAddress = facet.facetAddress;

    try {
      console.log(`Processing facet address: ${facet.facetAddress}`);

      const contractName = await fetchContractNameFromBaseScan(
        facet.facetAddress,
        apiKey,
        cache
      );
      if (!contractName || contractName === "Unknown Contract") {
        console.warn(
          `Skipping facet address ${facetAddress} due to missing or unknown contract name`
        );
        continue; // Skip to the next facet if contract name is missing
      }

      facetNamesLookup[facet.facetAddress] = contractName;

      const abi = await fetchABIFromBaseScan(
        facet.facetAddress,
        apiKey,
        cache
      );
      if (!abi) {
        console.warn(
          `Skipping facet address ${facetAddress} due to missing ABI`
        );
        methodNamesLookup[facet.facetAddress] = { readMethods: [], writeMethods: [] };
        continue; // Skip to the next facet if ABI is missing
      }

      const { readMethods, writeMethods } = classifyMethods(abi, facet.selectors);
      methodNamesLookup[facet.facetAddress] = { readMethods, writeMethods };
    } catch (error) {
      console.error(`Error processing facet at ${facetAddress}:`, error);
      continue; // Continue with the next facet on error
    }

    await delay(600); // Increased delay to further prevent rate limits
  }

  return { methodNamesLookup, facetNamesLookup };
}

// Map control increments
const PAN_STEP = 100; // Number of pixels to pan
const ZOOM_STEP = 0.2; // Zoom step for in/out

// Flashlight size options (like the time on financial charts)
const FLASHLIGHT_SIZES = {
  "5m": 100,
  "10m": 200,
  "30m": 400,
  "1hr": 800,
};

interface MySpotPanelProps {
  directoryFacetAddress: string;
  p0: string;
  cache: any;
}

// Loading Animation Component (Pulsar)
const LoadingAnimation: React.FC = () => {
  return (
    <div className="loader-container">
      <div className="pulsar">
        <div className="pulse"></div>
        <div className="pulse"></div>
        <div className="pulse"></div>
      </div>
      <div className="loading-text">Diamond Viewer loading...</div>
      <style jsx>{`
        .loader-container {
          display: flex;
          justify-content: center;
          align-items: center;
          height: 100vh;
          background-color: rgba(0, 0, 0, 0.8);
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          z-index: 1000;
        }

        .pulsar {
          position: relative;
          width: 100px;
          height: 100px;
        }

        .pulse {
          position: absolute;
          border: 4px solid #666666;
          opacity: 0.6;
          border-radius: 50%;
          animation: pulsate 1.5s infinite ease-in-out;
        }

        .pulse:nth-child(2) {
          animation-delay: 0.5s;
        }

        .pulse:nth-child(3) {
          animation-delay: 1s;
        }

        @keyframes pulsate {
          0% {
            top: 0;
            left: 0;
            width: 100px;
            height: 100px;
            opacity: 0.6;
          }
          50% {
            top: -10px;
            left: -10px;
            width: 120px;
            height: 120px;
            opacity: 0;
          }
          100% {
            top: 0;
            left: 0;
            width: 100px;
            height: 100px;
            opacity: 0.6;
          }
        }
      `}</style>
    </div>
  );
};

// Styled Components
const Container = styled("div")<{ isMobile: boolean }>(({ theme, isMobile }) => ({
  backgroundColor: "#0D0D0D",
  top: isMobile ? "8vh" : "0vh", // Use isMobile prop to switch between mobile and desktop
  maxHeight: "100vh",
  minHeight: "100vh",
  marginBottom: "10vh",
  padding: theme.spacing(2),
  color: "#FFFFFF",
  position: "relative",
  overflow: "hidden", // To contain particle background
  display: "flex",
  flexDirection: "column",
}));

// Removed StyledTabs and StyledTab as they were commented out and possibly unused.

const ContentArea = styled("div")<{ fontFamily: string }>(({ theme, fontFamily }) => ({
  borderRadius: "12px",
  padding: theme.spacing(2),
  flexGrow: 1,
  overflowY: "auto",
  marginLeft: "1%",
  marginRight: "1%",
  width: "98%",
  fontFamily: fontFamily, // Dynamic font
  lineHeight: 1.5, // Set line spacing to 1.5
  fontSize: "1rem",
  color: "#E0E0E0",
  marginTop: theme.spacing(2),
  border: "1px solid rgba(255, 255, 255, 0.2)",
  boxShadow: "0 0 10px #666666", // Neon glow
  zIndex: 2,
  "& p": {
    textIndent: "1.5em", // Add indentation before each paragraph
    marginBottom: "1em",
  },
}));

const SelectionControls = styled("div")(({ theme }) => ({
  display: "flex",
  flexWrap: "wrap",
  gap: theme.spacing(2),
  marginBottom: theme.spacing(2),
  alignItems: "center",
  zIndex: 2,
}));

const ThemeControls = styled("div")(({ theme }) => ({
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  gap: theme.spacing(2),
  marginBottom: theme.spacing(2),
  zIndex: 2,
}));

// Styled Accordion with Cyberpunk Theme
const StyledAccordion = styled("div")(({ theme }) => ({
  backgroundColor: "rgba(30, 30, 30, 0.9)",
  border: "1px solid #666666",
  borderRadius: "8px",
  marginLeft: "1%",
  marginRight: "1%",
  width: "98%",
  marginBottom: "1%",
  boxShadow: "0 0 10px #666666",
  color: "#E0E0E0",
  padding: "10px",
}));

// Styled Image with Cyberpunk Aesthetics
const StyledImage = styled("img")(({ theme }) => ({
  width: "100%",
  maxHeight: "400px",
  objectFit: "contain",
  borderRadius: "8px",
  boxShadow: "0 0 20px #666666",
  transition: "transform 0.3s, box-shadow 0.3s",
  "&:hover": {
    transform: "scale(1.02)",
    boxShadow: "0 0 30px #666666",
  },
}));

const ColorOption = styled("div")<{ color: string; selected: boolean }>(
  ({ color, selected }) => ({
    backgroundColor: color,
    width: "24px",
    height: "24px",
    borderRadius: "50%",
    border: selected ? `2px solid #666666` : "1px solid #ccc",
    cursor: "pointer",
    transition: "transform 0.2s, border 0.2s",
    "&:hover": {
      transform: "scale(1.2)",
    },
  })
);

const StyledSelectComponent = styled("select")(({ theme }) => ({
  color: "#FFFFFF",
  backgroundColor: "rgba(30, 30, 30, 0.8)",
  borderRadius: "8px",
  padding: "8px",
  border: "1px solid #666666",
  "&:focus": {
    outline: "none",
    borderColor: "#666666",
  },
  minWidth: "120px",
}));

const StyledSliderComponent = styled("input")(({ theme }) => ({
  width: "100px",
  appearance: "none",
  height: "8px",
  borderRadius: "5px",
  background: "#d3d3d3",
  outline: "none",
  opacity: 0.7,
  transition: "opacity .2s",
  "&:hover": {
    opacity: 1,
  },
  "&::-webkit-slider-thumb": {
    appearance: "none",
    width: "16px",
    height: "16px",
    borderRadius: "50%",
    background: "#666666",
    cursor: "pointer",
  },
  "&::-moz-range-thumb": {
    width: "16px",
    height: "16px",
    borderRadius: "50%",
    background: "#666666",
    cursor: "pointer",
  },
}));

const StyledTextField = styled("input")(({ theme }) => ({
  backgroundColor: "rgba(30, 30, 30, 0.8)",
  color: "#E0E0E0",
  fontFamily: "inherit",
  border: "1px solid #666666",
  borderRadius: "8px",
  padding: "10px",
  marginBottom: "10px",
  width: "100%",
  "&:focus": {
    outline: "none",
    borderColor: "#666666",
  },
}));

const MediaPreviewContainer = styled("div")(({ theme }) => ({
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  marginTop: theme.spacing(1),
}));

const PreviewImage = styled("img")(({ theme }) => ({
  maxWidth: "100%",
  maxHeight: "300px", // Restrict image height
  borderRadius: "8px",
  boxShadow: "0 0 10px #666666",
  objectFit: "contain",
}));

const PlaceholderText = styled("p")(({ theme }) => ({
  color: "#AAAAAA",
  fontStyle: "italic",
  textAlign: "center",
  marginTop: theme.spacing(2),
}));

const PublisherContainer = styled("div")(({ theme }) => ({
  overflowY: "auto", // Make the write section scrollable
  maxHeight: "80vh", // Adjust as needed
  paddingRight: theme.spacing(1),
}));

// Define background and text colors
type BackgroundType = "dark" | "light" | "sepia";

const backgroundColors: Record<BackgroundType, string> = {
  dark: "rgba(20, 20, 20, 0.8)",
  light: "rgba(245, 245, 245, 0.8)",
  sepia: "rgba(242, 224, 195, 0.8)",
};

const textColors: Record<string, string> = {
  white: "#FFFFFF",
  black: "#000000",
  gray: "#808080",
  red: "#FF0000",
  green: "#00FF00",
  blue: "#0000FF",
};

// Utility function to truncate text
const truncate = (text: string, maxLength: number) => {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + "...";
};

// Main Component
const MySpotPanel: React.FC<MySpotPanelProps> = ({
  directoryFacetAddress,
  p0,
  cache,
}) => {
  const [isPopupOpen, setIsPopupOpen] = useState(true); // For showing the popup
  const [viewDiamondViewer, setViewDiamondViewer] = useState(false); // Whether to show the Cytoscape interface
  const [viewDirectory, setViewDirectory] = useState(false);
  const [viewMythology, setViewMythology] = useState(false);
  const [viewPrinciples, setViewPrinciples] = useState(false);
  const [viewReserve, setViewReserve] = useState(false);
  const [viewSignatureBuilder, setViewSignatureBuilder] = useState(false);
  const [hasSignatureBuilderAccess, setHasSignatureBuilderAccess] = useState<boolean>(false);
  const [facets, setFacets] = useState<Facet[]>([]);
  const [methodNames, setMethodNames] = useState<{
    [key: string]: { readMethods: string[]; writeMethods: string[] };
  }>({});
  const [facetNames, setFacetNames] = useState<{ [key: string]: string }>({});
  const [transactionCount, setTransactionCount] = useState<number | null>(
    null
  ); // Store transaction count
  const [lastActivityTime, setLastActivityTime] = useState<string | null>(
    null
  ); // Store last activity time
  const [isLoading, setIsLoading] = useState<boolean>(true); // Loading state
  const [balance, setBalance] = useState<string | null>(null); // Store contract balance

  const activeAccount = useActiveAccount();
  const apiKey = process.env.NEXT_PUBLIC_EXPLORER_API_KEY as string;
  const contractAddress = process.env.NEXT_PUBLIC_DIAMOND_ADDRESS;

  // Validate environmental variables
  useEffect(() => {
    if (!apiKey) {
      console.error("NEXT_PUBLIC_EXPLORER_API_KEY environment variable is not set.");
    }
    if (!contractAddress) {
      console.error("NEXT_PUBLIC_DIAMOND_ADDRESS environment variable is not set.");
    }
  }, [apiKey, contractAddress]);

  const cyRef = useRef<HTMLDivElement | null>(null); // Use ref to access the container
  const cyInstance = useRef<cytoscape.Core | null>(null); // Reference for the Cytoscape instance
  const flashlightRef = useRef<HTMLDivElement | null>(null); // For flashlight effect
  const [flashlightPos, setFlashlightPos] = useState({ x: 0, y: 0 });
  const [flashlightSize, setFlashlightSize] = useState(
    FLASHLIGHT_SIZES["30m"]
  ); // Default size is 30m
  const [isMobile, setIsMobile] = useState(false);

  // Detect if the device is mobile
  useEffect(() => {
    if (typeof window !== "undefined" && typeof navigator !== "undefined") {
      setIsMobile(/Mobi|Android|iPhone|iPad/i.test(navigator.userAgent));
    }
  }, []);

  const handleTouchMove = (event: React.TouchEvent) => {
    const touch = event.touches[0]; // Get the first touch point
    setFlashlightPos({ x: touch.clientX, y: touch.clientY });
  };

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true); // Start loading

      const fetchContractBalance = async (contractAddress: string) => {
        try {
          const response = await fetch(
            `https://api.etherscan.io/v2/api?chainid=8453&module=account&action=balance&address=${contractAddress}&apikey=${apiKey}`
          );
          const data = await response.json();
          if (data.status === "1") {
            setBalance(ethers.formatEther(data.result)); // Convert Wei to Ether
          } else {
            console.error(`Error fetching balance: ${data.result}`);
          }
        } catch (error) {
          console.error("Error fetching contract balance:", error);
        }
      };

      // Fetch contract data (transaction count and last activity)
      const fetchContractData = async (contractAddress: string) => {
        try {
          const response = await fetch(
            `https://api.etherscan.io/v2/api?chainid=8453&module=account&action=txlist&address=${contractAddress}&apikey=${apiKey}`
          );
          const data = await response.json();
          if (data.status === "1" && data.result.length > 0) {
            setTransactionCount(data.result.length); // Number of transactions
            setLastActivityTime(
              new Date(
                parseInt(data.result[data.result.length - 1].timeStamp, 10) *
                1000
              ).toLocaleString()
            ); // Last activity time
          } else if (data.status === "1" && data.result.length === 0) {
            setTransactionCount(0);
            setLastActivityTime("No transactions yet.");
          } else {
            console.error(
              `Error fetching transactions: ${data.result}`
            );
          }
        } catch (error) {
          console.error(
            "Error fetching transaction count or last activity:",
            error
          );
        }
      };

      const currentCache = readCache();

      try {
        const data = await getFacets();
        const formattedFacets = data.map(
          (facet: { target: string; selectors: readonly `0x${string}`[] }) => ({
            facetAddress: facet.target as `0x${string}`,
            selectors: Array.from(facet.selectors),
          })
        );

        setFacets(formattedFacets);

        const {
          methodNamesLookup,
          facetNamesLookup,
        } = await processFacets(formattedFacets, apiKey, currentCache);

        setMethodNames(methodNamesLookup);
        setFacetNames(facetNamesLookup);

        // Fetch transaction count and last activity for the main contract (first facet)
        if (formattedFacets.length > 0) {
          await fetchContractData(formattedFacets[0].facetAddress);
          await fetchContractBalance(formattedFacets[0].facetAddress); // Fetch contract balance
        }

        setIsLoading(false); // Data loaded
      } catch (error) {
        console.error(
          "Error fetching facets, method names, or contract names:",
          error
        );
        setIsLoading(false); // Even on error, stop loading to prevent infinite spinner
      }
    };

    fetchData();
  }, [apiKey, contractAddress]);

  // Role checking for signature builder access
  useEffect(() => {
    const checkUserRole = async () => {
      if (!activeAccount?.address) {
        setHasSignatureBuilderAccess(false);
        return;
      }

      try {
        const contract = getContract({
          client: getThirdwebClient(),
          chain: base,
          address: diamondAddress as `0x${string}`,
        });

        const rolesToCheck = [
          'MemberRole',
          'BotanicalAdministrator',
          'DefaultAdminRole',
          'TSPTeam',
          'TSPFounders',
          'TSPEngineers',
          'TSPMarketing',
          'TSPIntern',
          'TSPArtists'
        ];

        for (const roleName of rolesToCheck) {
          try {
            const hasRole = await readContract({
              contract,
              method: "function omHasRole(string role, address account) view returns (bool)",
              params: [roleName, activeAccount.address as `0x${string}`]
            });

            if (hasRole) {
              console.log(`User has role: ${roleName}`);
              setHasSignatureBuilderAccess(true);
              return;
            }
          } catch (error) {
            console.error(`Error checking role ${roleName}:`, error);
          }
        }

        setHasSignatureBuilderAccess(false);
      } catch (error) {
        console.error('Error checking user roles:', error);
        setHasSignatureBuilderAccess(false);
      }
    };

    checkUserRole();
  }, [activeAccount?.address]);

  useEffect(() => {
    if (
      facets.length > 0 &&
      Object.keys(methodNames).length > 0 &&
      cyRef.current &&
      !cyInstance.current &&
      !isLoading
    ) {
      const baseColors = facets.map(() => getRandomColor()); // Generate and store random base colors for each facet

      cyInstance.current = cytoscape({
        container: cyRef.current, // Attach to the div reference
        style: [
          {
            selector: "node.facet",
            style: {
              "background-color": "#666666", // Fixed color for facet nodes
              label: "data(label)",
              "text-valign": "center",
              "text-halign": "center",
              width: 100, // Uniform size for all nodes
              height: 100, // Uniform size for all nodes
              "font-size": 12, // Font size for labels
              "min-zoomed-font-size": 8, // Font size when zoomed in
            },
          },
          {
            selector: "node.read-method",
            style: {
              label: "data(label)",
              "background-color": "data(color)", // Dynamically set color from node data
              "text-valign": "center",
              "text-halign": "center",
              width: 100, // Uniform size for all nodes
              height: 100, // Uniform size for all nodes
              "font-size": 12,
              "min-zoomed-font-size": 8, // Label visibility on zoom
            },
          },
          {
            selector: "node.write-method",
            style: {
              label: "data(label)",
              "background-color": "data(color)", // Dynamically set color from node data
              "text-valign": "center",
              "text-halign": "center",
              width: 100, // Uniform size for all nodes
              height: 100, // Uniform size for all nodes
              "font-size": 12,
              "min-zoomed-font-size": 8, // Label visibility on zoom
            },
          },
          {
            selector: "edge",
            style: {
              width: 15, // Reduced width for better performance
              "line-color": "data(color)", // Edge color will match method node color
              "target-arrow-color": "data(color)", // Target arrow color matches edge color
              // "target-arrow-shape": "triangle",
              "curve-style": "bezier",
            },
          },
        ],
        elements: [
          // Facet nodes with fixed color
          ...facets.map((facet, idx) => ({
            data: {
              id: facet.facetAddress,
              label:
                facetNames[facet.facetAddress] ||
                facet.facetAddress.substring(0, 6),
            },
            position: { x: 0, y: idx * 300 },
            classes: "facet",
          })),

          ...facets.flatMap((facet, idx) => {
            const baseColor = baseColors[idx]; // Use the stored base color for this facet

            // Ensure methodNames[facet.facetAddress] exists
            const facetMethodNames = methodNames[facet.facetAddress];
            if (!facetMethodNames) {
              console.warn(
                `No method names found for facet address: ${facet.facetAddress}`
              );
              return []; // Skip this facet if no method names are found
            }

            return [
              // Read method nodes (lighter version of base color)
              ...facetMethodNames.readMethods.map((method, i) => ({
                data: {
                  id: `${facet.facetAddress}-read-${i}`,
                  label: method,
                  color: baseColor, // Lighter color for read methods
                },
                position: { x: -300 - i * 300, y: idx * 300 + 0 },
                classes: "read-method",
              })),
              // Write method nodes (darker version of base color)
              ...facetMethodNames.writeMethods.map((method, i) => ({
                data: {
                  id: `${facet.facetAddress}-write-${i}`,
                  label: method,
                  color: baseColor, // Darker color for write methods
                },
                position: { x: 300 + i * 300, y: idx * 300 + 0 },
                classes: "write-method",
              })),
            ];
          }),

          // Connect facet nodes to read methods and set edge color to match node
          ...facets.flatMap((facet, idx) =>
            methodNames[facet.facetAddress]?.readMethods.map((_, i) => ({
              data: {
                source: facet.facetAddress,
                target: `${facet.facetAddress}-read-${i}`,
                color: baseColors[idx],
              }, // Set edge color
            }))
          ),

          // Connect facet nodes to write methods and set edge color to match node
          ...facets.flatMap((facet, idx) =>
            methodNames[facet.facetAddress]?.writeMethods.map((_, i) => ({
              data: {
                source: facet.facetAddress,
                target: `${facet.facetAddress}-write-${i}`,
                color: baseColors[idx],
              }, // Set edge color
            }))
          ),

          // Connect facet nodes vertically and set the edge color to #F54029
          ...facets.slice(1).map((facet, idx) => ({
            data: {
              source: facets[idx].facetAddress,
              target: facet.facetAddress,
              color: "#666666",
            }, // Set facet-to-facet edge color
          })),
        ],
        layout: {
          name: "preset", // Keep the positions as defined
        },
        userPanningEnabled: false, // Disable panning by touch or mouse
        userZoomingEnabled: false, // Disable zooming by touch or mouse
        boxSelectionEnabled: false, // Disable box selection (can sometimes interfere with touch)
      });

      // Disable all touch events for Cytoscape on mobile
      cyInstance.current.off("tapstart tapend touchstart touchend");
    }
  }, [facets, methodNames, facetNames, isLoading]);

  // Button Handlers
  const panMap = (direction: "up" | "down" | "left" | "right") => {
    if (!cyInstance.current) return;
    switch (direction) {
      case "up":
        cyInstance.current.panBy({ x: 0, y: PAN_STEP });
        break;
      case "down":
        cyInstance.current.panBy({ x: 0, y: -PAN_STEP });
        break;
      case "left":
        cyInstance.current.panBy({ x: PAN_STEP, y: 0 });
        break;
      case "right":
        cyInstance.current.panBy({ x: -PAN_STEP, y: 0 });
        break;
      default:
        break;
    }
  };

  const zoomMap = (zoomIn: boolean) => {
    if (!cyInstance.current) return;
    const currentZoom = cyInstance.current.zoom();
    cyInstance.current.zoom(
      zoomIn ? currentZoom + ZOOM_STEP : currentZoom - ZOOM_STEP
    );
  };

  const resetMap = () => {
    if (!cyInstance.current) return;
    cyInstance.current.reset();
  };

  const handleMouseMove = (event: React.MouseEvent) => {
    setFlashlightPos({ x: event.clientX, y: event.clientY });
  };

  // Flashlight size control
  const setFlashlight = (sizeLabel: keyof typeof FLASHLIGHT_SIZES) => {
    setFlashlightSize(FLASHLIGHT_SIZES[sizeLabel]);
  };

  // Button styles for arrows and reset
  const roundButtonStyle: React.CSSProperties = {
    width: "50px",
    height: "50px",
    borderRadius: "50%",
    backgroundColor: "#666666",
    color: "white",
    border: "none",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    cursor: "pointer",
    margin: "5px",
    aspectRatio: "1 / 1", // Ensures the button stays circular
    zIndex: 101, // Ensure buttons stay on top
    pointerEvents: "auto", // Ensure button is clickable
  };

  // Zoom button styles (placed below the directional buttons)
  const zoomButtonStyle: React.CSSProperties = {
    width: "50px",
    height: "50px",
    borderRadius: "50%",
    backgroundColor: "#666666",
    color: "white",
    border: "none",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    cursor: "pointer",
    marginTop: "5px",
    zIndex: 101, // Ensure zoom buttons stay on top
    pointerEvents: "auto", // Ensure button is clickable
  };

  // Reset button style (center of the gamepad)
  const resetButtonStyle: React.CSSProperties = {
    width: "50px",
    height: "50px",
    borderRadius: "50%",
    backgroundColor: "#666",
    color: "white",
    border: "none",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    cursor: "pointer",
    margin: "5px",
    zIndex: 101, // Ensure reset button stays on top
    pointerEvents: "auto", // Ensure button is clickable
  };

  // Icon style
  const iconStyle: React.CSSProperties = {
    width: "24px",
    height: "24px",
  };

  // Flashlight button styles for size selection (adjusted for mobile)
  const flashlightButtonStyle: React.CSSProperties = {
    margin: isMobile ? "0 2px" : "0 5px", // Reduce margin for mobile
    padding: isMobile ? "8px 10px" : "10px 15px", // Smaller padding for mobile
    backgroundColor: "#666666",
    color: "white",
    fontSize: isMobile ? "12px" : "16px", // Smaller font size for mobile
    borderRadius: "50%",
    border: "none",
    cursor: "pointer",
    zIndex: 101, // Ensure flashlight size buttons stay on top
    pointerEvents: "auto", // Ensure buttons are clickable
  };

  // Toggle between the popup menu and the different views
  const handleMenuSelection = (option: string) => {
    switch (option) {
      case "Diamond Viewer":
        setIsPopupOpen(false);
        setViewDiamondViewer(true); // Show the Cytoscape interface
        break;
      case "Directory":
        setIsPopupOpen(false);
        setViewDirectory(true); // Show the Directory component
        break;
      case "Mythology":
        setIsPopupOpen(false);
        setViewMythology(true); // Show the Mythology component
        break;
      case "Principles":
        setIsPopupOpen(false);
        setViewPrinciples(true); // Show the Principles component
        break;
      case "Reserve":
        setIsPopupOpen(false);
        setViewReserve(true); // Show the Reserve component
        break;
      case "Signature Builder":
        setIsPopupOpen(false);
        setViewSignatureBuilder(true); // Show the Signature Builder component
        break;
      default:
        alert(`${option} selected, but not yet implemented.`);
        break;
    }
  };

  return (
    <div style={{ width: "100vw", height: "100vh", position: "relative", overflow: "hidden" }}>
      {/* Popup to show options before rendering the Diamond Viewer */}
      {isPopupOpen && (
        <div className="absolute bottom-20 right-4 z-10 flex flex-col items-start space-y-4 backdrop-filter backdrop-blur-md bg-brand-900 bg-opacity-30 p-6 rounded-lg shadow-lg">
          <h2 className="text-white text-lg mb-0">Select an Option:</h2>

          {/* Diamond Viewer Button */}
          <div className="flex items-center space-x-2">
            <div className="h-2 w-2 rounded-full bg-orange-500"></div> {/* Orange dot */}
            <button
              className="bg-transparent text-white p-2 rounded-md"
              onClick={() => handleMenuSelection("Diamond Viewer")}
            >
              Contract Viewer
            </button>
          </div>

          {/* Directory Button */}
          <div className="flex items-center space-x-2">
            <div className="h-2 w-2 rounded-full bg-teal-500"></div> {/* Teal dot */}
            <button
              className="bg-transparent text-white p-2 rounded-md"
              onClick={() => handleMenuSelection("Directory")}
            >
              Directory
            </button>
          </div>

          {/* Mythology Button */}
          <div className="flex items-center space-x-2">
            <div className="h-2 w-2 rounded-full bg-brand-500"></div> {/* Cyan dot */}
            <button
              className="bg-transparent text-white p-2 rounded-md"
              onClick={() => handleMenuSelection("Mythology")}
            >
              Mythology
            </button>
          </div>

          {/* Principles Button */}
          <div className="flex items-center space-x-2">
            <div className="h-2 w-2 rounded-full bg-yellow-500"></div> {/* Yellow dot */}
            <button
              className="bg-transparent text-white p-2 rounded-md"
              onClick={() => handleMenuSelection("Principles")}
            >
              Principles
            </button>
          </div>

          {/* Reserve Button */}
          <div className="flex items-center space-x-2">
            <div className="h-2 w-2 rounded-full bg-red-500"></div> {/* Red dot */}
            <button
              className="bg-transparent text-white p-2 rounded-md"
              onClick={() => handleMenuSelection("Reserve")}
            >
              Reserve
            </button>
          </div>

          {/* Signature Builder Button - Only show if user has access */}
          {hasSignatureBuilderAccess && (
            <div className="flex items-center space-x-2">
              <div className="h-2 w-2 rounded-full bg-synthwaveBlue"></div> {/* Synthwave blue dot */}
              <button
                className="bg-transparent text-white p-2 rounded-md"
                onClick={() => handleMenuSelection("Signature Builder")}
              >
                Signature Builder
              </button>
            </div>
          )}
        </div>
      )}

      {/* Conditional Rendering of Different Views */}
      {viewDirectory && <Directory />}
      {viewMythology && <Mythology />}
      {viewPrinciples && <Principles />}
      {viewReserve && <Reserve />}
      {viewSignatureBuilder && <SignatureBuilder hasAccess={hasSignatureBuilderAccess} />}

      {/* Render the Cytoscape interface only if Diamond Viewer is selected */}
      {viewDiamondViewer && (
        <div>
          {/* Loading Animation */}
          {isLoading && <LoadingAnimation />}

          {/* Overlay bar to display contract-related data */}
          {!isLoading && (
            <div
              style={{
                position: "absolute",
                bottom: "50px", // Move the bar to the bottom
                left: "0", // Align to the left edge
                right: "0", // Stretch to the right edge
                padding: "10px 10px", // Padding for spacing
                backgroundColor: "rgba(102, 102, 102, 0.5)", // Slightly transparent background
                backdropFilter: "blur(10px)", // Glass effect
                WebkitBackdropFilter: "blur(10px)", // Safari support
                color: "#D1FAE5", // text-brand-100
                borderRadius: "15px 15px 0 0", // Rounded corners
                zIndex: 100,
                fontFamily: "Arial, sans-serif",
                fontSize: "12px",
                boxShadow: "0px 4px 12px rgba(0, 0, 0, 0.2)",
                display: "flex", // Flexbox layout
                justifyContent: "space-around", // Space items evenly
                alignItems: "center", // Vertically align items
                pointerEvents: "none", // Disable interaction with the overlay
              }}
            >
              {/* Facets */}
              <div style={{ display: "flex", alignItems: "center" }}>
                <div className="h-2 w-2 rounded-full bg-orange-500 mr-2"></div>
                <p>
                  <strong>Facets:</strong> {facets.length}
                </p>
              </div>

              {/* Methods */}
              <div style={{ display: "flex", alignItems: "center" }}>
                <div className="h-2 w-2 rounded-full bg-teal-500 mr-2"></div>
                <p>
                  <strong>Methods:</strong>{" "}
                  {Object.keys(methodNames).reduce(
                    (acc, key) =>
                      acc +
                      methodNames[key].readMethods.length +
                      methodNames[key].writeMethods.length,
                    0
                  )}
                </p>
              </div>

              {/* Transactions */}
              <div style={{ display: "flex", alignItems: "center" }}>
                <div className="h-2 w-2 rounded-full bg-brand-500 mr-2"></div>
                <p>
                  <strong>Transactions:</strong>{" "}
                  {transactionCount !== null ? transactionCount : "Loading..."}
                </p>
              </div>

              {/* Last Activity */}
              <div style={{ display: "flex", alignItems: "center" }}>
                <div className="h-2 w-2 rounded-full bg-brand-500 mr-2"></div>
                <p>
                  <strong>Last Activity:</strong>{" "}
                  {lastActivityTime !== null ? lastActivityTime : "Loading..."}
                </p>
              </div>

              {/* Balance */}
              <div style={{ display: "flex", alignItems: "center" }}>
                <div className="h-2 w-2 rounded-full bg-yellow-500 mr-2"></div>
                <p>
                  <strong>Balance:</strong>{" "}
                  {balance ? `${balance} ETH` : "Loading..."}
                </p>
              </div>

              {/* Louper Explorer Button */}
              <div style={{ display: "flex", alignItems: "center" }}>
                <button
                  style={{
                    padding: "1px 12px",
                    backgroundColor: "rgba(102, 102, 102, 0.5)", // Emerald color
                    backdropFilter: "blur(10px)", // Glass effect
                    WebkitBackdropFilter: "blur(10px)", // Safari support
                    color: "#fff", // White text color
                    borderRadius: "5px",
                    fontSize: "12px",
                    cursor: "pointer",
                    pointerEvents: "auto", // Enable interaction with the button
                    border: "none",
                    boxShadow: "0px 2px 5px rgba(0, 0, 0, 0.2)",
                  }}
                  onClick={() =>
                    window.open(
                      `https://louper.dev/diamond/${contractAddress}?network=base#facets`,
                      "_blank"
                    )
                  }
                >
                  View on Louper
                </button>
              </div>
            </div>
          )}

          {/* Media query for mobile font size */}
          <style jsx>{`
            @media (max-width: 768px) {
              div {
                font-size: 8px; // Smaller font size for mobile screens
              }
            }
          `}</style>

          {/* Main Cytoscape and Controls */}
          <div
            style={{
              width: "100vw",
              height: "100vh",
              position: "relative",
              overflow: "hidden",
            }}
            onMouseMove={handleMouseMove}
            onTouchMove={handleTouchMove} // Add touch event handler for mobile
          >
            {/* Gamepad Controls */}
            {!isLoading && (
              <div
                style={{
                  position: "absolute",
                  bottom: 100,
                  left: 20,
                  zIndex: 101,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  pointerEvents: "auto",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                  }}
                >
                  <button onClick={() => panMap("up")} style={roundButtonStyle}>
                    <ArrowUpIcon style={iconStyle} />
                  </button>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      width: "150px",
                      marginTop: "5px",
                    }}
                  >
                    <button
                      onClick={() => panMap("left")}
                      style={roundButtonStyle}
                    >
                      <ArrowLeftIcon style={iconStyle} />
                    </button>
                    <button onClick={resetMap} style={resetButtonStyle}>
                      <ArrowPathIcon style={iconStyle} />
                    </button>
                    <button
                      onClick={() => panMap("right")}
                      style={roundButtonStyle}
                    >
                      <ArrowRightIcon style={iconStyle} />
                    </button>
                  </div>
                  <button
                    onClick={() => panMap("down")}
                    style={roundButtonStyle}
                  >
                    <ArrowDownIcon style={iconStyle} />
                  </button>
                </div>

                {/* Zoom Controls */}
                <div
                  style={{
                    marginTop: "15px",
                    display: "flex",
                    flexDirection: "row",
                    alignItems: "center",
                  }}
                >
                  <button onClick={() => zoomMap(true)} style={zoomButtonStyle}>
                    <PlusIcon style={iconStyle} />
                  </button>
                  <button
                    onClick={() => zoomMap(false)}
                    style={zoomButtonStyle}
                  >
                    <MinusIcon style={iconStyle} />
                  </button>
                </div>
              </div>
            )}

            {/* Flashlight Size Buttons */}
            {!isLoading && (
              <div
                style={{
                  position: "absolute",
                  bottom: 103,
                  left: isMobile ? 150 : 200,
                  zIndex: 101,
                  display: "flex",
                  pointerEvents: "auto",
                }}
              >
                {Object.keys(FLASHLIGHT_SIZES).map((sizeLabel) => (
                  <button
                    key={sizeLabel}
                    onClick={() =>
                      setFlashlight(
                        sizeLabel as keyof typeof FLASHLIGHT_SIZES
                      )
                    }
                    style={flashlightButtonStyle}
                  >
                    {sizeLabel}
                  </button>
                ))}
              </div>
            )}

            {/* Cytoscape Container */}
            {!isLoading && (
              <div
                ref={cyRef}
                style={{
                  width: "100vw",
                  height: "100vh",
                  position: "relative",
                  overflow: "hidden",
                  zIndex: 0,
                  pointerEvents: "none",
                }}
              >
                {/* Flashlight Effect */}
                <div
                  ref={flashlightRef}
                  style={{
                    position: "absolute",
                    top: flashlightPos.y - flashlightSize / 2,
                    left: flashlightPos.x - flashlightSize / 2,
                    width: `${flashlightSize}px`,
                    height: `${flashlightSize}px`,
                    borderRadius: "50%",
                    backgroundColor: "transparent",
                    boxShadow: `0 0 0 9999px rgba(0, 0, 0, 0.99)`,
                    zIndex: 30,
                    pointerEvents: "auto",
                  }}
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export { processFacets };
export default MySpotPanel;
