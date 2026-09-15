#!/usr/bin/env node
/**
 * Launch, doctor, and cleanup for Leaseting staff-web verification.
 *
 *   node .cursor/skills/verify-leaseting/scripts/control-leaseting.mjs launch
 *   node .cursor/skills/verify-leaseting/scripts/control-leaseting.mjs doctor
 *   node .cursor/skills/verify-leaseting/scripts/control-leaseting.mjs origin
 *   node .cursor/skills/verify-leaseting/scripts/control-leaseting.mjs evidence-dir --feature sign-in
 *   node .cursor/skills/verify-leaseting/scripts/control-leaseting.mjs cleanup
 *
 * Env:
 *   LEASETING_VERIFY_PORT   listen port (default 4210 — not the user's 4200)
 *   LEASETING_VERIFY_HOST   bind host (default 127.0.0.1)
 *   LEASETING_VERIFY_EMAIL / LEASETING_VERIFY_PASSWORD  staff login (never printed)
 */
import { spawn, execFileSync } from 'node:child_process';
import { closeSync, existsSync, mkdirSync, openSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createConnection } from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const SKILL_DIR = path.resolve(SCRIPT_DIR, '..');
const REPO_ROOT = path.resolve(SKILL_DIR, '..', '..', '..');
const RUN_DIR = path.join(SKILL_DIR, '.run');
const INSTANCE_FILE = path.join(RUN_DIR, 'instance.json');
const LOG_FILE = path.join(RUN_DIR, 'ng-serve.log');
const EVIDENCE_ROOT = path.join(SKILL_DIR, 'evidence');

const DEFAULT_PORT = 4210;
const DEFAULT_HOST = '127.0.0.1';
const API_BASE_URL = 'http://localhost:8000/api/v1';
const READY_TIMEOUT_MS = 300_000;
const POLL_MS = 1000;

const command = process.argv[2] ?? 'help';

try {
  await main(command);
} catch (error) {
  fail(error instanceof Error ? error.message : String(error));
}

async function main(cmd) {
  switch (cmd) {
    case 'launch':
      await cmdLaunch();
      break;
    case 'doctor':
      await cmdDoctor({ requireInstance: true });
      break;
    case 'origin':
      cmdOrigin();
      break;
    case 'evidence-dir':
      cmdEvidenceDir();
      break;
    case 'cleanup':
      await cmdCleanup();
      break;
    case 'help':
    case '--help':
    case '-h':
      printHelp();
      break;
    default:
      fail(`Unknown command "${cmd}". Try launch | doctor | origin | evidence-dir | cleanup.`);
  }
}

function printHelp() {
  process.stdout.write(`Leaseting verification control

Commands:
  launch         Start ng serve on the verify port if this run does not already own one
  doctor         Read-only health check (JSON). Exit 0 only when this run's instance is driveable
  origin         Print the origin URL from instance.json
  evidence-dir   Create and print an evidence folder (--feature <id>)
  cleanup        Kill only the process tree recorded in instance.json. Leaves evidence/

Env: LEASETING_VERIFY_PORT (default ${DEFAULT_PORT}), LEASETING_VERIFY_HOST (default ${DEFAULT_HOST})
Repo: ${REPO_ROOT}
`);
}

