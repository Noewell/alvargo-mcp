# MCP Landing Page Branding and Layout Validation

Validated locally on 2026-09-02 after restoring the Tailwind/PostCSS build pipeline and replacing the placeholder mark.

| Check | Result |
|---|---|
| Navigation logo | The oversized placeholder “M” no longer renders. The compact official Alvargo emblem asset is constrained to a navigation-safe height and paired with a text wordmark. |
| Header alignment | Navigation content is placed inside a centered `max-w-6xl` container; account actions stay aligned on desktop and the secondary action hides on narrow screens. |
| Page layout | Tailwind utility CSS is compiled into the production stylesheet, restoring responsive grids, spacing, typography, cards, and button sizing. |
| Branding assets | The approved source logo is copied into `public/brand`; the page uses a deterministic emblem-only crop for compact UI use and the official ICO as favicon. |
| Desktop visual review | The hero, stats bar, live quote section, and header render with coherent alignment and no full-page logo overflow. |

The page should be verified again after Netlify deploy at `https://alvargo-mcp.netlify.app/agents/mcp` before attaching the `alvargo.net` domain.
