/// <reference types="tree-sitter-cli/dsl" />
// @ts-check

/**
 * Tree-sitter grammar for duckyPad duckyScript
 * Reference: duckypad-duckyscript.tmLanguage.json + duckyscript_for_ai.txt
 *
 * An external scanner (src/scanner.c) handles the block body content for
 * REM_BLOCK, STRING_BLOCK, and STRINGLN_BLOCK, since tree-sitter's regex
 * engine does not support lookahead assertions.
 */

const KEYS = [
    // Modifiers
    "CTRL",
    "RCTRL",
    "SHIFT",
    "RSHIFT",
    "ALT",
    "RALT",
    "WINDOWS",
    "RWINDOWS",
    "GUI",
    "COMMAND",
    "RCOMMAND",
    "OPTION",
    "ROPTION",
    // Navigation / editing
    "ESC",
    "ENTER",
    "UP",
    "DOWN",
    "LEFT",
    "RIGHT",
    "SPACE",
    "BACKSPACE",
    "TAB",
    "CAPSLOCK",
    "PRINTSCREEN",
    "SCROLLLOCK",
    "PAUSE",
    "BREAK",
    "INSERT",
    "HOME",
    "PAGEUP",
    "PAGEDOWN",
    "DELETE",
    "END",
    "MENU",
    "POWER",
    // Function keys — longest first so F12 isn't lexed as F1 + 2
    "F24",
    "F23",
    "F22",
    "F21",
    "F20",
    "F19",
    "F18",
    "F17",
    "F16",
    "F15",
    "F14",
    "F13",
    "F12",
    "F11",
    "F10",
    "F9",
    "F8",
    "F7",
    "F6",
    "F5",
    "F4",
    "F3",
    "F2",
    "F1",
    // Media keys
    "MK_VOLUP",
    "MK_VOLDOWN",
    "MK_MUTE",
    "MK_PREV",
    "MK_NEXT",
    "MK_PP",
    "MK_STOP",
    // Numpad
    "NUMLOCK",
    "KP_SLASH",
    "KP_ASTERISK",
    "KP_MINUS",
    "KP_PLUS",
    "KP_ENTER",
    "KP_0",
    "KP_1",
    "KP_2",
    "KP_3",
    "KP_4",
    "KP_5",
    "KP_6",
    "KP_7",
    "KP_8",
    "KP_9",
    "KP_DOT",
    "KP_EQUAL",
    // Japanese IME
    "ZENKAKUHANKAKU",
    "HENKAN",
    "MUHENKAN",
    "KATAKANAHIRAGANA",
    // Mouse buttons (usable in KEYDOWN/KEYUP context)
    "LMOUSE",
    "RMOUSE",
    "MMOUSE",
    "FMOUSE",
    "BMOUSE",
];

