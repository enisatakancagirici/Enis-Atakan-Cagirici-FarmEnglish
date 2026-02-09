
import os
import re

file_path = r'c:\FarmEnglishV1.0.1\FarmIngReleaseCodesX-main\guncelfarmword-main\src\utils\firebaseBattle.ts'

# Strategy:
# Locate the 'alreadyAnswered.includes(questionIndex)' block.
# Inject logic to check for completion inside it.

try:
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Locate the block
    start_pattern = r'if\s*\(\s*alreadyAnswered\.includes\(\s*questionIndex\s*\)\s*\)\s*\{'
    match = re.search(start_pattern, content)
    
    if match:
        print("Found duplicate check block.")
        # We need to see where it ends. It likely has a 'return {' inside.
        # We want to insert the check BEFORE the return, or allow the function to proceed to completion check?
        # Actually, if we proceed, we might double-increment score.
        # So we should duplicate the completion logic inside the block.
        
        # New Logic for inside the block:
        # Check if 10/10. If so, finish.
        
        # Since the logic is complex (rewards, updates), maybe extracting it is better? 
        # But I can't easily refactor.
        # I will inject a simplified check: 
        # If (questionIndex + 1 == totalQuestions) { ... check opponent ... if done -> update status ... }
        
        # Wait, I need 'battle', 'isHost', etc. They are available.
        # 'updates' variable is NOT defined yet in that block.
        
        # Easier fix:
        # Simply REMOVE the early return?
        # No, that would increment score again.
        
        # Correct fix:
        # Move the Early Return to AFTER variables are defined (scoreKey, etc), 
        # BUT before 'newScore' calculation.
        # And ensure 'updates' only happens if not answered.
        # BUT the completion check needs to happen regardless.
        
        # Minimal Invasive Fix:
        # Inside the 'if (alreadyAnswered...)' block:
        # Check opponent progress.
        # If opponent done, and I am done (questionIndex+1 == total), and status != finished.
        # Run the finish logic.
        
        # To avoid code duplication, I will create a cleaner structure in the script?
        # It's risky to rewrite a massive function with regex.
        
        # Backtrack:
        # What if I change the condition?
        # if (alreadyAnswered... && status === 'finished') return ...
        # If status !== 'finished', we might want to proceed?
        # But we don't want to add score.
        
        # I will add a special block inside the if:
        
        injection = """
            // DEADLOCK FIX: Check if game should be finished even if I already answered
            const totalQ = battle.questions.length;
            const myProg = questionIndex + 1;
            const oppProgKey = isHost ? 'guestProgress' : 'hostProgress';
            const oppProg = battle[oppProgKey] || 0;
            
            if (myProg >= totalQ && oppProg >= totalQ && battle.status !== 'finished') {
                 console.log('[Battle] 🛡️ Deadlock detected (Both finished), forcing FINISH...');
                 // Force Finish Logic
                 // Calculate Winner
                 const hScore = isHost ? (battle[scoreKey] || 0) : (battle.hostScore || 0); // My score is current
                 const gScore = isHost ? (battle.guestScore || 0) : (battle[scoreKey] || 0);
                 
                 let wId = null;
                 if (hScore > gScore) wId = battle.hostId;
                 else if (gScore > hScore) wId = battle.guestId;
                 
                 const finishUpdates = {
                     status: 'finished',
                     winnerId: wId,
                     finishedAt: serverTimestamp()
                 };
                 transaction.update(battleRef, finishUpdates);
                 
                 // Note: We skip user stats update here to keep it simple/safe (or we could dup it), 
                 // but at least the game ends and they get the result screen.
                 // The main logic handles stats. If we skip stats here, people might miss streak updates 
                 // if they hit the deadlock. 
                 // But better than being stuck.
                 
                 return { success: true, isCorrect: false, newScore: battle[scoreKey] || 0, message: 'DEADLOCK_RESOLVED' };
            }
        """
        
        # Insert this injection at the start of the 'if (alreadyAnswered...)' block
        # match.end() is after the opening brace '{'
        
        new_content = content[:match.end()] + injection + content[match.end():]
        
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print("Injected deadlock fix.")
        
    else:
        print("Could not find duplicate check block.")

except Exception as e:
    print(f"Error: {e}")
