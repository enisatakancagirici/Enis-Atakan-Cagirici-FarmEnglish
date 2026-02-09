
import os

file_path = r'c:\FarmEnglishV1.0.1\FarmIngReleaseCodesX-main\guncelfarmword-main\src\screens\BattleScreen.tsx'

# New content to inject at the specific location
new_block = """            if (currentQuestionIndex + 1 >= QUESTION_COUNT) {
                // Savaş bitti - Final sync ve ödül dağıtımı otomatik yapılacak
                // Bekle ve store'daki result verisini kullan
                // Trigger Waiting UI by logically advancing past the last question
                setCurrentQuestionIndex(p => p + 1);
                setShowResult(false);
            } else {"""

try:
    with open(file_path, 'r', encoding='utf-8') as f:
        lines = f.readlines()

    # Identify the start line of the block (checking lines 988-993 usually)
    # We look for the line containing "if (currentQuestionIndex + 1 >= QUESTION_COUNT) {"
    start_index = -1
    for i in range(len(lines)):
        if "if (currentQuestionIndex + 1 >= QUESTION_COUNT) {" in lines[i]:
            start_index = i
            break
    
    if start_index != -1:
        # We want to replace from start_index to the line containing "} else {"
        end_index = -1
        for i in range(start_index, len(lines)):
            if "} else {" in lines[i]:
                end_index = i
                break
        
        if end_index != -1:
            # Construct the new file content
            # lines[:start_index] + new_block + lines[end_index+1:]
            # But wait, new_block includes the "} else {", so we replace up to end_index (inclusive)
            
            # Actually, let's just replace lines start_index to end_index with the new_block lines
            
            new_lines = new_block.split('\n')
            new_lines = [line + '\n' for line in new_lines] # Add newlines back
            
            final_lines = lines[:start_index] + new_lines + lines[end_index+1:]
            
            with open(file_path, 'w', encoding='utf-8') as f:
                f.writelines(final_lines)
            print("Successfully applied Waiting UI fix.")
        else:
            print("Could not find closing '} else {' tag.")
    else:
        print("Could not find start of block.")

except Exception as e:
    print(f"Error: {e}")
