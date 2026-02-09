
import os
import re

file_path = r'c:\FarmEnglishV1.0.1\FarmIngReleaseCodesX-main\guncelfarmword-main\src\screens\BattleScreen.tsx'

new_logic = """    // 3. BATTLE RESULT SCREEN
    if (battleState === 'finished') {
        const amIWinner = battleScore > (opponentScore || 0);
        const resultType = battleScore === (opponentScore || 0) ? 'draw' : (amIWinner ? 'win' : 'loss');
        
        const stats = {
            accuracy: Math.round(((battleScore / 100) / QUESTION_COUNT) * 100) || 0,
            speed: 85, 
            streak: 0
        };
        
        const rewards = {
            xp: resultType === 'win' ? 250 : (resultType === 'draw' ? 100 : 50),
            coin: resultType === 'win' ? 100 : (resultType === 'draw' ? 50 : 25)
        };

        return (
            <BattleResultScreen
                result={resultType}
                myScore={battleScore}
                opponentScore={opponentScore || 0}
                myInfo={user}
                opponentInfo={opponentInfo}
                rewards={rewards}
                stats={stats}
                onPlayAgain={handlePlayAgain}
                onHome={handleGoHome}
            />
        );
    }
"""

try:
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. Add Import
    if "import { BattleResultScreen } from './BattleResultScreen';" not in content:
        content = "import { BattleResultScreen } from './BattleResultScreen';\n" + content
        print("Added import.")

    # 2. Find start of result logic
    # Look for "if (battleState === 'finished') {"
    start_match = re.search(r'if\s*\(\s*battleState\s*===\s*[\'"]finished[\'"]\s*\)\s*\{', content)
    
    if start_match:
        start_idx = start_match.start()
        
        # Find the fallback return which marks the end of the previous big block
        # return <View style={styles.container} />;
        end_match = re.search(r'return\s*<View\s*style=\{styles\.container\}\s*/>;', content[start_idx:])
        
        if end_match:
            end_idx = start_idx + end_match.start()
            
            # Replace the chunk
            print(f"Replacing chunk from {start_idx} to {end_idx}")
            new_content = content[:start_idx] + new_logic + "\n    " + content[end_idx:]
            
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(new_content)
            print("Integration successful.")
            
        else:
            print("Could not find end marker.")
    else:
        print("Could not find start marker.")

except Exception as e:
    print(f"Error: {e}")
