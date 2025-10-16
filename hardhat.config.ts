/// <reference types="node" />

import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";

const hardhatDeployLoaded = (() => {
  try {
    require("hardhat-deploy");
    return true;
  } catch (error) {
    console.warn("hardhat-deploy plugin not found, continuing without it");
    return false;
  }
})();

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.28",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
      viaIR: true,
    },
  },
  ...(hardhatDeployLoaded
    ? {
        namedAccounts: {
          deployer: {
            default: 0,
          },
        },
      }
    : {}),
  mocha: {
    timeout: 40000,
  },
  networks: {
    sepolia: {
      url: process.env.SEPOLIA_RPC_URL || "https://sepolia.infura.io/v3/your-key",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
    },
  },
};

export default config;
