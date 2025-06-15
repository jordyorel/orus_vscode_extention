# Troubleshooting Orus Language Extension

## Syntax Highlighting Issues

### White Text in Long Code Sections

If you're seeing parts of your code appear as plain white text (no highlighting) when working with very long files or lines, try the following solutions:

1. **Increase the tokenization limits**

   You can change the maximum tokenization line length in your VS Code settings:

   ```json
   "orus-lang.maxTokenizationLineLength": 50000
   ```

   You can set this in your settings.json or by going to Settings > Extensions > Orus Language.

2. **Break up long lines of code**

   Very long lines of code can sometimes exceed VS Code's tokenization limits. Consider breaking them into smaller chunks when possible.

3. **Use region markers for better organization**

   You can use region markers to organize your code and improve editor performance:

   ```
   // region: Description
   // Your code here
   // endregion
   ```

4. **Update the extension**

   Make sure you're using the latest version of the Orus Language extension, as performance improvements are regularly added.

## Performance Tips

When working with very large Orus files:

1. **Consider splitting files**

   If a single file is getting too large, consider splitting it into multiple smaller files.

2. **Disable syntax highlighting temporarily**

   For extremely large files, you can temporarily switch to plain text mode for better performance.

## Reporting Issues

If you continue to experience problems with syntax highlighting or any other aspect of the Orus Language extension, please report them on our [GitHub issues page](https://github.com/jordyorel/orus_vscode_extention/issues).

When reporting an issue, please include:
- A sample of the code that's not highlighting correctly
- Your VS Code version
- The extension version
- Any settings you've customized
