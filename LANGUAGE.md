# Orus Language Reference

This document provides a comprehensive reference for the Orus programming language (version 0.5.2).
All examples are taken from the programs located in the `tests/` directory.

## Primitive Types

Orus supports the following built-in primitive types:

- `i32` – Signed 32-bit integers (range: -2,147,483,648 to 2,147,483,647)
- `u32` – Unsigned 32-bit integers (range: 0 to 4,294,967,295)
- `f64` – 64-bit IEEE 754 floating point numbers (double precision)
- `bool` – Boolean values, represented as either `true` or `false`
- `string` – UTF-8 encoded text strings
- `nil` – Absence of a value, automatically returned from functions without an explicit return statement

Examples:
```orus
let signed_int: i32 = -42
let unsigned_int: u32 = 100
let float_num: f64 = 3.14159
let boolean: bool = true
let text: string = "Hello, Orus"
```

## Comments

Single-line comments start with `//` and continue to the end of the line. Block
comments are written using `/*` and `*/` and may span multiple lines.

```orus
// This is a single-line comment
let value = 1 /* inline comment */ + 2

/*
Multi-line comments can cover
several lines.
*/
```

## Compound Types

Orus provides two primary compound data types:

### Arrays

Arrays are fixed-length collections declared with the syntax `[ElementType; Size]`. Arrays are zero-indexed and can be accessed using square bracket notation.

Declaration and initialization:
```orus
// Declare an array of 5 integers
let numbers: [i32; 5] = [1, 2, 3, 4, 5]

// Access array elements (zero-indexed)
let first = numbers[0]  // 1
let third = numbers[2]  // 3

// Modify array elements
numbers[1] = 20

// Multidimensional arrays
let matrix: [i32; 2][2] = [[1, 2], [3, 4]]
let value = matrix[0][1]  // 2
```

### Dynamic Arrays

While arrays have a fixed declared size, they can grow dynamically when used with these built-in functions:

- `push(array, element)` – Appends an element to the end of an array, automatically expanding capacity
- `pop(array)` – Removes and returns the last element of an array
- `len(array)` – Returns the current length of an array

Example:
```orus
let numbers: [i32; 1] = [0]  // Initial capacity of 1
push(numbers, 10)            // Array grows to size 2
push(numbers, 20)            // Array grows to size 3
print(len(numbers))          // Prints 3
let last = pop(numbers)      // last = 20, array size back to 2
```

### Array Slicing

Arrays can be sliced to obtain a sub-array using the `[start..end]` syntax. The
`start` index is inclusive and `end` is exclusive.

```orus
let nums: [i32; 5] = [1, 2, 3, 4, 5]
let first_two = nums[0..2]        // [1, 2]
let tail = nums[2..len(nums)]     // [3, 4, 5]
```

### Structs

Structs are user-defined record types with named fields. They are defined using the `struct` keyword.

Definition and instantiation:
```orus
// Define a struct
struct Point {
    x: i32,
    y: i32
}

// Instantiate a struct
let p1 = Point{x: 10, y: 20}

// Access struct fields
let x_value = p1.x
```

## Variables

Variables are introduced with the `let` keyword and follow these rules:

