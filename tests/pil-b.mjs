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

// Même principe que gof-c : l'API réelle sur une base SQLite temporaire, jamais la base configurée.
async function startFixture() {
  const temporary = await mkdtemp(path.join(tmpdir(), 'om-pil-b-'));
  const password = randomBytes(18).toString('hex');
  const php = process.env.PHP_BIN || 'php';
  const env = { ...process.env, PIL_B_DB: path.join(temporary, 'test.sqlite'), PIL_B_PASSWORD: password };
  let server;
  const stop = async () => {
    if (server && server.exitCode === null) {
      const exited = new Promise((resolve) => server.once('exit', resolve));
      server.kill();
      await exited;
    }
    const relative = path.relative(tmpdir(), temporary);
    assert.ok(relative.startsWith('om-pil-b-') && !relative.includes(path.sep));
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
$pdo = new PDO('sqlite:' . getenv('PIL_B_DB'), null, null, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC]);
$pdo->exec('PRAGMA foreign_keys = ON');
(new ReflectionProperty(App\\Core\\Database::class, 'pdo'))->setValue(null, $pdo);
`);
    await writeFile(path.join(temporary, 'setup.php'), `<?php
require __DIR__ . '/bootstrap.php';
$pdo->exec("CREATE TABLE utilisateur (id INTEGER PRIMARY KEY, prenom TEXT, nom TEXT, email TEXT UNIQUE, telephone TEXT, password_hash TEXT, role TEXT);
CREATE TABLE categorie (id INTEGER PRIMARY KEY AUTOINCREMENT, nom VARCHAR(60) NOT NULL, slug VARCHAR(60) UNIQUE NOT NULL, ordre INTEGER NOT NULL DEFAULT 0);
CREATE TABLE produit (id INTEGER PRIMARY KEY, categorie_id INTEGER NOT NULL, nom TEXT, slug TEXT, description TEXT, details TEXT, prix NUMERIC, prix_flocage NUMERIC, image TEXT, nouveaute INTEGER);
CREATE TABLE taille (id INTEGER PRIMARY KEY, libelle TEXT, ordre INTEGER);
CREATE TABLE stock (produit_id INTEGER, taille_id INTEGER, quantite INTEGER);
CREATE TABLE image_produit (produit_id INTEGER, fichier TEXT, ordre INTEGER);
CREATE TABLE commande (id INTEGER PRIMARY KEY AUTOINCREMENT, numero TEXT UNIQUE NOT NULL, utilisateur_id INTEGER NOT NULL, statut TEXT NOT NULL DEFAULT 'en cours', total NUMERIC NOT NULL, date_commande TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, date_retrait TEXT);
CREATE TABLE ligne_commande (id INTEGER PRIMARY KEY AUTOINCREMENT, commande_id INTEGER NOT NULL, produit_id INTEGER NOT NULL, taille_id INTEGER, nom_produit TEXT NOT NULL, quantite INTEGER NOT NULL, prix_unitaire NUMERIC NOT NULL, flocage_nom TEXT, flocage_numero INTEGER, prix_flocage NUMERIC NOT NULL DEFAULT 0);
CREATE TABLE journal_admin (id INTEGER PRIMARY KEY AUTOINCREMENT, admin_id INTEGER NOT NULL, commande_id INTEGER NOT NULL, action TEXT NOT NULL, ancien_statut TEXT NOT NULL, nouveau_statut TEXT NOT NULL, date_action TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
INSERT INTO categorie (nom, slug, ordre) VALUES ('Maillots', 'maillots', 1), ('Entraînement', 'entrainement', 2);
INSERT INTO produit VALUES (1, 1, 'Maillot OM Domicile 26/27', 'maillot-domicile-26-27', 'Maillot officiel', 'Détails', 100, 10, 'maillot.png', 1), (2, 2, 'Pantalon OM', 'pantalon-om', 'Pantalon officiel', 'Détails', 60, NULL, 'pantalon.png', 0);
INSERT INTO taille VALUES (1, 'L', 1);
INSERT INTO stock VALUES (1, 1, 3), (2, 1, 8);
INSERT INTO commande (id, numero, utilisateur_id, total) VALUES (1, 'OM-000001', 2, 120);
INSERT INTO ligne_commande (commande_id, produit_id, taille_id, nom_produit, quantite, prix_unitaire) VALUES (1, 2, 1, 'Pantalon OM', 2, 60);");
$pdo->exec('ALTER TABLE categorie ADD COLUMN description VARCHAR(255) NOT NULL DEFAULT \\'\\'');
$pdo->exec('ALTER TABLE produit ADD COLUMN seuil_stock INTEGER NULL DEFAULT NULL');
$pdo->exec(file_get_contents(${quote(path.join(root, 'sql/migrations/pil-b-order-stock-flag.sql'))}));
$query = $pdo->prepare('INSERT INTO utilisateur VALUES (?, ?, ?, ?, ?, ?, ?)');
foreach (['admin', 'client'] as $i => $role) $query->execute([$i + 1, ucfirst($role), 'Test', $role . '@example.test', null, password_hash(getenv('PIL_B_PASSWORD'), PASSWORD_BCRYPT), $role]);
`);
    await writeFile(path.join(temporary, 'query.php'), `<?php
require __DIR__ . '/bootstrap.php';
echo json_encode($pdo->query($argv[1])->fetchAll());
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
    const query = (sql) => JSON.parse(run(path.join(temporary, 'query.php'), [sql]));
    for (let attempt = 0; attempt < 50; attempt++) {
      try {
        await fetch(api + 'me');
        return { api, password, stop, query };
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
  const stock = async (slug) => (await request(`produit?slug=${slug}`, 200)).produit.tailles[0].quantite;
  const order = (slug, quantite) => request('commande', 201, { lignes: [{ slug, quantite, tailleId: 1 }] });
  const statut = (list, numero) => list.commandes.find((c) => c.numero === numero).statut;
  try {
    // Accès : rien sans session admin, pas même avec une session client.
    for (const [route, body] of [['admin/commandes'], ['admin/commande?id=1'], ['admin/commandes/action', {}]]) await request(route, 401, body);
    await request('login', 200, { email: 'client@example.test', mdp: fixture.password });
    await request('admin/commandes', 401);
    await request('admin/commandes/action', 401, { ids: [1], action: 'annuler', confirmed: true });

    // STK-A : une commande retire le stock, une commande en trop est refusée.
    const a = (await order('maillot-domicile-26-27', 2)).commande.numero;
    await order('pantalon-om', 3);
    const b = (await order('maillot-domicile-26-27', 1)).commande.numero;
    assert.equal(await stock('maillot-domicile-26-27'), 0);
    assert.equal(await stock('pantalon-om'), 5);
    await request('commande', 422, { lignes: [{ slug: 'maillot-domicile-26-27', quantite: 1, tailleId: 1 }] });

    await request('admin/login', 200, { email: 'admin@example.test', mdp: fixture.password });
    // Liste, tri et filtre.
    const list = await request('admin/commandes', 200);
    assert.equal(list.commandes.length, 4);
    assert.deepEqual(list.compteurs, { 'en cours': 4, disponible: 0, 'retirée': 0, 'annulée': 0 });
    assert.equal(list.commandes[0].client, 'Client Test');
    const montants = (await request('admin/commandes?tri=montant&sens=asc', 200)).commandes.map((c) => c.total);
    assert.deepEqual(montants, [...montants].sort((x, y) => x - y));
    assert.equal((await request('admin/commandes?tri=montant&sens=desc', 200)).commandes[0].total, 200);
    await request('admin/commandes?tri=statut', 200);
    assert.equal((await request('admin/commandes?statut=annul%C3%A9e', 200)).commandes.length, 0);
    for (const route of ['tri=client', 'sens=up', 'statut=perdue']) await request(`admin/commandes?${route}`, 422);

    // Détail.
    const detail = (await request(`admin/commande?id=${list.commandes.find((c) => c.numero === a).id}`, 200)).commande;
    assert.deepEqual([detail.numero, detail.lignes[0].taille, detail.lignes[0].quantite, detail.total], [a, 'L', 2, 200]);
    for (const id of ['abc', '0', '999']) await request(`admin/commande?id=${id}`, 404);
    const ids = Object.fromEntries(list.commandes.map((c) => [c.numero, c.id]));

    // Statuts : en cours → disponible → retirée, sans toucher au stock.
    let result = (await request('admin/commandes/action', 200, { ids: [ids[a]], action: 'suivant' })).resultats[0];
    assert.equal(result.ok, true);
    assert.equal(await stock('maillot-domicile-26-27'), 0);
    await request('admin/commandes/action', 200, { ids: [ids[a]], action: 'suivant' });
    assert.equal(statut(await request('admin/commandes', 200), a), 'retirée');
    assert.equal((await request(`admin/commande?id=${ids[a]}`, 200)).commande.retrait !== null, true);
    assert.equal((await request('admin/commandes/action', 200, { ids: [ids[a]], action: 'suivant' })).resultats[0].ok, false);

    // Annulation : confirmation obligatoire, impossible une fois retirée, stock remis par taille.
    await request('admin/commandes/action', 422, { ids: [ids[b]], action: 'annuler' });
    await request('admin/commandes/action', 422, { ids: [ids[b]], action: 'annuler', confirmed: 'true' });
    assert.equal((await request('admin/commandes/action', 200, { ids: [ids[a]], action: 'annuler', confirmed: true })).resultats[0].ok, false);
    assert.equal(await stock('maillot-domicile-26-27'), 0);
    assert.equal((await request('admin/commandes/action', 200, { ids: [ids[b]], action: 'annuler', confirmed: true })).resultats[0].ok, true);
    assert.equal(await stock('maillot-domicile-26-27'), 1);
    assert.equal((await request('admin/commandes/action', 200, { ids: [ids[b]], action: 'annuler', confirmed: true })).resultats[0].ok, false);
    assert.equal(await stock('maillot-domicile-26-27'), 1, 'Une commande déjà annulée ne remet pas le stock deux fois');

    // Commande antérieure à PIL-B (id 1) : annulable, mais elle n'avait rien retiré du stock.
    await request('admin/commandes/action', 200, { ids: [1], action: 'annuler', confirmed: true });
    assert.equal(await stock('pantalon-om'), 5);

    // Actions en lot : chaque commande est traitée seule.
    const c = (await order('pantalon-om', 1)).commande.numero;
    const d = (await order('pantalon-om', 1)).commande.numero;
    assert.equal(await stock('pantalon-om'), 3);
    const lot = (await request('admin/commandes', 200)).commandes;
    const idC = lot.find((x) => x.numero === c).id;
    const idD = lot.find((x) => x.numero === d).id;
    const suivant = (await request('admin/commandes/action', 200, { ids: [idC, idD], action: 'suivant' })).resultats;
    assert.deepEqual(suivant.map((r) => r.ok), [true, true]);
    const annulation = (await request('admin/commandes/action', 200, { ids: [idC, idD, ids[a], 999], action: 'annuler', confirmed: true })).resultats;
    assert.deepEqual(annulation.map((r) => r.ok), [true, true, false, false]);
    assert.equal(await stock('pantalon-om'), 5);
    for (const body of [{}, { ids: [], action: 'suivant' }, { ids: ['1'], action: 'suivant' }, { ids: [1], action: 'supprimer' }, { ids: Array.from({ length: 51 }, (_, i) => i + 1), action: 'suivant' }]) {
      await request('admin/commandes/action', 422, body);
    }
    await request('admin/commandes/action', 403, { ids: [1], action: 'suivant' }, { headers: { 'Content-Type': 'text/plain' } });

    // Journal : une ligne par modification réussie, avec l'administrateur.
    const journal = fixture.query('SELECT admin_id, commande_id, action, ancien_statut, nouveau_statut FROM journal_admin ORDER BY id');
    assert.equal(journal.length, 8);
    assert.deepEqual(journal[0], { admin_id: 1, commande_id: ids[a], action: 'statut', ancien_statut: 'en cours', nouveau_statut: 'disponible' });
    assert.equal(journal.filter((l) => l.action === 'annulation').length, 4);

    // La déconnexion admin conserve la session client.
    await request('admin/logout', 200, {});
    await request('admin/commandes', 401);
    assert.equal((await request('me', 200)).connecte, true);
    console.log(`PIL-B : ${checks} contrôles API réussis ; statuts, annulations, remise en stock, lots et journal vérifiés sur SQLite isolée.`);
  } finally { await fixture.stop(); }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await checkApi();
