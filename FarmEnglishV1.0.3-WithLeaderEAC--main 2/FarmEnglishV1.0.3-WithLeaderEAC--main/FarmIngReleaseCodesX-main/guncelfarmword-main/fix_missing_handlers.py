
import os

file_path = r'c:\FarmEnglishV1.0.1\FarmIngReleaseCodesX-main\guncelfarmword-main\src\screens\BattleScreen.tsx'

try:
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
        
    # We need to inject handlePlayAgain and handleGoHome inside the "if (battleState === 'finished')" block.
    # We can inject them before the "return (" statement of the result screen logic.
    
    # Locate the start of the result return
    # The previous injection used this structure:
    # if (battleState === 'finished') {
    #    ... variables ...
    #    return (
    #        <BattleResultScreen ...
    
    target_str = "        return (\n            <BattleResultScreen"
    
    if target_str in content:
        # Define the handlers
        handlers = """
        const handlePlayAgain = () => {
            haptic.medium();
            resetBattle();
            navigation.goBack();
        };

        const handleGoHome = () => {
            haptic.medium();
            resetBattle();
            navigation.goBack();
        };
        """
        
        new_content = content.replace(target_str, handlers + "\n" + target_str)
        
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print("Injected missing handlers.")
    else:
        # Fallback: Maybe the whitespace is different
        import re
        match = re.search(r'return\s*\(\s*<BattleResultScreen', content)
        if match:
            print("Found via regex.")
            handlers = """
        const handlePlayAgain = () => {
            haptic.medium();
            resetBattle();
            navigation.goBack();
        };

        const handleGoHome = () => {
            haptic.medium();
            resetBattle();
            navigation.goBack();
        };
        """
            new_content = content[:match.start()] + handlers + content[match.start():]
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(new_content)
            print("Injected missing handlers via regex.")
        else:
            print("Could not find insertion point for handlers.")

except Exception as e:
    print(f"Error: {e}")