- All variables must be explicitly declared before use
- Type annotations are optional when the type can be inferred
- Variables are immutable by default and can only be reassigned when declared with `let mut`. See the [Mutability](#mutability) section below for details.
- A variable's type is fixed after its declaration or first assignment
- Variable scope is block-based
- Variables cannot be declared outside functions
- Variable names follow the common identifier rules (letters, digits, underscore; must start with letter/underscore)

Examples:
```orus
let mut count = 0             // Mutable variable (i32)
let text: string = "hello"    // Explicit type annotation
let flag = true               // Type inference (bool)

// Reassignment only works on `count`
count = 10                    // Simple reassignment
count += 2                    // Compound assignment

// Block scope
{
    let local = 5             // Only visible in this block
}
// local is not accessible here
```

### Mutability

Orus embraces immutability by default. Attempting to reassign a variable
declared with `let` results in a compile-time error.

```orus
fn main() {
    let x: i32 = 5
    x = 6  // ❌ Error
}
```

The compiler reports:

```
Error: cannot assign to immutable variable `x`
```

To allow reassignment, declare the variable with `let mut`:

```orus
fn main() {
    let mut count: i32 = 0
    count = 10        // ✅ OK
    count += 2        // ✅ OK
}
```

A mutable variable may change value but not type:

```orus
fn main() {
    let mut value: i32 = 1
    value = 2         // OK
    value = 3.0       // ❌ Error: type mismatch
}
```

Mutability controls the binding, not the contents of data structures:

```orus
fn main() {
    let numbers: [i32; 1] = [0]  // binding is immutable
    push(numbers, 42)            // allowed: array contents updated
    // numbers = [1]            // Error: cannot reassign `numbers`
}
```

For struct fields, the variable itself must be `mut` to modify its fields:

```orus
struct Point { x: i32, y: i32 }

fn main() {
    let mut p = Point{ x: 0, y: 0 }
    p.x = 3        // ✅ allowed
    p.y = 4
}
```

If `p` were immutable, assigning to `p.x` or `p.y` would fail.

In summary:

- Variables are **immutable by default**.
- Use **`let mut`** to create a mutable binding.
- Mutable bindings keep the **same type** for their lifetime.
- Mutability of a binding is separate from the mutability of the data it references.

See `tests/errors/immutable_assignment.orus` for a compiler test that
rejects reassignment of an immutable variable.

## Operators

Orus provides these operators with standard precedence rules:

### Arithmetic Operators
- `+` – Addition (numbers) or concatenation (strings)
- `-` – Subtraction
- `*` – Multiplication
- `/` – Division (integer division for i32/u32, floating point division for f64)
- `%` – Modulo (remainder after division)
- `+=`, `-=`, `*=`, `/=`, `%=` – Compound assignments

### Comparison Operators
- `==` – Equal to
- `!=` – Not equal to
- `<` – Less than
- `>` – Greater than
- `<=` – Less than or equal to
- `>=` – Greater than or equal to

### Logical Operators
- `and` – Logical AND
- `or` – Logical OR
- `not` – Logical NOT (unary)

### Type Conversion

Type conversion must be performed explicitly, as Orus does not perform implicit type conversions between numeric types. Use the `as` keyword to cast a value to another numeric type:

```orus
let a: i32 = -42
let b: u32 = a as u32
let c: f64 = b as f64
```

## Modules and Imports

Orus organizes code in files that serve as modules. The module system follows these rules:

- Modules are loaded using the `use` statement
- `use` statements must appear at the top level of a file, not inside functions
- Importing the same module more than once results in a runtime error
- Modules can contain function definitions, struct definitions, and `impl` blocks
- Module files do **not** require a `main` function and are not meant to be executed directly

Example:
```orus
use path::to::module

fn main() {
    // Call functions from the imported module
module_function()
}
```

Modules can be imported under a different name using the `as` keyword:

```orus
use datetime as dt

fn main() {
    let now = dt.now()
}
```

### Program Entry Point

The entry file of an Orus program must define a `main` function, which serves as the starting point. A project may contain only **one** such function:

```orus
fn main() {
    // Program execution starts here
    print("Hello, world!")
}
```

- Requirements:
- The project must provide exactly one `main` function (directly or via imports).
- Top-level code outside functions is not allowed except for imports and struct/impl definitions.
- `let` declarations and statements must be inside functions.

If the manifest does not specify an entry file, the interpreter searches all
files in the project to locate the unique `main` function.

Modules imported with `use` may omit a `main` function. Such files are compiled
when imported as part of a project but cannot be executed on their own.

## Functions

Functions are defined with the `fn` keyword and follow these rules:

- Parameter types must be explicitly declared
- Return type is specified with the `->` syntax
- If a return type is declared, all code paths must return a value of that type
- Functions without a return type declaration implicitly return `nil`
- Parameters are passed by value
- Functions may be called before their definitions appear

Examples:
```orus
// Function with parameters and return value
fn add(a: i32, b: i32) -> i32 {
    return a + b
}

// Function with multiple return paths
fn max(a: i32, b: i32) -> i32 {
    if a > b {
        return a
    }
    return b
}

// Function with no explicit return (returns nil)
fn greet(name: string) {
    print("Hello, {}!", name)
}

// Recursive function
fn factorial(n: i32) -> i32 {
    if n <= 1 {
        return 1
    }
    return n * factorial(n - 1)
}
```

## Control Flow

Orus provides the following control flow constructs:

### Conditionals

```orus
// Simple if
if condition {
    // code executed if condition is true
}

// If-else
if condition {
    // code executed if condition is true
} else {
    // code executed if condition is false
}

// If-elif-else chain
if condition1 {
    // code for condition1
} elif condition2 {
    // code for condition2
} elif condition3 {
    // code for condition3
} else {
    // default case
}
```

### Loops

```orus
// For loop with start..end syntax
for i in 0..10 {       // Range is inclusive of start, exclusive of end (0 to 9)
    print(i)
}

// Equivalent using range(start, end)
for i in range(0, 10) {
    print(i)
}

// While loop
while condition {
    // code executed as long as condition is true
}

// Nested loops
for x in 0..3 {
    for y in 0..3 {
        print("({},{})", x, y)
    }
}

// Countdown with while
let n = 3
while n > 0 {
    print(n)
    n = n - 1
}
```

### Loop Control

```orus
// Break statement (exits the loop)
while true {
    if condition {
        break           // Exits the loop immediately
    }
}

// Continue statement (skips to next iteration)
for i in 0..10 {
    if i % 2 == 0 {
        continue        // Skip even numbers, continue with next iteration
    }
    print(i)            // Only prints odd numbers
}
```

### Match Statements

Pattern matching compares a value against patterns:

```orus
match value {
    "yes" => print("ok"),
    "no" => print("not ok"),
    _ => print("unknown")
}
```

### Match Patterns

Each branch begins with a *pattern* followed by `=>`. Patterns are compared to
the matched value using equality:

- **Literal patterns** – numbers, strings or booleans. These are evaluated as
  expressions and checked with `==`.
- **Wildcard pattern** – the underscore `_` matches any value and is typically
  used for the final default case.

Cases are evaluated from top to bottom and the first matching branch runs. A
comma may follow each branch for readability.

## Methods with `impl`

Methods are defined inside `impl` blocks attached to a struct type:

```orus
struct Rectangle {
    width: i32,
    height: i32
}

impl Rectangle {
    // Instance method (requires an instance of Rectangle)
    fn area(self) -> i32 {
        return self.width * self.height
    }
    
    // Static method (creates and returns a new Rectangle)
    fn new(w: i32, h: i32) -> Rectangle {
        return Rectangle{
            width: w,
            height: h
        }
    }
}
```

Usage:
```orus
fn main() {
    // Call static method
    let rect = Rectangle.new(5, 10)
    
    // Call instance method
    let a = rect.area()  // Returns 50
}
```

Key points:
- Instance methods receive `self` as their first parameter
- Static methods are called with the struct name followed by a dot
- Instance methods are called on instances of the struct
- Multiple `impl` blocks can be defined for the same struct

## Printing and String Formatting

Orus provides a built-in `print` function for console output:

```orus
// Simple printing
print("Hello, world!")

// String interpolation with placeholders
let name = "Alice"
let age = 30
print("{} is {} years old", name, age)  // Alice is 30 years old

// Print expressions
print("The result is: {}", 10 * 5 + 2)
```

String interpolation features:
- Each `{}` placeholder is replaced with the corresponding argument
- Arguments are converted to strings automatically
- The number of placeholders should match the number of additional arguments

## String Operations

Orus supports the following string operations:

```orus
// String concatenation with +
let greeting = "Hello, " + "world!"

// String length
let length = len("Hello")  // 5

// Substring extraction: substring(str, start, end)
let part = substring("Hello, world!", 0, 5)  // "Hello"
```

## Built-in Functions

The language provides a small set of built-in functions available in every
module:
For a complete list see [BUILTINS.md](BUILTINS.md).

- `print(values...)` – Output values to the console using `{}` placeholders for
  interpolation.
- `len(value)` – Length of a string or array.
- `substring(str, start, len)` – Extract a portion of a string.
- `push(array, value)` – Append a value to a dynamic array.
- `pop(array)` – Remove and return the last element of an array.
- `range(start, end)` – Generate a sequence of integers for `for` loops.
- `sum(array)` – Sum all numeric elements of an array.
- `min(array)` – Return the smallest numeric element of an array.
- `max(array)` – Return the largest numeric element of an array.
- `type_of(value)` – Return the name of a value's type as a string.
- `is_type(value, name)` – Check whether a value is of the given type.
- `input(prompt)` – Display a prompt and return a line of user input.
- `int(text)` – Convert a string to an `i32`, raising an error on failure.
- `float(text)` – Convert a string to an `f64`, raising an error on failure.
- `sorted(array, key, reverse)` – Return a new array with the elements sorted. The `key` argument is optional and reserved for future use. `reverse` may be passed as the second argument when no key is supplied.

```orus
let arr: [i32; 1] = [1]
push(arr, 2)
print(len(arr))            // 2
print(type_of(arr))        // "[i32]"
print(is_type(10, "i32"))  // true
let name = input("Enter your name: ")
print("Hello, {}", name)
let age: i32 = int(input("How old are you? "))
let height: f64 = float(input("Height in meters? "))
let nums = [4, 2, 1]
print(sorted(nums))
print(sorted(nums, true))
```

## Error Handling

Orus provides exception-like error handling with `try`/`catch` blocks:

```orus
try {
    // Code that might cause an error
    let result = 10 / 0  // Division by zero error
} catch err {
    // Error handling code
    print("Error occurred: {}", err)
}
```

Error types:
- Runtime errors (e.g., division by zero)
- Type errors (e.g., incompatible types in an operation)
- I/O errors (e.g., failed file operations)

Error messages include the location of the failure using the format
`file:line:column: message`. When an error unwinds through function calls,
a short stack trace is printed showing the call chain.

## Generics

Orus functions and structs can take generic type parameters. Generic parameters
are declared after the name using angle brackets and can be referenced within
the definition. Type arguments may be supplied at call sites.

```orus
fn id<T>(x: T) -> T {
    return x
}

struct Box<T> {
    value: T,
}

fn main() {
    print(id<i32>(1))
    print(id<string>("hi"))
    let b: Box<i32> = Box { value: 2 }
    print(b.value)
}
```

// Generic function returning a pair with swapped values
fn swap<T>(a: T, b: T) -> [T; 2] {
    return [b, a]
}

fn demo() {
    let pair = swap<i32>(1, 2)
    print(pair[0])  // 2
    print(pair[1])  // 1
}

Generic parameters are checked during compilation and must be supplied or can
be inferred from argument types. The compiler verifies that generic arguments
match usage within the function or struct.

While regular functions support forward declarations (can be called before being defined), 
generic functions currently must be defined before they are used in the code. Forward 
declarations for generic functions are planned for a future version.

