import type {
  AssetType,
  TransactionProduct,
} from './transaction';

export type NewTransactionType =
  | 'gelir'
  | 'gider'
  | 'aktarim';

export type InvestmentTarget =
  | 'gold'
  | 'dollar';

export interface NewTransactionForm {
  type: NewTransactionType;

  assetType: AssetType;
  selectedBankId: string | null;

  category: string;

  txName: string;
  description: string;
  placeName: string;

  products: TransactionProduct[];

  amount: string;

  // Altın / dolar bozdurma
  exchangedTL: string;
  exchangeTarget: string;
  exchangePlace: string;

  // Yatırım alış
  investTarget: InvestmentTarget;
  investAmount: string;
  investPlace: string;

  // Hesaplar arası aktarım
  transferFrom: string;
  transferTo: string | null;

  date: Date;
  time: Date;
}