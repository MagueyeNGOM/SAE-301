import assert from 'node:assert/strict';
import { mkdtemp, writeFile, readFile, readdir, rm, unlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn, spawnSync } from 'node:child_process';
import { createServer } from 'node:net';
import { randomBytes } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const quote = (value) => "'" + value.replaceAll('\\', '/').replaceAll("'", "\\'") + "'";
const storage = path.join(root, 'back/storage/product-images');

// Les écritures utilisent une base isolée ; seuls les JPEG créés par cette fixture sont nettoyés.
export async function startFixture() {
  const temporary = await mkdtemp(path.join(tmpdir(), 'om-gof-a-'));
  const php = process.env.PHP_BIN || 'php';
  const hasGd = spawnSync(php, ['-r', 'echo extension_loaded("gd") ? "yes" : "no";'], { encoding: 'utf8' });
  if (hasGd.error) throw hasGd.error;
  const phpArgs = hasGd.stdout.trim() === 'yes' ? [] : ['-d', 'extension=gd'];
  const password = randomBytes(18).toString('hex');
  const env = { ...process.env, GOF_A_DB: path.join(temporary, 'test.sqlite'), GOF_A_PASSWORD: password };
  const originalFiles = new Set(await readdir(storage));
  let server;
  const run = (file, args = []) => {
    const result = spawnSync(php, [...phpArgs, file, ...args], { env, encoding: 'utf8' });
    if (result.error) throw result.error;
    assert.equal(result.status, 0, result.stderr || result.stdout);
    return result.stdout;
  };
  const stop = async () => {
    if (server && server.exitCode === null) {
      const exited = new Promise((resolve) => server.once('exit', resolve));
      server.kill();
      await exited;
    }
    for (const file of await readdir(storage)) {
      if (!originalFiles.has(file) && /^om-[a-f0-9]{32}\.jpg$/.test(file)) await unlink(path.join(storage, file));
    }
    const relative = path.relative(tmpdir(), temporary);
    assert.ok(relative.startsWith('om-gof-a-') && !relative.includes(path.sep));
    await rm(temporary, { recursive: true, force: true });
  };
  try {
    await writeFile(path.join(temporary, 'bootstrap.php'), `<?php
require_once ${quote(path.join(root, 'back/src/Core/Database.php'))};
$pdo = new PDO('sqlite:' . getenv('GOF_A_DB'), null, null, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC]);
$pdo->exec('PRAGMA foreign_keys = ON');
(new ReflectionProperty(App\\Core\\Database::class, 'pdo'))->setValue(null, $pdo);
`);
    await writeFile(path.join(temporary, 'setup.php'), `<?php
require __DIR__ . '/bootstrap.php';
if (!extension_loaded('gd')) throw new RuntimeException('GD doit être disponible pour ces tests.');
$pdo->exec("CREATE TABLE utilisateur (id INTEGER PRIMARY KEY, prenom TEXT, nom TEXT, email TEXT UNIQUE, password_hash TEXT, role TEXT);
CREATE TABLE categorie (id INTEGER PRIMARY KEY, nom TEXT, slug TEXT UNIQUE, description TEXT DEFAULT '', ordre INTEGER);
CREATE TABLE produit (id INTEGER PRIMARY KEY AUTOINCREMENT, categorie_id INTEGER NOT NULL REFERENCES categorie(id) ON DELETE RESTRICT,
 nom TEXT NOT NULL, slug TEXT COLLATE NOCASE UNIQUE NOT NULL, description TEXT, details TEXT, prix NUMERIC CHECK(prix >= 0), prix_flocage NUMERIC, image TEXT, nouveaute INTEGER);
CREATE TABLE taille (id INTEGER PRIMARY KEY, libelle TEXT, ordre INTEGER);
CREATE TABLE stock (produit_id INTEGER REFERENCES produit(id) ON DELETE CASCADE, taille_id INTEGER REFERENCES taille(id), quantite INTEGER CHECK(quantite >= 0), PRIMARY KEY(produit_id, taille_id));
CREATE TABLE image_produit (produit_id INTEGER REFERENCES produit(id) ON DELETE CASCADE, ordre INTEGER, fichier TEXT, PRIMARY KEY(produit_id, ordre));
CREATE TABLE commande (id INTEGER PRIMARY KEY AUTOINCREMENT, utilisateur_id INTEGER REFERENCES utilisateur(id), numero TEXT UNIQUE, total NUMERIC, statut TEXT DEFAULT 'en_cours');
CREATE TABLE ligne_commande (id INTEGER PRIMARY KEY AUTOINCREMENT, commande_id INTEGER REFERENCES commande(id), produit_id INTEGER REFERENCES produit(id) ON DELETE RESTRICT,
 taille_id INTEGER REFERENCES taille(id), nom_produit TEXT, quantite INTEGER, prix_unitaire NUMERIC, flocage_nom TEXT, flocage_numero INTEGER, prix_flocage NUMERIC);
INSERT INTO categorie VALUES (1, 'Maillots', 'maillots', 'Maillots officiels', 1), (2, 'Supporters', 'supporters', 'Accessoires', 2);
INSERT INTO taille VALUES (1, 'L', 1), (2, 'M', 2), (3, 'Unique', 3);
INSERT INTO produit VALUES (1, 1, 'Maillot OM', 'maillot-om', 'Maillot officiel', 'Détails', 100, 10, 'maillot-domicile-26-27.png', 1),
 (2, 2, 'Écharpe OM', 'echarpe-om', 'Écharpe officielle', '', 15, NULL, 'echarpe-droit-au-but.png', 0);
INSERT INTO stock VALUES (1, 1, 3), (1, 2, 0), (2, 3, 8);
INSERT INTO image_produit VALUES (1, 1, 'maillot-domicile-26-27.png'), (2, 1, 'echarpe-droit-au-but.png');
INSERT INTO commande (id, numero, total) VALUES (1, 'OM-TEST', 100);
INSERT INTO ligne_commande (commande_id, produit_id, taille_id, nom_produit, quantite, prix_unitaire, prix_flocage) VALUES (1, 1, 1, 'Maillot OM', 1, 100, 0);");
$pdo->exec(file_get_contents(${quote(path.join(root, 'sql/migrations/gof-a-product-stock-threshold.sql'))}));
if ($pdo->query('SELECT COUNT(*) FROM produit')->fetchColumn() != 2 || $pdo->query('SELECT seuil_stock FROM produit LIMIT 1')->fetchColumn() !== null) exit(1);
$query = $pdo->prepare('INSERT INTO utilisateur VALUES (?, ?, ?, ?, ?, ?)');
foreach (['admin', 'client'] as $i => $role) $query->execute([$i + 1, 'Test', $role, $role . '@example.test', password_hash(getenv('GOF_A_PASSWORD'), PASSWORD_BCRYPT), $role]);
$image = imagecreatetruecolor(2400, 1200);
imagefill($image, 0, 0, imagecolorallocate($image, 0, 97, 173));
imagepng($image, __DIR__ . '/upload.png');
imagedestroy($image);
`);
    run(path.join(temporary, 'setup.php'));
    await writeFile(path.join(temporary, 'router.php'), `<?php
require __DIR__ . '/bootstrap.php';
$config = require ${quote(path.join(root, 'back/config/config.php'))};
$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$relative = str_starts_with($uri, $config['chemin']) ? substr($uri, strlen($config['chemin'])) : '';
if ($relative === '__test-upload.png') { header('Content-Type: image/png'); readfile(__DIR__ . '/upload.png'); return; }
if (str_starts_with($relative, 'api/')) { require ${quote(path.join(root, 'back/index.php'))}; return; }
if (preg_match('~^images/produits/(om-[a-f0-9]{32}\\.jpg)$~D', $relative, $match)) {
 $file = ${quote(storage)} . '/' . $match[1];
 if (!is_file($file)) { http_response_code(404); return; }
 header('Content-Type: image/jpeg'); readfile($file); return;
}
$dist = ${quote(path.join(root, 'front/dist'))};
$file = realpath($dist . '/' . $relative);
if ($file && str_starts_with(str_replace('\\\\', '/', $file), str_replace('\\\\', '/', $dist) . '/') && is_file($file)) {
 $types = ['js' => 'text/javascript', 'css' => 'text/css', 'png' => 'image/png', 'jpg' => 'image/jpeg', 'webp' => 'image/webp', 'woff2' => 'font/woff2'];
 header('Content-Type: ' . ($types[pathinfo($file, PATHINFO_EXTENSION)] ?? 'text/html')); readfile($file); return;
}
header('Content-Type: text/html; charset=utf-8'); readfile($dist . '/index.html');
`);
    const socket = createServer();
    await new Promise((resolve) => socket.listen(0, '127.0.0.1', resolve));
    const port = socket.address().port;
    await new Promise((resolve) => socket.close(resolve));
    server = spawn(php, [...phpArgs, '-d', `session.save_path=${temporary}`, '-S', `127.0.0.1:${port}`, path.join(temporary, 'router.php')], { env, stdio: ['ignore', 'pipe', 'pipe'] });
    let logs = '';
    server.stderr.on('data', (data) => { logs += data; });
    server.on('error', (error) => { logs += error.message; });
    const base = run('-r', [`$c = require ${quote(path.join(root, 'back/config/config.php'))}; echo $c['chemin'];`]);
    const origin = `http://127.0.0.1:${port}`;
    for (let attempt = 0; attempt < 50; attempt++) {
      try {
        await fetch(origin + base + 'api/me');
        return { origin, base, api: origin + base + 'api/', password, upload: path.join(temporary, 'upload.png'), stop, run, temporary };
      } catch { await delay(100); }
    }
    throw new Error('Serveur PHP inaccessible : ' + logs);
  } catch (error) { await stop(); throw error; }
}

