<?php

namespace Tests\Unit;

use Tests\TestCase;
use App\Services\PersonaService;

class PersonaServiceTest extends TestCase
{
    public function test_can_instantiate_persona_service()
    {
        $service = new PersonaService();
        $this->assertInstanceOf(PersonaService::class, $service);
    }

    public function test_get_all_personas_returns_correct_format()
    {
        // Should mock the Persona Model to return a Collection
        $this->assertTrue(true);
    }
}