async function cmdLaunch() {
  const port = readPort();
  const host = readHost();
  const origin = `http://${host}:${port}`;

  if (existsSync(INSTANCE_FILE)) {
    const existing = readInstance();
    const health = await inspectInstance(existing);
    if (health.ok) {
      process.stdout.write(
        JSON.stringify({ status: 'already-running', origin: existing.origin, pid: existing.pid }, null, 2) + '\n',
      );
      return;
    }
    process.stderr.write(`Stale instance file (${health.reason}). Removing it.\n`);
    rmSync(INSTANCE_FILE, { force: true });
  }

  if (await portIsOpen(host, port)) {
    fail(
      `Port ${port} on ${host} is already accepting connections, and this run did not start it. ` +
        `Refuse to double-drive. Stop that listener, or set LEASETING_VERIFY_PORT to a free port.`,
    );
  }

  ensureDeps();
  mkdirSync(RUN_DIR, { recursive: true });
  writeFileSync(LOG_FILE, '', 'utf8');

  const ngJs = path.join(REPO_ROOT, 'node_modules', '@angular', 'cli', 'bin', 'ng.js');
  if (!existsSync(ngJs)) {
    fail(`Angular CLI missing at ${ngJs}. npm install did not produce it.`);
  }

  const logFd = openSync(LOG_FILE, 'a');
  const child = spawn(
    process.execPath,
    [ngJs, 'serve', `--port=${port}`, `--host=${host}`],
    {
      cwd: REPO_ROOT,
      detached: true,
      stdio: ['ignore', logFd, logFd],
      windowsHide: true,
      env: { ...process.env },
    },
  );
  closeSync(logFd);
  child.unref();

  const instance = {
    pid: child.pid,
    listenPid: null,
    port,
    host,
    origin,
    apiBaseUrl: API_BASE_URL,
    startedAt: new Date().toISOString(),
    repoRoot: REPO_ROOT,
    logFile: LOG_FILE,
    command: [process.execPath, ngJs, 'serve', `--port=${port}`, `--host=${host}`],
  };
  writeInstance(instance);

  try {
    await waitForHttp(origin, READY_TIMEOUT_MS);
  } catch (error) {
    await killRecordedTree(instance);
    const stillUp = isPidAlive(instance.pid) || (await portIsOpen(host, port));
    if (!stillUp) rmSync(INSTANCE_FILE, { force: true });
    fail(
      `Dev server did not become ready at ${origin} within ${READY_TIMEOUT_MS / 1000}s. ` +
        `${error instanceof Error ? error.message : error} See ${LOG_FILE}` +
        (stillUp ? ' instance.json kept so cleanup can kill the tree.' : ''),
    );
  }

  instance.listenPid = (await listenPidForPort(port)) ?? instance.pid;
  writeInstance(instance);

  const html = await fetchText(origin);
  if (!html.includes('<title>Leaseting</title>')) {
    await killRecordedTree(instance);
    const stillUp = isPidAlive(instance.pid) || (await portIsOpen(host, port));
    if (!stillUp) rmSync(INSTANCE_FILE, { force: true });
    fail(`Ready on ${origin} but the document title is not Leaseting. See ${LOG_FILE}`);
  }

  process.stdout.write(JSON.stringify({ status: 'started', origin, pid: instance.pid, listenPid: instance.listenPid }, null, 2) + '\n');
}

async function cmdDoctor({ requireInstance }) {
  if (!existsSync(INSTANCE_FILE)) {
    if (requireInstance) {
      fail('No instance.json. Run launch first. Never drive a frontend this run did not start.');
    }
    process.stdout.write(JSON.stringify({ ok: false, reason: 'no-instance' }, null, 2) + '\n');
    process.exitCode = 1;
    return;
  }

  const instance = readInstance();
  const health = await inspectInstance(instance);
  const api = await probeApi();
  const credentialsPresent = Boolean(process.env.LEASETING_VERIFY_EMAIL && process.env.LEASETING_VERIFY_PASSWORD);

  const report = {
    ok: health.ok,
    reason: health.reason,
    origin: instance.origin,
    pid: instance.pid,
    listenPid: instance.listenPid,
    pidAlive: health.pidAlive,
    portOwner: health.portOwner,
    title: health.title,
    api,
    credentialsPresent,
    cookieWarning:
      'Sign-in uses an HTTP-only Better Auth cookie on localhost:8000. Any other Leaseting tab on this machine shares that cookie. Do not sign out a session this run did not create.',
  };

  process.stdout.write(JSON.stringify(report, null, 2) + '\n');
  if (!report.ok) process.exitCode = 1;
}

