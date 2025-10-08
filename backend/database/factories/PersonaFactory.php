<?php

namespace Database\Factories;

use App\Models\Persona;
use Illuminate\Database\Eloquent\Factories\Factory;

class PersonaFactory extends Factory
{
    protected $model = Persona::class;

    public function definition()
    {
        return [
            'name' => $this->faker->jobTitle(),
            'role' => $this->faker->word(),
            'description' => $this->faker->sentence(),
            'prompt_template' => 'Please act as ' . $this->faker->jobTitle(),
            'is_default' => false,
            'focus_areas' => json_encode([$this->faker->word(), $this->faker->word()]),
        ];
    }
}
