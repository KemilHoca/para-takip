import type { Wallet } from '../types/wallet';
import type { WalletSetupForm } from '../types/walletForm';

import {
  parseAmount,
  parseAssetAmount,
} from '../utils/currency';

export const updateWalletById = (
  wallets: Wallet[],
  walletId: string,
  updates: Partial<Wallet>
): Wallet[] => {
  return wallets.map(wallet =>
    wallet.id === walletId
      ? { ...wallet, ...updates }
      : wallet
  );
};

export const createWallet = (
  setupData: WalletSetupForm
): Wallet => {
  const validBanks = setupData.banks.filter(
    bank => bank.name.trim() !== ''
  );

  const assets = {
    cash: parseAmount(setupData.cash),
    goldGrams: parseAssetAmount(setupData.goldGrams),
    dollar: parseAssetAmount(setupData.dollar),

    banks: validBanks.map(bank => ({
      id: bank.id || Math.random().toString(),
      name: bank.name,
      amount: parseAmount(bank.amount),
    })),
  };

  return {
    id: Math.random().toString(),
    name: setupData.name,
    profilePic: 'person',
    assets,
    transactions: [],
  };
};

export const createAssetsFromSetup = (
  setupData: WalletSetupForm
): Wallet['assets'] => {
  const validBanks = setupData.banks.filter(
    bank => bank.name.trim() !== ''
  );

  return {
    cash: parseAmount(setupData.cash),
    goldGrams: parseAssetAmount(setupData.goldGrams),
    dollar: parseAssetAmount(setupData.dollar),

    banks: validBanks.map(bank => ({
      id: bank.id || Math.random().toString(),
      name: bank.name,
      amount: parseAmount(bank.amount),
    })),
  };
};

export interface DeleteWalletResult {
  wallets: Wallet[];
  nextActiveWalletId: string | null;
}

export const deleteWalletById = (
  wallets: Wallet[],
  walletId: string
): DeleteWalletResult => {
  const updatedWallets = wallets.filter(
    wallet => wallet.id !== walletId
  );

  return {
    wallets: updatedWallets,
    nextActiveWalletId:
      updatedWallets.length > 0
        ? updatedWallets[0].id
        : null,
  };
};