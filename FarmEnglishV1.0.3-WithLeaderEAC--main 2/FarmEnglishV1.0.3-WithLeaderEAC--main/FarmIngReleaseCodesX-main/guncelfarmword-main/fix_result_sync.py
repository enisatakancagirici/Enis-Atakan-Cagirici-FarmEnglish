
import os
import re

file_path = r'c:\FarmEnglishV1.0.1\FarmIngReleaseCodesX-main\guncelfarmword-main\src\screens\BattleScreen.tsx'

# Original logic:
# const amIWinner = battleScore > (opponentScore || 0);
# const resultType = battleScore === (opponentScore || 0) ? 'draw' : (amIWinner ? 'win' : 'loss');

# New logic:
# Use finalBattleData if available (it has the committed winnerId)

try:
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
        
    pattern_start = r'const\s+amIWinner\s*=\s*battleScore\s*>\s*\(opponentScore\s*\|\|\s*0\);'
    pattern_end = r'const\s+resultType\s*=\s*.*?;'
    
    match = re.search(r'const\s+amIWinner\s*=\s*battleScore.+?const\s+resultType\s*=\s*.+?;', content, re.DOTALL)
    
    if match:
        new_block = """
        // 🛡️ SYNC FIX: Use Server Truth (winnerId) if available, fallback to local scores
        let resultType: 'win' | 'loss' | 'draw' = 'draw';
        
        // If we have final data (set during endBattle), trust it absolutely
        if (finalBattleData && finalBattleData.status === 'finished') {
             if (finalBattleData.winnerId === user?.odId) resultType = 'win';
             else if (finalBattleData.winnerId === null) resultType = 'draw';
             else resultType = 'loss';
        } else {
             // Fallback to local (optimistic)
             const myS = battleScore;
             const oppS = opponentScore || 0;
             if (myS > oppS) resultType = 'win';
             else if (oppS > myS) resultType = 'loss';
             else resultType = 'draw';
        }
        """
        
        new_content = content[:match.start()] + new_block + content[match.end():]
        
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print("Updated result calculation logic.")
    else:
        print("Could not find result calculation block to patch.")

except Exception as e:
    print(f"Error: {e}")
