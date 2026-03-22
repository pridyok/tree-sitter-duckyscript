; locals.scm -- duckyScript (duckyPad) scope / locals tracking

; --- Scopes -------------------------------------------------------------

; The whole file is a global scope
(source_file) @local.scope

; Each function definition creates its own scope
(function_def) @local.scope

; IF / WHILE blocks each create their own scope
(if_statement) @local.scope
(while_statement) @local.scope

; --- Definitions --------------------------------------------------------

; VAR declaration -- defines a variable in the current scope
(declaration
  name: (identifier) @local.definition)

; DEFINE declaration -- defines a constant in the current scope
(declaration
  name: (constant) @local.definition)

; Function name defined by FUN/FUNCTION
(function_def
  name: (identifier) @local.definition)

; Function parameters are defined in the function's inner scope
(param_list
  (identifier) @local.definition)

; --- References ---------------------------------------------------------

; Any bare identifier that is not a definition site is a reference
(identifier) @local.reference

; Interpolated variable names are also references
(interpolation
  (identifier) @local.reference)

; Left-hand side of assignment references (and re-binds) a variable
(assignment
  left: (identifier) @local.reference)
