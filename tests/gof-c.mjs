import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn, spawnSync } from 'node:child_process';
import { createServer } from 'node:net';
import { randomBytes } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const quote = (value) => "'" + value.replaceAll('\\', '/').replaceAll("'", "\\'") + "'";

// La même API et la migration réelle sont exercées, sans utiliser la base configurée.
export async function startFixture() {
  const temporary = await mkdtemp(path.join(tmpdir(), 'om-gof-c-'));
  const password = randomBytes(18).toString('hex');
  const php = process.env.PHP_BIN || 'php';
  const env = { ...process.env, GOF_C_DB: path.join(temporary, 'test.sqlite'), GOF_C_PASSWORD: password };
  let server;
  const stop = async () => {
    if (server && server.exitCode === null) {
      const exited = new Promise((resolve) => server.once('exit', resolve));
      server.kill();
      await exited;
    }
    const relative = path.relative(tmpdir(), temporary);
    assert.ok(relative.startsWith('om-gof-c-') && !relative.includes(path.sep));
    await rm(temporary, { recursive: true, force: true });
  };
  const run = (file, args = []) => {
    const result = spawnSync(php, [file, ...args], { env, encoding: 'utf8' });
    if (result.error) throw result.error;
    assert.equal(result.status, 0, result.stderr || result.stdout);
    return result.stdout;
  };
  try {
    await writeFile(path.join(temporary, 'bootstrap.php'), `<?php
require_once ${quote(path.join(root, 'back/src/Core/Database.php'))};
$pdo = new PDO('sqlite:' . getenv('GOF_C_DB'), null, null, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC]);
$pdo->exec('PRAGMA foreign_keys = ON');
(new ReflectionProperty(App\\Core\\Database::class, 'pdo'))->setValue(null, $pdo);
`);
    await writeFile(path.join(temporary, 'setup.php'), `<?php
require __DIR__ . '/bootstrap.php';
$pdo->exec("CREATE TABLE utilisateur (id INTEGER PRIMARY KEY, nom TEXT, email TEXT UNIQUE, password_hash TEXT, role TEXT);
CREATE TABLE categorie (id INTEGER PRIMARY KEY AUTOINCREMENT, nom VARCHAR(60) COLLATE NOCASE NOT NULL, slug VARCHAR(60) COLLATE NOCASE UNIQUE NOT NULL, ordre INTEGER NOT NULL DEFAULT 0);
CREATE TABLE produit (id INTEGER PRIMARY KEY, categorie_id INTEGER NOT NULL REFERENCES categorie(id) ON DELETE RESTRICT, nom TEXT, slug TEXT, description TEXT, details TEXT, prix NUMERIC, prix_flocage NUMERIC, image TEXT, nouveaute INTEGER);
CREATE TABLE commande (id INTEGER PRIMARY KEY);
CREATE TABLE taille (id INTEGER PRIMARY KEY, libelle TEXT, ordre INTEGER);
CREATE TABLE stock (produit_id INTEGER, taille_id INTEGER, quantite INTEGER);
CREATE TABLE image_produit (produit_id INTEGER, fichier TEXT, ordre INTEGER);
INSERT INTO categorie (nom, slug, ordre) VALUES ('Maillots', 'maillots', 1), ('Entraînement', 'entrainement', 2), ('Supporters', 'supporters', 3);
INSERT INTO produit VALUES (1, 1, 'Maillot OM Domicile 26/27', 'maillot-domicile-26-27', 'Maillot officiel', 'Détails', 100, 10, 'maillot-domicile-26-27.png', 1), (2, 2, 'Pantalon OM', 'pantalon-om', 'Pantalon officiel', 'Détails', 60, NULL, 'pantalon-entrainement-26-27.png', 0);
INSERT INTO taille VALUES (1, 'L', 1);
INSERT INTO stock VALUES (1, 1, 3), (2, 1, 8);
INSERT INTO commande VALUES (1);");
$pdo->exec(file_get_contents(${quote(path.join(root, 'sql/migrations/gof-c-category-description.sql'))}));
if ($pdo->query('SELECT COUNT(*) FROM categorie')->fetchColumn() != 3 || $pdo->query('SELECT COUNT(*) FROM produit')->fetchColumn() != 2) exit(1);
$query = $pdo->prepare('INSERT INTO utilisateur VALUES (?, ?, ?, ?, ?)');
foreach (['admin', 'client'] as $i => $role) $query->execute([$i + 1, $role, $role . '@example.test', password_hash(getenv('GOF_C_PASSWORD'), PASSWORD_BCRYPT), $role]);
`);
    run(path.join(temporary, 'setup.php'));
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
    const base = run('-r', [`$c = require ${quote(path.join(root, 'back/config/config.php'))}; echo $c['chemin'];`]);
    const api = `http://127.0.0.1:${port}${base}api/`;
    for (let attempt = 0; attempt < 50; attempt++) {
      try {
        await fetch(api + 'me');
        return { api, base, password, stop };
      } catch { await delay(100); }
    }
    throw new Error('Serveur PHP inaccessible : ' + logs);
  } catch (error) {
    await stop();
    throw error;
  }
}

