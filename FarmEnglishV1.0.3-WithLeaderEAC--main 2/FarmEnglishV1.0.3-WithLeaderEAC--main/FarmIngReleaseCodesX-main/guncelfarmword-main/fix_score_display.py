
import os
import re

file_path = r'c:\FarmEnglishV1.0.1\FarmIngReleaseCodesX-main\guncelfarmword-main\src\screens\BattleScreen.tsx'

try:
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Locate the Result Screen rendering block (the injected logic).
    # We want to use the SERVER score, not 'battleScore' (which is the optimistic State).
    
    # Locate: myScore={battleScore}
    # Change to: myScore={finalBattleData ? (user.odId === finalBattleData.hostId ? finalBattleData.hostScore : finalBattleData.guestScore) : battleScore}
    # Or cleaner variable extraction.
    
    match = re.search(r'myScore=\{battleScore\}', content)
    
    if match:
         replacement = """myScore={finalBattleData && finalBattleData.status === 'finished' 
                    ? (user?.odId === finalBattleData.hostId ? (finalBattleData.hostScore || 0) : (finalBattleData.guestScore || 0)) 
                    : battleScore}"""
         
         # Note: ensure finalBattleData is available in scope. It is state.
         
         new_content = content.replace('myScore={battleScore}', replacement)
         
         with open(file_path, 'w', encoding='utf-8') as f:
             f.write(new_content)
         print("Updated score display directly in JSX to use Server Truth.")
    else:
        print("Could not find myScore={battleScore} usage.")

except Exception as e:
    print(f"Error: {e}")
