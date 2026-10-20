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
  const temporary = await mkdtemp(path.join(tmpdir(), 'om-pil-a-'));
  const password = randomBytes(18).toString('hex');
  const php = process.env.PHP_BIN || 'php';
  const env = { ...process.env, PIL_A_DB: path.join(temporary, 'test.sqlite'), PIL_A_PASSWORD: password };
  let server;
  const stop = async () => {
    if (server && server.exitCode === null) {
      const exited = new Promise((resolve) => server.once('exit', resolve));
      server.kill();
      await exited;
    }
    const relative = path.relative(tmpdir(), temporary);
    assert.ok(relative.startsWith('om-pil-a-') && !relative.includes(path.sep));
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
$pdo = new PDO('sqlite:' . getenv('PIL_A_DB'), null, null, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC]);
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
foreach (['admin', 'client'] as $i => $role) $query->execute([$i + 1, ucfirst($role), 'Test', $role . '@example.test', null, password_hash(getenv('PIL_A_PASSWORD'), PASSWORD_BCRYPT), $role]);
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
  async function request(route, status, body) {
    const response = await fetch(fixture.api + route, {
      method: body === undefined ? 'GET' : 'POST',
      headers: { Cookie: [...jar].map(([key, value]) => `${key}=${value}`).join('; '), ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) },
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
    // Accès : rien sans session admin, pas même avec une session client.
    await request('admin/stats', 401);
    await request('login', 200, { email: 'client@example.test', mdp: fixture.password });
    await request('admin/stats', 401);
    await request('admin/login', 200, { email: 'admin@example.test', mdp: fixture.password });

    // Données de départ : une commande « en cours » du jour (120 €, 2 pantalons).
    let stats = await request('admin/stats', 200);
    assert.equal(stats.orders, 1);
    assert.deepEqual(stats.compteurs, { 'en cours': 1, disponible: 0, 'retirée': 0, 'annulée': 0 });
    assert.equal(stats.revenus.length, 7);
    assert.equal(stats.revenus[6].jour, fixture.query("SELECT DATE('now') AS d")[0].d);
    assert.equal(stats.revenus[6].revenu, 120);
    assert.deepEqual(stats.plusVendus, [{ nom: 'Pantalon OM', ventes: 2 }]);
    assert.deepEqual(stats.stocks, [{ nom: 'Maillot OM Domicile 26/27', quantite: 3 }, { nom: 'Pantalon OM', quantite: 8 }]);
    // Seuil par défaut (5) : seul le maillot (3) est en alerte.
    assert.deepEqual(stats.alertes, [{ nom: 'Maillot OM Domicile 26/27', taille: 'L', quantite: 3 }]);

    // Une annulée ne compte ni en revenus ni en ventes ; une commande de plus de 7 jours compte en ventes seulement.
    fixture.query(`INSERT INTO commande (id, numero, utilisateur_id, statut, total, date_commande) VALUES
      (2, 'OM-000002', 2, 'annulée', 500, datetime('now')),
      (3, 'OM-000003', 2, 'disponible', 40, datetime('now', '-3 day')),
      (4, 'OM-000004', 2, 'retirée', 300, datetime('now', '-10 day'))`);
    fixture.query(`INSERT INTO ligne_commande (commande_id, produit_id, taille_id, nom_produit, quantite, prix_unitaire) VALUES
      (2, 1, 1, 'Maillot', 5, 100), (3, 2, 1, 'Pantalon OM', 1, 40), (4, 1, 1, 'Ancien nom', 3, 100)`);
    // Seuil propre au pantalon : sa taille L (8) passe en alerte, après le maillot (3).
    fixture.query('UPDATE produit SET seuil_stock = 10 WHERE id = 2');
    stats = await request('admin/stats', 200);
    assert.equal(stats.orders, 4);
    assert.deepEqual(stats.compteurs, { 'en cours': 1, disponible: 1, 'retirée': 1, 'annulée': 1 });
    assert.deepEqual(stats.revenus.map((r) => r.revenu), [0, 0, 0, 40, 0, 0, 120]);
    assert.deepEqual(stats.plusVendus, [{ nom: 'Maillot OM Domicile 26/27', ventes: 3 }, { nom: 'Pantalon OM', ventes: 3 }]);
    assert.deepEqual(stats.alertes.map((a) => a.quantite), [3, 8]);

    // La déconnexion admin ferme les statistiques et conserve la session client.
    await request('admin/logout', 200, {});
    await request('admin/stats', 401);
    assert.equal((await request('me', 200)).connecte, true);
    console.log(`PIL-A : ${checks} contrôles API réussis ; accès, compteurs, revenus 7 jours, meilleures ventes, stocks et alertes vérifiés sur SQLite isolée.`);
  } finally { await fixture.stop(); }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await checkApi();
