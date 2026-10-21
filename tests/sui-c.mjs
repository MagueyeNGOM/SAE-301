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
  const temporary = await mkdtemp(path.join(tmpdir(), 'om-sui-c-'));
  const password = randomBytes(18).toString('hex');
  const php = process.env.PHP_BIN || 'php';
  const env = { ...process.env, SUI_C_DB: path.join(temporary, 'test.sqlite'), SUI_C_PASSWORD: password };
  let server;
  const stop = async () => {
    if (server && server.exitCode === null) {
      const exited = new Promise((resolve) => server.once('exit', resolve));
      server.kill();
      await exited;
    }
    const relative = path.relative(tmpdir(), temporary);
    assert.ok(relative.startsWith('om-sui-c-') && !relative.includes(path.sep));
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
$pdo = new PDO('sqlite:' . getenv('SUI_C_DB'), null, null, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC]);
(new ReflectionProperty(App\\Core\\Database::class, 'pdo'))->setValue(null, $pdo);
`);
    // Seules les tables utiles à l'historique : comptes, commandes, lignes et tailles.
    // 15 commandes pour Alice (OM-000001 à OM-000015), dont une vieille de 60 jours ; 1 pour Bob.
    await writeFile(path.join(temporary, 'setup.php'), `<?php
require __DIR__ . '/bootstrap.php';
$pdo->exec("CREATE TABLE utilisateur (id INTEGER PRIMARY KEY, prenom TEXT, nom TEXT, email TEXT UNIQUE, telephone TEXT, password_hash TEXT, role TEXT, date_creation TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE taille (id INTEGER PRIMARY KEY, libelle TEXT);
CREATE TABLE commande (id INTEGER PRIMARY KEY AUTOINCREMENT, numero TEXT UNIQUE NOT NULL, utilisateur_id INTEGER NOT NULL, statut TEXT NOT NULL DEFAULT 'en cours', total NUMERIC NOT NULL, date_commande TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, date_retrait TEXT);
CREATE TABLE ligne_commande (id INTEGER PRIMARY KEY AUTOINCREMENT, commande_id INTEGER NOT NULL, produit_id INTEGER, taille_id INTEGER, nom_produit TEXT, quantite INTEGER, prix_unitaire NUMERIC, flocage_nom TEXT, flocage_numero INTEGER, prix_flocage NUMERIC NOT NULL DEFAULT 0);
INSERT INTO taille (id, libelle) VALUES (1, 'L');");
$statuts = ['retirée', 'disponible', 'en cours', 'annulée'];
$ajout = $pdo->prepare('INSERT INTO commande (numero, utilisateur_id, statut, total, date_commande) VALUES (?, ?, ?, ?, ?)');
for ($i = 1; $i <= 15; $i++) {
    $jours = $i === 1 ? 60 : 16 - $i;
    $ajout->execute([sprintf('OM-%06d', $i), 1, $statuts[$i % 4], $i * 10, date('Y-m-d H:i:s', time() - $jours * 86400)]);
}
$ajout->execute(['OM-000016', 2, 'en cours', 99, date('Y-m-d H:i:s')]);
$pdo->exec("INSERT INTO ligne_commande (commande_id, produit_id, taille_id, nom_produit, quantite, prix_unitaire, flocage_nom, flocage_numero, prix_flocage) VALUES
 (2, 1, 1, 'Maillot domicile', 2, 100, 'NGOM', 10, 10),
 (2, 2, NULL, 'Écharpe OM', 1, 15, NULL, NULL, 0)");
$query = $pdo->prepare('INSERT INTO utilisateur (id, prenom, nom, email, password_hash, role) VALUES (?, ?, ?, ?, ?, ?)');
$query->execute([1, '', 'Alice', 'alice@example.test', password_hash(getenv('SUI_C_PASSWORD'), PASSWORD_BCRYPT), 'client']);
$query->execute([2, '', 'Bob', 'bob@example.test', password_hash(getenv('SUI_C_PASSWORD'), PASSWORD_BCRYPT), 'client']);
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
    await request('compte/commandes', 401);
    await request('compte/commande?numero=OM-000002', 401);

    await login('alice@example.test');
    const numeros = (page) => page.commandes.map((c) => c.numero);

    // Liste : 15 commandes, 6 par page, de la plus récente à la plus ancienne.
    const p1 = await request('compte/commandes', 200);
    assert.deepEqual([p1.page, p1.pages, p1.commandes.length], [1, 3, 6]);
    assert.deepEqual(numeros(p1), ['OM-000015', 'OM-000014', 'OM-000013', 'OM-000012', 'OM-000011', 'OM-000010']);
    assert.ok(p1.commandes.every((c) => c.statut && c.total !== undefined && c.date_commande));
    const p3 = await request('compte/commandes?page=3', 200);
    assert.deepEqual(numeros(p3), ['OM-000003', 'OM-000002', 'OM-000001']);
    assert.equal((await request('compte/commandes?page=-4', 200)).page, 1);
    assert.ok(!numeros(p1).concat(numeros(p3)).includes('OM-000016'), 'Les commandes des autres clients restent invisibles');

    // Filtres : statut, période, et les deux ensemble.
    const annulees = await request('compte/commandes?statut=' + encodeURIComponent('annulée'), 200);
    assert.ok(annulees.commandes.length > 0 && annulees.commandes.every((c) => c.statut === 'annulée'));
    const recentes = await request('compte/commandes?periode=30&page=3', 200);
    assert.ok(!numeros(recentes).includes('OM-000001'), 'Une commande de 60 jours sort du filtre « 30 derniers jours »');
    assert.equal((await request('compte/commandes?periode=30', 200)).pages, 3);
    const les2 = await request('compte/commandes?periode=30&statut=retir%C3%A9e', 200);
    assert.ok(les2.commandes.every((c) => c.statut === 'retirée'));
    assert.equal((await request('compte/commandes?statut=nimporte', 422)).erreur, 'Statut inconnu.');
    await request('compte/commandes?periode=1', 422);
    assert.deepEqual((await request('compte/commandes?statut=' + encodeURIComponent('retirée') + '&page=99', 200)).commandes, []);

    // Statut changé par l'admin : la liste le reflète aussitôt.
    fixture.query("UPDATE commande SET statut = 'disponible' WHERE numero = 'OM-000015'");
    assert.equal((await request('compte/commandes', 200)).commandes[0].statut, 'disponible');

    // Détail : produits, taille, flocage et prix enregistrés.
    const detail = await request('compte/commande?numero=OM-000002', 200);
    assert.deepEqual([detail.numero, detail.total, detail.lignes.length], ['OM-000002', 20, 2]);
    assert.deepEqual(detail.lignes[0], { nom: 'Maillot domicile', taille: 'L', quantite: 2, prix: 100, flocage: { nom: 'NGOM', numero: 10, prix: 10 } });
    assert.deepEqual([detail.lignes[1].taille, detail.lignes[1].flocage], [null, null]);
    assert.equal('client' in detail, false, 'Aucune donnée personnelle dans le détail');

    // Cloisonnement : la commande d'un autre client ou inconnue est introuvable.
    await request('compte/commande?numero=OM-000016', 404);
    await request('compte/commande?numero=OM-999999', 404);
    await request('compte/commande', 404);

    await request('logout', 200, {});
    await login('bob@example.test');
    assert.deepEqual(numeros(await request('compte/commandes', 200)), ['OM-000016']);
    await request('compte/commande?numero=OM-000002', 404);

    console.log(`SUI-C : ${checks} contrôles API réussis ; accès, tri, filtres, pagination, détail et cloisonnement vérifiés sur SQLite isolée.`);
  } finally { await fixture.stop(); }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await checkApi();
