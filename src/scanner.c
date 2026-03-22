#include "tree_sitter/parser.h"
#include <string.h>
#include <stdbool.h>

/*
 * External scanner for duckyScript block bodies.
 *
 * The tree-sitter regex engine does not support lookahead assertions, so we
 * handle the "everything up to the closing keyword" scanning here in C.
 *
 * Three external tokens are produced:
 *
 *   0  _rem_block_content      — text between REM_BLOCK and END_REM
 *   1  _string_block_content   — text between STRING_BLOCK and END_STRING
 *   2  _stringln_block_content — text between STRINGLN_BLOCK and END_STRINGLN
 *
 * Each scanner consumes characters one line at a time, stopping (without
 * consuming) when the closing keyword appears at the start of a line
 * (ignoring leading whitespace, matching the duckyScript spec).
 *
 * All three tokens are emitted as a single blob of raw text — the grammar
 * wraps them in a block_body alias so the highlighter can colour them.
 */

/* ── Token indices (must match the order in grammar.js externals) ─────────── */
#define TOKEN_REM_BLOCK_CONTENT      0
#define TOKEN_STRING_BLOCK_CONTENT   1
#define TOKEN_STRINGLN_BLOCK_CONTENT 2

/* ── Helpers ──────────────────────────────────────────────────────────────── */

/* Peek at the next character without advancing. */
static inline int32_t peek(TSLexer *lexer) {
    return lexer->lookahead;
}

/* Advance one character, optionally counting it as part of the token. */
static inline void advance(TSLexer *lexer) {
    lexer->advance(lexer, false);
}

/* Skip one character without including it in the token (for whitespace). */
static inline void skip(TSLexer *lexer) {
    lexer->advance(lexer, true);
}

/*
 * Try to match a keyword at the current position (after leading whitespace on
 * a line has already been consumed by the caller). Returns true if the keyword
 * is followed immediately by end-of-file, '\r', or '\n' — i.e. it occupies
 * the whole line.
 *
 * Does NOT advance the lexer on failure.
 */
static bool line_starts_with(TSLexer *lexer, const char *keyword) {
    /* We cannot "unrewind" the lexer, so we use lexer->get_column to detect
     * whether we are at the start of a line and do a speculative scan only
     * when we know we are at column 0 (or after only spaces/tabs). */
    size_t len = strlen(keyword);
    for (size_t i = 0; i < len; i++) {
        if (lexer->lookahead != (int32_t)(unsigned char)keyword[i]) {
            return false;
        }
        lexer->advance(lexer, false);
    }
    /* The keyword must be the whole token on the line. */
    int32_t c = lexer->lookahead;
    return c == '\0' || c == '\r' || c == '\n';
}

/*
 * Scan a block body up to (but not including) a line whose trimmed content
 * equals `end_keyword`.
 *
 * Strategy:
 *   - Read character by character.
 *   - At the start of each line, snapshot the mark, then check if the line
 *     begins with `end_keyword` (after optional leading spaces/tabs).
 *   - If it does, stop — do NOT consume that line.
 *   - Otherwise, consume the entire line (including its newline) and continue.
 *   - Mark the result after each successfully consumed line so the final
 *     token includes exactly those lines.
 *
 * Returns true if at least one line of content was consumed.
 *
 * Because TSLexer does not expose "unread", we use mark_end() to commit only
 * after we are sure a line is not the closing keyword.
 */