module.exports = grammar({
    name: "duckyscript",

    externals: ($) => [
        $._rem_block_content, // raw text inside REM_BLOCK … END_REM
        $._string_block_content, // raw text inside STRING_BLOCK … END_STRING
        $._stringln_block_content, // raw text inside STRINGLN_BLOCK … END_STRINGLN
    ],

    extras: ($) => [/[ \t]/],

    // The word rule enables keyword extraction: any string literal used in the
    // grammar (e.g. "RETURN", "IF", "WHILE") will automatically have higher
    // lexical priority than the identifier rule, preventing keywords from being
    // tokenized as plain identifiers.
    word: ($) => $.identifier,

    rules: {
        // ── Top-level ──────────────────────────────────────────────────────────
        source_file: ($) =>
            repeat(
                choice(
                    $.comment,
                    $.rem_block,
                    $.string_block,
                    $.string_command,
                    $.oled_print_command,
                    $.goto_profile_command,
                    $.loop_label,
                    $.if_statement,
                    $.while_statement,
                    $.function_def,
                    $.declaration,
                    $.assignment,
                    $.return_statement,
                    $.break_statement,
                    $.continue_statement,
                    $.key_press,
                    $.command,
                    $.function_call_statement,
                    $._newline,
                ),
            ),

        // ── Newlines ───────────────────────────────────────────────────────────
        _newline: (_) => /\r?\n/,

        // ── Comments ──────────────────────────────────────────────────────────
        comment: (_) =>
            token(
                choice(
                    // // line comment
                    seq("//", /.*/),
                    // REM with text after it
                    seq("REM", /[ \t].*/),
                    // REM on its own line (no trailing text)
                    "REM",
                ),
            ),

        // ── REM_BLOCK … END_REM ───────────────────────────────────────────────
        rem_block: ($) =>
            seq(
                field("open", alias("REM_BLOCK", $.block_keyword)),
                /\r?\n/,
                field("body", alias($._rem_block_content, $.block_body)),
                field("close", alias("END_REM", $.block_keyword)),
                /\r?\n/,
            ),

        // ── STRING_BLOCK / STRINGLN_BLOCK ─────────────────────────────────────
        string_block: ($) =>
            choice(
                seq(
                    field(
                        "open",
                        alias("STRING_BLOCK", $.string_block_keyword),
                    ),
                    /\r?\n/,
                    field("body", alias($._string_block_content, $.block_body)),
                    field("close", alias("END_STRING", $.string_block_keyword)),
                    /\r?\n/,
                ),
                seq(
                    field(
                        "open",
                        alias("STRINGLN_BLOCK", $.string_block_keyword),
                    ),
                    /\r?\n/,
                    field(
                        "body",
                        alias($._stringln_block_content, $.block_body),
                    ),
                    field(
                        "close",
                        alias("END_STRINGLN", $.string_block_keyword),
                    ),
                    /\r?\n/,
                ),
            ),

        // ── STRING / STRINGLN ─────────────────────────────────────────────────
        string_command: ($) =>
            seq(
                field(
                    "keyword",
                    alias(choice("STRING", "STRINGLN"), $.string_keyword),
                ),
                optional(field("content", $._string_content)),
                /\r?\n/,
            ),

        _string_content: ($) => repeat1(choice($.interpolation, $.string_text)),

        string_text: (_) => /[^\r\n$%]+/,

        // ── OLED print commands ────────────────────────────────────────────────
        oled_print_command: ($) =>
            seq(
                field(
                    "keyword",
                    alias(
                        choice("OLED_PRINT", "OLED_CPRINT"),
                        $.oled_print_keyword,
                    ),
                ),
                field("content", $._string_content),
                /\r?\n/,
            ),

        // ── GOTO_PROFILE ──────────────────────────────────────────────────────
        goto_profile_command: ($) =>
            seq(
                field("keyword", alias("GOTO_PROFILE", $.profile_keyword)),
                field("content", $._string_content),
                /\r?\n/,
            ),

        // ── Variable interpolation: $name[%[width]type] ───────────────────────
        interpolation: ($) =>
            seq(
                field("sigil", alias("$", $.interpolation_sigil)),
                field("name", $.identifier),
                optional(
                    seq(
                        field("percent", alias("%", $.format_sigil)),
                        optional(field("width", $.format_width)),
                        field("type", $.format_type),
                    ),
                ),
            ),

        format_width: (_) => /0?[0-9]+/,
        format_type: (_) => /[dDuUxX]/,

        // ── LOOP label ────────────────────────────────────────────────────────
        loop_label: (_) => token(seq(/LOOP[0-9]+/, ":")),

        // ── IF / ELSE IF / ELSE / END_IF ──────────────────────────────────────
        if_statement: ($) =>
            seq(
                field("condition", $.if_clause),
                field("body", $.block_body),
                repeat(field("alternative", $.else_if_clause)),
                optional(field("else", $.else_clause)),
                field("end", alias("END_IF", $.end_keyword)),
                /\r?\n/,
            ),

        if_clause: ($) =>
            seq(
                alias("IF", $.keyword),
                field("condition", $._expression),
                optional(alias("THEN", $.keyword)),
                /\r?\n/,
            ),

        else_if_clause: ($) =>
            seq(
                alias("ELSE IF", $.keyword),
                field("condition", $._expression),
                optional(alias("THEN", $.keyword)),
                /\r?\n/,
                field("body", $.block_body),
            ),

        else_clause: ($) =>
            seq(alias("ELSE", $.keyword), /\r?\n/, field("body", $.block_body)),

        // ── WHILE / END_WHILE ─────────────────────────────────────────────────
        while_statement: ($) =>
            seq(
                alias("WHILE", $.keyword),
                field("condition", $._expression),
                /\r?\n/,
                field("body", $.block_body),
                field("end", alias("END_WHILE", $.end_keyword)),
                /\r?\n/,
            ),

        // ── FUN / END_FUN (also FUNCTION / END_FUNCTION) ──────────────────────
        function_def: ($) =>
            seq(
                field("keyword", alias(choice("FUN", "FUNCTION"), $.keyword)),
                field("name", $.identifier),
                "(",
                optional(field("params", $.param_list)),
                ")",
                /\r?\n/,
                field("body", $.block_body),
                field(
                    "end",
                    alias(choice("END_FUN", "END_FUNCTION"), $.end_keyword),
                ),
                /\r?\n/,
            ),

        param_list: ($) => seq($.identifier, repeat(seq(",", $.identifier))),

        // ── Generic block body (used inside if / while / function) ────────────
        block_body: ($) =>
            repeat1(
                choice(
                    $.comment,
                    $.string_command,
                    $.oled_print_command,
                    $.goto_profile_command,
                    $.if_statement,
                    $.while_statement,
                    $.function_def,
                    $.declaration,
                    $.assignment,
                    $.return_statement,
                    $.break_statement,
                    $.continue_statement,
                    $.key_press,
                    $.command,
                    $.function_call_statement,
                    $._newline,
                ),
            ),

        // ── RETURN / LBREAK / CONTINUE ────────────────────────────────────────
        return_statement: ($) =>
            seq(
                alias("RETURN", $.keyword),
                optional(field("value", $._expression)),
                /\r?\n/,
            ),

        break_statement: ($) => seq(alias("LBREAK", $.keyword), /\r?\n/),

        continue_statement: ($) => seq(alias("CONTINUE", $.keyword), /\r?\n/),

        // ── DEFINE / VAR ──────────────────────────────────────────────────────
        declaration: ($) =>
            choice(
                seq(
                    field("keyword", alias("DEFINE", $.keyword)),
                    field("name", alias($.identifier, $.constant)),
                    field("value", $._define_value),
                    /\r?\n/,
                ),
                seq(
                    field("keyword", alias("VAR", $.keyword)),
                    field("name", $._var_name),
                    optional(seq("=", field("value", $._expression))),
                    /\r?\n/,
                ),
            ),

        // Variable name in a VAR declaration: bare identifier OR $-prefixed identifier
        _var_name: ($) => choice($.identifier, $.dollar_identifier),

        // DEFINE replaces its value as-is — treat the rest of the line as raw text
        _define_value: (_) => /.+/,

        // ── Assignment (variable = expr) ──────────────────────────────────────
        // Left-hand side may be a bare identifier, a $-prefixed user variable,
        // or a $-prefixed special variable (e.g. $_RANDOM_MIN = 0).
        assignment: ($) =>
            seq(
                field(
                    "left",
                    choice(
                        $.identifier,
                        $.dollar_identifier,
                        $.dollar_reserved,
                    ),
                ),
                field("operator", $.assignment_operator),
                field("right", $._expression),
                /\r?\n/,
            ),

        assignment_operator: (_) =>
            token(
                choice(
                    "=",
                    "+=",
                    "-=",
                    "*=",
                    "/=",
                    "%=",
                    "**=",
                    "&=",
                    "|=",
                    "^=",
                    "<<=",
                    ">>=",
                ),
            ),

        // ── Expressions ───────────────────────────────────────────────────────
        _expression: ($) =>
            choice(
                $.binary_expression,
                $.unary_expression,
                $.function_call,
                $.number,
                $.reserved_variable,
                $.dollar_reserved,
                $.dollar_identifier,
                $.identifier,
            ),

        binary_expression: ($) =>
            prec.left(
                1,
                seq(
                    field("left", $._expression),
                    field("operator", $._binary_operator),
                    field("right", $._expression),
                ),
            ),

        _binary_operator: (_) =>
            token(
                choice(
                    "**",
                    "*",
                    "/",
                    "%",
                    "+",
                    "-",
                    "<<",
                    ">>",
                    "<=",
                    ">=",
                    "<",
                    ">",
                    "==",
                    "!=",
                    "&",
                    "^",
                    "|",
                    "&&",
                    "||",
                ),
            ),

        unary_expression: ($) =>
            prec(
                2,
                seq(
                    field("operator", choice("!", "~", "-")),
                    field("operand", $._expression),
                ),
            ),

        // ── Function call (expression context) ────────────────────────────────
        function_call: ($) =>
            seq(
                field("name", $.identifier),
                "(",
                optional(field("args", $.argument_list)),
                ")",
            ),

        argument_list: ($) =>
            seq($._expression, repeat(seq(",", $._expression))),

        // ── Function call as a standalone statement ────────────────────────────
        function_call_statement: ($) =>
            seq(
                field("name", $.identifier),
                "(",
                optional(field("args", $.argument_list)),
                ")",
                /\r?\n/,
            ),

        // ── Key press (one or more key names on a line) ────────────────────────
        // e.g.  CTRL ALT DELETE   or just   ENTER
        // Single lowercase/mixed-case letters (e.g. "r" in "WINDOWS r") are
        // represented as identifiers since they are not in the key token list.
        key_press: ($) =>
            seq($.key, repeat(choice($.key, $.identifier)), /\r?\n/),

        key: (_) => token(choice(...KEYS)),

        // ── General / misc commands ────────────────────────────────────────────
        command: ($) =>
            seq(
                field("keyword", $.command_keyword),
                optional(field("args", $._arg_list)),
                /\r?\n/,
            ),

        _arg_list: ($) => repeat1(choice($._expression, $.key)),

        command_keyword: (_) =>
            token(
                choice(
                    // Timing
                    "DELAY",
                    "DEFAULTDELAY",
                    "DEFAULTCHARDELAY",
                    "CHARJITTER",
                    // Repeat / random
                    "REPEAT",
                    "RANDCHR",
                    "RANDINT",
                    "RANDUINT",
                    "RANDOM_LOWERCASE_LETTER",
                    "RANDOM_UPPERCASE_LETTER",
                    "RANDOM_NUMBER",
                    "RANDOM_SPECIAL",
                    "RANDOM_LETTER",
                    "RANDOM_CHAR",
                    // HID / stdlib
                    "HIDTX",
                    "USE_STDLIB",
                    "USE_UH",
                    // Power / control
                    "DP_SLEEP",
                    "HALT",
                    // Memory ops
                    "BCLR",
                    "PEEK8",
                    "PEEK16",
                    "PEEK32",
                    "PEEKU8",
                    "PEEKU16",
                    "POKE8",
                    "POKE16",
                    "POKE32",
                    // Unsigned ops (statement form)
                    "ULT",
                    "ULTE",
                    "UGT",
                    "UGTE",
                    "UDIV",
                    "UMOD",
                    "LSR",
                    // String output helpers
                    "PUTS",
                    // Key hold/release
                    "KEYDOWN",
                    "KEYUP",
                    // Mouse
                    "MOUSE_MOVE",
                    "MOUSE_SCROLL",
                    // LED
                    "SWC_SET",
                    "SWC_FILL",
                    "SWC_RESET",
                    // OLED (non-print)
                    "OLED_CURSOR",
                    "OLED_CLEAR",
                    "OLED_CIRCLE",
                    "OLED_LINE",
                    "OLED_RECT",
                    "OLED_UPDATE",
                    "OLED_RESTORE",
                    // Profile
                    "PREV_PROFILE",
                    "NEXT_PROFILE",
                ),
            ),

        // ── Reserved variables (_NAME) ─────────────────────────────────────────
        reserved_variable: (_) =>
            token(
                choice(
                    "_TIME_S",
                    "_TIME_MS",
                    "_READKEY",
                    "_BLOCKING_READKEY",
                    "_SW_BITFIELD",
                    "_KBLED_BITFIELD",
                    "_IS_NUMLOCK_ON",
                    "_IS_CAPSLOCK_ON",
                    "_IS_SCROLLLOCK_ON",
                    "_DEFAULTDELAY",
                    "_DEFAULTCHARDELAY",
                    "_CHARJITTER",
                    "_ALLOW_ABORT",
                    "_DONT_REPEAT",
                    "_THIS_KEYID",
                    "_DP_MODEL",
                    "_KEYPRESS_COUNT",
                    "_LOOP_SIZE",
                    "_NEEDS_EPILOGUE",
                    "_RTC_IS_VALID",
                    "_RTC_YEAR",
                    "_RTC_MONTH",
                    "_RTC_DAY",
                    "_RTC_HOUR",
                    "_RTC_MINUTE",
                    "_RTC_SECOND",
                    "_RTC_WDAY",
                    "_RTC_YDAY",
                    "_RTC_UTC_OFFSET",
                    // _GV0 … _GV31
                    ...[...Array(32).keys()].map((i) => `_GV${i}`),
                ),
            ),

        // ── Numbers ───────────────────────────────────────────────────────────
        number: (_) => token(choice(/0x[0-9a-fA-F]+/, /[0-9]+/)),

        // ── $-prefixed variable forms ──────────────────────────────────────────
        // $varname  -- user variable referenced with explicit $ sigil
        dollar_identifier: (_) => token(seq("$", /[a-zA-Z_][a-zA-Z0-9_]*/)),

        // $_RESERVED  -- special/built-in variable referenced with $ sigil
        // (e.g. $_RANDOM_INT, $_BLOCKING_READKEY used as lvalue $_RANDOM_MIN)
        dollar_reserved: (_) => token(seq("$_", /[A-Z][A-Z0-9_]*/)),

        // ── Identifier (lowest priority — catches anything else) ───────────────
        identifier: (_) => /[a-zA-Z_][a-zA-Z0-9_]*/,
    },
});
