import { getContract, readContract } from "thirdweb";
import { base } from "thirdweb/chains";
// Import the thirdweb client from your server-side utility
import { getThirdwebClient } from '../src/utils/createThirdwebClient';

// Initialize the client from the server-side utility
const client = getThirdwebClient();

export const diamondAddress = ((): string => {
  const address = process.env.NEXT_PUBLIC_DIAMOND_ADDRESS;
  if (!address) {
    throw new Error("DIAMOND_ADDRESS environment variable is not set.");
  }
  return address;
})();

export async function getDiamondAddress(): Promise<string> {
  return diamondAddress;
}

// Get contract details
const contract = getContract({
  client,
  chain: base,
  address: diamondAddress, // Diamond contract address
  abi: [{ "inputs": [], "name": "DiamondWritable__InvalidInitializationParameters", "type": "error" }, { "inputs": [], "name": "DiamondWritable__RemoveTargetNotZeroAddress", "type": "error" }, { "inputs": [], "name": "DiamondWritable__ReplaceTargetIsIdentical", "type": "error" }, { "inputs": [], "name": "DiamondWritable__SelectorAlreadyAdded", "type": "error" }, { "inputs": [], "name": "DiamondWritable__SelectorIsImmutable", "type": "error" }, { "inputs": [], "name": "DiamondWritable__SelectorNotFound", "type": "error" }, { "inputs": [], "name": "DiamondWritable__SelectorNotSpecified", "type": "error" }, { "inputs": [], "name": "DiamondWritable__TargetHasNoCode", "type": "error" }, { "inputs": [], "name": "ERC165Base__InvalidInterfaceId", "type": "error" }, { "inputs": [], "name": "Ownable__NotOwner", "type": "error" }, { "inputs": [], "name": "Ownable__NotTransitiveOwner", "type": "error" }, { "inputs": [], "name": "Proxy__ImplementationIsNotContract", "type": "error" }, { "inputs": [], "name": "SafeOwnable__NotNomineeOwner", "type": "error" }, { "anonymous": false, "inputs": [{ "components": [{ "internalType": "address", "name": "target", "type": "address" }, { "internalType": "enum IERC2535DiamondCutInternal.FacetCutAction", "name": "action", "type": "uint8" }, { "internalType": "bytes4[]", "name": "selectors", "type": "bytes4[]" }], "indexed": false, "internalType": "struct IERC2535DiamondCutInternal.FacetCut[]", "name": "facetCuts", "type": "tuple[]" }, { "indexed": false, "internalType": "address", "name": "target", "type": "address" }, { "indexed": false, "internalType": "bytes", "name": "data", "type": "bytes" }], "name": "DiamondCut", "type": "event" }, { "anonymous": false, "inputs": [{ "indexed": true, "internalType": "address", "name": "previousOwner", "type": "address" }, { "indexed": true, "internalType": "address", "name": "newOwner", "type": "address" }], "name": "OwnershipTransferred", "type": "event" }, { "stateMutability": "payable", "type": "fallback" }, { "inputs": [], "name": "acceptOwnership", "outputs": [], "stateMutability": "nonpayable", "type": "function" }, { "inputs": [{ "components": [{ "internalType": "address", "name": "target", "type": "address" }, { "internalType": "enum IERC2535DiamondCutInternal.FacetCutAction", "name": "action", "type": "uint8" }, { "internalType": "bytes4[]", "name": "selectors", "type": "bytes4[]" }], "internalType": "struct IERC2535DiamondCutInternal.FacetCut[]", "name": "facetCuts", "type": "tuple[]" }, { "internalType": "address", "name": "target", "type": "address" }, { "internalType": "bytes", "name": "data", "type": "bytes" }], "name": "diamondCut", "outputs": [], "stateMutability": "nonpayable", "type": "function" }, { "inputs": [{ "internalType": "bytes4", "name": "selector", "type": "bytes4" }], "name": "facetAddress", "outputs": [{ "internalType": "address", "name": "facet", "type": "address" }], "stateMutability": "view", "type": "function" }, { "inputs": [], "name": "facetAddresses", "outputs": [{ "internalType": "address[]", "name": "addresses", "type": "address[]" }], "stateMutability": "view", "type": "function" }, { "inputs": [{ "internalType": "address", "name": "facet", "type": "address" }], "name": "facetFunctionSelectors", "outputs": [{ "internalType": "bytes4[]", "name": "selectors", "type": "bytes4[]" }], "stateMutability": "view", "type": "function" }, { "inputs": [], "name": "facets", "outputs": [{ "components": [{ "internalType": "address", "name": "target", "type": "address" }, { "internalType": "bytes4[]", "name": "selectors", "type": "bytes4[]" }], "internalType": "struct IERC2535DiamondLoupeInternal.Facet[]", "name": "diamondFacets", "type": "tuple[]" }], "stateMutability": "view", "type": "function" }, { "inputs": [], "name": "getFallbackAddress", "outputs": [{ "internalType": "address", "name": "fallbackAddress", "type": "address" }], "stateMutability": "view", "type": "function" }, { "inputs": [], "name": "nomineeOwner", "outputs": [{ "internalType": "address", "name": "", "type": "address" }], "stateMutability": "view", "type": "function" }, { "inputs": [], "name": "owner", "outputs": [{ "internalType": "address", "name": "", "type": "address" }], "stateMutability": "view", "type": "function" }, { "inputs": [{ "internalType": "address", "name": "fallbackAddress", "type": "address" }], "name": "setFallbackAddress", "outputs": [], "stateMutability": "nonpayable", "type": "function" }, { "inputs": [{ "internalType": "bytes4", "name": "interfaceId", "type": "bytes4" }], "name": "supportsInterface", "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }], "stateMutability": "view", "type": "function" }, { "inputs": [{ "internalType": "address", "name": "account", "type": "address" }], "name": "transferOwnership", "outputs": [], "stateMutability": "nonpayable", "type": "function" }, { "stateMutability": "payable", "type": "receive" }],
});

// Function to get all facets and their selectors
async function getFacets() {
  try {
    // Call the 'facets' method on the contract
    const facetsResponse = await readContract({
      contract: contract,
      method: "facets", // This method returns all facets and their selectors
    });
    console.log(facetsResponse);

    return facetsResponse;
  } catch (error) {
    console.error("Error fetching facets:", error);
    return [];
  }
}

// Function to get details for a specific method (function selector) in a facet
async function getMethodDetails(facetAddress: `0x${string}`, selector: `0x${string}`) {
  try {
    // Call the 'facetFunctionSelectors' method to get the function selectors for a given facet address
    const selectors = await readContract({
      contract: contract,
      method: "facetFunctionSelectors",
      params: [facetAddress],
    });
    console.log(selectors)

    // Find and return the selector details (if applicable)
    const methodDetails = selectors.find((sel: any) => sel === selector);
    return methodDetails ? methodDetails : null;
  } catch (error) {
    console.error("Error fetching method details:", error);
    return null;
  }
}

export { getFacets };
export { getMethodDetails };
export { contract };