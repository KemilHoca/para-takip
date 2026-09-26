import type { Assets } from '../types/assets';
import type { Transaction } from '../types/transaction';
import type { NewTransactionForm } from '../types/transactionForm';

import {
  formatDate,
  formatTime,
} from '../utils/date';

import {
  parseAssetAmount,
  parseAmount,
} from '../utils/currency';

export interface DeleteTransactionResult {
  assets: Assets;
  transactions: Transaction[];
}

export const deleteTransaction = (
  tx: Transaction,
  assets: Assets,
  transactions: Transaction[]
): DeleteTransactionResult => {
  const updatedAssets: Assets = JSON.parse(
    JSON.stringify(assets)
  );

  const txsToRemove = tx.groupId
    ? transactions.filter(
        transaction =>
          transaction.groupId === tx.groupId
      )
    : [tx];

  txsToRemove.forEach(transaction => {
    const amount =
      Number(transaction.amount) || 0;

    // Gideri siliyorsak para/varlık geri gelir.
    // Geliri siliyorsak para/varlık geri çıkar.
    const reverseAmount =
      transaction.type === 'gider'
        ? amount
        : -amount;

    switch (transaction.assetType) {
      case 'cash': {
        updatedAssets.cash += reverseAmount;
        break;
      }

      case 'bank': {
        if (!transaction.selectedBankId) {
          break;
        }

        const bank = updatedAssets.banks.find(
          item =>
            item.id === transaction.selectedBankId
        );

        if (bank) {
          bank.amount += reverseAmount;
        }

        break;
      }

      case 'gold': {
        updatedAssets.goldGrams += reverseAmount;
        break;
      }

      case 'dollar': {
        updatedAssets.dollar += reverseAmount;
        break;
      }
    }
  });

  const idsToRemove = new Set(
    txsToRemove.map(transaction => transaction.id)
  );

  const updatedTransactions =
    transactions.filter(
      transaction =>
        !idsToRemove.has(transaction.id)
    );

  return {
    assets: updatedAssets,
    transactions: updatedTransactions,
  };
};

export interface EditTransactionResult {
  assets: Assets;
  transactions: Transaction[];
}

export const editTransaction = (
  editData: Transaction,
  assets: Assets,
  transactions: Transaction[]
): EditTransactionResult | null => {
  const oldTransaction = transactions.find(
    transaction => transaction.id === editData.id
  );

  if (!oldTransaction) {
    return null;
  }

  const updatedAssets: Assets = JSON.parse(
    JSON.stringify(assets)
  );

  const amount = Number(oldTransaction.amount) || 0;

  const accountChanged =
    oldTransaction.assetType !== editData.assetType ||
    oldTransaction.selectedBankId !== editData.selectedBankId;

  if (accountChanged) {
    // Önce eski işlemin bakiye etkisini geri al
    const reverseModifier =
      oldTransaction.type === 'gider'
        ? amount
        : -amount;

    if (oldTransaction.assetType === 'cash') {
      updatedAssets.cash += reverseModifier;
    }

    else if (oldTransaction.assetType === 'bank') {
      const oldBank = updatedAssets.banks.find(
        bank =>
          bank.id === oldTransaction.selectedBankId
      );

      if (oldBank) {
        oldBank.amount += reverseModifier;
      }
    }

    // Ardından aynı işlemi yeni hesaba uygula
    const applyModifier =
      oldTransaction.type === 'gider'
        ? -amount
        : amount;

    if (editData.assetType === 'cash') {
      updatedAssets.cash += applyModifier;
    }

    else if (editData.assetType === 'bank') {
      const newBank = updatedAssets.banks.find(
        bank =>
          bank.id === editData.selectedBankId
      );

      if (newBank) {
        newBank.amount += applyModifier;
      }
    }
  }

  const updatedTransactions =
    transactions.map(transaction => {
      if (transaction.id !== editData.id) {
        return transaction;
      }

      return {
        ...transaction,

        txName: editData.txName,
        category: editData.category,
        description: editData.description,

        assetType: editData.assetType,
        selectedBankId: editData.selectedBankId,
      };
    });

  return {
    assets: updatedAssets,
    transactions: updatedTransactions,
  };
};

export interface TransactionOperationResult {
  assets: Assets;
  transactions: Transaction[];
}

