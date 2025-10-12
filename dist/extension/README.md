# Orus VS Code Extension

![Orus logo](logo/logo.png)

This extension adds first-class Visual Studio Code support for the Orus programming language. It pairs the official language
grammar with editor ergonomics so you can read, write, and run Orus code without leaving VS Code. The extension targets VS Code 1.56 and newer builds.

## Features
- Accurate TextMate grammar derived from [`docs/grammar.ebnf`](docs/grammar.ebnf) and [`docs/KEYWORDS.md`](docs/KEYWORDS.md)
- Built-in Orus language server that surfaces keyword documentation on hover
- One Dark Pro-inspired keyword, builtin, constant, type, variable, and function-call highlighting tailored for Orus syntax
- Bundled `Orus One Dark` editor theme for a cohesive experience
- Language configuration for comments, indentation, and bracket pairing
- Optional Orus file icon theme (Seti-based) so `.orus` files display the logo when selected
- Productive snippets curated from [`docs/TUTORIAL.md`](docs/TUTORIAL.md)
- `Orus: Run Current File` command to execute the active `.orus` file through the Orus CLI
- `Orus: New Sample File` command for quickly bootstrapping a fresh script

## Getting Started
1. Run `npm install` to fetch the extension dependencies.
2. Build the extension once with `npm run compile`.
3. Press `F5` (Run → Start Debugging) to launch the Extension Development Host.
4. Open any `.orus` file (see `hello.orus` or `basic_algorithms.orus`) to try the highlighting, snippets, and commands.
5. (Optional) Switch to *File → Preferences → Color Theme → Orus One Dark* for the full Orus look and feel.
6. (Optional) Open *File → Preferences → File Icon Theme* and choose *Orus File Icons (Seti base)* if you want `.orus` files to display the logo.

## Commands
| Command | Description |
|---------|-------------|
| `Orus: Run Current File` | Saves and runs the active file via the configured Orus executable. |
| `Orus: New Sample File` | Opens a new unsaved editor populated with a friendly Orus template. |

The run command streams output to a dedicated *Orus* output channel by default. Enable the `orus.runInTerminal` setting to use
an integrated terminal instead.

## Settings
| Setting | Default | Description |
|---------|---------|-------------|
| `orus.executablePath` | `orus` | Absolute or relative path to the Orus CLI. |
| `orus.runInTerminal` | `false` | When `true`, run files inside the integrated terminal instead of the output channel. |

## Packaging
- `npm run package` bundles a `.vsix` (requires [`vsce`](https://code.visualstudio.com/api/working-with-extensions/publishing-extension)).
- `vsce package` output can be installed locally via *Extensions → … → Install from VSIX*.

## Contributing
The TextMate grammar intentionally mirrors `docs/grammar.ebnf`. When the language evolves, update both documents together and bump
`package.json` accordingly. Sample programs in this repository help validate highlighting and snippets—feel free to add more.
