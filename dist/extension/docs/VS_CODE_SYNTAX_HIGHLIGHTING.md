# Building a VS Code Extension for Orus Syntax Coloring

## Purpose
This guide walks through creating a Visual Studio Code extension that provides full syntax coloring for the Orus programming language. It leverages the existing language documentation (`docs/grammar.ebnf`, `docs/KEYWORDS.md`, `docs/TUTORIAL.md`) so the grammar and token scopes stay aligned with the compiler.

## Prerequisites
- Node.js 18+ and npm (required by VS Code extension tooling)
- Yeoman and the VS Code Extension generator: `npm install -g yo generator-code`
- The Orus repository checked out locally (this repo)
- A recent build of Orus available on your `PATH` for validating sample files (optional but recommended)

## 1. Scaffold the Extension
1. Run `yo code` and choose **New Language Support**.
2. Answer the prompts:
   - **Language id**: `orus`
   - **File extensions**: `.orus`
   - **Display name**: `Orus`
   - **Description**: `Syntax highlighting for the Orus programming language`
3. The generator produces a starter extension with `package.json`, a `syntaxes/` directory, and language configuration files.

## 2. Map Orus Tokens to TextMate Scopes
Use `docs/grammar.ebnf` as the authoritative reference for tokenization.

| Grammar Section | TextMate Scope Suggestions |
|-----------------|----------------------------|
| Identifiers (`identifier`) | `variable.other`, `entity.name.function`, `entity.name.type`
| Keywords (`keyword`) | `keyword.control.orus`, `storage.type.orus`
| Literals (`number_literal`, `string_literal`, `boolean_literal`) | `constant.numeric.orus`, `string.quoted.double.orus`, `constant.language.boolean.orus`
| Operators (`operator`) | `keyword.operator.orus`
| Punctuation (`other_symbol`) | `punctuation.definition.orus`
| Comments (add lexical rule) | `comment.line.double-slash.orus`

Refer to `docs/KEYWORDS.md` to keep the keyword list synchronized. Update the TextMate grammar whenever the keyword production changes.

## 3. Author the TextMate Grammar (`syntaxes/orus.tmLanguage.json`)
1. Replace the generated placeholder with rules that mirror the Orus grammar. Start with top-level patterns:
   - Comments: `//.*$`
   - Strings: `"([^"\\]|\\.)*"`
   - Numbers: handle decimal, hexadecimal (`0x`), binary (`0b`), octal (`0o`), and numeric suffixes (`i32`, `f64`, etc.)
   - Keywords: pull from `docs/KEYWORDS.md`
   - Operators: enumerate from the `operator` production
2. Structure the grammar with named repos, for example:

```jsonc
{
  "repository": {
    "keywords": {
      "patterns": [
        {
          "match": "\\b(and|as|break|catch|continue|elif|else|enum|fn|for|if|impl|in|match|matches|mut|not|or|pass|print|pub|return|struct|try|use|while)\\b",
          "name": "keyword.control.orus"
        }
      ]
    }
  }
}
```

3. Use captures to scope function definitions (`fn` + identifier) as `entity.name.function.orus`. Align block detection with Orus’ colon + indentation syntax (see `docs/TUTORIAL.md:19`).

## 4. Configure Language Features
- **language-configuration.json**: Define comment toggles (`//`), bracket pairs (`()`, `[]`, `{}`), and auto-closing rules for strings.
- **Folding**: Since Orus is indentation-sensitive, set `folding` in `contributes.languages` to `off` by default and rely on indentation-based folding. Optionally add regex-based folding markers using `^\s*(fn|struct|enum|impl)\b`.
- **Snippets**: Populate `snippets/` with templates derived from `docs/TUTORIAL.md` (e.g., function, struct, match expression). Snippets reinforce valid syntax for tests.

## 5. Validate Coloring
1. Create sample `.orus` files under `samples/` using code lifted from `docs/TUTORIAL.md` and `tests/`.
2. Run `npm install` then `npm run compile` (if using TypeScript) or `vsce package` for packaging.
3. Launch the extension in the Extension Development Host (VS Code: `F5`).
4. Open the sample Orus programs and verify scopes with the *Developer: Inspect Editor Tokens and Scopes* command.
5. Adjust regex patterns until keywords, literals, and operators match the expected scopes.

## 6. Keep the Grammar in Sync
- When `docs/grammar.ebnf` changes, update the TextMate grammar and bump the extension version.
- Add a task to your workflow to run `rg --files -g"*.orus"` in `tests/` to collect fixtures for regression testing.
- Consider adding a script that extracts keywords and operators from the EBNF automatically to avoid drift.

## 7. Distribute the Extension
1. Update `README.md` inside the extension project with usage instructions and screenshots.
2. Use `vsce package` to produce a `.vsix` bundle.
3. Publish to the VS Code Marketplace with `vsce publish` (requires Personal Access Token) or share the `.vsix` internally.

## Appendix: Helpful Commands
- Regenerate keyword regex from the grammar:
  ```bash
  rg 'keyword\s*::=' docs/grammar.ebnf -A4
  ```
- List Orus examples for testing:
  ```bash
  rg --files -g"*.orus" tests
  ```
- Launch Orus to validate snippets:
  ```bash
  ./orus samples/demo.orus
  ```

Following this guide will give you a maintainable VS Code extension that stays aligned with the Orus language specification and highlights every construct currently supported by the compiler.
