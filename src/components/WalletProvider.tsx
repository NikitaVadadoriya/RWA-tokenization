"use client";

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";

interface WalletContextType {
    walletAddress: string;
    isConnecting: boolean;
    connectWallet: () => Promise<void>;
    disconnectWallet: () => void;
    shortAddress: string;
}

const WalletContext = createContext<WalletContextType>({
    walletAddress: "",
    isConnecting: false,
    connectWallet: async () => { },
    disconnectWallet: () => { },
    shortAddress: "",
});

export function useWallet() {
    return useContext(WalletContext);
}

export function WalletProvider({ children }: { children: ReactNode }) {
    const [walletAddress, setWalletAddress] = useState("");
    const [isConnecting, setIsConnecting] = useState(false);

    // Restore wallet from localStorage + check MetaMask on mount
    useEffect(() => {
        const saved = localStorage.getItem("rwa_wallet");
        if (saved) {
            // Verify it's still connected in MetaMask
            const w = window as unknown as {
                ethereum?: { request: (args: { method: string }) => Promise<string[]> };
            };
            if (w.ethereum) {
                w.ethereum
                    .request({ method: "eth_accounts" }) // Silent check — no popup
                    .then((accounts) => {
                        if (accounts.length > 0 && accounts[0].toLowerCase() === saved.toLowerCase()) {
                            setWalletAddress(accounts[0]);
                        } else {
                            localStorage.removeItem("rwa_wallet");
                        }
                    })
                    .catch(() => localStorage.removeItem("rwa_wallet"));
            }
        }

        // Listen for account changes
        const w = window as unknown as {
            ethereum?: {
                on?: (event: string, handler: (accounts: string[]) => void) => void;
                removeListener?: (event: string, handler: (accounts: string[]) => void) => void;
            };
        };
        const handleAccountsChanged = (accounts: string[]) => {
            if (accounts.length === 0) {
                setWalletAddress("");
                localStorage.removeItem("rwa_wallet");
            } else {
                setWalletAddress(accounts[0]);
                localStorage.setItem("rwa_wallet", accounts[0]);
            }
        };
        w.ethereum?.on?.("accountsChanged", handleAccountsChanged);

        return () => {
            w.ethereum?.removeListener?.("accountsChanged", handleAccountsChanged);
        };
    }, []);

    const connectWallet = useCallback(async () => {
        const w = window as unknown as {
            ethereum?: { request: (args: { method: string }) => Promise<string[]> };
        };
        if (!w.ethereum) {
            alert("Please install MetaMask!");
            return;
        }
        setIsConnecting(true);
        try {
            const accounts = await w.ethereum.request({ method: "eth_requestAccounts" });
            if (accounts.length > 0) {
                setWalletAddress(accounts[0]);
                localStorage.setItem("rwa_wallet", accounts[0]);
            }
        } catch {
            alert("Failed to connect wallet");
        }
        setIsConnecting(false);
    }, []);

    const disconnectWallet = useCallback(async () => {
        setWalletAddress("");
        localStorage.removeItem("rwa_wallet");

        // Attempt true MetaMask disconnect
        const w = window as unknown as {
            ethereum?: { request: (args: { method: string, params?: unknown[] }) => Promise<unknown> };
        };
        if (w.ethereum) {
            try {
                await w.ethereum.request({
                    method: "wallet_revokePermissions",
                    params: [{ eth_accounts: {} }],
                });
            } catch (err) {
                console.warn("Could not revoke MetaMask permissions", err);
            }
        }
    }, []);

    const shortAddress = walletAddress
        ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`
        : "";

    return (
        <WalletContext.Provider
            value={{ walletAddress, isConnecting, connectWallet, disconnectWallet, shortAddress }}
        >
            {children}
        </WalletContext.Provider>
    );
}
