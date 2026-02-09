// 🎯 Global tab state - Farm ve Inventory arası geçişlerde korunur
// Bu dosya App.tsx'ten ayrı tutularak require cycle uyarılarını önler

export type TabType = 'words' | 'phrasal' | 'puzzle';

export const globalTabState = { 
  current: 'words' as TabType 
};
