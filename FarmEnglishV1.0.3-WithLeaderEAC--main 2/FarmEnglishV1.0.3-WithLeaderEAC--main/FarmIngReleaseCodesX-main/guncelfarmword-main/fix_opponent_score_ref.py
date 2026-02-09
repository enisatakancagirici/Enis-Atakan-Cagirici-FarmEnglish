
import os

file_path = r'c:\FarmEnglishV1.0.1\FarmIngReleaseCodesX-main\guncelfarmword-main\src\screens\BattleScreen.tsx'

try:
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
        
    # The erroneous line: const amIWinner = battleScore > (opponentScore || 0);
    # And passing opponentScore to component
    
    # We should define opponentScore at the start of the block
    
    target_block_start = "if (battleState === 'finished') {"
    replacement_start = """if (battleState === 'finished') {
        const opponentScore = opponentInfo?.currentScore || 0;"""
        
    if target_block_start in content:
        new_content = content.replace(target_block_start, replacement_start)
        # Note: This simply injects the definition. 
        # Existing usages of opponentScore will now be valid.
        # But wait, did I use opponentScore or (opponentScore || 0)?
        # In the script I wrote: const amIWinner = battleScore > (opponentScore || 0);
        # So defining it is correct.
        
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print("Fixed ReferenceError: Defined opponentScore.")
    else:
        print("Could not find block start to inject variable definition.")

except Exception as e:
    print(f"Error: {e}")