static bool scan_block_body(TSLexer *lexer, const char *end_keyword) {
    bool consumed_any = false;

    while (true) {
        /* Skip leading whitespace on this line to check for the end keyword. */
        /* First, record where we are so we can "restart" the line read after
         * the keyword-check whitespace. We do this by consuming ws into the
         * token temporarily, then using mark_end to roll back if needed.
         *
         * Actually — because we cannot roll back arbitrary amounts, we use a
         * simpler two-pass approach:
         *
         *   Pass 1: consume optional spaces/tabs (included in token) and check
         *           for the end keyword.  If found → do not mark, return.
         *   Pass 2: if not the end keyword, the whitespace is already consumed;
         *           continue consuming the rest of the line and the newline,
         *           then mark_end.
         */

        /* --- check for end-of-file --- */
        if (lexer->lookahead == '\0') {
            break;
        }

        /* --- consume leading spaces/tabs on this line --- */
        while (lexer->lookahead == ' ' || lexer->lookahead == '\t') {
            advance(lexer);
        }

        /* --- check for the closing keyword --- */
        /* We need a way to detect the keyword without committing.  Because
         * line_starts_with() does advance the lexer and we cannot rewind, we
         * handle the match check with a manual loop that remembers where we
         * started in the keyword string.
         *
         * If the keyword is NOT matched we simply continue consuming the rest
         * of the line — the whitespace we already consumed is part of the
         * content (which is fine; block bodies are raw text).
         */
        const char *kw = end_keyword;
        bool is_end = false;

        if (lexer->lookahead == (int32_t)(unsigned char)kw[0]) {
            /* Speculatively consume the keyword characters. */
            size_t matched = 0;
            size_t kw_len = strlen(kw);

            /* Save current mark so we can "not commit" the speculative read.
             * We do NOT call mark_end here — if it IS the keyword we just
             * return (the caller's mark stays where it was after the last full
             * line), and if it ISN'T the keyword the extra chars become part
             * of the current line content. */
            while (matched < kw_len &&
                   lexer->lookahead == (int32_t)(unsigned char)kw[matched]) {
                advance(lexer);
                matched++;
            }

            if (matched == kw_len) {
                int32_t c = lexer->lookahead;
                if (c == '\0' || c == '\r' || c == '\n') {
                    is_end = true;
                }
            }
            /* If not the end keyword, the characters we consumed are just
             * regular content — we fall through to consume the rest of the
             * line below. */
        }

        if (is_end) {
            break;
        }

        /* --- consume the rest of this line (up to and including '\n') --- */
        while (lexer->lookahead != '\0' &&
               lexer->lookahead != '\n') {
            advance(lexer);
        }
        if (lexer->lookahead == '\n') {
            advance(lexer);
        }

        /* Commit everything up to here as part of the token. */
        lexer->mark_end(lexer);
        consumed_any = true;
    }

    return consumed_any;
}

/* ── Public API required by tree-sitter ───────────────────────────────────── */

void *tree_sitter_duckyscript_external_scanner_create(void) {
    return NULL; /* no state needed */
}

void tree_sitter_duckyscript_external_scanner_destroy(void *payload) {
    (void)payload;
}

unsigned tree_sitter_duckyscript_external_scanner_serialize(void *payload,
                                                             char *buffer) {
    (void)payload;
    (void)buffer;
    return 0;
}

void tree_sitter_duckyscript_external_scanner_deserialize(void *payload,
                                                           const char *buffer,
                                                           unsigned length) {
    (void)payload;
    (void)buffer;
    (void)length;
}

bool tree_sitter_duckyscript_external_scanner_scan(void *payload,
                                                    TSLexer *lexer,
                                                    const bool *valid_symbols) {
    (void)payload;

    /* Skip any leading blank lines / whitespace before we start. */
    /* (tree-sitter's extras already handle spaces/tabs between tokens, but
     *  we may be called right after the opening keyword's newline.) */

    if (valid_symbols[TOKEN_REM_BLOCK_CONTENT]) {
        lexer->result_symbol = TOKEN_REM_BLOCK_CONTENT;
        return scan_block_body(lexer, "END_REM");
    }

    if (valid_symbols[TOKEN_STRING_BLOCK_CONTENT]) {
        lexer->result_symbol = TOKEN_STRING_BLOCK_CONTENT;
        return scan_block_body(lexer, "END_STRING");
    }

    if (valid_symbols[TOKEN_STRINGLN_BLOCK_CONTENT]) {
        lexer->result_symbol = TOKEN_STRINGLN_BLOCK_CONTENT;
        return scan_block_body(lexer, "END_STRINGLN");
    }

    return false;
}