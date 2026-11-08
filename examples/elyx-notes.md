# Elyx notes

Behaviour that `elyx man` doesn't warn about, found while building these examples with CLI 0.0.1-preview.

## Checks

- `elyx diagnostics` reports a failed import or an unknown name as a **warning**, with `errors: 0`. Read the warnings too.
- An unknown font family or style silently falls back to Inter. Check the render.
- Render small text at `--scale 3` to see spacing and kerning problems.

## Text

- A `text` layer has no default fill: without `fill` it is invisible.
- `padding` on text is accepted and ignored; wrap the text in a frame instead.
- `border` on text strokes the glyphs. For a rule under text, use a frame.
- `strikethrough` takes `.single`, not `.true`.
- Tabular figures: `font-features: {tnum: 1}`.
- `subrange` styles part of a text: `subrange: [{range: [start, end], font-style: "Italic"}]`, 0-based with the end excluded.
- `\n` in `contents` breaks a line.

## Layout

- Frames clip their children (`overflow: .clip`) by default. Shadows, stickers, overlapping mockups and out-of-flow decorations need `overflow: .visible` on every clipping ancestor.
- A frame without `layout` does not hug its children: give wrappers a `layout`.
- A bare `layout: {}` is a row.
- `justify-content: .space-between` overrides `item-gap`, so the gap can collapse to 0 when there is no free space. Use padding or fixed widths.
- `transform` rotates about the layer's top-left corner, not its centre. Compensate with the matrix's `tx`/`ty`.

## Names and instances

- `icon`, `ref`, `text`, `data`, `group`, `board` and `type` can't be used as symbol names. The parse error, "expected ']'", doesn't say why.
- Overriding `layout` on an instance replaces the whole map, not one key.
- An instance that overrides only `left` or only `top` loses the other: set both.
- `children:` inside an instance sub-block is ignored. Mark the source frame `slot: .true` and use `overrides: [insert(child, after = .nil)]` inside the slot's sub-block.
- `after =` and insert targets across files need the import alias and full source path, such as `P.phone.screen.statusBar`.
- Declarations not listed in any `children` don't render, so they can serve as private local component sources.
- `remove()` inside a sub-block needs the source-qualified path, such as `remove(kpiCard.kFoot.kDelta)`.
- A nested piece can't be an instance source (`frame : P.tableRow.code` fails): export it on its own.
- A `@variant` doesn't inherit its source's `left`: place it, or the board-overlap lint fires.

## Paint

- Paint lists stack back to front: `fill: [#0B0B0F, {radial-gradient: {at: point(50%, 0%), radius: [60%, 70%], stops: [stop(0%, #5B4BFF66), stop(100%, #5B4BFF00)]}}]`.
- A frame's own border paints over its children: draw a ring track as a separate child.
- A negative-spread shadow on a pill renders as a rectangle.
- Shadow lists work as token values, so a style can keep its shadows in a `shadows` token group.
- Multicolour SVGs keep their colours when the asset has no `fill`; a solid `fill` tints single-colour ones.
- There is no repeat or pattern fill: a grid background is drawn line by line.
