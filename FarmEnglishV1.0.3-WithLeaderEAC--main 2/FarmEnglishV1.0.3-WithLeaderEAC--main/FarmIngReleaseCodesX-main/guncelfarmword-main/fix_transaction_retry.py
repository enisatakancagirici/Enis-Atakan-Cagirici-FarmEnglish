
import os
import re

file_path = r'c:\FarmEnglishV1.0.1\FarmIngReleaseCodesX-main\guncelfarmword-main\src\utils\firebaseBattle.ts'

# Strategy:
# Wrap the ENTIRE try-catch block of submitAnswer in a while loop.
# Function starts at line ~650.
# "const battleRef = doc(db, 'battles', battleId);" is correct.
# Then "try {" starts the block.
# The catch block ends with a return.

try:
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Find the start of the function body part to wrap
    # Look for: const battleRef = doc(db, 'battles', battleId);
    start_anchor = "const battleRef = doc(db, 'battles', battleId);"
    
    # We want to inject the loop variable before this or after?
    # Ideally:
    # const battleRef = ...
    # let attempt = 0;
    # while (attempt < 5) {
    #    try { ... } catch (error) { ... retry logic ... }
    # }
    
    # But currently it is:
    # const battleRef ...
    # try { ... } catch (error) { ... }
    
    # So we replace "try {" with "let attempt = 0;\n while (attempt < 5) {\n try {"
    # AND we need to handle the catch block to Continue or Break.
    
    # Steps:
    # 1. Replace "try {" with retry loop start.
    # 2. Modify the "catch (error: any) {" block to implement retry.
    
    if start_anchor in content:
        # 1. Start Loop
        # We target the specific try inside submitAnswer.
        # It follows battleRef.
        
        split_point = content.find(start_anchor) + len(start_anchor)
        rest = content[split_point:]
        
        # Find first "try {"
        try_idx = rest.find("try {")
        if try_idx != -1:
            abs_try_idx = split_point + try_idx
            
            # Injection 1: Loop start
            prefix = """
    let attempt = 0;
    while (attempt < 5) {
        """
            
            # Injection 2: Modify Catch to Handle Retry
            # We need to find the matching catch block.
            # Using regex for catch pattern.
            
            # catch (error: any) {
            #    if (error.message === 'BATTLE_NOT_ACTIVE') ...
            #    else console.error...
            #    return { success: false... }
            # }
            
            # We want to intercept this catch.
            # If error is contention, retry.
            # Else, fall through to existing logic (which returns success:false).
            
            # Replacement Catch Logic:
            # } catch (error: any) {
            #    const isContention = error.code === 'aborted' || error.code === 'failed-precondition' || (error.message && error.message.includes('match the required base version'));
            #    if (isContention && attempt < 4) {
            #        attempt++;
            #        const delay = Math.random() * 500 * attempt;
            #        console.warn(`[Battle] ⚠️ Contention detected, retrying (${attempt}/5)...`);
            #        await new Promise(resolve => setTimeout(resolve, delay));
            #        continue;
            #    }
            #    
            #    // Original Catch Logic follows...
            
            # Locate "catch (error: any) {"
            catch_match = re.search(r'catch\s*\(\s*error\s*:\s*any\s*\)\s*\{', content[abs_try_idx:])
            
            if catch_match:
                abs_catch_idx = abs_try_idx + catch_match.start()
                
                catch_injection = """catch (error: any) {
            // RETRY LOGIC for Contention
            const isContention = error.code === 'aborted' || error.code === 'failed-precondition' || (error.message && error.message.includes('match the required base version'));
            if (isContention && attempt < 4) {
                attempt++;
                const delay = Math.random() * 500 * attempt;
                console.warn(`[Battle] ⚠️ Contention detected, retrying (${attempt}/5)...`);
                await new Promise(resolve => setTimeout(resolve, delay));
                continue;
            }
                """
                
                # Apply changes
                # Be careful with string slicing order.
                
                # 1. Replace "try {"
                part1 = content[:abs_try_idx]
                part2_start = content[abs_try_idx : abs_catch_idx] # Contains "try { ... code ... ~"
                part2_end = content[abs_catch_idx:]
                
                # In part2_start, replace "try {" with "try {" (no change needed actually, just prepending loop)
                # Actually I need to close the loop at the very end.
                
                # Wait, if I wrap in while loop:
                # while (...) {
                #    try { ... return result; } 
                #    catch (e) { if retry, continue; else ... return failure; }
                # }
                # return { success: false ... } // Fallback ??
                
                # The original catch returns a value. So the loop terminates naturally if not continued.
                # But I need a closing brace for the while loop at the very end of the function?
                # No, the catch block returns. So if we don't continue, we return.
                # So we just need to close the 'while' loop brace after the catch block?
                # Or simply:
                # catch (e) {
                #    if (retry) continue;
                #    ... original return ...
                # }
                # } <--- End of while
                # return { success: false, ... } <--- Unreachable but safe?
                
                # Actually, the original catch block handles ALL errors and returns.
                # So if I append "}" after the catch block, it covers the loop.
                
                # Find end of catch block.
                # It has matching braces. simpler not to parse.
                # But wait, looking at the code:
                # catch (error: any) {
                #     ...
                #     return { ... };
                # }
                # End of function.
                
                # So if I add "}" at the end of function, it works.
                
                # Construct new content:
                # 0 to try_idx:  ... battleRef = ... \n let attempt... while... \n
                # try_idx: try {
                # catch_idx: replaced with my catch injection
                # ... existing catch body ...
                # End of function: add "}"
                
                # Insert Loop Start
                new_c = content[:abs_try_idx] + prefix + content[abs_try_idx:abs_catch_idx]
                
                # Insert Catch Logic
                # Remove "catch (error: any) {" from start of part2_end
                catch_header_len = catch_match.end() - catch_match.start()
                # Actually catch_match was found in content[abs_try_idx:], so offset calls are correct
                
                catch_body_start = abs_catch_idx + catch_header_len
                
                new_c += catch_injection + content[catch_body_start:]
                
                # Now add closing brace at the end of the function.
                # Function ends with last closing brace of file? No.
                # It ends before "export const listenToBattle".
                
                # Let's assume indentation implies end.
                # Or just put it after the last return of catch.
                # The catch block returns, so execution leaves function.
                # The "continue" stays in loop.
                # So we need "}" after the catch block closing brace.
                
                # Finding the closing brace of the catch block is hard without parsing.
                # Alternative: Use "break" instead of return in existing catch? No.
                
                # Let's hope the catch block is the last thing.
                # "return { success: false ... }; \n }"
                # If I find the last "}" of the function and insert "}" before it?
                
                # Search for the next export or End of File.
                next_export = content.find("export const listenToBattle", catch_body_start)
                if next_export != -1:
                    # The function ends before this.
                    insertion_point = next_export
                    # Valid TS:
                    # while(...) { ... }
                    # return ... (unreachable but required by TS if while doesn't definitely return)
                    
                    # But submitAnswer returns Promise.
                    # I will add "return { success: false, ... }; }" before next export.
                    
                    # Actually, if I just append "}" at end of existing content (before next function), 
                    # it closes the while loop.
                    
                    # Refined plan:
                    # 1. Insert Loop Start before "try".
                    # 2. Reconstruct Catch Header.
                    # 3. Find end of submitAnswer function.
                    #    - Look for "export const listenToBattle" or similar.
                    #    - Insert "}" before it.
                    #    - And maybe a fallback return?
                    
                    # To be safe, I'll add the fallback return too.
                    fallback = """
    }
    return { success: false, isCorrect: false, newScore: 0, message: 'MAX_RETRIES_EXCEEDED' };
                    """
                    new_c = new_c[:len(new_c) - (len(content) - next_export)] + fallback + "\n\n" + content[next_export:]
                    
                    with open(file_path, 'w', encoding='utf-8') as f:
                        f.write(new_c)
                    print("Injected retry loop successfully.")
                else:
                    print("Could not find end of submitAnswer function.")
            else:
                print("Could not find catch block.")
        else:
            print("Could not find try block.")
    else:
        print("Could not find function start.")

except Exception as e:
    print(f"Error: {e}")
