<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="docs/readme/hero-dark.png">
    <img src="docs/readme/hero-light.png" alt="The Elyx canvas in Claude: a board of screens with a small label selected and a quick-edit bar beside it.">
  </picture>
</p>

# Elyx for Claude Code

One command, `/elyx`, for working with Elyx designs from Claude Code: design something new, browse a project, or run anything the `elyx` CLI can do.

```
/elyx design a pricing card
```

Claude writes the design, checks it, and opens it on a canvas you can click through. It's an overview for designers, not an editor: you keep sight of every screen, component and token, and change the small things yourself.

## Install

You need Node.js and the Elyx CLI:

```bash
npm install --global @elyx-design/cli
```

Then, at the prompt of a terminal session:

```
/plugin install elyx-canvas --marketplace robertkeus/elyx-claude-canvas-plugin
```

Answer `y` to add the marketplace, then pick a scope.

From a shell:

```bash
claude plugin install elyx-canvas --marketplace robertkeus/elyx-claude-canvas-plugin
```

In the desktop app, where `/plugin` does not run: click **+** next to the prompt box, then **Plugins**, **Add marketplace** with `robertkeus/elyx-claude-canvas-plugin`, then **Add plugin**.

## Use

| You type | What happens |
| --- | --- |
| `/elyx` | Claude asks what you want to design, and in which style |
| `/elyx design a pricing card` | Claude writes the design, checks it and opens it on the canvas |
| `/elyx improve screens/home.elyx` | The improve agent scores the screen, fixes its weakest points within your design system, and shows before and after |
| `/elyx export the tokens of a.elyx` | Claude picks the right `elyx` command and runs it |
| `/elyx a.elyx` | Opens the file on the canvas right away |
| `/elyx --app a.elyx` | Opens the project in the Elyx app, if you have it |

The canvas opens in the Browser pane of the Claude desktop app. Elsewhere you get a URL to open yourself.

### Styles and examples

Claude designs against a library of examples instead of from scratch: six styles (studio, midnight, editorial, swiss, soft and clean), each with a nav, hero, features, pricing, testimonials, call to action and footer, plus a full page. Name a style, or Claude offers them. They live in [`examples`](examples), with open-license fonts and a [reference of 260 free icon sets](examples/icon-libraries.md) Claude fetches icons from.

Every new design gets a second look from the improve agent before you see it. You can also point it at anything you already have.

## The canvas

### Click anything, change it right there

Select a layer, however small, and a quick-edit bar opens beside it for text, color and size. Colors come from your tokens, so the design system stays intact. The inspector holds the rest, and can apply a change to this screen or to the component everywhere.

<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="docs/readme/quick-edit-dark.png">
    <img src="docs/readme/quick-edit-light.png" alt="A selected button label with the quick-edit bar below it and the token color picker open.">
  </picture>
</p>

### See your whole design system

Browse every component and token, with where each one is used. Components show their variants and are highlighted on the real screens that use them. Tokens show their value in every context.

<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="docs/readme/library-dark.png">
    <img src="docs/readme/library-light.png" alt="A gallery of components with a panel of color tokens, one of them used by 34 layers.">
  </picture>
</p>

### Sharp at any zoom

Whatever is in view is redrawn by the Elyx engine at the exact zoom when you stop moving, so a corner stays a clean curve at 1,000% and beyond.

<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="docs/readme/zoom-dark.png">
    <img src="docs/readme/zoom-light.png" alt="A button zoomed in to 1360 percent with crisp edges and type, next to a small map of where the view sits.">
  </picture>
</p>

### Share it with anyone

**Share**, top right, turns the board into a page Claude publishes as an artifact: every frame at 2×, with zoom, a link per frame, and the design's tokens. It starts private; share it from its page on claude.ai with people, your organization or anyone with the link. Sharing again updates the same page, and the link button beside Share opens it. Without the canvas, `/elyx share a.elyx` does the same.

### Arrange your board

Drag a screen and the new position is saved to the file. Drag empty canvas, or hold Space, to pan.

<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="docs/readme/drag-dark.png">
    <img src="docs/readme/drag-light.png" alt="A screen being dragged across a board, leaving a dashed outline where it was, with a Saved message and Undo.">
  </picture>
</p>

### And more

- **Export** any layer or a whole board as PNG at any size (`@2x`, `@3x`), JPG, WebP, vector SVG or CSS. Files land in an `exports` folder in your project.
- **Switch projects** from the top bar when a repository holds more than one Elyx project.
- **Search** the whole project with ⌘K, including the text inside layers.
- **Context** switches a design between themes and surfaces.
- **Ask Claude** sends bigger changes to the session that opened the canvas, with the selected layer as context.

## Your files stay yours

Edits change one property and leave every other line alone, so your diffs show only what you changed. Each edit is checked with `elyx diagnostics`. A change that adds a problem is reverted, and Undo takes back the rest.

While it draws, the canvas keeps a short-lived file in a hidden `.elyx-canvas` folder in your project, because imports only resolve from inside it. The folder goes away with the canvas.

## License

MIT, see [LICENSE](LICENSE). The bundled Lucide icons keep their own license, see [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

<sub>Driftwood, the product in these images, is a made-up sample.</sub>
