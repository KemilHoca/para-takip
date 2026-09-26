export type AppTheme =
  | 'system'
  | 'light'
  | 'dark'
  | 'custom';

export interface CustomColors {
  bg: string;
  btn: string;
}

export type SortOption =
  | 'default'
  | 'cat_az'
  | 'cat_za'
  | 'name_az'
  | 'name_za';

export type FilterAssetType =
  | 'cash'
  | 'bank'
  | 'gold'
  | 'dollar';