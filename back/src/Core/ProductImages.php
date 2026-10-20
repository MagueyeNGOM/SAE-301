<?php

declare(strict_types=1);

namespace App\Core;

use InvalidArgumentException;
use RuntimeException;

final class ProductImages
{
    public function __construct(private string $directory)
    {
    }

    public function prepare(mixed $images, array $allowed): array
    {
        if (!is_array($images) || !array_is_list($images) || count($images) < 1 || count($images) > 8) {
            throw new InvalidArgumentException('Choisissez de 1 à 8 images.');
        }
        $prepared = [];
        $total = 0;
        foreach ($images as $image) {
            if (!is_array($image)) throw new InvalidArgumentException('Image invalide.');
            if (isset($image['file']) && count($image) === 1 && is_string($image['file']) && in_array($image['file'], $allowed, true)) {
                $prepared[] = ['file' => $image['file']];
                continue;
            }
            if (count($image) !== 1 || !is_string($image['data'] ?? null) || strlen($image['data']) > 2796204) {
                throw new InvalidArgumentException('Image invalide : 2 Mo maximum par fichier.');
            }
            $binary = base64_decode($image['data'], true);
            if ($binary === false || strlen($binary) > 2097152) throw new InvalidArgumentException('Image invalide : 2 Mo maximum par fichier.');
            $total += strlen($binary);
            if ($total > 4194304) throw new InvalidArgumentException('Les nouvelles images ne doivent pas dépasser 4 Mo au total.');
            $info = @getimagesizefromstring($binary);
            if (!$info || !in_array($info[2], [IMAGETYPE_JPEG, IMAGETYPE_PNG, IMAGETYPE_WEBP], true)
                || $info[0] > 6000 || $info[1] > 6000 || $info[0] * $info[1] > 12000000) {
                throw new InvalidArgumentException('Utilisez une image JPEG, PNG ou WebP de 6 000 pixels et 12 millions de pixels maximum.');
            }
            if (!function_exists('imagecreatefromstring')) throw new RuntimeException('Le téléversement nécessite l’extension PHP GD sur le serveur.');
            $prepared[] = ['binary' => $binary, 'width' => $info[0], 'height' => $info[1]];
        }
        return $prepared;
    }

    public function store(array $images, array &$created): array
    {
        $files = [];
        foreach ($images as $image) {
            if (isset($image['file'])) {
                $files[] = $image['file'];
                continue;
            }
            if (!is_dir($this->directory) && !@mkdir($this->directory, 0755, true) && !is_dir($this->directory)) {
                throw new RuntimeException('Le dossier des images n’est pas accessible en écriture.');
            }
            $source = @imagecreatefromstring($image['binary']);
            if (!$source) throw new InvalidArgumentException('Le fichier image est endommagé.');
            $scale = min(1, 1600 / max($image['width'], $image['height']));
            $width = max(1, (int) round($image['width'] * $scale));
            $height = max(1, (int) round($image['height'] * $scale));
            $target = imagecreatetruecolor($width, $height);
            try {
                imagefill($target, 0, 0, imagecolorallocate($target, 255, 255, 255));
                imagecopyresampled($target, $source, 0, 0, 0, 0, $width, $height, $image['width'], $image['height']);
                // Le réencodage enlève les métadonnées et tout contenu joint au fichier reçu.
                $file = 'om-' . bin2hex(random_bytes(16)) . '.jpg';
                $created[] = $file;
                if (!imagejpeg($target, $this->directory . '/' . $file, 85)) throw new RuntimeException('Impossible d’enregistrer l’image.');
                $files[] = $file;
            } finally {
                imagedestroy($source);
                imagedestroy($target);
            }
        }
        if (count(array_unique($files)) !== count($files)) throw new InvalidArgumentException('Une image ne peut apparaître qu’une fois dans la galerie.');
        return $files;
    }

    public function discard(array $files): void
    {
        foreach ($files as $file) {
            if (preg_match('/^om-[a-f0-9]{32}\.jpg$/D', $file)) @unlink($this->directory . '/' . $file);
        }
    }
}
