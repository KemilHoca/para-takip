export type TransactionType = 'gelir' | 'gider';

export type AssetType =
  | 'cash'
  | 'bank'
  | 'gold'
  | 'dollar';

export interface TransactionProduct {
  id: string;
  name: string;
  price: string;
}

export interface Transaction {
  id: string;

  groupId?: string;

  type: TransactionType;
  assetType: AssetType;

  selectedBankId?: string | null;

  category: string;
  txName: string;

  description?: string;
  placeName?: string;

  products?: TransactionProduct[];

  amount: number;

  isCart?: boolean;
  isExchange?: boolean;

  exchangedTL?: number;

  date: string;
  time: string;

  remainingBalance?: number;
}