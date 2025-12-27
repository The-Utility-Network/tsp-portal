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
import dynamic from "next/dynamic";
const DiamondRings = dynamic(() => import("./DiamondRings"), { ssr: false });
import { styled } from "@mui/material";

// Define the structure of a Facet
interface Facet {
  facetAddress: string;
  selectors: string[];
}

// Raw facet type from getFacets()
type RawFacet = { target: `0x${string}`; selectors: readonly `0x${string}`[] };

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
async function fetchABIFromBaseScan(address: string, apiKey: string, cache: any, retries = 3) {
  if (cache.abis[address]) return cache.abis[address];

  for (let i = 0; i < retries; i++) {
    await delay(600 + (i * 400)); // Exponential-ish backoff
    try {
      const response = await fetch(
        `/api/explorer/abi?address=${address}`
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
        if (data.result.includes("rate limit") && i < retries - 1) {
          console.warn(`Rate limit hit for ABI ${address}, retrying... (${i + 1}/${retries})`);
          continue;
        }
        console.error(`Error fetching ABI for ${address}: ${data.result}`);
        break; // Stop on non-rate-limit error
      }
    } catch (error) {
      console.error(`Network error fetching ABI for ${address}:`, error);
      if (i === retries - 1) break;
    }
  }
  return null;
}

async function fetchContractNameFromBaseScan(
  address: string,
  apiKey: string,
  cache: any,
  retries = 3
) {
  if (cache.contractNames[address]) {
    const cached = cache.contractNames[address] as string;
    const isShort = typeof cached === 'string' && cached.includes('…');
    if (cached && !isShort && cached !== "Unknown Contract") return cached;
  }

  for (let i = 0; i < retries; i++) {
    await delay(600 + (i * 400));
    try {
      const response = await fetch(
        `/api/explorer/name?address=${address}`
      );
      const data = await response.json();

      if (
        data.status === "1" &&
        data.result &&
        Array.isArray(data.result) &&
        data.result[0]?.ContractName
      ) {
        const contractName = String(data.result[0].ContractName || '').trim();
        if (contractName.length > 0) {
          cache.contractNames[address] = contractName; // Cache the contract name
          writeCache(cache); // Persist cache
          return contractName;
        }
      } else if (data.status === "0") {
        if (data.result.includes("rate limit") && i < retries - 1) {
          console.warn(`Rate limit hit for name ${address}, retrying... (${i + 1}/${retries})`);
          continue;
        }
        break; // Stop on non-rate-limit error
      }
    } catch (error) {
      console.error(
        `Error fetching contract name from BaseScan for ${address}:`,
        error
      );
      if (i === retries - 1) break;
    }
  }

  // Final fallback: return existing cached (even if short), else synthesize short
  const existing = cache.contractNames[address] as string | undefined;
  if (existing) return existing;
  const shortName = `${address.slice(0, 6)}…${address.slice(-4)}`;
  cache.contractNames[address] = shortName;
  writeCache(cache);
  return shortName;
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
  const facetAbis: { [key: string]: any[] } = {};

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
      // Always include facet; if name not found, a short address was assigned above

      facetNamesLookup[facet.facetAddress] = contractName;

      const abi = await fetchABIFromBaseScan(
        facet.facetAddress,
        apiKey,
        cache
      );
      if (!abi) {
        // proceed with empty methods; we'll allow viewer to synthesize placeholders
        methodNamesLookup[facet.facetAddress] = { readMethods: [], writeMethods: [] };
        continue;
      }

      const { readMethods, writeMethods } = classifyMethods(abi, facet.selectors);
      methodNamesLookup[facet.facetAddress] = { readMethods, writeMethods };
      facetAbis[facet.facetAddress] = abi;
    } catch (error) {
      console.error(`Error processing facet at ${facetAddress}:`, error);
      continue; // Continue with the next facet on error
    }

    await delay(600); // Increased delay to further prevent rate limits
  }

  return { methodNamesLookup, facetNamesLookup, facetAbis };
}

// Map control increments
const PAN_STEP = 100; // Number of pixels to pan
const ZOOM_STEP = 0.2; // Zoom step for in/out

// Spotlight removed

interface AnalyzePanelProps {
  directoryFacetAddress?: string;
  p0?: string;
  cache?: any;
}

