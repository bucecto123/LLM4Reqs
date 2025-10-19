<?php

namespace App\Utils;

class TextCommons
{
    /**
     * Create a new class instance.
     */
    public function __construct()
    {
        //
    }

    /**
     * Clean and validate UTF-8 content, removing control characters and normalizing whitespace.
     */
    public function cleanUtf8Content(string $content): string
    {
        if ($content === '') {
            return '';
        }

        if (!mb_check_encoding($content, 'UTF-8')) {
            $encoding = mb_detect_encoding($content, ['UTF-8', 'ISO-8859-1', 'Windows-1252', 'ASCII'], true);
            if ($encoding) {
                $content = mb_convert_encoding($content, 'UTF-8', $encoding);
            } else {
                $content = utf8_encode($content);
            }
        }

        // Remove invalid sequences
        $content = mb_convert_encoding($content, 'UTF-8', 'UTF-8');

        // Remove control characters except newlines and tabs
        $content = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/', '', $content) ?? '';

        // Normalize whitespace (preserve newlines)
        $content = preg_replace('/[ \t]+/', ' ', $content) ?? '';
        $content = preg_replace('/\n{3,}/', "\n\n", $content) ?? '';

        return trim($content);
    }
}
