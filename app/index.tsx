import React, { useState, useEffect } from 'react';
import { 
  View, Text, TouchableOpacity, ScrollView, SafeAreaView, 
  Modal, TextInput, Alert, Dimensions, useColorScheme, Platform, StatusBar, BackHandler
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import {
  loadAppData,
  saveAppData,
} from '../src/services/storageService';
import {
  updateWalletById,
  createWallet,
  createAssetsFromSetup,
  deleteWalletById,
} from '../src/services/walletService';
import {
  deleteTransaction,
  editTransaction,
  createStandardTransaction,
  createAccountTransfer,
  createInvestmentPurchase,
  createExchangeSale,
} from '../src/services/transactionService';


import type { Wallet } from '../src/types/wallet';
import type { Transaction } from '../src/types/transaction';
import type { NewTransactionForm } from '../src/types/transactionForm';
import type {
  WalletSetupForm,
  ProfileEditForm,
} from '../src/types/walletForm';
import type { CrossWalletTransferForm } from '../src/types/transferForm';
import type {
  AppTheme,
  CustomColors,
  SortOption,
  FilterAssetType,
} from '../src/types/ui';

import { formatDate, formatTime } from '../src/utils/date';

import {
  parseAmount,
  formatAmount,
  parseAssetAmount,
  formatAssetAmount,
} from '../src/utils/currency';

import { COLORS } from '../src/constants/colors';
import { PROFILE_ICONS } from '../src/constants/profileIcons';

import {
  EXPENSE_CATEGORIES,
  CART_CATEGORIES,
} from '../src/constants/categories';

const { height, width } = Dimensions.get('window');
const STATUSBAR_HEIGHT = Platform.OS === 'android' ? StatusBar.currentHeight : 0;

export default function App() {
  const systemColorScheme = useColorScheme();

  // --- DURUM YÖNETİMİ (STATE) ---
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [activeWalletId, setActiveWalletId] = useState<string | null>(null);
  const [appTheme, setAppTheme] = useState<AppTheme>('system'); 
  const [customColors, setCustomColors] = useState<CustomColors>({ bg: '#0F172A', btn: '#14B8A6' });

  // Arayüz Modalları
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isSetupVisible, setIsSetupVisible] = useState(false);
  const [isEditingAssets, setIsEditingAssets] = useState(false);
  const [isProfileModalVisible, setIsProfileModalVisible] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isBalanceModalVisible, setIsBalanceModalVisible] = useState(false);
  const [isEditTxModalVisible, setIsEditTxModalVisible] = useState(false);
  const [isCrossWalletModalVisible, setIsCrossWalletModalVisible] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false); // V0.8.2 Çıkış Uyarı Modalı
  
  const [showAssets, setShowAssets] = useState(false);
  const [showBanksList, setShowBanksList] = useState(false);
  const [balanceViewType, setBalanceViewType] = useState('Toplam (TL)');
  const [showWalletOptions, setShowWalletOptions] = useState(false);

  // Arama, Filtre ve Sıralama 
  const [searchQuery, setSearchQuery] = useState('');
  const [isFilterModalVisible, setIsFilterModalVisible] = useState(false);
  const [sortOption, setSortOption] = useState<SortOption>('default'); 
  const [filterCats, setFilterCats] = useState<string[]>([]);
  const [filterAssets, setFilterAssets] = useState<FilterAssetType[]>([]);
  const [filterDate, setFilterDate] = useState<Date | null>(null);
  
  const [tempSortOption, setTempSortOption] = useState('default');
  const [tempFilterCats, setTempFilterCats] = useState([]);
  const [tempFilterAssets, setTempFilterAssets] = useState([]);
  const [tempFilterDate, setTempFilterDate] = useState(null);
  const [showFilterDatePicker, setShowFilterDatePicker] = useState(false);

  // Takvim/Saat Seçiciler
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  // Cüzdan Silme
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  // Form Verileri (Adım Adım Sihirbaz)
  const [txStep, setTxStep] = useState(1);
  const [setupData, setSetupData] = useState<WalletSetupForm>({ name: '', cash: '', goldGrams: '', dollar: '', banks: [], profilePic: 'person' });
  const [profileEditData, setProfileEditData] = useState<ProfileEditForm>({ name: '', profilePic: 'person' });
  const [newTx, setNewTx] = useState<NewTransactionForm>(
    getInitialTxState()
  );
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [editTxData, setEditTxData] = useState<Transaction | null>(null);
  const [isDetailsVisible, setIsDetailsVisible] = useState(false);
  
  const [crossWalletData, setCrossWalletData] = useState<CrossWalletTransferForm>({ targetWalletId: null, fromAsset: 'cash', fromBankId: null, amount: '', description: '' });

  const activeWallet = wallets.find(w => w.id === activeWalletId) || null;
  const assets = activeWallet ? activeWallet.assets : { cash: 0, goldGrams: 0, dollar: 0, banks: [] };
  const transactions = activeWallet ? activeWallet.transactions : [];

  const sortedWallets = [...wallets].sort((a, b) => {
    if (a.id === activeWalletId) return -1;
    if (b.id === activeWalletId) return 1;
    return 0;
  });
  const targetWallets = sortedWallets.filter(w => w.id !== activeWalletId);

  // --- ANDROID GERİ TUŞU YÖNETİMİ ---
  useEffect(() => {
    const backAction = () => {
      if (showDatePicker) { setShowDatePicker(false); return true; }
      if (showTimePicker) { setShowTimePicker(false); return true; }
      if (showFilterDatePicker) { setShowFilterDatePicker(false); return true; }
      if (showWalletOptions) { setShowWalletOptions(false); return true; }
      if (showDeleteConfirm) { setShowDeleteConfirm(false); return true; }
      if (isProfileModalVisible) { setIsProfileModalVisible(false); return true; }
      if (isEditTxModalVisible) { setIsEditTxModalVisible(false); return true; }
      if (isCrossWalletModalVisible) { setIsCrossWalletModalVisible(false); return true; }
      
      // Modal içi adım geri gitme
      if (isModalVisible) {
        if (txStep > 1) { setTxStep(txStep - 1); return true; }
        else { setIsModalVisible(false); return true; }
      }

      if (isDetailsVisible) { setIsDetailsVisible(false); return true; }
      if (isFilterModalVisible) { setIsFilterModalVisible(false); return true; }
      if (isBalanceModalVisible) { setIsBalanceModalVisible(false); return true; }
      if (isEditingAssets) { setIsEditingAssets(false); return true; }
      if (isDrawerOpen) { setIsDrawerOpen(false); return true; }
      if (isSetupVisible && wallets.length > 0) { setIsSetupVisible(false); return true; }
      
      // V0.8.2 - Çıkış Onayı Yönetimi
      if (showExitConfirm) {
        BackHandler.exitApp(); // Uyarı açıkken tekrar basarsa çıkar
        return true;
      } else {
        setShowExitConfirm(true); // Hiçbir şey açık değilse uyarıyı göster
        return true;
      }
    };
    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [isModalVisible, txStep, isDetailsVisible, isDrawerOpen, isFilterModalVisible, isBalanceModalVisible, isEditingAssets, isProfileModalVisible, isSetupVisible, isEditTxModalVisible, isCrossWalletModalVisible, wallets, showDatePicker, showTimePicker, showFilterDatePicker, showWalletOptions, showDeleteConfirm, showExitConfirm]);

  // --- YÜKLEME / KAYDETME ---
  useEffect(() => { loadData(); }, []);
  useEffect(() => { if (isDataLoaded) saveData(); }, [wallets, activeWalletId, appTheme, customColors]);

  const loadData = async () => {
    try {
      const data = await loadAppData();

      setWallets(data.wallets);

      if (data.activeWalletId) {
        setActiveWalletId(data.activeWalletId);
      }

      if (data.appTheme) {
        setAppTheme(data.appTheme);
      }

      if (data.customColors) {
        setCustomColors(data.customColors);
      }

      setIsDataLoaded(true);

      if (data.wallets.length === 0) {
        setIsSetupVisible(true);
      }
    } catch (e) {
      console.error('Veri yüklenemedi', e);
    }
  };

  const saveData = async () => {
    try {
      await saveAppData(
        wallets,
        activeWalletId,
        appTheme,
        customColors
      );
    } catch (e) {
      console.error('Veri kaydedilemedi', e);
    }
  };

  function getInitialTxState(): NewTransactionForm {
    const now = new Date();
    return {
      type: 'gider', assetType: 'cash', selectedBankId: null, category: '', 
      txName: '', description: '', placeName: '', 
      products: [{ id: 'p1', name: '', price: '' }], amount: '', 
      exchangedTL: '', exchangeTarget: 'cash', exchangePlace: '',
      investTarget: 'gold', investAmount: '', investPlace: '',
      transferFrom: 'cash', transferTo: null,
      date: now, time: now
    };
  }

  const openNewTxModal = () => {
    setSearchQuery('');
    setNewTx(getInitialTxState());
    setTxStep(1);
    setIsModalVisible(true);
  };

  const renderTxIcon = (tx, themeObj) => {
    if (tx.category === 'Aktarım' || tx.category === 'Cüzdan Transferi') return <Ionicons name="swap-vertical" size={24} color={themeObj.text} />;
    if (tx.category === 'Bozdurma') return <Ionicons name="swap-horizontal" size={24} color={themeObj.text} />;
    if (tx.category === 'Giriş' || tx.type === 'gelir') return <Text style={{color: themeObj.primary, fontSize:20, fontWeight:'bold'}}>+{tx.assetType==='gold'?'Au':tx.assetType==='dollar'?'$':'₺'}</Text>;
    if (tx.category === 'Yatırım') return <Ionicons name="trending-up" size={24} color={themeObj.text} />;
    if (tx.category === 'Market') return <Ionicons name="cart" size={24} color={themeObj.text} />;
    if (tx.category === 'Giyim') return <Ionicons name="shirt" size={24} color={themeObj.text} />;
    if (tx.category === 'Restoran') return <Ionicons name="restaurant" size={24} color={themeObj.text} />;
    if (tx.category === 'Abonelik') return <Ionicons name="card" size={24} color={themeObj.text} />;
    if (tx.category === 'Online Alışveriş') return <Ionicons name="globe" size={24} color={themeObj.text} />;
    if (tx.category === 'Fatura') return <Ionicons name="document-text" size={24} color={themeObj.text} />;
    if (tx.category === 'Diğer') return <Ionicons name="grid" size={24} color={themeObj.text} />;
    return <Ionicons name="pricetag" size={24} color={themeObj.text} />;
  };

  const t = appTheme === 'custom' ? { bg: customColors.bg, card: '#1A1A1A', text: '#FFF', subText: '#999', border: '#333', primary: customColors.btn } 
        : appTheme === 'system' ? COLORS[systemColorScheme || 'dark'] : COLORS[appTheme];

  const updateActiveWallet = (
    updates: Partial<Wallet>
  ) => { 
    if (!activeWalletId) return;
    setWallets(
      updateWalletById(
        wallets,
        activeWalletId,
        updates
      )
    );
  };

  // --- CÜZDAN KAYDET/SİL ---
  const handleSaveSetup = () => {
    if (!setupData.name.trim() && !isEditingAssets) {
      Alert.alert(
        'Hata',
        'Lütfen cüzdan adı girin.'
      );
      return;
    }

    if (isEditingAssets) {
      const newAssets =
        createAssetsFromSetup(setupData);

      updateActiveWallet({
        assets: newAssets,
      });

      setIsEditingAssets(false);
    } else {
      const newWallet =
        createWallet(setupData);

      setWallets([
        ...wallets,
        newWallet,
      ]);

      setActiveWalletId(newWallet.id);
      setIsSetupVisible(false);
    }
  };

  const handleDeleteWallet = () => {
    if (!activeWalletId) return;

    const result = deleteWalletById(
      wallets,
      activeWalletId
    );

    setWallets(result.wallets);
    setActiveWalletId(
      result.nextActiveWalletId
    );

    setShowDeleteConfirm(false);
    setDeleteConfirmText('');
    setIsEditingAssets(false);

    if (result.wallets.length === 0) {
      setIsSetupVisible(true);
    }
  };

  const handleSaveProfile = () => {
    if (!profileEditData.name.trim()) { Alert.alert("Hata", "İsim boş olamaz."); return; }
    updateActiveWallet({ name: profileEditData.name, profilePic: profileEditData.profilePic });
    setIsProfileModalVisible(false);
  };

  // --- GELİŞMİŞ FİLTRELEME ---
  const openFilterModal = () => {
    setTempSortOption(sortOption);
    setTempFilterCats([...filterCats]);
    setTempFilterAssets([...filterAssets]);
    setTempFilterDate(filterDate);
    setIsFilterModalVisible(true);
  };

  const applyFilters = () => {
    setSortOption(tempSortOption);
    setFilterCats([...tempFilterCats]);
    setFilterAssets([...tempFilterAssets]);
    setFilterDate(tempFilterDate);
    setIsFilterModalVisible(false);
  };

  const handleDateSelect = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) setNewTx({...newTx, date: selectedDate});
  };
  const handleTimeSelect = (event, selectedTime) => {
    setShowTimePicker(false);
    if (selectedTime) setNewTx({...newTx, time: selectedTime});
  };

  // --- İŞLEM SİLME (ROLLBACK) ---
  const promptDeleteTx = (tx) => {
    Alert.alert(
      "İşlemi Sil", 
      "Bu işlemi silmek istediğinize emin misiniz? Yapılan bakiye değişikliği geri alınacaktır.", 
      [
        { text: "İptal", style: "cancel" },
        { text: "Evet, Sil", style: "destructive", onPress: () => executeDeleteTx(tx) }
      ]
    );
  };

  const executeDeleteTx = (
    tx: Transaction
  ) => {
    const result = deleteTransaction(
      tx,
      assets,
      transactions
    );

    updateActiveWallet({
      assets: result.assets,
      transactions: result.transactions,
    });

    setIsDetailsVisible(false);
    setSelectedTx(null);
  };

  // --- İŞLEM DÜZENLEME (KISITLI) ---
  const promptEditTx = (tx) => {
    if (tx.groupId) {
      Alert.alert("Uyarı", "Aktarım veya yatırım işlemleri düzenlenemez, ancak silebilirsiniz.");
      return;
    }
    if (tx.assetType === 'gold' || tx.assetType === 'dollar') {
      Alert.alert("Uyarı", "Altın ve Dolar işlemleri düzenlenemez, lütfen işlemi silip tekrar girin.");
      return;
    }
    setEditTxData({ ...tx });
    setIsEditTxModalVisible(true);
    setIsDetailsVisible(false);
  };

  const handleSaveEditTx = () => {
    if (!editTxData) return;

    if (!editTxData.txName.trim()) {
      Alert.alert(
        'Hata',
        'İşlem adı boş olamaz.'
      );
      return;
    }

    const result = editTransaction(
      editTxData,
      assets,
      transactions
    );

    if (!result) {
      Alert.alert(
        'Hata',
        'Düzenlenecek işlem bulunamadı.'
      );
      return;
    }

    updateActiveWallet({
      assets: result.assets,
      transactions: result.transactions,
    });

    setIsEditTxModalVisible(false);
    setSelectedTx(null);
  };

  // --- CÜZDANLAR ARASI TRANSFER ---
  const executeCrossWalletTransfer = () => {
    const amt = parseAmount(crossWalletData.amount);
    if (amt <= 0) { Alert.alert("Hata", "Geçerli bir tutar girin."); return; }
    if (!crossWalletData.targetWalletId) { Alert.alert("Hata", "Hedef cüzdan seçin."); return; }

    const targetW = wallets.find(w => w.id === crossWalletData.targetWalletId);
    let sourceAssets = JSON.parse(JSON.stringify(assets));
    
    if (crossWalletData.fromAsset === 'bank') {
      const b = sourceAssets.banks.find(bk => bk.id === crossWalletData.fromBankId);
      if (!b) return;
      if (b.amount < amt) { Alert.alert("Hata", "Yetersiz bakiye!"); return; }
      b.amount -= amt;
    } else {
      if (sourceAssets.cash < amt) { Alert.alert("Hata", "Yetersiz bakiye!"); return; }
      sourceAssets.cash -= amt;
    }

    let targetAssets = JSON.parse(JSON.stringify(targetW.assets));
    targetAssets.cash += amt;

    const dStr = formatDate(new Date());
    const tStr = formatTime(new Date());
    const groupId = Math.random().toString(); 

    const sourceTx = { 
      id: Math.random().toString(), groupId, type: 'gider', assetType: crossWalletData.fromAsset, 
      selectedBankId: crossWalletData.fromBankId, category: 'Cüzdan Transferi', 
      txName: `${targetW.name} Cüzdanına Aktarım`, description: crossWalletData.description, 
      amount: amt, date: dStr, time: tStr, 
      remainingBalance: crossWalletData.fromAsset === 'bank' ? sourceAssets.banks.find(b=>b.id===crossWalletData.fromBankId).amount : sourceAssets.cash 
    };

    const targetTx = { 
      id: Math.random().toString(), groupId, type: 'gelir', assetType: 'cash', 
      category: 'Cüzdan Transferi', txName: `${activeWallet.name} Cüzdanından Gelen`, 
      description: crossWalletData.description, amount: amt, date: dStr, time: tStr, 
      remainingBalance: targetAssets.cash 
    };

    const updatedWallets = wallets.map(w => {
      if (w.id === activeWalletId) return { ...w, assets: sourceAssets, transactions: [sourceTx, ...w.transactions] };
      if (w.id === targetW.id) return { ...w, assets: targetAssets, transactions: [targetTx, ...w.transactions] };
      return w;
    });

    setWallets(updatedWallets);
    setIsCrossWalletModalVisible(false);
    setCrossWalletData({ targetWalletId: null, fromAsset: 'cash', fromBankId: null, amount: '', description: '' });
    setIsDrawerOpen(false);
  };


  // --- YENİ İŞLEM EKLEME (SIHIRBAZ) ---
  const handleAddTransaction = () => {
    let finalAmount = 0;
    const isCartCategory = CART_CATEGORIES.includes(newTx.category);
    const isExchangeSale = newTx.type === 'gider' && (newTx.assetType === 'gold' || newTx.assetType === 'dollar');
    const isInvestmentBuy = newTx.type === 'gider' && newTx.category === 'Yatırım' && !isExchangeSale;
    const isTransfer = newTx.type === 'aktarim';

    if (isTransfer || isInvestmentBuy) finalAmount = parseAmount(newTx.amount);
    else if (isExchangeSale) finalAmount = parseAssetAmount(newTx.amount); 
    else if (newTx.type === 'gider' && isCartCategory) finalAmount = newTx.products.reduce((sum, p) => sum + parseAmount(p.price), 0);
    else finalAmount = parseAmount(newTx.amount);

    if (finalAmount <= 0) { Alert.alert("Hata", "Lütfen geçerli bir tutar girin."); return; }
    if (newTx.type === 'gider' && newTx.assetType === 'cash' && assets.cash - finalAmount < 0) { Alert.alert("Hata", "Nakit eksiye düşemez!"); return; }
    if (newTx.type === 'gider' && newTx.assetType === 'gold' && assets.goldGrams - finalAmount < 0) { Alert.alert("Hata", "Altın eksiye düşemez!"); return; }
    if (isTransfer && newTx.transferFrom === 'cash' && assets.cash - finalAmount < 0) { Alert.alert("Hata", "Yeterli nakit yok!"); return; }
    
    if (!isTransfer && !isExchangeSale && !isInvestmentBuy && !isCartCategory && !newTx.txName.trim()) {
      Alert.alert("Hata", "Lütfen bir İşlem Adı girin."); return;
    }

    const updatedAssets = { ...assets };
    const newTransactions = [];
    const dStr = formatDate(newTx.date);
    const tStr = formatTime(newTx.time);
    const groupId = Math.random().toString();

    if (isTransfer) {
      const result = createAccountTransfer(
        newTx,
        assets,
        finalAmount
      );

      if (!result) {
        Alert.alert(
          'Hata',
          'Aktarım oluşturulamadı.'
        );
        return;
      }

      updatedAssets.cash =
        result.assets.cash;

      updatedAssets.goldGrams =
        result.assets.goldGrams;

      updatedAssets.dollar =
        result.assets.dollar;

      updatedAssets.banks =
        result.assets.banks;

      newTransactions.push(
        ...result.transactions
      );
    }
 
    else if (isInvestmentBuy) {
      const result = createInvestmentPurchase(
        newTx,
        assets,
        finalAmount
      );

      if (!result) {
        Alert.alert(
          'Hata',
          'Yatırım işlemi oluşturulamadı.'
        );
        return;
      }

      updatedAssets.cash =
        result.assets.cash;

      updatedAssets.goldGrams =
        result.assets.goldGrams;

      updatedAssets.dollar =
        result.assets.dollar;

      updatedAssets.banks =
        result.assets.banks;

      newTransactions.push(
        ...result.transactions
      );
    }

    else if (isExchangeSale) {
      const result = createExchangeSale(
        newTx,
        assets,
        finalAmount
      );

      if (!result) {
        Alert.alert(
          'Hata',
          'Bozdurma işlemi oluşturulamadı.'
        );
        return;
      }

      updatedAssets.cash =
        result.assets.cash;

      updatedAssets.goldGrams =
        result.assets.goldGrams;

      updatedAssets.dollar =
        result.assets.dollar;

      updatedAssets.banks =
        result.assets.banks;

      newTransactions.push(
        ...result.transactions
      );
    }
    else {
    const result = createStandardTransaction(
      newTx,
      assets,
      finalAmount
    );

    if (!result) {
      Alert.alert(
        'Hata',
        'İşlem oluşturulamadı.'
      );
      return;
    }

    updatedAssets.cash =
      result.assets.cash;

    updatedAssets.goldGrams =
      result.assets.goldGrams;

    updatedAssets.dollar =
      result.assets.dollar;

    updatedAssets.banks =
      result.assets.banks;

    newTransactions.push(
      ...result.transactions
    );
  }

    updateActiveWallet({ assets: updatedAssets, transactions: [...newTransactions, ...transactions] });
    setSearchQuery('');
    setIsModalVisible(false);
  };

  const getDisplayedBalance = () => {
    const totalBanks = assets.banks.reduce((sum, b) => sum + b.amount, 0);
    switch (balanceViewType) {
      case 'Nakit': return `₺${formatAmount(assets.cash)}`;
      case 'Banka': return `₺${formatAmount(totalBanks)}`;
      case 'Altın': return `${formatAssetAmount(assets.goldGrams)} Gram`;
      case 'Dolar': return `$${formatAssetAmount(assets.dollar)}`;
      default: return `₺${formatAmount(assets.cash + totalBanks)}`;
    }
  };

  // --- ARAMA & FİLTRELEME ---
  let filteredTx = [...transactions];
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    filteredTx = filteredTx.filter(tx => {
      const str = `${tx.txName||''} ${tx.category||''} ${tx.placeName||''} ${tx.description||''} ${tx.amount}`.toLowerCase();
      return str.includes(q);
    });
  }
  if (filterCats.length > 0) filteredTx = filteredTx.filter(tx => filterCats.includes(tx.category));
  if (filterAssets.length > 0) filteredTx = filteredTx.filter(tx => filterAssets.includes(tx.assetType));
  if (filterDate) filteredTx = filteredTx.filter(tx => tx.date === formatDate(filterDate));

  const grouped = {};
  filteredTx.forEach(tx => { if (!grouped[tx.date]) grouped[tx.date] = []; grouped[tx.date].push(tx); });

  const sortedDates = Object.keys(grouped).sort((a,b) => {
    const [d1, m1, y1] = a.split('.'); const [d2, m2, y2] = b.split('.');
    return new Date(y2, m2-1, d2) - new Date(y1, m1-1, d1);
  });

  sortedDates.forEach(date => {
    grouped[date].sort((a, b) => {
      if (sortOption === 'default') return b.time.localeCompare(a.time); 
      if (sortOption === 'cat_az') return (a.category||'').localeCompare(b.category||'');
      if (sortOption === 'cat_za') return (b.category||'').localeCompare(a.category||'');
      if (sortOption === 'name_az') return (a.txName||'').localeCompare(b.txName||''); 
      if (sortOption === 'name_za') return (b.txName||'').localeCompare(a.txName||''); 
      return 0; 
    });
  });

  if (!isDataLoaded) return <View style={{flex:1, backgroundColor: '#000'}} />;

  // --- EKRAN 1: KURULUM ---
  if (isSetupVisible || isEditingAssets) {
    return (
      <SafeAreaView style={{flex:1, backgroundColor: t.bg, paddingTop: STATUSBAR_HEIGHT}}>
        <ScrollView contentContainerStyle={{padding: 20, paddingBottom: 100}}>
          {isEditingAssets && <TouchableOpacity onPress={() => {setIsEditingAssets(false); setShowDeleteConfirm(false);}} style={{marginBottom:20}}><Ionicons name="arrow-back" size={28} color={t.text}/></TouchableOpacity>}
          <Text style={{color: t.text, fontSize: 28, fontWeight: 'bold', marginBottom: 20}}>{isEditingAssets ? 'Bakiyeyi Güncelle' : 'Yeni Cüzdan Oluştur'}</Text>
          
          {!isEditingAssets && (
            <View style={{marginBottom: 15}}>
              <Text style={{color: t.subText, fontSize: 14, marginBottom: 5}}>Cüzdan Adı</Text>
              <TextInput style={{backgroundColor: t.card, color: t.text, padding: 15, borderRadius: 12}} placeholder="Örn: Kişisel, Şirket" placeholderTextColor={t.subText} value={setupData.name} onChangeText={(text) => setSetupData({...setupData, name: text})} />
            </View>
          )}
          
          <View style={{marginBottom: 15}}>
            <Text style={{color: t.subText, fontSize: 14, marginBottom: 5}}>Nakit (TL)</Text>
            <TextInput style={{backgroundColor: t.card, color: t.text, padding: 15, borderRadius: 12}} keyboardType="numeric" placeholder="0,00" placeholderTextColor={t.subText} value={setupData.cash} onChangeText={(text) => setSetupData({...setupData, cash: text})} />
          </View>
          <View style={{marginBottom: 15}}>
            <Text style={{color: t.subText, fontSize: 14, marginBottom: 5}}>Altın (Gram)</Text>
            <TextInput style={{backgroundColor: t.card, color: t.text, padding: 15, borderRadius: 12}} keyboardType="numeric" placeholder="0" placeholderTextColor={t.subText} value={setupData.goldGrams} onChangeText={(text) => setSetupData({...setupData, goldGrams: text})} />
          </View>
          <View style={{marginBottom: 15}}>
            <Text style={{color: t.subText, fontSize: 14, marginBottom: 5}}>Dolar ($)</Text>
            <TextInput style={{backgroundColor: t.card, color: t.text, padding: 15, borderRadius: 12}} keyboardType="numeric" placeholder="0" placeholderTextColor={t.subText} value={setupData.dollar} onChangeText={(text) => setSetupData({...setupData, dollar: text})} />
          </View>
          
          <Text style={{color: t.text, fontSize: 20, fontWeight: 'bold', marginVertical: 15}}>Bankalar</Text>
          {setupData.banks.map((bank, index) => (
            <View key={bank.id || index} style={{flexDirection: 'row', marginBottom: 15}}>
              <TextInput style={{flex:2, backgroundColor: t.card, color: t.text, padding: 15, borderRadius: 12, marginRight: 10}} placeholder="Banka Adı" placeholderTextColor={t.subText} value={bank.name} onChangeText={(text) => { const b=[...setupData.banks]; b[index].name=text; setSetupData({...setupData, banks: b}); }} />
              <TextInput style={{flex:1.5, backgroundColor: t.card, color: t.text, padding: 15, borderRadius: 12, marginRight: 10}} keyboardType="numeric" placeholder="0,00" placeholderTextColor={t.subText} value={bank.amount} onChangeText={(text) => { const b=[...setupData.banks]; b[index].amount=text; setSetupData({...setupData, banks: b}); }} />
              <TouchableOpacity style={{justifyContent: 'center', alignItems: 'center', padding: 15, backgroundColor: t.card, borderRadius: 12}} onPress={() => setSetupData({...setupData, banks: setupData.banks.filter(x=>x.id!==bank.id)})}>
                <Ionicons name="trash" size={20} color="#FF6B6B" />
              </TouchableOpacity>
            </View>
          ))}
          <TouchableOpacity style={{padding: 15, borderRadius: 15, borderWidth: 1, borderColor: t.primary, alignItems: 'center', marginBottom: 15}} onPress={() => setSetupData({...setupData, banks: [...setupData.banks, { id: Math.random().toString(), name: '', amount: '' }]})}>
            <Text style={{color: t.primary, fontWeight: 'bold'}}>+ Banka Ekle</Text>
          </TouchableOpacity>

          <TouchableOpacity style={{backgroundColor: t.primary, padding: 15, borderRadius: 15, alignItems: 'center'}} onPress={handleSaveSetup}>
            <Text style={{color: '#FFF', fontSize: 18, fontWeight: 'bold'}}>Kaydet</Text>
          </TouchableOpacity>

          {isEditingAssets && !showDeleteConfirm && (
             <TouchableOpacity style={{marginTop: 15, padding: 15, alignItems: 'center'}} onPress={() => setShowDeleteConfirm(true)}>
               <Text style={{color: '#FF6B6B', fontSize: 16, fontWeight: 'bold'}}>🗑️ Cüzdanı Sil</Text>
             </TouchableOpacity>
          )}

          {isEditingAssets && showDeleteConfirm && (
             <View style={{marginTop: 15, padding: 15, backgroundColor: 'rgba(255,107,107,0.1)', borderRadius: 15, borderWidth: 1, borderColor: '#FF6B6B'}}>
               <Text style={{color: t.text, marginBottom: 10}}>Cüzdanı silmek istediğinize emin misiniz? Onaylamak için adını yazın:</Text>
               <Text style={{color: '#FF6B6B', fontWeight: 'bold', marginBottom: 10}}>{activeWallet?.name}</Text>
               <TextInput style={{backgroundColor: t.bg, color: t.text, padding: 15, borderRadius: 12, marginBottom: 10}} value={deleteConfirmText} onChangeText={setDeleteConfirmText} placeholder="Cüzdan adını yazın" placeholderTextColor={t.subText} />
               <View style={{flexDirection: 'row', gap: 10}}>
                  <TouchableOpacity style={{flex: 1, padding: 15, backgroundColor: t.bg, borderRadius: 10, alignItems: 'center'}} onPress={() => { setShowDeleteConfirm(false); setDeleteConfirmText(''); }}>
                     <Text style={{color: t.text, fontWeight: 'bold'}}>İptal</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={{flex: 1, padding: 15, backgroundColor: deleteConfirmText === activeWallet?.name ? '#FF6B6B' : '#555', borderRadius: 10, alignItems: 'center'}} disabled={deleteConfirmText !== activeWallet?.name} onPress={handleDeleteWallet}>
                     <Text style={{color: '#FFF', fontWeight: 'bold'}}>Sil</Text>
                  </TouchableOpacity>
               </View>
             </View>
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }

  // --- EKRAN 2: ANA UYGULAMA ---
  return (
    <SafeAreaView style={{flex: 1, backgroundColor: t.bg, paddingTop: STATUSBAR_HEIGHT}}>
      
      {/* V0.8.2 ÇIKIŞ ONAY MODALI */}
      <Modal visible={showExitConfirm} animationType="fade" transparent={true}>
        <View style={{flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center'}}>
          <View style={{backgroundColor: t.card, width: '85%', borderRadius: 20, padding: 25, alignItems: 'center'}}>
            <Ionicons name="exit-outline" size={50} color={t.text} style={{marginBottom: 15}} />
            <Text style={{color: t.text, fontSize: 20, fontWeight: 'bold', textAlign: 'center', marginBottom: 25}}>Uygulamadan çıkmak istediğinize emin misiniz?</Text>
            <View style={{flexDirection: 'row', gap: 15}}>
              <TouchableOpacity style={{flex: 1, padding: 15, backgroundColor: t.bg, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: t.border}} onPress={() => setShowExitConfirm(false)}>
                <Text style={{color: t.text, fontWeight: 'bold', fontSize: 16}}>Hayır</Text>
              </TouchableOpacity>
              <TouchableOpacity style={{flex: 1, padding: 15, backgroundColor: '#FF6B6B', borderRadius: 12, alignItems: 'center'}} onPress={() => BackHandler.exitApp()}>
                <Text style={{color: '#FFF', fontWeight: 'bold', fontSize: 16}}>Evet, Çık</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ÜST BAR */}
      <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, height: 60}}>
        <TouchableOpacity onPress={() => setIsDrawerOpen(true)}>
          <Ionicons name="menu" size={32} color={t.text} />
        </TouchableOpacity>
        <TouchableOpacity onPress={openNewTxModal}>
          <Ionicons name="add-circle" size={36} color={t.primary} />
        </TouchableOpacity>
      </View>

      {/* STATİK BAKİYE */}
      <View style={{justifyContent: 'center', alignItems: 'center', paddingVertical: 10}}>
        <TouchableOpacity onPress={() => setIsBalanceModalVisible(true)} style={{alignItems: 'center'}}>
          <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: 5}}>
            <Text style={{color: t.subText, fontSize: 18}}>{balanceViewType === 'Nakit' || balanceViewType === 'Banka' ? `${balanceViewType} (TL) Bakiyesi` : `${balanceViewType} Bakiyesi`}</Text>
            <Ionicons name="chevron-down" size={18} color={t.subText} style={{marginLeft: 5}}/>
          </View>
          <Text style={{color: t.text, fontSize: 52, fontWeight: 'bold', textAlign: 'center'}}>{getDisplayedBalance()}</Text>
        </TouchableOpacity>
      </View>

      {/* VARLIKLARIM */}
      <View style={{paddingHorizontal: 20, paddingBottom: 15}}>
        <TouchableOpacity style={{flexDirection: 'row', alignItems: 'center', paddingVertical: 10, justifyContent: 'center'}} onPress={() => setShowAssets(!showAssets)}>
          <Text style={{color: t.primary, fontSize: 16, fontWeight: 'bold', marginRight: 5}}>Tüm Varlıklarım</Text>
          <Ionicons name={showAssets ? "chevron-up" : "chevron-down"} size={20} color={t.primary} />
        </TouchableOpacity>
        
        {showAssets && (
          <View style={{backgroundColor: t.card, borderRadius: 15, padding: 15, marginTop: 10}}>
            <View style={{flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5}}><Text style={{color: t.subText, fontWeight: 'bold'}}><Ionicons name="cash" size={16}/> Nakit:</Text><Text style={{color: t.text, fontWeight: 'bold'}}>₺{formatAmount(assets.cash)}</Text></View>
            <TouchableOpacity style={{flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5, marginTop: 10}} onPress={() => setShowBanksList(!showBanksList)}>
              <Text style={{color: t.primary, fontWeight: 'bold'}}><Ionicons name="card" size={16}/> Bankalar <Ionicons name={showBanksList?"chevron-up":"chevron-down"} size={14}/></Text>
            </TouchableOpacity>
            {showBanksList && assets.banks.map(b => (
              <View key={b.id} style={{flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5, paddingLeft: 20, borderBottomWidth: 1, borderBottomColor: t.border}}>
                <Text style={{color: t.subText}}>- {b.name}</Text><Text style={{color: t.text, fontWeight: 'bold'}}>₺{formatAmount(b.amount)}</Text>
              </View>
            ))}
            <View style={{flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5, marginTop: 10}}><Text style={{color: t.subText, fontWeight: 'bold'}}><Ionicons name="analytics" size={16}/> Altın:</Text><Text style={{color: t.text, fontWeight: 'bold'}}>{formatAssetAmount(assets.goldGrams)} Gr</Text></View>
            <View style={{flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5}}><Text style={{color: t.subText, fontWeight: 'bold'}}><Ionicons name="logo-usd" size={16}/> Dolar:</Text><Text style={{color: t.text, fontWeight: 'bold'}}>${formatAssetAmount(assets.dollar)}</Text></View>
          </View>
        )}
      </View>

      {/* İŞLEM LİSTESİ KARTI */}
      <View style={{flex: 1, backgroundColor: t.card, borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 20}}>
        <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15}}>
          <Text style={{color: t.text, fontSize: 20, fontWeight: 'bold'}}>Son İşlemler</Text>
          <TouchableOpacity onPress={openFilterModal}><Ionicons name="filter" size={24} color={t.primary} /></TouchableOpacity>
        </View>

        <View style={{flexDirection: 'row', alignItems: 'center', backgroundColor: t.bg, borderRadius: 15, paddingHorizontal: 15, marginBottom: 15}}>
          <Ionicons name="search" size={20} color={t.subText} />
          <TextInput style={{flex: 1, color: t.text, padding: 15}} placeholder="İşlem Adı veya Kategori Ara..." placeholderTextColor={t.subText} value={searchQuery} onChangeText={setSearchQuery} />
          {searchQuery.length > 0 && <TouchableOpacity onPress={() => setSearchQuery('')}><Ionicons name="close-circle" size={20} color={t.subText}/></TouchableOpacity>}
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{paddingBottom: 40}}>
          {sortedDates.length === 0 ? <Text style={{color: t.subText, textAlign: 'center', marginTop: 30}}>İşlem bulunamadı.</Text> : (
            sortedDates.map(date => (
              <View key={date}>
                <Text style={{color: t.primary, fontSize: 14, fontWeight: 'bold', marginTop: 10, marginBottom: 10}}>{date}</Text>
                {grouped[date].map((tx) => (
                  <TouchableOpacity key={tx.id} style={{flexDirection: 'row', alignItems: 'center', backgroundColor: t.bg, padding: 15, borderRadius: 15, marginBottom: 10}} onPress={() => { setSelectedTx(tx); setIsDetailsVisible(true); }}>
                    <View style={{width: 45, height: 45, borderRadius: 12, backgroundColor: t.card, justifyContent: 'center', alignItems: 'center', marginRight: 15}}>
                      {renderTxIcon(tx, t)}
                    </View>
                    <View style={{flex: 1}}>
                      <Text style={{color: t.text, fontSize: 16, fontWeight: 'bold'}}>{tx.txName || tx.category}</Text>
                      <Text style={{color: t.subText, fontSize: 12, marginTop: 3}}>
                        {tx.assetType === 'bank' && tx.selectedBankId ? assets.banks.find(b=>b.id===tx.selectedBankId)?.name : tx.assetType.toUpperCase()} • {tx.category} • {tx.time}
                      </Text>
                    </View>
                    <Text style={{fontSize: 16, fontWeight: 'bold', color: tx.type === 'gider' ? '#FF6B6B' : t.primary}}>
                      {tx.type === 'gider' ? '-' : '+'}{tx.assetType === 'gold' ? `${formatAssetAmount(tx.amount)} Gr` : (tx.assetType === 'dollar' ? `$${formatAssetAmount(tx.amount)}` : `₺${formatAmount(tx.amount)}`)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            ))
          )}
        </ScrollView>
      </View>

      {/* --- SIDEBAR (CÜZDANLAR & TEMA) --- */}
      <Modal visible={isDrawerOpen} animationType="fade" transparent={true}>
        <View style={{flex: 1, flexDirection: 'row'}}>
          <View style={{width: '80%', backgroundColor: t.card, padding: 25, paddingTop: STATUSBAR_HEIGHT + 20}}>
            <Text style={{color: t.text, fontSize: 24, fontWeight: 'bold', marginBottom: 15}}>Cüzdanlarım</Text>
            <ScrollView style={{flexGrow: 0, maxHeight: height * 0.4, marginVertical: 10}}>
              {sortedWallets.map(w => {
                const isActive = w.id === activeWalletId;
                return (
                  <View key={w.id} style={{marginBottom: 10}}>
                    <TouchableOpacity style={{flexDirection: 'row', alignItems: 'center', padding: 15, backgroundColor: isActive ? t.primary : t.bg, borderRadius: 12}} onPress={() => { if(isActive) setShowWalletOptions(!showWalletOptions); else { setActiveWalletId(w.id); setShowWalletOptions(false); setIsDrawerOpen(false); } }}>
                      <View style={{width: 40, height: 40, borderRadius: 20, backgroundColor: isActive ? 'rgba(255,255,255,0.2)' : t.card, justifyContent: 'center', alignItems: 'center', marginRight: 15}}>
                        <Ionicons name={w.profilePic || 'person'} size={20} color={isActive ? '#FFF' : t.text} />
                      </View>
                      <Text style={{color: isActive ? '#FFF' : t.text, fontWeight: 'bold', fontSize: isActive ? 18 : 16, flex: 1}}>{w.name}</Text>
                      {isActive && <Ionicons name={showWalletOptions ? "chevron-up" : "chevron-down"} size={20} color="#FFF" />}
                    </TouchableOpacity>
                    
                    {isActive && showWalletOptions && (
                      <View style={{backgroundColor: t.bg, borderBottomLeftRadius: 12, borderBottomRightRadius: 12, padding: 15, marginTop: -5, paddingTop: 15}}>
                        <TouchableOpacity style={{flexDirection: 'row', alignItems: 'center', paddingVertical: 10}} onPress={() => { setProfileEditData({name: w.name, profilePic: w.profilePic}); setIsProfileModalVisible(true); setIsDrawerOpen(false); }}>
                          <Ionicons name="person-circle" size={20} color={t.text} style={{marginRight: 10}}/>
                          <Text style={{color: t.text}}>Profili Düzenle</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={{flexDirection: 'row', alignItems: 'center', paddingVertical: 10}} onPress={() => { setSetupData({name: w.name, cash: assets.cash.toString(), goldGrams: assets.goldGrams.toString(), dollar: assets.dollar.toString(), banks: assets.banks.map(b=>({...b, amount: b.amount.toString()}))}); setIsEditingAssets(true); setIsDrawerOpen(false); }}>
                          <Ionicons name="cash" size={20} color={t.text} style={{marginRight: 10}}/>
                          <Text style={{color: t.text}}>Bakiyeleri Düzenle</Text>
                        </TouchableOpacity>
                        {targetWallets.length > 0 && (
                           <TouchableOpacity style={{flexDirection: 'row', alignItems: 'center', paddingVertical: 10}} onPress={() => setIsCrossWalletModalVisible(true)}>
                             <Ionicons name="swap-horizontal" size={20} color={t.text} style={{marginRight: 10}}/>
                             <Text style={{color: t.text}}>Cüzdana Para Aktar</Text>
                           </TouchableOpacity>
                        )}
                      </View>
                    )}
                  </View>
                );
              })}
            </ScrollView>
            <TouchableOpacity style={{padding: 15, borderRadius: 12, borderWidth: 1, borderColor: t.primary, alignItems: 'center', marginBottom: 20}} onPress={() => { setSetupData({name:'', cash:'', goldGrams:'', dollar:'', banks:[], profilePic: 'person'}); setIsDrawerOpen(false); setIsSetupVisible(true); }}>
              <Text style={{color: t.primary, fontWeight: 'bold'}}>+ Yeni Cüzdan</Text>
            </TouchableOpacity>
            <View style={{height: 1, backgroundColor: t.border, marginBottom: 20}} />
            <Text style={{color: t.text, fontSize: 18, fontWeight: 'bold', marginBottom: 15}}>Tema</Text>
            <View style={{flexDirection: 'row', flexWrap: 'wrap', gap: 10}}>
              {(['system', 'light', 'dark', 'custom'] as AppTheme[]).map(themeOpt => (
                <TouchableOpacity key={themeOpt} style={{padding: 10, backgroundColor: appTheme === themeOpt ? t.primary : t.bg, borderRadius: 10}} onPress={() => setAppTheme(themeOpt)}>
                  <Text style={{color: appTheme === themeOpt ? '#FFF' : t.text, fontSize: 12}}>{themeOpt.toUpperCase()}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          <TouchableOpacity style={{flex: 1, backgroundColor: 'rgba(0,0,0,0.6)'}} onPress={() => setIsDrawerOpen(false)} />
        </View>
      </Modal>

      {/* --- CÜZDANLAR ARASI TRANSFER MODALI --- */}
      <Modal visible={isCrossWalletModalVisible} animationType="slide" transparent={true}>
        <View style={{flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end'}}>
           <View style={{backgroundColor: t.card, borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 25, paddingBottom: 40}}>
              <View style={{flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20}}>
                <Text style={{color: t.text, fontSize: 22, fontWeight: 'bold'}}>Cüzdana Para Aktar</Text>
                <TouchableOpacity onPress={() => setIsCrossWalletModalVisible(false)}><Ionicons name="close" size={28} color={t.text} /></TouchableOpacity>
              </View>
              
              <Text style={{color: t.subText, marginBottom: 8}}>Hangi Hesaptan Çıkacak?</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginBottom: 15, maxHeight: 50}}>
                <TouchableOpacity style={{paddingHorizontal: 20, paddingVertical: 12, backgroundColor: t.bg, borderRadius: 20, marginRight: 10, borderWidth: 1, borderColor: crossWalletData.fromAsset === 'cash' ? t.primary : t.border}} onPress={() => setCrossWalletData({...crossWalletData, fromAsset: 'cash', fromBankId: null})}><Text style={{color: crossWalletData.fromAsset === 'cash' ? t.primary : t.text, fontWeight: 'bold'}}>Nakit</Text></TouchableOpacity>
                {assets.banks.map(b => (
                  <TouchableOpacity key={b.id} style={{paddingHorizontal: 20, paddingVertical: 12, backgroundColor: t.bg, borderRadius: 20, marginRight: 10, borderWidth: 1, borderColor: crossWalletData.fromBankId === b.id ? t.primary : t.border}} onPress={() => setCrossWalletData({...crossWalletData, fromAsset: 'bank', fromBankId: b.id})}><Text style={{color: crossWalletData.fromBankId === b.id ? t.primary : t.text, fontWeight: 'bold'}}>{b.name}</Text></TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={{color: t.subText, marginBottom: 8}}>Hangi Cüzdana Aktarılacak?</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginBottom: 15, maxHeight: 50}}>
                {targetWallets.map(tw => (
                  <TouchableOpacity key={tw.id} style={{paddingHorizontal: 20, paddingVertical: 12, backgroundColor: t.bg, borderRadius: 20, marginRight: 10, borderWidth: 1, borderColor: crossWalletData.targetWalletId === tw.id ? t.primary : t.border}} onPress={() => setCrossWalletData({...crossWalletData, targetWalletId: tw.id})}><Text style={{color: crossWalletData.targetWalletId === tw.id ? t.primary : t.text, fontWeight: 'bold'}}>{tw.name}</Text></TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={{color: t.subText, marginBottom: 8}}>Tutar (TL) - Kuruş için virgül kullanın</Text>
              <TextInput style={{backgroundColor: t.bg, color: t.text, padding: 15, borderRadius: 12, marginBottom: 15}} keyboardType="numeric" placeholder="Örn: 1250,50" placeholderTextColor={t.subText} value={crossWalletData.amount} onChangeText={(t) => setCrossWalletData({...crossWalletData, amount: t})} />
              
              <Text style={{color: t.subText, marginBottom: 8}}>Açıklama (Opsiyonel)</Text>
              <TextInput style={{backgroundColor: t.bg, color: t.text, padding: 15, borderRadius: 12, marginBottom: 20}} placeholder="Transfer Notu" placeholderTextColor={t.subText} value={crossWalletData.description} onChangeText={(t) => setCrossWalletData({...crossWalletData, description: t})} />

              <TouchableOpacity style={{backgroundColor: t.primary, padding: 15, borderRadius: 15, alignItems: 'center'}} onPress={executeCrossWalletTransfer}><Text style={{color: '#FFF', fontSize: 18, fontWeight: 'bold'}}>Transferi Başlat</Text></TouchableOpacity>
           </View>
        </View>
      </Modal>

      {/* --- PROFİL DÜZENLE --- */}
      <Modal visible={isProfileModalVisible} animationType="slide" transparent={true}>
        <View style={{flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end'}}>
          <View style={{backgroundColor: t.card, borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 25, paddingBottom: 40}}>
            <Text style={{color: t.text, fontSize: 22, fontWeight: 'bold', marginBottom: 20}}>Profili Düzenle</Text>
            <TextInput style={{backgroundColor: t.bg, color: t.text, padding: 15, borderRadius: 12, marginBottom: 20}} value={profileEditData.name} onChangeText={(text) => setProfileEditData({...profileEditData, name: text})} />
            <View style={{flexDirection: 'row', flexWrap: 'wrap', gap: 15, marginBottom: 30}}>
              {PROFILE_ICONS.map(icon => (
                <TouchableOpacity key={icon} style={{width: 50, height: 50, borderRadius: 25, backgroundColor: profileEditData.profilePic === icon ? t.primary : t.bg, justifyContent: 'center', alignItems: 'center'}} onPress={() => setProfileEditData({...profileEditData, profilePic: icon})}><Ionicons name={icon} size={24} color={profileEditData.profilePic === icon ? '#FFF' : t.text} /></TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity style={{backgroundColor: t.primary, padding: 15, borderRadius: 15, alignItems: 'center'}} onPress={handleSaveProfile}><Text style={{color: '#FFF', fontSize: 18, fontWeight: 'bold'}}>Kaydet</Text></TouchableOpacity>
            <TouchableOpacity style={{padding: 15, alignItems: 'center', marginTop: 10}} onPress={() => setIsProfileModalVisible(false)}><Text style={{color: '#FF6B6B', fontSize: 16}}>İptal</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* --- İŞLEM DETAY MODALI --- */}
      {selectedTx && (
        <Modal visible={isDetailsVisible} animationType="fade" transparent={true}>
          <View style={{flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center'}}>
            <View style={{backgroundColor: t.card, width: '90%', borderRadius: 20, padding: 25}}>
              <Text style={{color: t.text, fontSize: 22, fontWeight: 'bold', textAlign: 'center', marginBottom: 15}}>İşlem Detayı</Text>
              <View style={{height: 1, backgroundColor: t.border, marginVertical: 15}}/>
              <View style={{flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5}}><Text style={{color: t.subText, fontWeight: 'bold'}}>Cüzdan:</Text><Text style={{color: t.text, fontWeight: 'bold'}}>{activeWallet?.name}</Text></View>
              <View style={{flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5}}><Text style={{color: t.subText, fontWeight: 'bold'}}>İşlem Adı:</Text><Text style={{color: t.text, fontWeight: 'bold'}}>{selectedTx.txName || '-'}</Text></View>
              <View style={{flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5}}><Text style={{color: t.subText, fontWeight: 'bold'}}>Hesap Türü:</Text><Text style={{color: t.text, fontWeight: 'bold'}}>{selectedTx.assetType === 'bank' && selectedTx.selectedBankId ? assets.banks.find(b=>b.id===selectedTx.selectedBankId)?.name : selectedTx.assetType.toUpperCase()}</Text></View>
              <View style={{flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5}}><Text style={{color: t.subText, fontWeight: 'bold'}}>Kategori:</Text><Text style={{color: t.text, fontWeight: 'bold'}}>{selectedTx.category}</Text></View>
              <View style={{flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5}}><Text style={{color: t.subText, fontWeight: 'bold'}}>Tarih:</Text><Text style={{color: t.text, fontWeight: 'bold'}}>{selectedTx.date} {selectedTx.time}</Text></View>
              
              {selectedTx.category === 'Bozdurma' ? (
                <><View style={{flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5}}><Text style={{color: t.subText, fontWeight: 'bold'}}>Bozdurulan:</Text><Text style={{color: t.text, fontWeight: 'bold'}}>{formatAssetAmount(selectedTx.amount)} {selectedTx.assetType==='gold'?'Gr':'$'}</Text></View><View style={{flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5}}><Text style={{color: t.subText, fontWeight: 'bold'}}>Alınan TL:</Text><Text style={{color: t.text, fontWeight: 'bold'}}>₺{formatAmount(selectedTx.exchangedTL)}</Text></View><View style={{flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5}}><Text style={{color: t.subText, fontWeight: 'bold'}}>Kuyumcu/Dövizci:</Text><Text style={{color: t.text, fontWeight: 'bold'}}>{selectedTx.exchangePlace || '-'}</Text></View></>
              ) : selectedTx.category === 'Yatırım' ? (
                <View style={{flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5}}><Text style={{color: t.subText, fontWeight: 'bold'}}>İşlem Yeri:</Text><Text style={{color: t.text, fontWeight: 'bold'}}>{selectedTx.placeName || '-'}</Text></View>
              ) : selectedTx.isCart ? (
                <View style={{marginTop: 15}}><Text style={{color: t.primary, fontWeight: 'bold', marginBottom: 10}}>🏷️ {selectedTx.placeName || 'Mağaza'}:</Text>{selectedTx.products.map((p, i) => (<View key={i} style={{flexDirection: 'row', justifyContent: 'space-between'}}><Text style={{color: t.text}}>- {p.name}</Text><Text style={{color: t.text}}>₺{formatAmount(p.price)}</Text></View>))}</View>
              ) : selectedTx.category === 'Diğer' ? (
                <><View style={{flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5}}><Text style={{color: t.subText, fontWeight: 'bold'}}>Mağaza/Yer:</Text><Text style={{color: t.text, fontWeight: 'bold'}}>{selectedTx.placeName || '-'}</Text></View>
                  <View style={{flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5}}><Text style={{color: t.subText, fontWeight: 'bold'}}>Açıklama:</Text><Text style={{color: t.text, fontWeight: 'bold'}}>{selectedTx.description || '-'}</Text></View></>
              ) : (
                selectedTx.description ? <View style={{flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5}}><Text style={{color: t.subText, fontWeight: 'bold'}}>Açıklama:</Text><Text style={{color: t.text, fontWeight: 'bold'}}>{selectedTx.description}</Text></View> : null
              )}
              
              <View style={{height: 1, backgroundColor: t.border, marginVertical: 15}}/>
              <View style={{flexDirection: 'row', justifyContent: 'space-between'}}>
                <Text style={{color: t.text, fontSize: 18, fontWeight: 'bold'}}>Toplam:</Text>
                <Text style={{color: selectedTx.type==='gider'?'#FF6B6B':t.primary, fontSize: 22, fontWeight: 'bold'}}>{selectedTx.type==='gider'?'-':'+'}{selectedTx.assetType==='gold'?`${formatAssetAmount(selectedTx.amount)} Gr`:selectedTx.assetType==='dollar'?`$${formatAssetAmount(selectedTx.amount)}`:`₺${formatAmount(selectedTx.amount)}`}</Text>
              </View>
              <View style={{flexDirection: 'row', justifyContent: 'space-between', marginTop: 15}}>
                <Text style={{color: t.subText, fontWeight: 'bold'}}>İşlem Sonrası Bakiye:</Text>
                <Text style={{color: t.primary, fontWeight: 'bold'}}>{selectedTx.assetType==='gold'?`${formatAssetAmount(selectedTx.remainingBalance)} Gr`:selectedTx.assetType==='dollar'?`$${formatAssetAmount(selectedTx.remainingBalance)}`:`₺${formatAmount(selectedTx.remainingBalance)}`}</Text>
              </View>
              
              <View style={{flexDirection: 'row', marginTop: 25, gap: 10}}>
                <TouchableOpacity style={{flex: 1, backgroundColor: t.border, padding: 15, borderRadius: 15, alignItems: 'center'}} onPress={() => promptEditTx(selectedTx)}><Text style={{color: t.text, fontSize: 16, fontWeight: 'bold'}}>Düzenle</Text></TouchableOpacity>
                <TouchableOpacity style={{flex: 1, backgroundColor: 'rgba(255,107,107,0.1)', borderWidth: 1, borderColor: '#FF6B6B', padding: 15, borderRadius: 15, alignItems: 'center'}} onPress={() => promptDeleteTx(selectedTx)}><Text style={{color: '#FF6B6B', fontSize: 16, fontWeight: 'bold'}}>Sil</Text></TouchableOpacity>
              </View>
              <TouchableOpacity style={{backgroundColor: t.primary, padding: 15, borderRadius: 15, alignItems: 'center', marginTop: 10}} onPress={() => setIsDetailsVisible(false)}><Text style={{color: '#FFF', fontSize: 18, fontWeight: 'bold'}}>Kapat</Text></TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}

      {/* --- İŞLEM DÜZENLEME MODALI --- */}
      <Modal visible={isEditTxModalVisible} animationType="slide" transparent={true}>
         <View style={{flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end'}}>
            <View style={{backgroundColor: t.card, borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 25, paddingBottom: 40}}>
               <Text style={{color: t.text, fontSize: 22, fontWeight: 'bold', marginBottom: 20}}>İşlemi Düzenle</Text>
               <Text style={{color: t.subText, marginBottom: 5}}>İşlem Adı</Text>
               <TextInput style={{backgroundColor: t.bg, color: t.text, padding: 15, borderRadius: 12, marginBottom: 15}} value={editTxData?.txName} onChangeText={(text) => setEditTxData({...editTxData, txName: text})} />
               <Text style={{color: t.subText, marginBottom: 5}}>Açıklama</Text>
               <TextInput style={{backgroundColor: t.bg, color: t.text, padding: 15, borderRadius: 12, marginBottom: 15}} value={editTxData?.description} onChangeText={(text) => setEditTxData({...editTxData, description: text})} />
               <Text style={{color: t.subText, marginBottom: 5}}>Hesap Türü (Sadece Nakit/Banka değiştirilebilir)</Text>
               <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginBottom: 15, maxHeight: 50}}>
                  <TouchableOpacity style={{paddingHorizontal: 15, paddingVertical: 10, backgroundColor: t.bg, borderRadius: 15, marginRight: 10, borderWidth: 1, borderColor: editTxData?.assetType === 'cash' ? t.primary : t.border}} onPress={() => setEditTxData({...editTxData, assetType: 'cash', selectedBankId: null})}><Text style={{color: editTxData?.assetType === 'cash' ? t.primary : t.text}}>Nakit</Text></TouchableOpacity>
                  {assets.banks.map(b => (
                     <TouchableOpacity key={b.id} style={{paddingHorizontal: 15, paddingVertical: 10, backgroundColor: t.bg, borderRadius: 15, marginRight: 10, borderWidth: 1, borderColor: editTxData?.selectedBankId === b.id ? t.primary : t.border}} onPress={() => setEditTxData({...editTxData, assetType: 'bank', selectedBankId: b.id})}><Text style={{color: editTxData?.selectedBankId === b.id ? t.primary : t.text}}>{b.name}</Text></TouchableOpacity>
                  ))}
               </ScrollView>
               <TouchableOpacity style={{backgroundColor: t.primary, padding: 15, borderRadius: 15, alignItems: 'center'}} onPress={handleSaveEditTx}><Text style={{color: '#FFF', fontSize: 18, fontWeight: 'bold'}}>Güncelle</Text></TouchableOpacity>
               <TouchableOpacity style={{padding: 15, alignItems: 'center', marginTop: 10}} onPress={() => setIsEditTxModalVisible(false)}><Text style={{color: '#FF6B6B', fontSize: 16}}>İptal</Text></TouchableOpacity>
            </View>
         </View>
      </Modal>

      {/* --- BAKİYE GÖRÜNTÜLEME MODALI --- */}
      <Modal visible={isBalanceModalVisible} animationType="fade" transparent={true}>
        <View style={{flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center'}}>
          <View style={{backgroundColor: t.card, width: '80%', borderRadius: 20, paddingBottom: 20, zIndex: 100}}>
            <Text style={{color: t.text, fontSize: 22, fontWeight: 'bold', textAlign: 'center', paddingVertical: 20}}>Görüntüleme</Text>
            {['Toplam (TL)', 'Nakit', 'Banka', 'Altın', 'Dolar'].map(type => (
              <TouchableOpacity key={type} style={{paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: t.border, alignItems: 'center'}} onPress={() => { setBalanceViewType(type); setIsBalanceModalVisible(false); }}><Text style={{color: t.text, fontSize: 18}}>{type}</Text></TouchableOpacity>
            ))}
            <TouchableOpacity style={{marginTop: 20}} onPress={() => setIsBalanceModalVisible(false)}><Text style={{color: '#FF6B6B', textAlign: 'center', fontSize: 16}}>İptal</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* --- FULL FİLTRELEME & SIRALAMA MODALI --- */}
      <Modal visible={isFilterModalVisible} animationType="slide" transparent={true}>
        <View style={{flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end'}}>
          <View style={{backgroundColor: t.card, borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 20, paddingBottom: 40}}>
            <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20}}>
              <Text style={{color: t.text, fontSize: 22, fontWeight: 'bold'}}>Sıralama ve Filtreleme</Text>
              <TouchableOpacity onPress={() => setIsFilterModalVisible(false)}><Ionicons name="close" size={28} color={t.text} /></TouchableOpacity>
            </View>
            
            <Text style={{color: t.subText, fontWeight: 'bold', marginBottom: 10}}>Sıralama</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginBottom: 20, maxHeight: 50}}>
              {[ {id: 'default', label: 'Varsayılan (Saat)'}, {id: 'cat_az', label: 'Kategori (A-Z)'}, {id: 'cat_za', label: 'Kategori (Z-A)'}, {id: 'name_az', label: 'Ad (A-Z)'}, {id: 'name_za', label: 'Ad (Z-A)'} ].map(opt => (
                <TouchableOpacity key={opt.id} style={{paddingHorizontal: 15, paddingVertical: 10, backgroundColor: t.bg, borderRadius: 20, marginRight: 10, borderWidth: 1, borderColor: tempSortOption === opt.id ? t.primary : t.border}} onPress={() => setTempSortOption(opt.id)}>
                  <Text style={{color: tempSortOption === opt.id ? t.primary : t.text}}>{opt.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={{color: t.subText, fontWeight: 'bold', marginBottom: 10}}>Tarihe Git</Text>
            <TouchableOpacity style={{padding: 15, backgroundColor: t.bg, borderRadius: 15, borderWidth: 1, borderColor: tempFilterDate ? t.primary : t.border, marginBottom: 20, alignItems: 'center'}} onPress={() => { if(tempFilterDate) setTempFilterDate(null); else setShowFilterDatePicker(true); }}>
              <Text style={{color: tempFilterDate ? t.primary : t.text, fontWeight: 'bold'}}>{tempFilterDate ? `Seçili: ${formatDate(tempFilterDate)} (Temizle)` : '🗓️ Tarih Seçin'}</Text>
            </TouchableOpacity>
            {showFilterDatePicker && <DateTimePicker value={tempFilterDate || new Date()} mode="date" display="default" onChange={(event, date) => { setShowFilterDatePicker(false); if(date) setTempFilterDate(date); }} />}

            <Text style={{color: t.subText, fontWeight: 'bold', marginBottom: 10}}>Hesap Türüne Göre Filtrele</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginBottom: 20, maxHeight: 50}}>
              {['cash', 'bank', 'gold', 'dollar'].map(type => (
                <TouchableOpacity key={type} style={{paddingHorizontal: 15, paddingVertical: 10, backgroundColor: t.bg, borderRadius: 20, marginRight: 10, borderWidth: 1, borderColor: tempFilterAssets.includes(type) ? t.primary : t.border}} onPress={() => setTempFilterAssets(prev => prev.includes(type) ? prev.filter(a=>a!==type) : [...prev, type])}>
                  <Text style={{color: tempFilterAssets.includes(type) ? t.primary : t.text}}>{type}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={{color: t.subText, fontWeight: 'bold', marginBottom: 10}}>Kategoriye Göre Filtrele</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginBottom: 20, maxHeight: 50}}>
              {[...EXPENSE_CATEGORIES, 'Giriş', 'Aktarım', 'Bozdurma'].map(cat => (
                <TouchableOpacity key={cat} style={{paddingHorizontal: 15, paddingVertical: 10, backgroundColor: t.bg, borderRadius: 20, marginRight: 10, borderWidth: 1, borderColor: tempFilterCats.includes(cat) ? t.primary : t.border}} onPress={() => setTempFilterCats(prev => prev.includes(cat) ? prev.filter(c=>c!==cat) : [...prev, cat])}>
                  <Text style={{color: tempFilterCats.includes(cat) ? t.primary : t.text}}>{cat}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <TouchableOpacity style={{backgroundColor: t.primary, padding: 15, borderRadius: 15, alignItems: 'center'}} onPress={applyFilters}><Text style={{color: '#FFF', fontSize: 18, fontWeight: 'bold'}}>Uygula</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* --- YENİ İŞLEM (V0.8.2 ADIM ADIM DİNAMİK SİHİRBAZ) --- */}
      <Modal visible={isModalVisible} animationType="slide" transparent={true}>
        <View style={{flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end'}}>
          
          {/* V0.8.2: SafeAreaView yerine View, sabit height yerine maxHeight eklendi. Modal artık içindeki öğelere göre büyüyüp küçülecek */}
          <View style={{backgroundColor: t.card, borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 20, maxHeight: '90%'}}>
            
            {/* Sihirbaz Üst Bar */}
            <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, marginTop: 5}}>
              {txStep > 1 ? (
                 <TouchableOpacity onPress={() => setTxStep(txStep - 1)} style={{flexDirection: 'row', alignItems: 'center'}}>
                    <Ionicons name="arrow-back" size={24} color={t.text} />
                    <Text style={{color: t.text, marginLeft: 5, fontSize: 16}}>Geri</Text>
                 </TouchableOpacity>
              ) : <View style={{width: 60}}/>}
              
              {txStep > 1 && <Text style={{color: t.text, fontSize: 20, fontWeight: 'bold'}}>Adım {txStep} / 5</Text>}
              
              <TouchableOpacity onPress={() => setIsModalVisible(false)}><Ionicons name="close" size={28} color={t.text} /></TouchableOpacity>
            </View>

            {/* V0.8.2: flexGrow: 0 yapıldı ki scroll view kendini gereksiz yere uzatmasın */}
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{paddingBottom: 20}} style={{flexGrow: 0}}>
              
              {/* ADIM 1: İŞLEM TİPİ (V0.8.2 İkonlar eklendi) */}
              {txStep === 1 && (
                <View>
                  <Text style={{color: t.text, fontSize: 22, fontWeight: 'bold', marginBottom: 20, textAlign: 'center'}}>İşlem Tipini Seçin</Text>
                  
                  <TouchableOpacity style={{flexDirection: 'row', padding: 20, backgroundColor: 'rgba(255, 107, 107, 0.1)', borderWidth: 1, borderColor: '#FF6B6B', borderRadius: 15, marginBottom: 15, alignItems: 'center', justifyContent: 'center'}} onPress={() => { setNewTx({...newTx, type: 'gider'}); setTxStep(2); }}>
                    <Ionicons name="arrow-up-circle" size={28} color="#FF6B6B" style={{marginRight: 10}} />
                    <Text style={{color: '#FF6B6B', fontSize: 18, fontWeight: 'bold'}}>Gider / Para Çıkışı</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity style={{flexDirection: 'row', padding: 20, backgroundColor: `${t.primary}20`, borderWidth: 1, borderColor: t.primary, borderRadius: 15, marginBottom: 15, alignItems: 'center', justifyContent: 'center'}} onPress={() => { setNewTx({...newTx, type: 'gelir'}); setTxStep(2); }}>
                    <Ionicons name="arrow-down-circle" size={28} color={t.primary} style={{marginRight: 10}} />
                    <Text style={{color: t.primary, fontSize: 18, fontWeight: 'bold'}}>Gelir / Para Girişi</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity style={{flexDirection: 'row', padding: 20, backgroundColor: t.bg, borderWidth: 1, borderColor: t.border, borderRadius: 15, alignItems: 'center', justifyContent: 'center'}} onPress={() => { setNewTx({...newTx, type: 'aktarim', category: 'Aktarım'}); setTxStep(2); }}>
                    <Ionicons name="swap-vertical" size={28} color={t.text} style={{marginRight: 10}} />
                    <Text style={{color: t.text, fontSize: 18, fontWeight: 'bold'}}>Hesaplar Arası Aktarım</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* ADIM 2: HESAP SEÇİMİ */}
              {txStep === 2 && newTx.type !== 'aktarim' && (
                <View>
                  <Text style={{color: t.text, fontSize: 22, fontWeight: 'bold', marginBottom: 20, textAlign: 'center'}}>Hangi Hesaptan?</Text>
                  <View style={{flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 10}}>
                    <TouchableOpacity style={{width: '45%', padding: 20, backgroundColor: t.bg, borderWidth: 1, borderColor: t.border, borderRadius: 15, alignItems: 'center', marginBottom: 10}} onPress={() => { setNewTx({...newTx, assetType: 'cash', selectedBankId: null}); setTxStep(3); }}>
                       <Text style={{color: t.text, fontSize: 16, fontWeight: 'bold'}}>Nakit</Text>
                    </TouchableOpacity>
                    {assets.banks.map(b => (
                       <TouchableOpacity key={b.id} style={{width: '45%', padding: 20, backgroundColor: t.bg, borderWidth: 1, borderColor: t.border, borderRadius: 15, alignItems: 'center', marginBottom: 10}} onPress={() => { setNewTx({...newTx, assetType: 'bank', selectedBankId: b.id}); setTxStep(3); }}>
                          <Text style={{color: t.text, fontSize: 16, fontWeight: 'bold'}}>{b.name}</Text>
                       </TouchableOpacity>
                    ))}
                    {newTx.type === 'gider' && (
                       <>
                         <TouchableOpacity style={{width: '45%', padding: 20, backgroundColor: t.bg, borderWidth: 1, borderColor: t.border, borderRadius: 15, alignItems: 'center', marginBottom: 10}} onPress={() => { setNewTx({...newTx, assetType: 'gold'}); setTxStep(3); }}>
                            <Text style={{color: t.text, fontSize: 16, fontWeight: 'bold'}}>Altın</Text>
                         </TouchableOpacity>
                         <TouchableOpacity style={{width: '45%', padding: 20, backgroundColor: t.bg, borderWidth: 1, borderColor: t.border, borderRadius: 15, alignItems: 'center', marginBottom: 10}} onPress={() => { setNewTx({...newTx, assetType: 'dollar'}); setTxStep(3); }}>
                            <Text style={{color: t.text, fontSize: 16, fontWeight: 'bold'}}>Dolar</Text>
                         </TouchableOpacity>
                       </>
                    )}
                  </View>
                </View>
              )}

              {txStep === 2 && newTx.type === 'aktarim' && (
                 <View>
                    <Text style={{color: t.text, fontSize: 22, fontWeight: 'bold', marginBottom: 20, textAlign: 'center'}}>Aktarım Yönü</Text>
                    <Text style={{color: t.subText, marginBottom: 8}}>Çıkış Yapılacak Hesap</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginBottom: 15}}>
                      <TouchableOpacity style={{paddingHorizontal: 20, paddingVertical: 12, backgroundColor: t.bg, borderRadius: 20, marginRight: 10, borderWidth: 1, borderColor: newTx.transferFrom === 'cash' ? t.primary : t.border}} onPress={() => setNewTx({...newTx, transferFrom: 'cash'})}><Text style={{color: newTx.transferFrom === 'cash' ? t.primary : t.text}}>Nakit</Text></TouchableOpacity>
                      {assets.banks.map(b => (
                        <TouchableOpacity key={b.id} style={{paddingHorizontal: 20, paddingVertical: 12, backgroundColor: t.bg, borderRadius: 20, marginRight: 10, borderWidth: 1, borderColor: newTx.transferFrom === b.id ? t.primary : t.border}} onPress={() => setNewTx({...newTx, transferFrom: b.id})}><Text style={{color: newTx.transferFrom === b.id ? t.primary : t.text}}>{b.name}</Text></TouchableOpacity>
                      ))}
                    </ScrollView>
                    <Text style={{color: t.subText, marginBottom: 8}}>Giriş Yapılacak Hesap</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginBottom: 25}}>
                      <TouchableOpacity style={{paddingHorizontal: 20, paddingVertical: 12, backgroundColor: t.bg, borderRadius: 20, marginRight: 10, borderWidth: 1, borderColor: newTx.transferTo === 'cash' ? t.primary : t.border}} onPress={() => setNewTx({...newTx, transferTo: 'cash'})}><Text style={{color: newTx.transferTo === 'cash' ? t.primary : t.text}}>Nakit</Text></TouchableOpacity>
                      {assets.banks.map(b => (
                        <TouchableOpacity key={b.id} style={{paddingHorizontal: 20, paddingVertical: 12, backgroundColor: t.bg, borderRadius: 20, marginRight: 10, borderWidth: 1, borderColor: newTx.transferTo === b.id ? t.primary : t.border}} onPress={() => setNewTx({...newTx, transferTo: b.id})}><Text style={{color: newTx.transferTo === b.id ? t.primary : t.text}}>{b.name}</Text></TouchableOpacity>
                      ))}
                    </ScrollView>
                    <TouchableOpacity style={{backgroundColor: t.primary, padding: 15, borderRadius: 15, alignItems: 'center'}} onPress={() => setTxStep(4)}><Text style={{color: '#FFF', fontSize: 18, fontWeight: 'bold'}}>Devam Et</Text></TouchableOpacity>
                 </View>
              )}

              {/* ADIM 3: KATEGORİ */}
              {txStep === 3 && (
                <View>
                   <Text style={{color: t.text, fontSize: 22, fontWeight: 'bold', marginBottom: 20, textAlign: 'center'}}>Kategori Seçin</Text>
                   {newTx.type === 'gider' ? (
                     (newTx.assetType === 'gold' || newTx.assetType === 'dollar') ? (
                        <View style={{alignItems: 'center'}}>
                           <TouchableOpacity style={{width: '80%', padding: 20, backgroundColor: t.bg, borderWidth: 1, borderColor: t.primary, borderRadius: 15, alignItems: 'center'}} onPress={() => { setNewTx({...newTx, category: 'Bozdurma'}); setTxStep(4); }}>
                              <Text style={{color: t.primary, fontSize: 18, fontWeight: 'bold'}}>Yatırım Bozdurma</Text>
                           </TouchableOpacity>
                        </View>
                     ) : (
                        <View style={{flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 10}}>
                           {EXPENSE_CATEGORIES.map(cat => (
                             <TouchableOpacity key={cat} style={{width: '45%', padding: 15, backgroundColor: t.bg, borderWidth: 1, borderColor: t.border, borderRadius: 15, alignItems: 'center', marginBottom: 5}} onPress={() => { setNewTx({...newTx, category: cat}); setTxStep(4); }}>
                                <Text style={{color: t.text, fontSize: 16, fontWeight: 'bold'}}>{cat}</Text>
                             </TouchableOpacity>
                           ))}
                        </View>
                     )
                   ) : (
                     <View style={{alignItems: 'center'}}>
                        <TouchableOpacity style={{width: '80%', padding: 20, backgroundColor: t.bg, borderWidth: 1, borderColor: t.border, borderRadius: 15, alignItems: 'center'}} onPress={() => { setNewTx({...newTx, category: 'Giriş'}); setTxStep(4); }}>
                           <Text style={{color: t.text, fontSize: 18, fontWeight: 'bold'}}>Standart Gelir</Text>
                        </TouchableOpacity>
                     </View>
                   )}
                </View>
              )}

              {/* ADIM 4: DETAYLAR */}
              {txStep === 4 && (
                 <View>
                    <Text style={{color: t.text, fontSize: 22, fontWeight: 'bold', marginBottom: 20, textAlign: 'center'}}>İşlem Detayları</Text>
                    
                    {newTx.category === 'Bozdurma' ? (
                       <>
                         <Text style={{color: t.subText, marginBottom: 5}}>Bozdurulan Miktar ({newTx.assetType === 'gold' ? 'Gram' : '$'})</Text>
                         <TextInput style={{backgroundColor: t.bg, color: t.text, padding: 15, borderRadius: 12, marginBottom: 10}} keyboardType="numeric" placeholder="Örn: 10,5" placeholderTextColor={t.subText} value={newTx.amount} onChangeText={(t) => setNewTx({...newTx, amount: t})} />
                         <Text style={{color: t.subText, marginBottom: 5}}>Ele Geçen Toplam TL</Text>
                         <TextInput style={{backgroundColor: t.bg, color: t.text, padding: 15, borderRadius: 12, marginBottom: 10}} keyboardType="numeric" placeholder="0,00" placeholderTextColor={t.subText} value={newTx.exchangedTL} onChangeText={(t) => setNewTx({...newTx, exchangedTL: t})} />
                         <Text style={{color: t.subText, marginBottom: 5}}>Kuyumcu/Dövizci Adı</Text>
                         <TextInput style={{backgroundColor: t.bg, color: t.text, padding: 15, borderRadius: 12, marginBottom: 15}} placeholder="Örn: Merkez Döviz" placeholderTextColor={t.subText} value={newTx.exchangePlace} onChangeText={(t) => setNewTx({...newTx, exchangePlace: t})} />
                         <Text style={{color: t.subText, marginBottom: 5}}>Ele Geçen TL Nereye Eklensin?</Text>
                         <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginBottom: 20}}>
                           <TouchableOpacity style={{paddingHorizontal: 15, paddingVertical: 10, backgroundColor: t.bg, borderRadius: 15, marginRight: 10, borderWidth: 1, borderColor: newTx.exchangeTarget === 'cash' ? t.primary : t.border}} onPress={() => setNewTx({...newTx, exchangeTarget: 'cash'})}><Text style={{color: newTx.exchangeTarget === 'cash' ? t.primary : t.text}}>Nakit</Text></TouchableOpacity>
                           {assets.banks.map(b => (
                             <TouchableOpacity key={b.id} style={{paddingHorizontal: 15, paddingVertical: 10, backgroundColor: t.bg, borderRadius: 15, marginRight: 10, borderWidth: 1, borderColor: newTx.exchangeTarget === b.id ? t.primary : t.border}} onPress={() => setNewTx({...newTx, exchangeTarget: b.id})}><Text style={{color: newTx.exchangeTarget === b.id ? t.primary : t.text}}>{b.name}</Text></TouchableOpacity>
                           ))}
                         </ScrollView>
                       </>
                    ) : newTx.category === 'Yatırım' ? (
                       <>
                         <View style={{flexDirection: 'row', marginBottom: 15}}>
                           <TouchableOpacity style={{flex:1, padding:15, backgroundColor: t.bg, borderRadius:10, marginRight:5, borderWidth:1, borderColor: newTx.investTarget==='gold'?t.primary:t.border}} onPress={() => setNewTx({...newTx, investTarget: 'gold'})}><Text style={{color: t.text, textAlign:'center'}}>Altın Al</Text></TouchableOpacity>
                           <TouchableOpacity style={{flex:1, padding:15, backgroundColor: t.bg, borderRadius:10, marginLeft:5, borderWidth:1, borderColor: newTx.investTarget==='dollar'?t.primary:t.border}} onPress={() => setNewTx({...newTx, investTarget: 'dollar'})}><Text style={{color: t.text, textAlign:'center'}}>Dolar Al</Text></TouchableOpacity>
                         </View>
                         <Text style={{color: t.subText, marginBottom: 5}}>Alınan Miktar ({newTx.investTarget === 'gold' ? 'Gram' : '$'})</Text>
                         <TextInput style={{backgroundColor: t.bg, color: t.text, padding: 15, borderRadius: 12, marginBottom: 10}} keyboardType="numeric" placeholder="Örn: 5,25" placeholderTextColor={t.subText} value={newTx.investAmount} onChangeText={(t) => setNewTx({...newTx, investAmount: t})} />
                         <Text style={{color: t.subText, marginBottom: 5}}>Harcanan Tutar (TL)</Text>
                         <TextInput style={{backgroundColor: t.bg, color: t.text, padding: 15, borderRadius: 12, marginBottom: 10}} keyboardType="numeric" placeholder="0,00" placeholderTextColor={t.subText} value={newTx.amount} onChangeText={(t) => setNewTx({...newTx, amount: t})} />
                         <Text style={{color: t.subText, marginBottom: 5}}>İşlem Yeri</Text>
                         <TextInput style={{backgroundColor: t.bg, color: t.text, padding: 15, borderRadius: 12, marginBottom: 20}} placeholderTextColor={t.subText} value={newTx.investPlace} onChangeText={(t) => setNewTx({...newTx, investPlace: t})} />
                       </>
                    ) : CART_CATEGORIES.includes(newTx.category) ? (
                       <>
                         <Text style={{color: t.subText, marginBottom: 5}}>İşlem/Fiş Adı</Text>
                         <TextInput style={{backgroundColor: t.bg, color: t.text, padding: 15, borderRadius: 12, marginBottom: 10}} placeholder="Örn: Haftalık Alışveriş" placeholderTextColor={t.subText} value={newTx.txName} onChangeText={(t) => setNewTx({...newTx, txName: t})} />
                         <Text style={{color: t.subText, marginBottom: 5}}>Mağaza Adı</Text>
                         <TextInput style={{backgroundColor: t.bg, color: t.text, padding: 15, borderRadius: 12, marginBottom: 15}} placeholder="Örn: Migros" placeholderTextColor={t.subText} value={newTx.placeName} onChangeText={(t) => setNewTx({...newTx, placeName: t})} />
                         
                         <Text style={{color: t.text, fontWeight: 'bold', marginBottom: 10}}>Ürünler</Text>
                         {newTx.products.map((prod, index) => (
                           <View key={prod.id} style={{flexDirection: 'row', marginBottom: 10}}>
                             <TextInput style={{flex: 2, backgroundColor: t.bg, color: t.text, padding: 15, borderRadius: 12, marginRight: 10}} placeholder="Ürün Adı" placeholderTextColor={t.subText} value={prod.name} onChangeText={(val) => { const updated = [...newTx.products]; updated[index].name = val; setNewTx({...newTx, products: updated}); }} />
                             <TextInput style={{flex: 1, backgroundColor: t.bg, color: t.text, padding: 15, borderRadius: 12}} keyboardType="numeric" placeholder="0,00" placeholderTextColor={t.subText} value={prod.price} onChangeText={(val) => { const updated = [...newTx.products]; updated[index].price = val; setNewTx({...newTx, products: updated}); }} />
                           </View>
                         ))}
                         <TouchableOpacity style={{padding: 15, borderRadius: 12, borderWidth: 1, borderColor: t.primary, alignItems: 'center', marginBottom: 20}} onPress={() => setNewTx({...newTx, products: [...newTx.products, {id: Math.random().toString(), name: '', price: ''}]})}><Text style={{color: t.primary, fontWeight: 'bold'}}>+ Yeni Ürün Ekle</Text></TouchableOpacity>
                       </>
                    ) : newTx.category === 'Diğer' ? (
                       <>
                         <Text style={{color: t.subText, marginBottom: 5}}>İşlem Adı *</Text>
                         <TextInput style={{backgroundColor: t.bg, color: t.text, padding: 15, borderRadius: 12, marginBottom: 10}} placeholder="Örn: Kuaför" placeholderTextColor={t.subText} value={newTx.txName} onChangeText={(t) => setNewTx({...newTx, txName: t})} />
                         <Text style={{color: t.subText, marginBottom: 5}}>Mağaza/Kişi Adı</Text>
                         <TextInput style={{backgroundColor: t.bg, color: t.text, padding: 15, borderRadius: 12, marginBottom: 10}} placeholder="Opsiyonel" placeholderTextColor={t.subText} value={newTx.placeName} onChangeText={(t) => setNewTx({...newTx, placeName: t})} />
                         <Text style={{color: t.subText, marginBottom: 5}}>Açıklama</Text>
                         <TextInput style={{backgroundColor: t.bg, color: t.text, padding: 15, borderRadius: 12, marginBottom: 10}} placeholder="Opsiyonel detaylar" placeholderTextColor={t.subText} value={newTx.description} onChangeText={(t) => setNewTx({...newTx, description: t})} />
                         <Text style={{color: t.subText, marginBottom: 5}}>Tutar (TL) *</Text>
                         <TextInput style={{backgroundColor: t.bg, color: t.text, padding: 15, borderRadius: 12, marginBottom: 20}} keyboardType="numeric" placeholder="0,00" placeholderTextColor={t.subText} value={newTx.amount} onChangeText={(t) => setNewTx({...newTx, amount: t})} />
                       </>
                    ) : (
                       <>
                         <Text style={{color: t.subText, marginBottom: 5}}>İşlem Adı *</Text>
                         <TextInput style={{backgroundColor: t.bg, color: t.text, padding: 15, borderRadius: 12, marginBottom: 10}} placeholder="Örn: Maaş, Elektrik Faturası" placeholderTextColor={t.subText} value={newTx.txName} onChangeText={(t) => setNewTx({...newTx, txName: t})} />
                         <Text style={{color: t.subText, marginBottom: 5}}>Açıklama (Opsiyonel)</Text>
                         <TextInput style={{backgroundColor: t.bg, color: t.text, padding: 15, borderRadius: 12, marginBottom: 10}} placeholder="İsteğe bağlı notunuz" placeholderTextColor={t.subText} value={newTx.description} onChangeText={(t) => setNewTx({...newTx, description: t})} />
                         <Text style={{color: t.subText, marginBottom: 5}}>Tutar (TL) *</Text>
                         <TextInput style={{backgroundColor: t.bg, color: t.text, padding: 15, borderRadius: 12, marginBottom: 20}} keyboardType="numeric" placeholder="0,00 (Kuruş için virgül)" placeholderTextColor={t.subText} value={newTx.amount} onChangeText={(t) => setNewTx({...newTx, amount: t})} />
                       </>
                    )}
                    
                    <TouchableOpacity style={{backgroundColor: t.primary, padding: 15, borderRadius: 15, alignItems: 'center'}} onPress={() => setTxStep(5)}><Text style={{color: '#FFF', fontSize: 18, fontWeight: 'bold'}}>Devam Et</Text></TouchableOpacity>
                 </View>
              )}

              {/* ADIM 5: TARİH VE KAYIT */}
              {txStep === 5 && (
                 <View>
                    <Text style={{color: t.text, fontSize: 22, fontWeight: 'bold', marginBottom: 20, textAlign: 'center'}}>Zaman Seçimi</Text>
                    <Text style={{color: t.subText, fontWeight: 'bold', marginBottom: 8}}>Tarih</Text>
                    <TouchableOpacity style={{flexDirection: 'row', alignItems: 'center', backgroundColor: t.bg, borderRadius: 12, padding: 15, marginBottom: 15}} onPress={() => setShowDatePicker(true)}><Ionicons name="calendar" size={20} color={t.subText} style={{marginRight: 10}} /><Text style={{color: t.text}}>{formatDate(newTx.date)}</Text></TouchableOpacity>
                    {showDatePicker && <DateTimePicker value={newTx.date instanceof Date ? newTx.date : new Date()} mode="date" display="default" onChange={handleDateSelect} />}
                    
                    <Text style={{color: t.subText, fontWeight: 'bold', marginBottom: 8}}>Saat</Text>
                    <TouchableOpacity style={{flexDirection: 'row', alignItems: 'center', backgroundColor: t.bg, borderRadius: 12, padding: 15, marginBottom: 30}} onPress={() => setShowTimePicker(true)}><Ionicons name="time" size={20} color={t.subText} style={{marginRight: 10}} /><Text style={{color: t.text}}>{formatTime(newTx.time)}</Text></TouchableOpacity>
                    {showTimePicker && <DateTimePicker value={newTx.time instanceof Date ? newTx.time : new Date()} mode="time" display="default" onChange={handleTimeSelect} />}

                    <TouchableOpacity style={{backgroundColor: t.primary, padding: 15, borderRadius: 15, alignItems: 'center'}} onPress={handleAddTransaction}>
                      <Text style={{color: '#FFF', fontSize: 18, fontWeight: 'bold'}}>İşlemi Tamamla ve Kaydet</Text>
                    </TouchableOpacity>
                 </View>
              )}

            </ScrollView>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}