export type CrossWalletSourceType =
  | 'cash'
  | 'bank';

export interface CrossWalletTransferForm {
  targetWalletId: string | null;

  fromAsset: CrossWalletSourceType;
  fromBankId: string | null;

  amount: string;
  description: string;
}