async function checkApi() {
  const fixture = await startFixture();
  const jar = new Map();
  let checks = 0;
  const request = async (route, status, body, headers = {}) => {
    const response = await fetch(fixture.api + route, {
      method: body === undefined ? 'GET' : 'POST',
      headers: { Cookie: [...jar].map(([key, value]) => `${key}=${value}`).join('; '), ...(body === undefined ? {} : { 'Content-Type': 'application/json' }), ...headers },
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
  };
  try {
    for (const route of ['admin/produits', 'admin/produit?id=1', 'admin/produits/save', 'admin/produits/delete']) await request(route, 401, route.includes('/save') || route.includes('/delete') ? {} : undefined);
    await request('login', 200, { email: 'client@example.test', mdp: fixture.password });
    await request('admin/produits', 401);
    await request('admin/login', 200, { email: 'admin@example.test', mdp: fixture.password });
    const initial = await request('admin/produits', 200);
    assert.equal(initial.produits.length, 2);
    assert.equal(initial.produits[0].seuil_stock, 5);
    await request('admin/produit?id=65535', 404);
    for (const id of ['-1', '0', '65536', '1abc', '1.2', '']) await request('admin/produit?id=' + id, 422);
    const image = (await readFile(fixture.upload)).toString('base64');
    const draft = { nom: 'Équipement été', description: 'Description du produit', details: 'Détails\nLigne 2', prix: 25.99, categorie_id: 2,
      nouveaute: false, prix_flocage: null, seuil_stock: 2, variants: [{ taille_id: 3, quantite: 4 }], images: [{ data: image }] };
    const filesBefore = await readdir(storage);
    for (const invalid of [{}, { nom: '' }, { nom: [] }, { nom: 'a'.repeat(121) }, { description: '' }, { details: [] }, { categorie_id: 250 }, { categorie_id: '1' },
      { prix: '25' }, { prix: -1 }, { prix: 100000 }, { prix: 0.001 }, { prix_flocage: 1000 }, { nouveaute: 1 }, { seuil_stock: -1 }, { seuil_stock: 65536 }, { seuil_stock: '5' },
      { variants: [] }, { variants: [{ taille_id: 1, quantite: -1 }] }, { variants: [{ taille_id: 1, quantite: 0.5 }] }, { variants: [{ taille_id: 1, quantite: 65536 }] },
      { variants: [{ taille_id: 250, quantite: 1 }] }, { variants: [{ taille_id: 1, quantite: 1 }, { taille_id: 1, quantite: 2 }] },
      { variants: [{ taille_id: 3, quantite: 1 }, { taille_id: 1, quantite: 2 }] }, { images: [] }, { images: [{ file: '../config/config.php' }] },
      { images: [{ data: 'invalid' }] }, { images: [{ data: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"></svg>').toString('base64') }] },
      { images: Array.from({ length: 9 }, () => ({ data: image })) }, { images: [{ data: Buffer.alloc(2097153).toString('base64') }] }]) {
      await request('admin/produits/save', 422, Object.keys(invalid).length ? { ...draft, ...invalid } : {});
    }
    assert.deepEqual(await readdir(storage), filesBefore, 'Les données invalides ne créent aucun fichier');
    await request('admin/produits/save', 403, draft, { 'Content-Type': 'text/plain' });
    await request('admin/produits/save', 403, draft, { 'Sec-Fetch-Site': 'cross-site' });
    const created = (await request('admin/produits/save', 201, draft)).produit;
    assert.equal(created.slug, 'equipement-ete');
    assert.deepEqual(created.variants, [{ taille_id: 3, quantite: 4 }]);
    assert.match(created.image, /^om-[a-f0-9]{32}\.jpg$/);
    const file = path.join(storage, created.image);
    const dimensions = fixture.run('-r', [`$i = getimagesize(${quote(file)}); echo json_encode([$i[0], $i[1], $i[2]]);`]);
    assert.deepEqual(JSON.parse(dimensions), [1600, 800, 2], 'Image réencodée et redimensionnée');
    const publicImage = await fetch(fixture.origin + fixture.base + 'images/produits/' + created.image);
    assert.equal(publicImage.headers.get('content-type'), 'image/jpeg');
    assert.ok((await publicImage.arrayBuffer()).byteLength > 0);
    const publicProduct = (await request('produit?slug=' + created.slug, 200)).produit;
    assert.equal(publicProduct.stock, 'en_stock');
    const update = { ...draft, id: created.id, nom: 'Nom modifié', prix: 35, prix_flocage: 9.99, categorie_id: 1, seuil_stock: 10,
      variants: [{ taille_id: 1, quantite: 3 }, { taille_id: 2, quantite: 0 }], images: [{ file: created.image }, { data: image }] };
    const modified = (await request('admin/produits/save', 200, update)).produit;
    assert.equal(modified.slug, created.slug);
    assert.equal(modified.images.length, 2);
    const updatedPublic = (await request('produit?slug=' + created.slug, 200)).produit;
    assert.equal(updatedPublic.stock, 'bientot');
    assert.equal(updatedPublic.prixFlocage, 9.99);
    assert.equal(updatedPublic.categorie, 'Maillots');
    assert.deepEqual(updatedPublic.tailles.map((size) => size.quantite), [3, 0]);
    assert.equal((await request('produits', 200)).produits.find((product) => product.id === created.id).stock, 'bientot');
    const reordered = (await request('admin/produits/save', 200, { ...update, images: [...modified.images].reverse().map((file) => ({ file })) })).produit;
    assert.deepEqual(reordered.images, [...modified.images].reverse());
    assert.equal(reordered.image, modified.images[1]);
    const beforeRollback = (await request('admin/produit?id=' + created.id, 200)).produit;
    const filesBeforeRollback = await readdir(storage);
    fixture.run('-r', [`require ${quote(path.join(fixture.temporary, 'bootstrap.php'))}; $pdo->exec("CREATE TRIGGER reject_gallery BEFORE INSERT ON image_produit WHEN NEW.produit_id = ${created.id} BEGIN SELECT RAISE(ABORT, 'Échec simulé de galerie'); END");`]);
    await request('admin/produits/save', 409, { ...update, prix: 88, variants: [{ taille_id: 1, quantite: 10 }] });
    fixture.run('-r', [`require ${quote(path.join(fixture.temporary, 'bootstrap.php'))}; $pdo->exec('DROP TRIGGER reject_gallery');`]);
    assert.deepEqual((await request('admin/produit?id=' + created.id, 200)).produit, beforeRollback, 'Une panne en fin d’écriture restaure produit, stocks et galerie');
    assert.deepEqual(await readdir(storage), filesBeforeRollback, 'Aucune nouvelle image après rollback');
    const failureFiles = await readdir(storage);
    await request('admin/produits/save', 409, draft);
    assert.deepEqual(await readdir(storage), failureFiles, 'Un échec SQL supprime les nouvelles images');
    await request('admin/produits/save', 422, { ...update, images: [{ file: created.image }, { file: created.image }] });
    await request('admin/produits/save', 413, { ...draft, details: 'x'.repeat(6291456) });
    await request('commande', 422, { lignes: [{ slug: created.slug, quantite: 1, tailleId: 2 }] });
    await request('commande', 422, { lignes: [{ slug: created.slug, quantite: 4, tailleId: 1 }] });
    const order = await request('commande', 201, { lignes: [{ slug: 'maillot-om', quantite: 1, tailleId: 1, flocage: { nom: 'MAG', numero: 10 } }] });
    assert.equal(order.commande.total, 110, 'Le tunnel de commande conserve prix et options');
    const existing = (await request('admin/produit?id=1', 200)).produit;
    const existingUpdate = { ...existing, images: existing.images.map((file) => ({ file })), nom: '<img src=x onerror=alert(1)>', prix: 120 };
    await request('admin/produits/save', 200, existingUpdate);
    assert.equal(fixture.run('-r', [`require ${quote(path.join(fixture.temporary, 'bootstrap.php'))}; echo $pdo->query('SELECT prix_unitaire FROM ligne_commande WHERE id = 1')->fetchColumn();`]), '100');
    await request('admin/produits/delete', 409, { id: 1, confirmed: true });
    await request('admin/produits/delete', 422, { id: created.id });
    await request('admin/produits/delete', 422, { id: created.id, confirmed: 'true' });
    await request('admin/produits/delete', 422, { id: '1', confirmed: true });
    await request('admin/produits/delete', 404, { id: 65535, confirmed: true });
    await request('admin/produits/delete', 200, { id: created.id, confirmed: true });
    await request('produit?slug=' + created.slug, 404);
    const remnants = fixture.run('-r', [`require ${quote(path.join(fixture.temporary, 'bootstrap.php'))}; echo $pdo->query('SELECT COUNT(*) FROM stock WHERE produit_id = ${created.id}')->fetchColumn() . ',' . $pdo->query('SELECT COUNT(*) FROM image_produit WHERE produit_id = ${created.id}')->fetchColumn();`]);
    assert.equal(remnants, '0,0', 'Suppression en cascade des variantes et de la galerie');
    assert.equal((await request('me', 200)).connecte, true);
    await request('admin/logout', 200, {});
    await request('admin/produits', 401);
    assert.equal((await request('me', 200)).connecte, true);
    console.log(`GOF-A : ${checks} contrôles API réussis ; migration, images 1600 × 800, transactions, commandes et sessions vérifiées sur SQLite isolée.`);
  } finally { await fixture.stop(); }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await checkApi();
