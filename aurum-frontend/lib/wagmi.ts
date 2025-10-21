import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { http } from "wagmi";
import type { Chain } from "wagmi/chains";

const sepoliaRpc = process.env.NEXT_PUBLIC_SEPOLIA_RPC || "https://rpc.sepolia.org";
const baseSepoliaRpc =
  process.env.NEXT_PUBLIC_BASE_RPC || "https://sepolia.base.org";
const walletConnectProjectId =
  process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "00000000000000000000000000000000";

export const sepolia: Chain = {
  id: 11155111,
  name: "Sepolia",
  nativeCurrency: {
    name: "Sepolia Ether",
    symbol: "ETH",
    decimals: 18,
  },
  rpcUrls: {
    default: { http: [sepoliaRpc] },
    public: { http: [sepoliaRpc] },
  },
  blockExplorers: {
    default: {
      name: "Etherscan",
      url: "https://sepolia.etherscan.io",
    },
  },
  testnet: true,
};

export const baseSepolia: Chain = {
  id: 84532,
  name: "Base Sepolia",
  nativeCurrency: {
    name: "Base Sepolia ETH",
    symbol: "ETH",
    decimals: 18,
  },
  rpcUrls: {
    default: { http: [baseSepoliaRpc] },
    public: { http: [baseSepoliaRpc] },
  },
  blockExplorers: {
    default: {
      name: "Basescan",
      url: "https://sepolia.basescan.org",
    },
  },
  testnet: true,
};

export const chains = [sepolia, baseSepolia] as const;

export type SupportedChainId = (typeof chains)[number]["id"];

export const config = getDefaultConfig({
  appName: "Aurum Protocol",
  projectId: walletConnectProjectId,
  chains,
  ssr: true,
  transports: {
    [sepolia.id]: http(sepoliaRpc),
    [baseSepolia.id]: http(baseSepoliaRpc),
  },
});