// Loading Animation Component (Tube-like ring with emerging nodes)
const LoadingAnimation: React.FC = () => {
  const nodes = Array.from({ length: 16 });
  return (
    <div className="loader-container">
      <div className="ring">
        <div className="nodes">
          {nodes.map((_, i) => (
            <span key={i} className="node" style={{ ['--i' as any]: i, animationDelay: `${i * 90}ms` } as React.CSSProperties} />
          ))}
        </div>
      </div>
      <div className="loading-text">Assembling schematic…</div>
      <style jsx>{`
        .loader-container {
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          height: 100%;
          width: 100%;
          position: absolute;
          inset: 0;
          z-index: 10;
          pointer-events: none;
        }
        .ring {
          position: relative;
          width: 200px;
          height: 200px;
          border-radius: 50%;
          box-shadow:
            inset 0 0 0 12px rgba(0, 204, 255, 0.2),
            0 0 20px rgba(0, 204, 255, 0.4),
            0 0 40px rgba(0, 204, 255, 0.2);
          background:
            radial-gradient(closest-side, rgba(0, 204, 255, 0.1), transparent 70%);
        }
        .nodes {
          position: absolute;
          inset: 0;
          transform: translateZ(0);
          animation: spin 8s linear infinite;
        }
        .node {
          position: absolute;
          top: 50%;
          left: 50%;
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #00ccff;
          box-shadow: 0 0 6px rgba(0, 204, 255, 0.9), 0 0 12px rgba(0, 204, 255, 0.5);
          transform: rotate(calc(var(--i) * 22.5deg)) translate(88px) rotate(calc(var(--i) * -22.5deg));
          opacity: 0;
          animation: pulse 1.6s ease-in-out infinite;
        }
        .loading-text {
          margin-top: 12px;
          color: #00ccff;
          font-size: 11px;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          opacity: 0.9;
          text-shadow: 0 0 8px rgba(0, 204, 255, 0.5);
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes pulse {
          0% { opacity: 0; transform: rotate(calc(var(--i) * 22.5deg)) translate(84px) rotate(calc(var(--i) * -22.5deg)) scale(0.6); }
          40% { opacity: 1; }
          60% { opacity: 1; }
          100% { opacity: 0; transform: rotate(calc(var(--i) * 22.5deg)) translate(94px) rotate(calc(var(--i) * -22.5deg)) scale(1); }
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
  boxShadow: "0 0 10px #00ccff", // Neon glow
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
  border: "1px solid #00ccff",
  borderRadius: "8px",
  marginLeft: "1%",
  marginRight: "1%",
  width: "98%",
  marginBottom: "1%",
  boxShadow: "0 0 10px #00ccff",
  color: "#E0E0E0",
  padding: "10px",
}));

// Styled Image with Cyberpunk Aesthetics
const StyledImage = styled("img")(({ theme }) => ({
  width: "100%",
  maxHeight: "400px",
  objectFit: "contain",
  borderRadius: "8px",
  boxShadow: "0 0 20px #00ccff",
  transition: "transform 0.3s, box-shadow 0.3s",
  "&:hover": {
    transform: "scale(1.02)",
    boxShadow: "0 0 30px #00ccff",
  },
}));

const ColorOption = styled("div")<{ color: string; selected: boolean }>(
  ({ color, selected }) => ({
    backgroundColor: color,
    width: "24px",
    height: "24px",
    borderRadius: "50%",
    border: selected ? `2px solid #00ccff` : "1px solid #ccc",
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
  border: "1px solid #00ccff",
  "&:focus": {
    outline: "none",
    borderColor: "#00ccff",
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
    background: "#00ccff",
    cursor: "pointer",
  },
  "&::-moz-range-thumb": {
    width: "16px",
    height: "16px",
    borderRadius: "50%",
    background: "#00ccff",
    cursor: "pointer",
  },
}));

