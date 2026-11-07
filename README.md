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
