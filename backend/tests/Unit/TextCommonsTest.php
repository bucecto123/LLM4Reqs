<?php

namespace Tests\Unit;

use PHPUnit\Framework\TestCase;
use App\Utils\TextCommons;

class TextCommonsTest extends TestCase
{
    private TextCommons $textCommons;

    protected function setUp(): void
    {
        parent::setUp();
        $this->textCommons = new TextCommons();
    }

    public function test_clean_utf8_content_returns_empty_string_for_empty_input()
    {
        $this->assertEquals('', $this->textCommons->cleanUtf8Content(''));
    }

    public function test_clean_utf8_content_removes_control_characters()
    {
        // Includes some control characters like null byte and bell
        $input = "Hello\x00 World\x07!";
        $expected = "Hello World!";
        
        $this->assertEquals($expected, $this->textCommons->cleanUtf8Content($input));
    }

    public function test_clean_utf8_content_normalizes_whitespace()
    {
        // Multiple spaces and tabs
        $input = "This   is \t a   test.";
        $expected = "This is a test.";
        
        $this->assertEquals($expected, $this->textCommons->cleanUtf8Content($input));
    }

    public function test_clean_utf8_content_preserves_allowed_newlines()
    {
        $input = "Line 1\nLine 2";
        $expected = "Line 1\nLine 2";
        
        $this->assertEquals($expected, $this->textCommons->cleanUtf8Content($input));
    }

    public function test_clean_utf8_content_limits_excessive_newlines()
    {
        // 4 newlines should become 2 newlines
        $input = "Paragraph 1\n\n\n\nParagraph 2";
        $expected = "Paragraph 1\n\nParagraph 2";
        
        $this->assertEquals($expected, $this->textCommons->cleanUtf8Content($input));
    }
}
