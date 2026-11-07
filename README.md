# Elyx for Claude Code

One command, `/elyx`, for working with Elyx designs from Claude Code: design something new, browse a project, or run anything the `elyx` CLI can do.

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
| `/elyx design a pricing card` | Claude writes the design, checks it and opens it on the canvas |
| `/elyx export the tokens of a.elyx` | Claude picks the right `elyx` command and runs it |
| `/elyx a.elyx` | Opens the file on the canvas right away |
| `/elyx --app a.elyx` | Opens the project in the Elyx app, if you have it |

The canvas opens in the Browser pane of the Claude desktop app. Elsewhere you get a URL to open yourself.

## The canvas

An overview for designers, not an editor. Everything comes from the `elyx` CLI.

- **Click any layer**, however small. A quick-edit bar opens beside it for text, color and size, and the inspector holds the rest.
- **Zoom** as far as you like. Whatever is in view is redrawn by the Elyx engine at the exact zoom, so it stays sharp.
- **Drag screens** around the board. The new position is saved to the file. Drag empty canvas, or hold Space, to pan.
- **Apply to** this screen, or everywhere through the component it belongs to.
- **Browse** screens, components, tokens and assets, with where each one is used.
- **Search** the whole project with ⌘K, including the text inside layers.
- **Context** switches a design between themes and surfaces.
- **Ask Claude** sends bigger changes to the session that opened the canvas, with the selected layer as context.

Edits change one property and are checked with `elyx diagnostics`. A change that adds a problem is reverted, and Undo takes back the rest.

While it draws, the canvas keeps a short-lived file in a hidden `.elyx-canvas` folder in your project, because imports only resolve from inside it. The folder goes away with the canvas.
