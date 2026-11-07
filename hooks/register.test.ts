import { expect, mock, test } from 'claude-code/testing'

const run = (args: string) =>
  ({
    command: 'elyx',
    args,
    origin: { kind: 'composer' },
    presentation: { isFullscreen: false, columns: 80 },
  }) as const

test('nothing typed answers with the usage', async ($, on) => {
  on('command.register', () => ({ value: { command: 'elyx' } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })

  const { text } = await $.command.run(run(''))

  expect(text).toBe('Usage: /elyx <what to do>, or /elyx [--app] <file.elyx>')
})

test('a request goes to Claude, even one that ends in a file name', async ($, on) => {
  const clock = mock.clock(on)
  const sent: string[] = []
  on('command.register', () => ({ value: { command: 'elyx' } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('prompt.submit', (_, e) => {
    sent.push(e.text)
    return { text: e.text }
  })
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })

  await $.command.run(run('export the tokens of a.elyx'))
  await clock.advance(0)

  expect(sent).toHaveLength(1)
  expect(sent[0]).toStartWith('Do this with Elyx: export the tokens of a.elyx')
  expect(sent[0]).toContain('elyx --help')
})

test('the canvas can ask Claude, even when its line arrives in two pieces', async ($, on) => {
  const clock = mock.clock(on)
  const sent: string[] = []
  let env: Record<string, string> | undefined
  on('command.register', () => ({ value: { command: 'elyx' } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('prompt.submit', (_, e) => {
    sent.push(e.text)
    return { text: e.text }
  })
  on('process.spawn', async function* (_, e) {
    env = e.env
    yield { stream: 'stdout', text: 'http://127.0.0.1:1/t/\n' }
    yield { stream: 'stdout', text: 'ask {"text":"Make it ' }
    yield { stream: 'stdout', text: 'bigger"}\n' }
    return { value: { code: 0, signal: null } }
  })
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })

  await $.command.run(run('a.elyx'))
  await clock.advance(0)

  expect(env).toEqual({ ELYX_CANVAS_BRIDGE: '1' })
  expect(sent).toHaveLength(1)
  expect(sent[0]).toStartWith('Do this with Elyx: Make it bigger')
})

test('open with a bare file opens it without asking Claude', async ($, on) => {
  let argv: readonly string[] = []
  on('command.register', () => ({ value: { command: 'elyx' } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('process.run', (_, e) => {
    argv = e.argv
    return { value: { exitCode: 0, stdout: '/project\n', stderr: '', isStdoutTruncated: false, isStderrTruncated: false } }
  })
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })

  await $.command.run(run('open --app a.elyx'))

  expect(argv.slice(2)).toEqual(['--app', 'a.elyx'])
})

test('--app runs the server script with the flag and the unquoted file', async ($, on) => {
  let argv: readonly string[] = []
  on('command.register', () => ({ value: { command: 'elyx' } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('process.run', (_, e) => {
    argv = e.argv
    return { value: { exitCode: 0, stdout: '/project\n', stderr: '', isStdoutTruncated: false, isStderrTruncated: false } }
  })
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })

  const { text } = await $.command.run(run('--app "my designs/a.elyx"'))

  expect(argv.slice(2)).toEqual(['--app', 'my designs/a.elyx'])
  expect(text).toBe('Opened /project in the Elyx app.')
})
