
import os
import re

file_path = r'c:\FarmEnglishV1.0.1\FarmIngReleaseCodesX-main\guncelfarmword-main\src\screens\BattleScreen.tsx'

# Strategy:
# Find the listener logic where updates are processed.
# We fixed oppProgress logic previously.
# Now we add the deadlock check.

try:
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Look for the oppProgress definition we added/modified
    anchor = "const oppAnsList = isUserHost ? battle.guestAnswers : battle.hostAnswers;"
    
    # We want to insert logic AFTER oppProgress is defined.
    # We can search for the updateRemoteOpponentProgress call or similar.
    
    # Let's find "if (updateRemoteOpponentProgress) {"
    
    injection = """
            // 🛡️ CLIENT-SIDE DEADLOCK PREVENTION
            // If both are done but server missed the finish trigger, force a sync.
            // We use a small delay or check to avoid spamming.
            const totalQ = battle.questions.length;
            const myProg = isUserHost ? (battle.hostProgress || 0) : (battle.guestProgress || 0);
            
            if (myProg >= totalQ && oppProgress >= totalQ && battle.status !== 'finished' && !battle.winnerId) {
                console.warn('[Battle] 🛡️ Client detected deadlock - Retrying finish trigger...');
                // Retrigger last answer submission to force server check
                // We use currentQuestionIndex (which is likely 9 or 10)
                // If we are at result screen wait, index should be totalQ-1
                const forceIndex = totalQ - 1;
                submitAnswer(battleId, user.odId, isUserHost, forceIndex, '', 0);
            }
    """
    
    if anchor in content:
        # Insert after the anchor + a few lines (after oppProgress definition)
        # Find the line with oppProgress
        lines = content.split('\n')
        target_line = -1
        for i, line in enumerate(lines):
            if anchor in line:
                target_line = i + 3 # Skip a few lines to be safe
                break
                
        if target_line != -1:
            new_lines = lines[:target_line] + [injection] + lines[target_line:]
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write('\n'.join(new_lines))
            print("Injected client-side deadlock trigger.")
        else:
            print("Could not find insertion point.")
            
    else:
        print("Could not find anchor to inject client logic. (Did previous fix apply?)")

except Exception as e:
    print(f"Error: {e}")
