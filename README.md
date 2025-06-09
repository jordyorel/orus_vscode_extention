# Orus VS Code Extension

This extension adds syntax highlighting support for the **Orus** programming language.

Keywords and operators are highlighted similarly to Python and Rust. The language features are described in [`LANGUAGE.md`](./LANGUAGE.md) and the example programs under the `tests/` directory.

## Features
- Highlight keywords such as `fn`, `let`, `struct`, `impl`, `match`, `try/catch`, control flow statements and boolean operators.
- Built-in types (`i32`, `u32`, `f64`, `bool`, `string`) and the `nil` value.
- Support for generics with the `<T>` syntax.
- Comments with both `//` single-line and `/* */` block comment styles.
- Strings with interpolation using `{}` placeholders.
- Array types and operations including slicing with `..` notation.
- Numeric literals for integers and floating-point values.

## Usage
Install the extension from the VSIX package or clone this repository and run `vsce package` to build.

Once installed, any file with the `.orus` extension will be highlighted automatically.
