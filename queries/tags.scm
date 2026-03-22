; tags.scm -- duckyScript (duckyPad) symbol tags
; Used by tree-sitter tags / ctags-style tooling

; --- Function definitions -----------------------------------------------

(function_def
  name: (identifier) @name) @definition.function

; --- Variable declarations ----------------------------------------------

(declaration
  name: (identifier) @name) @definition.var

(declaration
  name: (constant) @name) @definition.constant

; --- Loop labels --------------------------------------------------------

(loop_label) @name @definition.label

; --- Function calls -----------------------------------------------------

(function_call
  name: (identifier) @name) @reference.call

(function_call_statement
  name: (identifier) @name) @reference.call
