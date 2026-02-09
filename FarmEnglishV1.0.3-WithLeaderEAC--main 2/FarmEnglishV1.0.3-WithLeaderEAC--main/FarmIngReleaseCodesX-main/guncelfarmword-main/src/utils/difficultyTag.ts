export const difficultyClasses = (difficulty: string) => {
  const baseClasses = 'px-2 py-1 rounded-full text-xs font-bold';
  
  switch (difficulty) {
    case 'A1':
      return `${baseClasses} bg-green-500/30 text-green-300 border border-green-500/40`;
    case 'A2':
      return `${baseClasses} bg-emerald-500/30 text-emerald-300 border border-emerald-500/40`;
    case 'B1':
      return `${baseClasses} bg-yellow-500/30 text-yellow-300 border border-yellow-500/40`;
    case 'B2':
      return `${baseClasses} bg-orange-500/30 text-orange-300 border border-orange-500/40`;
    case 'C1':
      return `${baseClasses} bg-red-500/30 text-red-300 border border-red-500/40`;
    case 'C2':
      return `${baseClasses} bg-purple-500/30 text-purple-300 border border-purple-500/40`;
    default:
      return `${baseClasses} bg-gray-500/30 text-gray-300 border border-gray-500/40`;
  }
};

export const difficultyIcon = (difficulty: string) => {
  switch (difficulty) {
    case 'A1': return '🟢';
    case 'A2': return '🟢';
    case 'B1': return '🟡';
    case 'B2': return '🟠';
    case 'C1': return '🔴';
    case 'C2': return '🟣';
    default: return '⚪';
  }
};

export const difficultyColor = (difficulty: string): string => {
  switch (difficulty) {
    case 'A1': return '#22c55e';
    case 'A2': return '#10b981';
    case 'B1': return '#eab308';
    case 'B2': return '#f97316';
    case 'C1': return '#ef4444';
    case 'C2': return '#a855f7';
    default: return '#6b7280';
  }
};
