export interface BankAccountForm {
  id: string;
  name: string;
  amount: string;
}

export interface WalletSetupForm {
  name: string;

  cash: string;
  goldGrams: string;
  dollar: string;

  banks: BankAccountForm[];

  profilePic: string;
}

export interface ProfileEditForm {
  name: string;
  profilePic: string;
}