export const createStandardTransaction = (
  form: NewTransactionForm,
  assets: Assets,
  amount: number
): TransactionOperationResult | null => {
  // Bu fonksiyon yalnızca normal gelir/gider içindir.
  if (
    form.type !== 'gelir' &&
    form.type !== 'gider'
  ) {
    return null;
  }

  const updatedAssets: Assets = JSON.parse(
    JSON.stringify(assets)
  );

  const amountModifier =
    form.type === 'gider'
      ? -amount
      : amount;

  let remainingBalance = 0;

  if (form.assetType === 'cash') {
    updatedAssets.cash += amountModifier;
    remainingBalance = updatedAssets.cash;
  }

  else if (form.assetType === 'gold') {
    updatedAssets.goldGrams += amountModifier;
    remainingBalance = updatedAssets.goldGrams;
  }

  else if (form.assetType === 'dollar') {
    updatedAssets.dollar += amountModifier;
    remainingBalance = updatedAssets.dollar;
  }

  else if (form.assetType === 'bank') {
    if (!form.selectedBankId) {
      return null;
    }

    const bank = updatedAssets.banks.find(
      item => item.id === form.selectedBankId
    );

    if (!bank) {
      return null;
    }

    bank.amount += amountModifier;
    remainingBalance = bank.amount;
  }

  const transaction: Transaction = {
    id: Math.random().toString(),

    type: form.type,
    assetType: form.assetType,
    selectedBankId: form.selectedBankId,

    category:
      form.type === 'gelir'
        ? 'Giriş'
        : form.category,

    txName: form.txName,
    description: form.description,
    placeName: form.placeName,

    products: form.products,

    amount,

    isCart:
      form.type === 'gider' &&
      [
        'Market',
        'Giyim',
        'Online Alışveriş',
        'Restoran',
      ].includes(form.category),

    date: formatDate(form.date),
    time: formatTime(form.time),

    remainingBalance,
  };

  return {
    assets: updatedAssets,
    transactions: [transaction],
  };
};

export const createAccountTransfer = (
  form: NewTransactionForm,
  assets: Assets,
  amount: number
): TransactionOperationResult | null => {
  if (form.type !== 'aktarim') {
    return null;
  }

  if (
    !form.transferTo ||
    form.transferFrom === form.transferTo
  ) {
    return null;
  }

  const updatedAssets: Assets = JSON.parse(
    JSON.stringify(assets)
  );

  const groupId = Math.random().toString();

  // Kaynak hesaptan düş
  if (form.transferFrom === 'cash') {
    updatedAssets.cash -= amount;
  } else {
    const sourceBank = updatedAssets.banks.find(
      bank => bank.id === form.transferFrom
    );

    if (!sourceBank) {
      return null;
    }

    sourceBank.amount -= amount;
  }

  // Hedef hesaba ekle
  if (form.transferTo === 'cash') {
    updatedAssets.cash += amount;
  } else {
    const targetBank = updatedAssets.banks.find(
      bank => bank.id === form.transferTo
    );

    if (!targetBank) {
      return null;
    }

    targetBank.amount += amount;
  }

  const date = formatDate(form.date);
  const time = formatTime(form.time);

  const outgoingTransaction: Transaction = {
    id: Math.random().toString(),
    groupId,

    type: 'gider',

    assetType:
      form.transferFrom === 'cash'
        ? 'cash'
        : 'bank',

    selectedBankId:
      form.transferFrom === 'cash'
        ? null
        : form.transferFrom,

    category: 'Aktarım',

    txName:
      form.txName || 'Aktarım Çıkışı',

    description: form.description,

    amount,
    date,
    time,

    remainingBalance:
      form.transferFrom === 'cash'
        ? updatedAssets.cash
        : updatedAssets.banks.find(
            bank => bank.id === form.transferFrom
          )?.amount ?? 0,
  };

  const incomingTransaction: Transaction = {
    id: Math.random().toString(),
    groupId,

    type: 'gelir',

    assetType:
      form.transferTo === 'cash'
        ? 'cash'
        : 'bank',

    selectedBankId:
      form.transferTo === 'cash'
        ? null
        : form.transferTo,

    category: 'Aktarım',

    txName:
      form.txName || 'Aktarım Girişi',

    description: form.description,

    amount,
    date,
    time,

    remainingBalance:
      form.transferTo === 'cash'
        ? updatedAssets.cash
        : updatedAssets.banks.find(
            bank => bank.id === form.transferTo
          )?.amount ?? 0,
  };

  return {
    assets: updatedAssets,
    transactions: [
      outgoingTransaction,
      incomingTransaction,
    ],
  };
};