function cmdOrigin() {
  if (!existsSync(INSTANCE_FILE)) fail('No instance.json. Run launch first.');
  process.stdout.write(readInstance().origin + '\n');
}

function cmdEvidenceDir() {
  const feature = flagValue('--feature') ?? 'unspecified';
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const dir = path.join(EVIDENCE_ROOT, `${stamp}-${feature}`);
  mkdirSync(dir, { recursive: true });
  process.stdout.write(dir + '\n');
}

async function cmdCleanup() {
  if (!existsSync(INSTANCE_FILE)) {
    process.stdout.write(JSON.stringify({ status: 'nothing-to-clean' }, null, 2) + '\n');
    return;
  }
  const instance = readInstance();
  await killRecordedTree(instance);
  rmSync(INSTANCE_FILE, { force: true });
  process.stdout.write(
    JSON.stringify(
      {
        status: 'stopped',
        pid: instance.pid,
        origin: instance.origin,
        evidenceKept: EVIDENCE_ROOT,
      },
      null,
      2,
    ) + '\n',
  );
}

async function inspectInstance(instance) {
  const host = instance.host || DEFAULT_HOST;
  const pidAlive = isPidAlive(instance.pid);
  const listening = await portIsOpen(host, instance.port);
  const portOwner = listening ? await listenPidForPort(instance.port) : null;
  const owned =
    portOwner == null ||
    portOwner === instance.pid ||
    portOwner === instance.listenPid;

  let title = null;
  let httpOk = false;
  try {
    const html = await fetchText(instance.origin);
    httpOk = html.includes('<title>Leaseting</title>');
    const match = html.match(/<title>([^<]*)<\/title>/);
    title = match ? match[1] : null;
  } catch {
    httpOk = false;
  }

  if (!pidAlive) return { ok: false, reason: 'pid-dead', pidAlive, portOwner, title };
  if (!listening) return { ok: false, reason: 'port-not-listening', pidAlive, portOwner, title };
  if (portOwner != null && !owned) {
    return {
      ok: false,
      reason: `port-${instance.port}-owned-by-${portOwner}-not-our-${instance.pid}`,
      pidAlive,
      portOwner,
      title,
    };
  }
  if (!httpOk) return { ok: false, reason: 'http-not-leaseting', pidAlive, portOwner, title };
  return { ok: true, reason: 'ok', pidAlive, portOwner: portOwner ?? instance.pid, title };
}

async function probeApi() {
  try {
    const response = await fetch(`${API_BASE_URL}/users/me`, {
      method: 'GET',
      redirect: 'manual',
      headers: { Accept: 'application/json' },
    });
    return {
      reachable: true,
      status: response.status,
      note:
        response.status === 401 || response.status === 403
          ? 'API up; Node probe has no session cookie (expected).'
          : 'Unexpected status without a cookie. Inspect before driving auth.',
    };
  } catch (error) {
    const code = error && typeof error === 'object' && 'cause' in error ? error.cause?.code : error?.code;
    return {
      reachable: false,
      status: 0,
      note: `API not reachable at ${API_BASE_URL} (${code ?? error.message}). Authenticated features cannot be proven.`,
    };
  }
}

function ensureDeps() {
  const ngJs = path.join(REPO_ROOT, 'node_modules', '@angular', 'cli', 'bin', 'ng.js');
  if (existsSync(ngJs)) return;
  process.stderr.write('node_modules missing Angular CLI. Running npm install…\n');
  execFileSync('npm', ['install'], { cwd: REPO_ROOT, stdio: 'inherit', shell: process.platform === 'win32' });
}

function readPort() {
  const raw = process.env.LEASETING_VERIFY_PORT ?? String(DEFAULT_PORT);
  const port = Number(raw);
  if (!Number.isInteger(port) || port < 1 || port > 65535) fail(`Invalid LEASETING_VERIFY_PORT: ${raw}`);
  return port;
}

