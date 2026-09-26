export interface BankAccount {
  id: string;
  name: string;
  amount: number;
}

export interface Assets {
  cash: number;
  goldGrams: number;
  dollar: number;
  banks: BankAccount[];
}