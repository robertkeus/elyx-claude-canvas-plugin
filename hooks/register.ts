import type { EngineInterface, Register } from 'claude-code'

const COMMAND = 'elyx'
const PREVIEW = 'mcp__Claude_Browser__preview_start'
const OPEN = /^(?:open\s+)?(--app\s+)?("[^"]+\.elyx"|'[^']+\.elyx'|\S+\.elyx)$/

// Anything but a plain open goes to Claude, so every CLI command works with no code here.
const request = (text: string, root: string) => `Do this with Elyx: ${text}

Elyx is a design tool. A design is a .elyx text file, and the \`elyx\` CLI does the work: \`elyx --help\` lists every command, \`elyx <command> --help\` gives its options. If the CLI is missing, tell the person to run \`npm install --global @elyx-design/cli\` and stop.
To design: run \`elyx man\` first, it teaches the language (\`elyx man <path>\` looks up one property). Work in the Elyx project here (a folder with elyx.json), or create one with \`elyx --create <folder>\`. Check with \`elyx diagnostics <file>\` and \`elyx render <file> -o <png>\`, look at the PNG, and fix what you find.
To show a design, and when a design is done: run \`node ${root}/server/canvas.mjs <file>\` in the background and open the URL it prints with ${PREVIEW} (the url parameter). Without that tool, give the person the URL. \`elyx <folder>\` opens a project in the Elyx app instead.`

let stopServer: (() => void) | undefined

// A request from the canvas's Ask Claude button: `{ text }`, already naming the file and layer.
const askClaude = ($: EngineInterface, line: string) => {
  const { text } = JSON.parse(line) as { text: string }
  $.clock.after(0, () => void $.prompt.submit({ text: request(text, $.plugin.root) }))
}

const startServer = ($: EngineInterface, file: string) =>
  new Promise<string>((resolve, reject) => {
    const server = $.process.spawn({ argv: ['node', `${$.plugin.root}/server/canvas.mjs`, file], env: { ELYX_CANVAS_BRIDGE: '1' } })
    stopServer = () => void server.return(undefined as never)
    void (async () => {
      let errors = ''
      let output = ''
      for await (const { stream, text } of server) {
        if (stream === 'stderr') {
          errors += text
          continue
        }
        // Pieces arrive as they were written, so a line can span two of them.
        const lines = (output + text).split('\n')
        output = lines.pop() ?? ''
        for (const line of lines) {
          if (line.startsWith('http:')) resolve(line.trim())
          if (line.startsWith('ask ')) askClaude($, line.slice(4))
        }
      }
      reject(new Error(errors.trim() || 'The canvas server stopped.'))
    })().catch(reject)
  })

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: COMMAND,
      description: 'Design, check or export with Elyx: say what you want. Give an .elyx file to browse it, with --app in the Elyx app',
      argumentHint: '[what to do] | [--app] <file.elyx>',
    })

    return next(e)
  })

  on('command.run', { command: COMMAND }, async ($, e) => {
    const args = e.args.trim() || 'Ask the person what they want to design, then design it.'

    const [, flag, quoted] = args.match(OPEN) ?? []
    if (!quoted) {
      // The engine refuses a submit while this hook holds the turn, so it waits for the hook to return.
      $.clock.after(0, () => void $.prompt.submit({ text: request(args, $.plugin.root) }))

      return {}
    }

    const file = quoted.replace(/^(["'])(.*)\1$/, '$2')

    if (flag) {
      const { exitCode, stdout, stderr } = await $.process.run(['node', `${$.plugin.root}/server/canvas.mjs`, '--app', file])

      return { text: exitCode === 0 ? `Opened ${stdout.trim()} in the Elyx app.` : stderr.trim() }
    }

    stopServer?.()
    const url = await startServer($, file).catch((cause: Error) => cause)
    if (url instanceof Error) return { text: url.message }

    const opened = await $.tool.call({ tool: PREVIEW, url }).then(
      result => !result.isError,
      () => false,
    )

    return opened
      ? { text: `Opened ${file} on the Elyx canvas: ${url}` }
      : {
          text: `The Elyx canvas is running at ${url}`,
          context: [`Open ${url} with ${PREVIEW} (the url parameter) so the person can see the canvas.`],
        }
  })
}
