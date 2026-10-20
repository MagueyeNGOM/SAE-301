<?php

declare(strict_types=1);

namespace App\Controller;

use App\Core\Request;
use App\Core\Response;
use App\Model\OrderModel;

/**
 * Gestion des commandes par les administrateurs (PIL-B).
 *
 * L'accès admin est déjà exigé par back/index.php pour tout /api/admin/.
 */
final class AdminOrderController
{
    private const STATUTS = ['en cours', 'disponible', 'retirée', 'annulée'];
    private const SUIVANT = ['en cours' => 'disponible', 'disponible' => 'retirée'];
    private const LOT_MAX = 50;

    public function __construct(private OrderModel $commandes)
    {
    }

    public function index(Request $request): void
    {
        $tri = $request->parametre('tri', 'date');
        $sens = $request->parametre('sens', 'desc');
        $statut = $request->parametre('statut');
        if (!in_array($tri, ['date', 'statut', 'montant'], true) || !in_array($sens, ['asc', 'desc'], true)
            || ($statut !== null && !in_array($statut, self::STATUTS, true))) {
            Response::erreur('Tri ou filtre de commandes invalide.', 422);
        }

        Response::json([
            'commandes' => $this->commandes->liste($tri, $sens === 'asc', $statut),
            'compteurs' => $this->commandes->compteurs(),
        ]);
    }

    public function show(Request $request): void
    {
        $id = filter_var($request->parametre('id'), FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]);
        $commande = $id === false ? null : $this->commandes->detail($id);
        if ($commande === null) {
            Response::erreur('Commande introuvable.', 404);
        }

        Response::json(['commande' => $commande]);
    }

    /**
     * Applique une action à une ou plusieurs commandes :
     * « suivant » (en cours → disponible → retirée) ou « annuler » (confirmation obligatoire).
     * Chaque commande est traitée seule : un refus n'empêche pas les autres.
     */
    public function action(Request $request): void
    {
        $corps = $request->corps();
        $ids = $corps['ids'] ?? null;
        $action = $corps['action'] ?? null;

        if (!is_array($ids) || $ids === [] || count($ids) > self::LOT_MAX || array_filter($ids, static fn ($i) => !is_int($i) || $i < 1) !== []) {
            Response::erreur('Sélectionnez entre 1 et ' . self::LOT_MAX . ' commandes.', 422);
        }
        if (!in_array($action, ['suivant', 'annuler'], true)) {
            Response::erreur('Action sur les commandes invalide.', 422);
        }
        if ($action === 'annuler' && ($corps['confirmed'] ?? null) !== true) {
            Response::erreur('Confirmez l\'annulation des commandes.', 422);
        }

        $adminId = (int) $_SESSION['admin_id'];
        $resultats = [];
        foreach (array_unique($ids) as $id) {
            $commande = $this->commandes->detail($id);
            if ($commande === null) {
                $resultats[] = ['id' => $id, 'numero' => null, 'ok' => false, 'message' => 'Commande introuvable.'];
                continue;
            }

            $ancien = $commande['statut'];
            $nouveau = $action === 'annuler' ? 'annulée' : (self::SUIVANT[$ancien] ?? null);
            if ($nouveau === null || ($action === 'annuler' && in_array($ancien, ['retirée', 'annulée'], true))) {
                $message = $action === 'annuler'
                    ? 'Une commande ' . $ancien . ' ne peut plus être annulée.'
                    : 'Une commande ' . $ancien . ' n\'a pas de statut suivant.';
                $resultats[] = ['id' => $id, 'numero' => $commande['numero'], 'ok' => false, 'message' => $message];
                continue;
            }

            $ok = $this->commandes->changerStatut($id, $ancien, $nouveau, $adminId);
            $resultats[] = [
                'id' => $id, 'numero' => $commande['numero'], 'ok' => $ok,
                'message' => $ok ? 'Commande ' . $nouveau . '.' : 'Le statut a changé entre-temps. Actualisez la liste.',
            ];
        }

        Response::json(['resultats' => $resultats]);
    }
}