async function checkApi() {
  const fixture = await startFixture();
  const jar = new Map();
  let checks = 0;
  async function request(route, status, body, options = {}) {
    const response = await fetch(fixture.api + route, {
      method: body === undefined ? 'GET' : 'POST',
      headers: { Cookie: [...jar].map(([key, value]) => `${key}=${value}`).join('; '), ...(body === undefined ? {} : { 'Content-Type': 'application/json' }), ...options.headers },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const data = await response.json();
    assert.equal(response.status, status, `${route}: ${JSON.stringify(data)}`);
    for (const cookie of response.headers.getSetCookie()) {
      const [name, ...parts] = cookie.split(';')[0].split('=');
      if (parts.join('=')) jar.set(name, parts.join('=')); else jar.delete(name);
    }
    checks++;
    return data;
  }
  try {
    for (const route of ['admin/categories', 'admin/categories/save', 'admin/categories/delete']) await request(route, 401, route.endsWith('categories') ? undefined : {});
    await request('login', 200, { email: 'client@example.test', mdp: fixture.password });
    await request('admin/categories', 401);
    await request('admin/categories/save', 401, { nom: 'Interdit', description: 'Client' });
    await request('admin/login', 200, { email: 'admin@example.test', mdp: fixture.password });
    assert.equal((await request('admin/categories', 200)).categories.length, 3);
    const original = await request('produit?slug=maillot-domicile-26-27', 200);
    const initial = await request('categories', 200);
    assert.deepEqual(initial.categories.map((c) => c.slug), ['maillots', 'entrainement', 'supporters']);
    for (const data of [{}, { nom: [] }, { nom: '---', description: 'Test' }, { nom: 'a'.repeat(61), description: 'Test' }, { nom: 'Test', description: [] }, { nom: 'Test', description: 'x'.repeat(256) }, { nom: 'Test\nInvalid', description: 'Test' }, { nom: 'Test', description: 'Test\u0000' }, { id: '1', nom: 'Test', description: 'Test' }, { id: 0 }, { id: 256 }, { id: [] }]) {
      await request('admin/categories/save', 422, data);
    }
    await request('admin/categories/save', 404, { id: 250, nom: 'Absent', description: 'Test' });
    await request('admin/categories/save', 409, { nom: 'maillots', description: 'Doublon' });
    await request('admin/categories/save', 403, { nom: 'Interdit', description: 'Test' }, { headers: { 'Content-Type': 'text/plain' } });
    await request('admin/categories/save', 403, { nom: 'Interdit', description: 'Test' }, { headers: { 'Sec-Fetch-Site': 'cross-site' } });
    const created = (await request('admin/categories/save', 201, { nom: '  Équipements été  ', description: '  Nouveautés  ' })).categories.find((c) => c.nom === 'Équipements été');
    assert.equal(created.slug, 'equipements-ete');
    assert.equal(created.description, 'Nouveautés');
    assert.equal(created.nombre, 0);
    await request('admin/categories/save', 409, { nom: 'Equipements ete', description: 'Collision de slug' });
    const modified = (await request('admin/categories/save', 200, { id: 1, nom: 'Maillots officiels', description: 'Maillots du club' })).categories.find((c) => c.id === 1);
    assert.equal(modified.slug, 'maillots');
    assert.equal(modified.nombre, 1);
    assert.equal((await request('produits?categorie=maillots', 200)).produits[0].categorie, 'Maillots officiels');
    const renamedProduct = (await request('produit?slug=maillot-domicile-26-27', 200)).produit;
    assert.deepEqual({ ...renamedProduct, categorie: original.produit.categorie }, original.produit, 'Options, prix, images et stocks inchangés');
    await request('admin/categories/save', 409, { id: created.id, nom: 'Maillots officiels', description: 'Doublon' });
    await request('admin/categories/delete', 422, { id: created.id });
    await request('admin/categories/delete', 422, { id: created.id, confirmed: 'true' });
    await request('admin/categories/delete', 422, { id: -1, confirmed: true });
    await request('admin/categories/delete', 404, { id: 250, confirmed: true });
    await request('admin/categories/delete', 409, { id: 1, confirmed: true });
    assert.equal((await request('produits?categorie=maillots', 200)).produits.length, 1);
    await request('admin/categories/delete', 200, { id: created.id, confirmed: true });
    await request('admin/categories/delete', 404, { id: created.id, confirmed: true });
    await request('produits?categorie=equipements-ete', 404);
    const hostile = '<img src=x onerror=alert(1)>';
    const text = (await request('admin/categories/save', 201, { nom: hostile, description: '<script>alert(1)</script>' })).categories.find((c) => c.nom === hostile);
    assert.ok(text);
    await request('admin/categories/delete', 200, { id: text.id, confirmed: true });
    assert.equal((await request('me', 200)).connecte, true);
    await request('admin/logout', 200, {});
    await request('admin/categories/delete', 401, { id: 3, confirmed: true });
    assert.equal((await request('me', 200)).connecte, true);
    console.log(`GOF-C : ${checks} contrôles API réussis ; migration et conservation des produits vérifiées sur SQLite isolée.`);
  } finally { await fixture.stop(); }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await checkApi();
