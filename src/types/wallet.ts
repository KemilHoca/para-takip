import type { Assets } from './assets';
import type { Transaction } from './transaction';

export interface Wallet {
  id: string;
  name: string;
  profilePic: string;

  assets: Assets;
  transactions: Transaction[];
}