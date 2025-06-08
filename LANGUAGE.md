# Orus Language Reference

This document provides a comprehensive reference for the Orus programming language (version 0.5.0).
All examples are taken from the programs located in the `tests/` directory.

## Primitive Types

Orus supports the following built-in primitive types:

- `i32` – Signed 32-bit integers (range: -2,147,483,648 to 2,147,483,647)
- `u32` – Unsigned 32-bit integers (range: 0 to 4,294,967,295)
- `f64` – 64‑bit floating point numbers.
- `bool` – boolean values `true` or `false`.
- `string` – UTF‑8 text.
- `nil` – absence of a value, returned from functions without an explicit result.

## Compound types

Two compound type forms are provided:

- **Arrays** – fixed length collections declared with `[T; N]`. Arrays can be
  multidimensional and indexed with `arr[i]`.
- **Structs** – records containing named fields. `impl` blocks may define
  methods or static functions on a struct type.

See `tests/datastructures/stack_queue.orus` for an example mixing arrays,
structs and methods.

## Variables

Variables are introduced with `let` and can optionally specify a type:

```orus
let count = 0
let text: string = "hello"
```

Assignment reuses the variable name on the left hand side.

## Functions

Functions use the `fn` keyword with an optional return type after `->`:

```orus
fn add(a: i32, b: i32) -> i32 {
    return a + b
}
```

Return statements may be omitted if `nil` is returned. Examples can be found
in `tests/functions/basic_functions.orus` and
`tests/functions/advanced_functions.orus`.

## Control flow

Orus provides common flow control constructs:

- `if`/`elif`/`else` conditional blocks.
- `for` ranges (`for i in 0..10 { ... }`).
- `while` loops.
- `break` and `continue` statements.

All of these are demonstrated under `tests/control_flow/`.

## Methods with `impl`

Methods are defined inside `impl` blocks attached to a `struct` type. Instance
methods receive `self` as the first parameter:

```orus
struct Stack {
    data: [i32; 10],
    top: i32
}

impl Stack {
    fn push(self, value: i32) -> bool {
        /* ... */
    }
}
```

See `tests/datastructures/stack_queue.orus` for full implementations of a stack
and queue using methods.

## Printing values

Use the built‑in `print` function to write output. Strings may include `{}`
placeholders which are replaced by the remaining arguments:

```orus
let name = "Orus"
print("Hello, {}!", name)
```

More examples are available in `tests/print/string_interpolation.orus`.