const StyledTextField = styled("input")(({ theme }) => ({
  backgroundColor: "rgba(30, 30, 30, 0.8)",
  color: "#E0E0E0",
  fontFamily: "inherit",
  border: "1px solid #00ccff",
  borderRadius: "8px",
  padding: "10px",
  marginBottom: "10px",
  width: "100%",
  "&:focus": {
    outline: "none",
    borderColor: "#00ccff",
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
  boxShadow: "0 0 10px #00ccff",
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
const AnalyzePanel: React.FC<AnalyzePanelProps> = ({
  directoryFacetAddress,
  p0,
  cache,
}) => {
  const [viewDiamondViewer, setViewDiamondViewer] = useState(true); // Default to true for NET view
  const [viewDirectory, setViewDirectory] = useState(false);
  const [viewMythology, setViewMythology] = useState(false);
  const [viewPrinciples, setViewPrinciples] = useState(false);
  const [viewReserve, setViewReserve] = useState(false);
  const [facets, setFacets] = useState<Facet[]>([]);
  const [methodNames, setMethodNames] = useState<{
    [key: string]: { readMethods: string[]; writeMethods: string[] };
  }>({});
  const [facetNames, setFacetNames] = useState<{ [key: string]: string }>({});
  const [facetAbis, setFacetAbis] = useState<{ [key: string]: any[] }>({});
  const [transactionCount, setTransactionCount] = useState<number | null>(
    null
  ); // Store transaction count
  const [lastActivityTime, setLastActivityTime] = useState<string | null>(
    null
  ); // Store last activity time
  const [isLoading, setIsLoading] = useState<boolean>(true); // Loading state
  const [balance, setBalance] = useState<string | null>(null); // Store contract balance

  const [contractAddress, setContractAddress] = useState<string | null>(null);
  const apiKey = process.env.NEXT_PUBLIC_EXPLORER_API_KEY || "";

  // Validate environmental variables
  useEffect(() => {
    const load = async () => {
      try {
        const resp = await fetch('/api/config', { cache: 'no-store' });
        const json = await resp.json();
        setContractAddress(json.diamondAddress || null);
      } catch { }
    };
    load();
  }, []);

  const cyRef = useRef<HTMLDivElement | null>(null); // Use ref to access the container
  const cyInstance = useRef<cytoscape.Core | null>(null); // Reference for the Cytoscape instance
  const [isMobile, setIsMobile] = useState(false);

  // Detect if the device is mobile
  useEffect(() => {
    if (typeof window !== "undefined" && typeof navigator !== "undefined") {
      setIsMobile(/Mobi|Android|iPhone|iPad/i.test(navigator.userAgent));
    }
  }, []);

  // Spotlight interactions removed

  // Defer heavy data fetching until Diamond Viewer is explicitly selected
  useEffect(() => {
    if (!viewDiamondViewer) return;

    let isStale = false;

    const fetchData = async () => {
      setIsLoading(true);

      const fetchContractBalance = async (addr: string) => {
        if (isStale) return;
        try {
          const response = await fetch(`/api/explorer/account?action=balance&address=${addr}`);
          const data = await response.json();
          if (data.status === "1" && !isStale) {
            setBalance(ethers.formatEther(data.result));
          } else if (!isStale) {
            setBalance(null);
          }
        } catch (error) {
          if (!isStale) setBalance(null);
        }
      };

      const fetchContractData = async (addr: string) => {
        if (isStale) return;
        try {
          const response = await fetch(`/api/explorer/account?action=txlist&address=${addr}&sort=asc`);
          const data = await response.json();
          if (data.status === "1" && data.result.length > 0 && !isStale) {
            setTransactionCount(data.result.length);
            setLastActivityTime(
              new Date(
                parseInt(data.result[data.result.length - 1].timeStamp, 10) * 1000
              ).toLocaleString()
            );
          } else if (data.status === "1" && data.result.length === 0 && !isStale) {
            setTransactionCount(0);
            setLastActivityTime("No transactions yet.");
          } else if (!isStale) {
            setTransactionCount(null);
            setLastActivityTime("Unknown (no API key)");
          }
        } catch (error) {
          if (!isStale) {
            setTransactionCount(null);
            setLastActivityTime("Unknown (no API key)");
          }
        }
      };

      const currentCache = readCache();

      try {
        const rawFacets = (await getFacets()) as unknown as RawFacet[];
        if (isStale) return;

        const formattedFacets: Facet[] = rawFacets.map((facet) => ({
          facetAddress: facet.target,
          selectors: Array.from(facet.selectors) as string[],
        }));

        setFacets(formattedFacets);

        const {
          methodNamesLookup,
          facetNamesLookup,
          facetAbis,
        } = await processFacets(formattedFacets, apiKey, currentCache);

        if (isStale) return;

        setMethodNames(methodNamesLookup);
        setFacetNames(facetNamesLookup);
        setFacetAbis(facetAbis);

        const targetAddress = contractAddress || (formattedFacets[0]?.facetAddress ?? null);
        if (targetAddress && !isStale) {
          await fetchContractData(targetAddress);
          await fetchContractBalance(targetAddress);
        }

        if (!isStale) setIsLoading(false);
      } catch (error) {
        if (!isStale) {
          console.error("Error fetching facets, method names, or contract names:", error);
          setIsLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      isStale = true;
    };
  }, [apiKey, contractAddress, viewDiamondViewer]);

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
              "background-color": "#00ccff", // Fixed color for facet nodes
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
              color: "#00ccff",
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

  // Spotlight interactions removed

  // Spotlight controls removed

  // Button styles for arrows and reset
  const roundButtonStyle: React.CSSProperties = {
    width: "50px",
    height: "50px",
    borderRadius: "50%",
    backgroundColor: "#00ccff",
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
    backgroundColor: "#00ccff",
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

  // Spotlight button styles removed

  // Toggle between the popup menu and the different views
  /*
  const resetViews = () => {
    setViewDiamondViewer(false);
    setViewDirectory(false);
    setViewMythology(false);
    setViewPrinciples(false);
    setViewReserve(false);
  };
  */

  return (
    <div style={{ width: "100%", height: "100%", position: "relative", overflow: "hidden" }}>
      {/* Conditional Rendering of Different Views */}
      {viewDirectory && <Directory />}
      {viewMythology && <Mythology />}
      {viewPrinciples && <Principles />}
      {viewReserve && <Reserve />}

      {/* Render the Cytoscape interface only if Diamond Viewer is selected */}
      {viewDiamondViewer && (
        <div style={{ width: "100%", height: "100%", position: "relative" }}>
          {/* Loading Animation */}
          {isLoading && <LoadingAnimation />}

          {/* Overlay bar to display contract-related data - Hidden per user request */}
          {/* {!isLoading && (
            <div
              style={{
                position: "absolute",
                bottom: "50px", // Move the bar to the bottom
                left: "0", // Align to the left edge
                right: "0", // Stretch to the right edge
                padding: "10px 20px", // Padding for spacing
                backgroundColor: "rgba(0, 0, 0, 0.6)", // Match PortalHUD bg-black/60
                backdropFilter: "blur(20px)", // Enhanced blur
                WebkitBackdropFilter: "blur(20px)", 
                color: "#FFFFFF", // White text
                borderRadius: "24px 24px 0 0", // More rounded top
                zIndex: 100,
                fontFamily: "monospace", // Tech/Mono font like HUD
                fontSize: "12px",
                letterSpacing: "0.05em",
                borderTop: "1px solid rgba(255, 255, 255, 0.1)", // Subtle border
                boxShadow: "0px -4px 20px rgba(0, 204, 255, 0.15)", // Cyan glow
                display: "flex", // Flexbox layout
                justifyContent: "space-between", // Space
                alignItems: "center", // Vertically align items
                pointerEvents: "auto",
              }}
            >
              <div style={{ display: "flex", alignItems: "center" }}>
                <div className="h-2 w-2 rounded-full bg-brand-500 mr-2 shadow-[0_0_8px_rgba(0,204,255,0.5)]"></div>
                <p>
                  <strong>Facets:</strong> {facets.length}
                </p>
              </div>

              <div style={{ display: "flex", alignItems: "center" }}>
                <div className="h-2 w-2 rounded-full bg-white mr-2 opacity-80"></div>
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

              <div style={{ display: "flex", alignItems: "center" }}>
                <div className="h-2 w-2 rounded-full bg-brand-400 mr-2 shadow-[0_0_8px_rgba(0,204,255,0.4)]"></div>
                <p>
                  <strong>Transactions:</strong>{" "}
                  {transactionCount !== null ? transactionCount : "Loading..."}
                </p>
              </div>

              <div style={{ display: "flex", alignItems: "center" }}>
                <div className="h-2 w-2 rounded-full bg-white mr-2 opacity-60"></div>
                <p>
                  <strong>Last Activity:</strong>{" "}
                  {lastActivityTime !== null ? lastActivityTime : "Loading..."}
                </p>
              </div>

              <div style={{ display: "flex", alignItems: "center" }}>
                <div className="h-2 w-2 rounded-full bg-brand-300 mr-2 shadow-[0_0_8px_rgba(0,204,255,0.3)]"></div>
                <p>
                  <strong>Balance:</strong>{" "}
                  {balance ? `${balance} ETH` : "Loading..."}
                </p>
              </div>

              <div style={{ display: "flex", alignItems: "center" }}>
                <button
                  style={{
                    padding: "1px 12px",
                    backgroundColor: "rgba(0, 204, 255, 0.5)", // Cyan color
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
          )} */}

          {/* Media query for mobile font size */}
          <style jsx>{`
            @media (max-width: 768px) {
              div {
                font-size: 8px; // Smaller font size for mobile screens
              }
            }
          `}</style>

          {/* Main Viewer (Cylinder of rings) */}
          <div style={{ width: "100%", height: "100%", position: "relative", overflow: "hidden" }}>
            <DiamondRings facets={facets} methodNames={methodNames} facetNames={facetNames} facetAbis={facetAbis} isMobile={isMobile} />
          </div>
        </div>
      )}
    </div>
  );
};

export { processFacets };
export default AnalyzePanel;