function readHost() {
  return process.env.LEASETING_VERIFY_HOST || DEFAULT_HOST;
}

function readInstance() {
  return JSON.parse(readFileSync(INSTANCE_FILE, 'utf8'));
}

function writeInstance(instance) {
  mkdirSync(RUN_DIR, { recursive: true });
  writeFileSync(INSTANCE_FILE, JSON.stringify(instance, null, 2) + '\n', 'utf8');
}

function isPidAlive(pid) {
  if (!pid) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

async function killRecordedTree(instance) {
  const pids = [...new Set([instance.listenPid, instance.pid].filter(Boolean))];
  for (const pid of pids) {
    if (!isPidAlive(pid)) continue;
    if (process.platform === 'win32') {
      try {
        execFileSync('taskkill', ['/PID', String(pid), '/T', '/F'], { stdio: 'ignore' });
      } catch {
        // process already gone
      }
    } else {
      try {
        process.kill(-pid, 'SIGTERM');
      } catch {
        try {
          process.kill(pid, 'SIGTERM');
        } catch {
          // gone
        }
      }
    }
  }
  const deadline = Date.now() + 8000;
  const host = instance.host || DEFAULT_HOST;
  while (Date.now() < deadline) {
    if (pids.every((pid) => !isPidAlive(pid)) && !(await portIsOpen(host, instance.port))) return;
    await sleep(200);
  }
  if (await portIsOpen(host, instance.port)) {
    fail(`Cleanup could not free port ${instance.port}. Kill PID ${instance.listenPid ?? instance.pid} by that PID only — do not kill by process name.`);
  }
}

async function listenPidForPort(port) {
  if (process.platform === 'win32') {
    return listenPidWindows(port);
  }
  return listenPidUnix(port);
}

function listenPidWindows(port) {
  try {
    const stdout = execFileSync(
      'powershell.exe',
      [
        '-NoProfile',
        '-NonInteractive',
        '-Command',
        `(Get-NetTCPConnection -LocalPort ${Number(port)} -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1).OwningProcess`,
      ],
      { encoding: 'utf8', timeout: 15_000 },
    );
    const pid = Number(String(stdout).trim());
    return Number.isInteger(pid) && pid > 0 ? pid : null;
  } catch {
    return null;
  }
}

function portIsOpen(host, port, timeoutMs = 400) {
  return new Promise((resolve) => {
    const socket = createConnection({ host, port });
    const timer = setTimeout(() => {
      socket.destroy();
      resolve(false);
    }, timeoutMs);
    socket.once('connect', () => {
      clearTimeout(timer);
      socket.destroy();
      resolve(true);
    });
    socket.once('error', () => {
      clearTimeout(timer);
      resolve(false);
    });
  });
}

function listenPidUnix(port) {
  try {
    const stdout = execFileSync('lsof', ['-nP', `-iTCP:${port}`, '-sTCP:LISTEN', '-t'], {
      encoding: 'utf8',
    });
    const pid = Number(stdout.trim().split(/\s+/)[0]);
    return Number.isInteger(pid) && pid > 0 ? pid : null;
  } catch {
    return null;
  }
}

async function waitForHttp(origin, timeoutMs) {
  const start = Date.now();
  let lastError = 'no attempt';
  while (Date.now() - start < timeoutMs) {
    try {
      const html = await fetchText(origin);
      if (html.includes('<title>Leaseting</title>') || html.includes('app-root')) return;
      lastError = 'HTTP 200 but unexpected body';
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }
    await sleep(POLL_MS);
  }
  throw new Error(lastError);
}

async function fetchText(url) {
  const response = await fetch(url, { redirect: 'follow' });
  if (!response.ok) throw new Error(`GET ${url} -> ${response.status}`);
  return response.text();
}

function flagValue(name) {
  const index = process.argv.indexOf(name);
  if (index === -1) return null;
  return process.argv[index + 1] ?? null;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function fail(message) {
  process.stderr.write(message + '\n');
  process.exit(1);
}
