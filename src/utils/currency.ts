type AmountValue = string | number | null | undefined;

export const parseAmount = (val: AmountValue): number => {
  if (typeof val === 'number') return val;
  if (!val) return 0;

  const parsed = parseFloat(
    val.toString().replace(/\./g, '').replace(',', '.')
  );

  return isNaN(parsed) ? 0 : parsed;
};

export const formatAmount = (num: AmountValue): string => {
  return Number(num || 0).toLocaleString('tr-TR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

export const parseAssetAmount = (val: AmountValue): number => {
  if (typeof val === 'number') return val;
  if (!val) return 0;

  const parsed = parseFloat(
    val.toString().replace(',', '.')
  );

  return isNaN(parsed) ? 0 : parsed;
};

export const formatAssetAmount = (num: AmountValue): string => {
  return Number(num || 0).toLocaleString('tr-TR');
};