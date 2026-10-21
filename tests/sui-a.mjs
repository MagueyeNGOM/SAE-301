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

// Même principe que pil-b : l'API réelle sur une base SQLite temporaire, jamais la base configurée.
async function startFixture() {
  const temporary = await mkdtemp(path.join(tmpdir(), 'om-sui-a-'));
  const password = randomBytes(18).toString('hex');
  const php = process.env.PHP_BIN || 'php';
  const env = { ...process.env, SUI_A_DB: path.join(temporary, 'test.sqlite'), SUI_A_PASSWORD: password };
  let server;
  const stop = async () => {
    if (server && server.exitCode === null) {
      const exited = new Promise((resolve) => server.once('exit', resolve));
      server.kill();
      await exited;
    }
    const relative = path.relative(tmpdir(), temporary);
    assert.ok(relative.startsWith('om-sui-a-') && !relative.includes(path.sep));
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
$pdo = new PDO('sqlite:' . getenv('SUI_A_DB'), null, null, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC]);
(new ReflectionProperty(App\\Core\\Database::class, 'pdo'))->setValue(null, $pdo);
`);
    // Alice (OM-000001) a commandé : un maillot floqué L x2 (100 € à l'époque), un autre maillot L x1,
    // une écharpe, un short L, un produit supprimé (id 5) et un produit qui ne se floque plus. Bob : OM-000002.
    await writeFile(path.join(temporary, 'setup.php'), `<?php
require __DIR__ . '/bootstrap.php';
$pdo->exec("CREATE TABLE utilisateur (id INTEGER PRIMARY KEY, prenom TEXT, nom TEXT, email TEXT UNIQUE, telephone TEXT, password_hash TEXT, role TEXT, date_creation TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE taille (id INTEGER PRIMARY KEY, libelle TEXT);
CREATE TABLE produit (id INTEGER PRIMARY KEY, slug TEXT, nom TEXT, prix NUMERIC, prix_flocage NUMERIC, image TEXT);
CREATE TABLE stock (produit_id INTEGER, taille_id INTEGER, quantite INTEGER);
CREATE TABLE commande (id INTEGER PRIMARY KEY AUTOINCREMENT, numero TEXT UNIQUE NOT NULL, utilisateur_id INTEGER NOT NULL, statut TEXT NOT NULL DEFAULT 'en cours', total NUMERIC NOT NULL, date_commande TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, date_retrait TEXT);
CREATE TABLE ligne_commande (id INTEGER PRIMARY KEY AUTOINCREMENT, commande_id INTEGER NOT NULL, produit_id INTEGER, taille_id INTEGER, nom_produit TEXT, quantite INTEGER, prix_unitaire NUMERIC, flocage_nom TEXT, flocage_numero INTEGER, prix_flocage NUMERIC NOT NULL DEFAULT 0);
INSERT INTO taille (id, libelle) VALUES (1, 'L');
INSERT INTO produit VALUES (1, 'maillot', 'Maillot domicile', 110, 10, 'maillot.jpg'), (2, 'echarpe', 'Écharpe OM', 15, NULL, 'echarpe.jpg'),
  (3, 'short', 'Short', 30, NULL, 'short.jpg'), (4, 'veste', 'Veste', 60, NULL, 'veste.jpg');
INSERT INTO stock VALUES (1, 1, 1), (3, 1, 0);
INSERT INTO commande (numero, utilisateur_id, statut, total) VALUES ('OM-000001', 1, 'retirée', 300), ('OM-000002', 2, 'en cours', 15);
INSERT INTO ligne_commande (commande_id, produit_id, taille_id, nom_produit, quantite, prix_unitaire, flocage_nom, flocage_numero, prix_flocage) VALUES
 (1, 1, 1, 'Maillot domicile', 2, 100, 'NGOM', 10, 10),
 (1, 1, 1, 'Maillot domicile', 1, 100, NULL, NULL, 0),
 (1, 2, NULL, 'Écharpe OM', 1, 12, NULL, NULL, 0),
 (1, 3, 1, 'Short', 1, 30, NULL, NULL, 0),
 (1, 5, NULL, 'Ancien produit', 1, 9, NULL, NULL, 0),
 (1, 4, NULL, 'Veste', 1, 50, 'OM', 1, 8),
 (2, 2, NULL, 'Écharpe OM', 1, 15, NULL, NULL, 0)");
$query = $pdo->prepare('INSERT INTO utilisateur (id, prenom, nom, email, password_hash, role) VALUES (?, ?, ?, ?, ?, ?)');
$query->execute([1, '', 'Alice', 'alice@example.test', password_hash(getenv('SUI_A_PASSWORD'), PASSWORD_BCRYPT), 'client']);
$query->execute([2, '', 'Bob', 'bob@example.test', password_hash(getenv('SUI_A_PASSWORD'), PASSWORD_BCRYPT), 'client']);
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
  const login = (email, mdp = fixture.password) => request('login', 200, { email, mdp });
  try {
    // Sans session : aucun accès.
    await request('compte/recommander?numero=OM-000001', 401);

    await login('alice@example.test');
    const { lignes } = await request('compte/recommander?numero=OM-000001', 200);
    assert.equal(lignes.length, 6);
    const [maillot, maillot2, echarpe, short, supprime, veste] = lignes;

    // Prix actuels (110 et non 100), taille et flocage d'origine conservés, quantité ramenée au stock (1).
    assert.deepEqual([maillot.statut, maillot.quantite, maillot.prix, maillot.prixFlocage], ['ajustee', 1, 110, 10]);
    assert.deepEqual([maillot.slug, maillot.image, maillot.taille, maillot.flocage], ['maillot', 'maillot.jpg', { id: 1, libelle: 'L', stock: 1 }, { nom: 'NGOM', numero: 10 }]);
    assert.match(maillot.message, /il ne reste que 1 exemplaire/);
    // Stock déjà attribué à la ligne précédente : pas de survente.
    assert.equal(maillot2.statut, 'indisponible');
    // Produit sans taille : repris tel quel, au prix actuel.
    assert.deepEqual([echarpe.statut, echarpe.quantite, echarpe.prix, echarpe.taille, echarpe.flocage, echarpe.message], ['ok', 1, 15, null, null, '']);
    // Épuisé, supprimé, flocage retiré : signalés, sans données de produit.
    assert.equal(short.statut, 'indisponible');
    assert.match(short.message, /épuisé en taille L/);
    assert.equal(supprime.statut, 'indisponible');
    assert.match(supprime.message, /Ancien produit.*n'est plus au catalogue/);
    assert.equal(veste.statut, 'indisponible');
    assert.match(veste.message, /ne se floque plus/);
    assert.ok([maillot2, short, supprime, veste].every((l) => !('slug' in l)));

    // Le stock actuel est relu à chaque appel.
    fixture.query('UPDATE stock SET quantite = 5 WHERE produit_id = 1');
    const apres = (await request('compte/recommander?numero=OM-000001', 200)).lignes;
    assert.deepEqual([apres[0].statut, apres[0].quantite, apres[1].statut, apres[1].quantite], ['ok', 2, 'ok', 1]);

    // Cloisonnement : commande d'un autre client, inconnue ou absente.
    await request('compte/recommander?numero=OM-000002', 404);
    await request('compte/recommander?numero=OM-999999', 404);
    await request('compte/recommander', 404);

    await request('logout', 200, {});
    await login('bob@example.test');
    await request('compte/recommander?numero=OM-000001', 404);
    assert.equal((await request('compte/recommander?numero=OM-000002', 200)).lignes[0].statut, 'ok');

    console.log(`SUI-A : ${checks} contrôles API réussis ; prix et stock actuels, options conservées, produits indisponibles et cloisonnement vérifiés sur SQLite isolée.`);
  } finally { await fixture.stop(); }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await checkApi();
