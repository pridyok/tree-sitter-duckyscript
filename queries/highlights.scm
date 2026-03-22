; highlights.scm -- duckyScript (duckyPad) syntax highlighting

; --- Comments -----------------------------------------------------------

(comment) @comment

(rem_block
  (block_keyword) @comment)

(rem_block
  (block_body) @comment)

; --- String blocks ------------------------------------------------------

(string_block
  (string_block_keyword) @keyword)

(string_block
  (block_body) @string)

; --- STRING / STRINGLN --------------------------------------------------

(string_command
  (string_keyword) @keyword)

(string_command
  (string_text) @string)

; --- OLED print ---------------------------------------------------------

(oled_print_command
  (oled_print_keyword) @keyword)

(oled_print_command
  (string_text) @string)

; --- GOTO_PROFILE -------------------------------------------------------

(goto_profile_command
  (profile_keyword) @keyword)

(goto_profile_command
  (string_text) @string)

; --- Variable interpolation ---------------------------------------------

(interpolation
  (interpolation_sigil) @punctuation.special)

(interpolation
  (identifier) @variable)

(interpolation
  (format_sigil) @punctuation.special)

(interpolation
  (format_width) @constant.numeric)

(interpolation
  (format_type) @type)

; --- LOOP label ---------------------------------------------------------

(loop_label) @label

; --- Control-flow keywords ----------------------------------------------

(if_clause
  (keyword) @keyword.control)

(else_if_clause
  (keyword) @keyword.control)

(else_clause
  (keyword) @keyword.control)

(if_statement
  (end_keyword) @keyword.control)

(while_statement
  (keyword) @keyword.control)

(while_statement
  (end_keyword) @keyword.control)

(return_statement
  (keyword) @keyword.control)

(break_statement
  (keyword) @keyword.control)

(continue_statement
  (keyword) @keyword.control)

; --- Function definition ------------------------------------------------

(function_def
  (keyword) @keyword.function)

(function_def
  (end_keyword) @keyword.function)

(function_def
  name: (identifier) @function)

(param_list
  (identifier) @variable.parameter)

; --- Declarations -------------------------------------------------------

(declaration
  (keyword) @keyword)

(declaration
  name: (constant) @constant)

(declaration
  name: (identifier) @variable)

; --- Assignment ---------------------------------------------------------

(assignment
  left: (identifier) @variable)

(assignment
  (assignment_operator) @operator)

; --- Expressions --------------------------------------------------------

(binary_expression) @operator

(unary_expression) @operator

; --- Function calls -----------------------------------------------------

(function_call
  name: (identifier) @function.call)

(function_call_statement
  name: (identifier) @function.call)

; --- Commands -----------------------------------------------------------

(command
  (command_keyword) @keyword)

; --- Key names ----------------------------------------------------------

(key_press
  (key) @constant.builtin)

; --- Reserved variables -------------------------------------------------

(reserved_variable) @variable.builtin

(dollar_reserved) @variable.builtin

; --- Dollar-prefixed user variables -------------------------------------

(dollar_identifier) @variable

; --- Numbers ------------------------------------------------------------

(number) @number

; --- General identifiers (lowest priority) ------------------------------

(identifier) @variable
