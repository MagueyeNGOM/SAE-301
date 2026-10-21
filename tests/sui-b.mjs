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
  const temporary = await mkdtemp(path.join(tmpdir(), 'om-sui-b-'));
  const password = randomBytes(18).toString('hex');
  const php = process.env.PHP_BIN || 'php';
  const env = { ...process.env, SUI_B_DB: path.join(temporary, 'test.sqlite'), SUI_B_PASSWORD: password };
  let server;
  const stop = async () => {
    if (server && server.exitCode === null) {
      const exited = new Promise((resolve) => server.once('exit', resolve));
      server.kill();
      await exited;
    }
    const relative = path.relative(tmpdir(), temporary);
    assert.ok(relative.startsWith('om-sui-b-') && !relative.includes(path.sep));
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
$pdo = new PDO('sqlite:' . getenv('SUI_B_DB'), null, null, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC]);
(new ReflectionProperty(App\\Core\\Database::class, 'pdo'))->setValue(null, $pdo);
`);
    // Seules les tables utiles à l'espace personnel : comptes et commandes.
    await writeFile(path.join(temporary, 'setup.php'), `<?php
require __DIR__ . '/bootstrap.php';
$pdo->exec("CREATE TABLE utilisateur (id INTEGER PRIMARY KEY, prenom TEXT, nom TEXT, email TEXT UNIQUE, telephone TEXT, password_hash TEXT, role TEXT, date_creation TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE commande (id INTEGER PRIMARY KEY AUTOINCREMENT, numero TEXT UNIQUE NOT NULL, utilisateur_id INTEGER NOT NULL, statut TEXT NOT NULL DEFAULT 'en cours', total NUMERIC NOT NULL, date_commande TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, date_retrait TEXT);
INSERT INTO commande (numero, utilisateur_id, statut, total, date_commande) VALUES
 ('OM-000001', 1, 'retirée', 10, '2026-10-01 10:00:00'),
 ('OM-000002', 1, 'disponible', 20, '2026-10-02 10:00:00'),
 ('OM-000003', 1, 'en cours', 30, '2026-10-03 10:00:00'),
 ('OM-000004', 1, 'annulée', 40, '2026-10-04 10:00:00'),
 ('OM-000005', 2, 'en cours', 50, '2026-10-05 10:00:00');");
$query = $pdo->prepare('INSERT INTO utilisateur (id, prenom, nom, email, password_hash, role) VALUES (?, ?, ?, ?, ?, ?)');
$query->execute([1, '', 'Alice', 'alice@example.test', password_hash(getenv('SUI_B_PASSWORD'), PASSWORD_BCRYPT), 'client']);
$query->execute([2, '', 'Bob', 'bob@example.test', password_hash(getenv('SUI_B_PASSWORD'), PASSWORD_BCRYPT), 'client']);
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
    // Sans session : aucun accès, ni en lecture ni en écriture.
    await request('compte', 401);
    await request('compte/profil', 401, { nom: 'X', email: 'x@example.test' });

    // Aperçu : profil et commandes récentes du client connecté, les plus récentes d'abord.
    await login('alice@example.test');
    const compte = await request('compte', 200);
    assert.deepEqual([compte.nom, compte.email], ['Alice', 'alice@example.test']);
    assert.deepEqual(compte.commandes.map((c) => c.numero), ['OM-000004', 'OM-000003', 'OM-000002']);
    assert.ok(!compte.commandes.some((c) => c.numero === 'OM-000005'), 'Les commandes des autres clients restent invisibles');
    assert.equal('password_hash' in compte, false);

    // Profil : validation et unicité de l'email.
    await request('compte/profil', 422, { nom: '', email: 'alice@example.test' });
    await request('compte/profil', 422, { nom: 'Alice', email: 'pas-un-email' });
    await request('compte/profil', 409, { nom: 'Alice', email: 'bob@example.test' });
    const modifie = await request('compte/profil', 200, { nom: 'Alice Martin', email: 'Alice.Martin@example.test' });
    assert.deepEqual([modifie.nom, modifie.email, modifie.mdpModifie], ['Alice Martin', 'alice.martin@example.test', false]);
    assert.deepEqual(fixture.query('SELECT nom, email FROM utilisateur WHERE id = 1')[0], { nom: 'Alice Martin', email: 'alice.martin@example.test' });
    assert.equal((await request('me', 200)).nom, 'Alice Martin');
    // Garder son propre email n'est pas un doublon.
    await request('compte/profil', 200, { nom: 'Alice Martin', email: 'alice.martin@example.test' });

    // Mot de passe : l'actuel est exigé, rien n'est modifié en cas de refus.
    const avant = fixture.query('SELECT password_hash FROM utilisateur WHERE id = 1')[0].password_hash;
    await request('compte/profil', 403, { nom: 'Pirate', email: 'alice.martin@example.test', nouveau: 'nouveau-mdp-1' });
    await request('compte/profil', 403, { nom: 'Pirate', email: 'alice.martin@example.test', actuel: 'faux', nouveau: 'nouveau-mdp-1' });
    await request('compte/profil', 422, { nom: 'Alice Martin', email: 'alice.martin@example.test', actuel: fixture.password, nouveau: 'court' });
    await request('compte/profil', 422, { nom: 'Alice Martin', email: 'alice.martin@example.test', actuel: fixture.password, nouveau: 'x'.repeat(73) });
    const intact = fixture.query('SELECT nom, password_hash FROM utilisateur WHERE id = 1')[0];
    assert.deepEqual([intact.nom, intact.password_hash], ['Alice Martin', avant], 'Un refus ne modifie rien');

    const ancienneSession = jar.get('PHPSESSID');
    const change = await request('compte/profil', 200, { nom: 'Alice Martin', email: 'alice.martin@example.test', actuel: fixture.password, nouveau: 'nouveau-mdp-1' });
    assert.equal(change.mdpModifie, true);
    assert.notEqual(jar.get('PHPSESSID'), ancienneSession, 'La session est régénérée');
    assert.equal((await request('me', 200)).connecte, true, 'La connexion en cours est conservée');
    const apres = fixture.query('SELECT password_hash FROM utilisateur WHERE id = 1')[0].password_hash;
    assert.ok(apres.startsWith('$2y$') && apres !== avant, 'Mot de passe haché en bcrypt, jamais en clair');

    // Après déconnexion : l'ancien mot de passe ne marche plus, le nouveau oui.
    await request('logout', 200, {});
    await request('compte', 401);
    await request('login', 401, { email: 'alice.martin@example.test', mdp: fixture.password });
    await request('login', 200, { email: 'alice.martin@example.test', mdp: 'nouveau-mdp-1' });

    // Chaque client ne voit et ne modifie que son propre compte.
    await request('logout', 200, {});
    await login('bob@example.test');
    const bob = await request('compte', 200);
    assert.deepEqual([bob.nom, bob.commandes.map((c) => c.numero)], ['Bob', ['OM-000005']]);
    // L'identité vient de la session : un identifiant glissé dans le corps est ignoré.
    await request('compte/profil', 200, { id: 1, nom: 'Bob Dupont', email: 'bob@example.test' });
    assert.equal(fixture.query('SELECT nom FROM utilisateur WHERE id = 1')[0].nom, 'Alice Martin');
    assert.equal(fixture.query('SELECT nom FROM utilisateur WHERE id = 2')[0].nom, 'Bob Dupont');

    console.log(`SUI-B : ${checks} contrôles API réussis ; accès, profil, mot de passe, session et cloisonnement vérifiés sur SQLite isolée.`);
  } finally { await fixture.stop(); }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await checkApi();
