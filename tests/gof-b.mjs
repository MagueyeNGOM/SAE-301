import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn, spawnSync } from 'node:child_process';
import { createServer } from 'node:net';
import { randomBytes } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';

// Les contrôleurs réels utilisent une base isolée ; aucune connexion à la base du projet.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const temporary = await mkdtemp(path.join(tmpdir(), 'om-gof-b-'));
const php = process.env.PHP_BIN || 'php';
const password = process.env.GOF_B_TEST_PASSWORD || randomBytes(18).toString('hex');
const env = { ...process.env, GOF_B_DB: path.join(temporary, 'test.sqlite'), OM_ADMIN_TEST_PASSWORD: password };
const quote = (value) => "'" + value.replaceAll('\\', '/').replaceAll("'", "\\'") + "'";
let server;
let checks = 0;

function run(file, args = [], overrides = {}) {
  const result = spawnSync(php, [file, ...args], { env: { ...env, ...overrides }, encoding: 'utf8' });
  if (result.error) throw result.error;
  return result;
}

try {
  await writeFile(path.join(temporary, 'bootstrap.php'), `<?php
require_once ${quote(path.join(root, 'back/src/Core/Database.php'))};
$pdo = new PDO('sqlite:' . getenv('GOF_B_DB'), null, null, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC]);
(new ReflectionProperty(App\\Core\\Database::class, 'pdo'))->setValue(null, $pdo);
`);
  await writeFile(path.join(temporary, 'setup.php'), `<?php
require __DIR__ . '/bootstrap.php';
$pdo->exec("CREATE TABLE utilisateur (id INTEGER PRIMARY KEY AUTOINCREMENT, prenom TEXT, nom TEXT, email TEXT UNIQUE, password_hash TEXT, role TEXT DEFAULT 'client');
CREATE TABLE categorie (id INTEGER PRIMARY KEY, nom TEXT, ordre INTEGER);
CREATE TABLE produit (id INTEGER PRIMARY KEY, prix NUMERIC, categorie_id INTEGER, nom TEXT, prix_flocage NUMERIC, nouveaute INTEGER, seuil_stock INTEGER);
CREATE TABLE taille (id INTEGER PRIMARY KEY, libelle TEXT, ordre INTEGER);
CREATE TABLE stock (produit_id INTEGER, taille_id INTEGER, quantite INTEGER);
CREATE TABLE commande (id INTEGER PRIMARY KEY, statut TEXT NOT NULL DEFAULT 'en cours', total NUMERIC NOT NULL DEFAULT 0, date_commande TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE ligne_commande (id INTEGER PRIMARY KEY, commande_id INTEGER, produit_id INTEGER, quantite INTEGER);
INSERT INTO categorie VALUES (1, 'Maillots', 1);
INSERT INTO produit VALUES (1, 90, 1, 'Maillot', NULL, 0, NULL), (2, 100, 1, 'Short', NULL, 0, NULL);
INSERT INTO commande (id) VALUES (1), (2), (3);");
$pdo->prepare('INSERT INTO utilisateur (nom, email, password_hash) VALUES (?, ?, ?)')->execute(['Client test', 'client@example.test', password_hash(getenv('OM_ADMIN_TEST_PASSWORD'), PASSWORD_BCRYPT)]);
`);
  assert.equal(run(path.join(temporary, 'setup.php')).status, 0, 'Création de la base de test');

  await writeFile(path.join(temporary, 'seed.php'), `<?php
require __DIR__ . '/bootstrap.php';
require ${quote(path.join(root, 'back/scripts/create-admin.php'))};
`);
  const seed = (email, overrides) => run(path.join(temporary, 'seed.php'), [email], overrides);
  assert.equal(seed('admin@example.test').status, 0, 'Création du compte admin');
  assert.equal(seed('admin@example.test', { OM_ADMIN_TEST_PASSWORD: 'Another-Test-Password-2026' }).status, 0);
  assert.equal(seed('client@example.test').status, 1, 'Aucune promotion de compte client');
  assert.equal(seed('invalid').status, 1);
  assert.equal(seed('new@example.test', { OM_ADMIN_TEST_PASSWORD: 'court' }).status, 1);
  checks += 5;

  await writeFile(path.join(temporary, 'router.php'), `<?php
require __DIR__ . '/bootstrap.php';
require ${quote(path.join(root, 'back/index.php'))};
`);
  const socket = createServer();
  await new Promise((resolve) => socket.listen(0, '127.0.0.1', resolve));
  const port = socket.address().port;
  await new Promise((resolve) => socket.close(resolve));
  server = spawn(php, ['-d', `session.save_path=${temporary}`, '-S', `127.0.0.1:${port}`, path.join(temporary, 'router.php')], { env, stdio: ['ignore', 'pipe', 'pipe'] });
  let logs = '';
  server.stderr.on('data', (data) => { logs += data; });
  server.on('error', (error) => { logs += error.message; });
  const config = run('-r', [`$c = require ${quote(path.join(root, 'back/config/config.php'))}; echo $c['chemin'];`]);
  assert.equal(config.status, 0);
  const base = config.stdout;
  const url = `http://127.0.0.1:${port}${base}api/`;
  let ready = false;
  let connectionError = '';
  for (let attempt = 0; attempt < 50; attempt++) {
    try { await fetch(url + 'me'); ready = true; break; } catch (error) { connectionError = String(error.cause || error); await delay(100); }
  }
  assert.ok(ready, `Démarrage PHP : ${logs} ${connectionError}`);

  const jar = new Map();
  async function request(route, status, body, options = {}) {
    const response = await fetch(url + route, {
      method: body === undefined ? 'GET' : 'POST',
      headers: { Cookie: [...jar].map(([name, value]) => `${name}=${value}`).join('; '), ...(body === undefined ? {} : { 'Content-Type': 'application/json' }), ...options.headers },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const data = await response.json();
    assert.equal(response.status, status, `${route}: ${JSON.stringify(data)}`);
    for (const cookie of response.headers.getSetCookie()) {
      const [name, ...value] = cookie.split(';')[0].split('=');
      if (value.join('=')) jar.set(name, value.join('=')); else jar.delete(name);
    }
    checks++;
    return { response, data };
  }

  assert.equal((await request('admin/me', 200)).data.connecte, false);
  const anonymousId = jar.get('OMADMINSESSID');
  await request('admin/stats', 401);
  await request('admin/future-action', 401, {});
  await request('admin/login', 403, {}, { headers: { 'Content-Type': 'text/plain' } });
  await request('admin/login', 403, {}, { headers: { 'Sec-Fetch-Site': 'cross-site' } });
  for (const body of [{}, { email: [] }, { email: 'admin@example.test', mdp: [] }, { email: 'admin@example.test', mdp: 'é'.repeat(37) }]) {
    await request('admin/login', 422, body);
  }
  const denied = await request('admin/login', 401, { email: 'client@example.test', mdp: password });
  assert.equal((await request('admin/login', 401, { email: 'unknown@example.test', mdp: password })).data.erreur, denied.data.erreur);
  await request('admin/login', 401, { email: 'admin@example.test', mdp: 'incorrect' });
  await request('admin/stats', 401);

  await request('login', 200, { email: 'client@example.test', mdp: password });
  const clientId = jar.get('PHPSESSID');
  assert.ok(clientId);
  assert.equal((await request('me', 200)).data.connecte, true);
  await request('admin/stats', 401);

  const login = await request('admin/login', 200, { email: ' ADMIN@example.test ', mdp: password });
  assert.equal(login.data.connecte, true);
  const adminId = jar.get('OMADMINSESSID');
  assert.notEqual(adminId, anonymousId, 'Régénération de session');
  const cookie = login.response.headers.getSetCookie().find((value) => value.startsWith('OMADMINSESSID='));
  for (const flag of ['HttpOnly', 'Secure', 'SameSite=Lax', `path=${base.replace(/\/$/, '')}/api/admin`]) {
    assert.ok(cookie.toLowerCase().includes(flag.toLowerCase()), flag);
  }
  assert.equal(jar.get('PHPSESSID'), clientId, 'Session client conservée');
  const stats = await request('admin/stats', 200);
  assert.equal(stats.data.total, 2);
  assert.equal(stats.data.orders, 3);
  assert.match(stats.response.headers.get('cache-control'), /\bno-store\b/);
  assert.equal((await request('me', 200)).data.role, 'client');

  await request('logout', 200, {});
  assert.equal((await request('admin/me', 200)).data.connecte, true, 'Déconnexion client indépendante');
  await request('admin/stats', 200);
  await request('commande', 401, { lignes: [] }, { headers: { Cookie: `OMADMINSESSID=${adminId}` } });
  await request('login', 200, { email: 'client@example.test', mdp: password });
  await request('admin/logout', 200, {});
  assert.equal((await request('me', 200)).data.connecte, true, 'Déconnexion admin indépendante');
  await request('admin/stats', 401);
  await request('admin/stats', 401, undefined, { headers: { Cookie: `OMADMINSESSID=${adminId}` } });
  assert.equal((await request('admin/me', 200)).data.connecte, false);
  await request('register', 201, { nom: 'Nouveau client', email: 'new@example.test', mdp: password });
  await request('admin/stats', 401);
  await request('admin/login', 200, { email: 'admin@example.test', mdp: password });
  await request('admin/stats', 200);

  console.log(`GOF-B : ${checks} contrôles API/compte de test réussis (SQLite isolée).`);
} finally {
  if (server && server.exitCode === null) {
    server.kill();
    await new Promise((resolve) => server.once('exit', resolve));
  }
  const relative = path.relative(tmpdir(), temporary);
  assert.ok(relative.startsWith('om-gof-b-') && !relative.includes(path.sep), 'Suppression limitée au répertoire temporaire du test');
  await rm(temporary, { recursive: true, force: true });
}
