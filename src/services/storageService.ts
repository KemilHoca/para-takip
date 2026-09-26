import AsyncStorage from '@react-native-async-storage/async-storage';

import type { Wallet } from '../types/wallet';
import type {
  AppTheme,
  CustomColors,
} from '../types/ui';

const STORAGE_KEYS = {
  wallets: 'wallets',
  activeWalletId: 'activeWalletId',
  appTheme: 'appTheme',
  customColors: 'customColors',
} as const;

export interface StoredAppData {
  wallets: Wallet[];
  activeWalletId: string | null;
  appTheme: AppTheme | null;
  customColors: CustomColors | null;
}

const VALID_THEMES: AppTheme[] = [
  'system',
  'light',
  'dark',
  'custom',
];

export const loadAppData = async (): Promise<StoredAppData> => {
  const savedWallets = await AsyncStorage.getItem(
    STORAGE_KEYS.wallets
  );

  const savedActiveId = await AsyncStorage.getItem(
    STORAGE_KEYS.activeWalletId
  );

  const savedTheme = await AsyncStorage.getItem(
    STORAGE_KEYS.appTheme
  );

  const savedCustomColors = await AsyncStorage.getItem(
    STORAGE_KEYS.customColors
  );

  const appTheme =
    savedTheme &&
    VALID_THEMES.includes(savedTheme as AppTheme)
      ? (savedTheme as AppTheme)
      : null;

  return {
    wallets: savedWallets
      ? JSON.parse(savedWallets)
      : [],

    activeWalletId:
      savedActiveId || null,

    appTheme,

    customColors: savedCustomColors
      ? JSON.parse(savedCustomColors)
      : null,
  };
};

export const saveAppData = async (
  wallets: Wallet[],
  activeWalletId: string | null,
  appTheme: AppTheme,
  customColors: CustomColors
): Promise<void> => {
  await AsyncStorage.setItem(
    STORAGE_KEYS.wallets,
    JSON.stringify(wallets)
  );

  await AsyncStorage.setItem(
    STORAGE_KEYS.activeWalletId,
    activeWalletId || ''
  );

  await AsyncStorage.setItem(
    STORAGE_KEYS.appTheme,
    appTheme
  );

  await AsyncStorage.setItem(
    STORAGE_KEYS.customColors,
    JSON.stringify(customColors)
  );
};