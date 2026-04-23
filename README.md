# Insighta Labs Profile API

Our Profile API provides robust query structure, dynamic filtering, sorting, pagination, and a pure rule-based Natural Language to SQL converter.

## Setup

1. **Deploy your PostgreSQL database** (or use local PostgreSQL).
2. Grab your `DATABASE_URL` and plug it into `.env`.
3. Run the provided seed script directly against your database using:
```bash
node scripts/seed.js
```
4. Start the server (listening on PORT 3000 by default):
```bash
npm start
```

## Natural Language Parsing Approach

Our core requirement was parsing plain English into exact SQL filters utilizing a purely **rule-based algorithm without LLMs**. 

### Keyword Mappings Supported:
The algorithm tokenizes the `q` parameter string and matches explicit tokens.
- **Gender Map**: `male`, `males`, `boy`, `boys` → `gender: "male"` | `female`, `females`, `girl`, `girls` → `gender: "female"`
- **Age Map**: `young` statically bounds to age 16–24. Keywords `teenager`, `adult`, `child`, `senior` map cleanly to the enumerated `age_group` column.
- **Bounding Ages**: We leverage forward indexing. When meeting bounding tokens (`above`, `over`, `older than`), the scanner skips directly to the trailing integer and appends a `min_age` filter. The counterpart (`under`, `below`, `younger than`) forces `max_age`.
- **Lexical Geolocation**: A strict lookup map captures major ISO-two character codes (`nigeria` → `NG`, `united states` → `US`, etc.) preceded by the preposition `from` or `in`. If an unknown country string falls out of bounds from the static map, the parser initiates a `.includes(country_name)` fuzz search to prevent fatal null returns.

### Limitations & Edge Cases Left Out
- **Boolean / Logical Negation**: Queries deploying "NOT" logic (e.g., "NOT male", "exclude nigeria", "except adults") are completely unaccounted for and typically map to nothing.
- **Multi-parameter Conjunctives**: Query paths attempting multiple countries ("from nigeria and angola") simply break down and bind sequentially to the final country captured.
- **Malformed Spacing / Aggregation**: Keywords like "overfifty" must structurally stand isolated ("over 50") for the integers to be stripped smoothly.

## Standard Endpoint
`GET /api/profiles`
Supports generic filters (`gender`, `min_age`, `max_age`, `min_gender_probability`, etc.) as well as `page` (default 1), `limit` (max 50), and `sort_by` (`age`, `created_at`, `gender_probability`) mapped against `order`.