export const createInvestmentPurchase = (
  form: NewTransactionForm,
  assets: Assets,
  amount: number
): TransactionOperationResult | null => {
  if (
    form.type !== 'gider' ||
    form.category !== 'Yatırım'
  ) {
    return null;
  }

  // Yatırım alışı yalnızca TL kaynağından yapılabilir.
  if (
    form.assetType !== 'cash' &&
    form.assetType !== 'bank'
  ) {
    return null;
  }

  const updatedAssets: Assets = JSON.parse(
    JSON.stringify(assets)
  );

  const receivedAmount =
    parseAssetAmount(form.investAmount);

  const groupId = Math.random().toString();

  // TL kaynağından tutarı düş
  if (form.assetType === 'cash') {
    updatedAssets.cash -= amount;
  } else {
    if (!form.selectedBankId) {
      return null;
    }

    const bank = updatedAssets.banks.find(
      item => item.id === form.selectedBankId
    );

    if (!bank) {
      return null;
    }

    bank.amount -= amount;
  }

  // Alınan yatırım varlığını ekle
  if (form.investTarget === 'gold') {
    updatedAssets.goldGrams += receivedAmount;
  } else {
    updatedAssets.dollar += receivedAmount;
  }

  const date = formatDate(form.date);
  const time = formatTime(form.time);

  const outgoingTransaction: Transaction = {
    id: Math.random().toString(),
    groupId,

    type: 'gider',
    assetType: form.assetType,

    selectedBankId:
        form.assetType === 'bank'
        ? form.selectedBankId
        : null,

    category: 'Yatırım',

    txName:
      form.txName || 'Yatırım Alış',

    placeName: form.investPlace,

    amount,
    date,
    time,

    remainingBalance:
      form.assetType === 'cash'
        ? updatedAssets.cash
        : updatedAssets.banks.find(
            bank =>
              bank.id === form.selectedBankId
          )?.amount ?? 0,
  };

  const incomingTransaction: Transaction = {
    id: Math.random().toString(),
    groupId,

    type: 'gelir',
    assetType: form.investTarget,

    category: 'Yatırım',
    txName: 'Alınan Varlık',

    placeName: form.investPlace,

    amount: receivedAmount,
    date,
    time,

    remainingBalance:
      form.investTarget === 'gold'
        ? updatedAssets.goldGrams
        : updatedAssets.dollar,
  };

  return {
    assets: updatedAssets,
    transactions: [
      outgoingTransaction,
      incomingTransaction,
    ],
  };
};

export const createExchangeSale = (
  form: NewTransactionForm,
  assets: Assets,
  amount: number
): TransactionOperationResult | null => {
  if (
    form.type !== 'gider' ||
    (
      form.assetType !== 'gold' &&
      form.assetType !== 'dollar'
    )
  ) {
    return null;
  }

  const updatedAssets: Assets = JSON.parse(
    JSON.stringify(assets)
  );

  const tlGained =
    parseAmount(form.exchangedTL);

  if (tlGained <= 0) {
    return null;
  }

  const groupId = Math.random().toString();

  // Satılan yatırım varlığını düş
  if (form.assetType === 'gold') {
    updatedAssets.goldGrams -= amount;
  } else {
    updatedAssets.dollar -= amount;
  }

  // Gelen TL'yi hedef hesaba ekle
  if (form.exchangeTarget === 'cash') {
    updatedAssets.cash += tlGained;
  } else {
    const bank = updatedAssets.banks.find(
      item => item.id === form.exchangeTarget
    );

    if (!bank) {
      return null;
    }

    bank.amount += tlGained;
  }

  const date = formatDate(form.date);
  const time = formatTime(form.time);

  const assetOutgoingTransaction: Transaction = {
    id: Math.random().toString(),
    groupId,

    type: 'gider',
    assetType: form.assetType,

    category: 'Bozdurma',
    txName:
      form.txName || 'Yatırım Bozdurma',

    placeName: form.exchangePlace,

    amount,
    date,
    time,

    remainingBalance:
      form.assetType === 'gold'
        ? updatedAssets.goldGrams
        : updatedAssets.dollar,
  };

  const tlIncomingTransaction: Transaction = {
    id: Math.random().toString(),
    groupId,

    type: 'gelir',

    assetType:
      form.exchangeTarget === 'cash'
        ? 'cash'
        : 'bank',

    selectedBankId:
      form.exchangeTarget === 'cash'
        ? null
        : form.exchangeTarget,

    category: 'Bozdurma',

    txName: 'Bozdurma TL Girişi',

    placeName: form.exchangePlace,

    amount: tlGained,
    date,
    time,

    remainingBalance:
      form.exchangeTarget === 'cash'
        ? updatedAssets.cash
        : updatedAssets.banks.find(
            bank =>
              bank.id === form.exchangeTarget
          )?.amount ?? 0,
  };

  return {
    assets: updatedAssets,
    transactions: [
      assetOutgoingTransaction,
      tlIncomingTransaction,
    ],
  };
};