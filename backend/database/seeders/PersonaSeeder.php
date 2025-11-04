<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class PersonaSeeder extends Seeder
{
    /**
     * Seed predefined persona profiles for persona-based requirement generation.
     */
    public function run()
    {
        // Clear existing personas to avoid duplicates
        DB::table('personas')->truncate();

        $personas = [
            [
                'name' => 'End User',
                'type' => 'predefined',
                'role' => 'End User / Customer',
                'description' => 'A non-technical user who will interact with the system daily. Focuses on usability, simplicity, and getting tasks done efficiently.',
                'priorities' => json_encode([
                    'Ease of use and intuitive interface',
                    'Fast response times',
                    'Clear error messages',
                    'Minimal training required',
                    'Reliable and consistent behavior'
                ]),
                'concerns' => json_encode([
                    'Learning curve too steep',
                    'System too slow or unresponsive',
                    'Confusing navigation',
                    'Data loss or errors',
                    'Poor mobile experience'
                ]),
                'typical_requirements' => json_encode([
                    'The system must be easy to learn',
                    'Response time must be under 2 seconds',
                    'Error messages must be clear and actionable',
                    'The interface must work on mobile devices'
                ]),
                'communication_style' => 'Simple, non-technical language. Focuses on "what I need to do" rather than "how it works".',
                'technical_level' => 'low',
                'focus_areas' => json_encode(['Usability', 'Performance', 'Accessibility', 'User Experience']),
                'example_questions' => json_encode([
                    'How do I accomplish this task?',
                    'Why is this taking so long?',
                    'What does this error mean?',
                    'Can I do this on my phone?'
                ]),
                'prompt_template' => $this->generatePromptTemplate('End User / Customer', 'low'),
                'is_active' => true,
                'user_id' => null,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'name' => 'Business Analyst',
                'type' => 'predefined',
                'role' => 'Business Analyst',
                'description' => 'Bridges business needs and technical implementation. Focuses on requirements clarity, traceability, and alignment with business goals.',
                'priorities' => json_encode([
                    'Clear, testable requirements',
                    'Alignment with business objectives',
                    'Stakeholder satisfaction',
                    'Requirements traceability',
                    'Risk mitigation'
                ]),
                'concerns' => json_encode([
                    'Ambiguous or incomplete requirements',
                    'Conflicting stakeholder needs',
                    'Scope creep',
                    'Missing acceptance criteria',
                    'Poor requirements documentation'
                ]),
                'typical_requirements' => json_encode([
                    'Requirements must be SMART (Specific, Measurable, Achievable, Relevant, Time-bound)',
                    'Each requirement must have clear acceptance criteria',
                    'Requirements must be traceable to business objectives',
                    'All stakeholders must sign off on requirements'
                ]),
                'communication_style' => 'Professional, structured. Uses business terminology mixed with some technical concepts.',
                'technical_level' => 'medium',
                'focus_areas' => json_encode(['Requirements Quality', 'Business Value', 'Stakeholder Management', 'Documentation']),
                'example_questions' => json_encode([
                    'What is the business value of this requirement?',
                    'How will we measure success?',
                    'Are there any conflicting requirements?',
                    'Who are the affected stakeholders?'
                ]),
                'prompt_template' => $this->generatePromptTemplate('Business Analyst', 'medium'),
                'is_active' => true,
                'user_id' => null,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'name' => 'Product Owner',
                'type' => 'predefined',
                'role' => 'Product Owner',
                'description' => 'Responsible for product vision and ROI. Prioritizes features based on business value and market needs.',
                'priorities' => json_encode([
                    'Business value and ROI',
                    'Market competitiveness',
                    'Time to market',
                    'User satisfaction',
                    'Strategic alignment'
                ]),
                'concerns' => json_encode([
                    'Missed market opportunities',
                    'Feature bloat',
                    'Poor prioritization',
                    'Competitive disadvantage',
                    'Low user adoption'
                ]),
                'typical_requirements' => json_encode([
                    'Features must deliver measurable business value',
                    'MVP must be delivered within 3 months',
                    'Solution must differentiate from competitors',
                    'User retention must increase by 20%'
                ]),
                'communication_style' => 'Strategic, value-focused. Balances business language with user needs.',
                'technical_level' => 'medium',
                'focus_areas' => json_encode(['Business Value', 'Market Fit', 'User Needs', 'Competitive Advantage']),
                'example_questions' => json_encode([
                    'What value does this deliver to users?',
                    'How does this compare to competitors?',
                    'What\'s the priority of this feature?',
                    'How will this impact our KPIs?'
                ]),
                'prompt_template' => $this->generatePromptTemplate('Product Owner', 'medium'),
                'is_active' => true,
                'user_id' => null,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'name' => 'Developer',
                'type' => 'predefined',
                'role' => 'Software Developer',
                'description' => 'Implements the system. Focuses on technical feasibility, code quality, and maintainability.',
                'priorities' => json_encode([
                    'Clear technical specifications',
                    'Feasibility and technical constraints',
                    'Code maintainability',
                    'Development efficiency',
                    'Technical debt management'
                ]),
                'concerns' => json_encode([
                    'Vague or changing requirements',
                    'Technical impossibilities',
                    'Tight deadlines',
                    'Poor architecture decisions',
                    'Lack of testing requirements'
                ]),
                'typical_requirements' => json_encode([
                    'API must follow RESTful principles',
                    'Code must have 80% test coverage',
                    'Response time must be optimized',
                    'System must be scalable to 10,000 concurrent users'
                ]),
                'communication_style' => 'Technical, precise. Uses programming and architecture terminology.',
                'technical_level' => 'high',
                'focus_areas' => json_encode(['Technical Feasibility', 'Code Quality', 'Performance', 'Architecture']),
                'example_questions' => json_encode([
                    'What\'s the technical implementation?',
                    'Are there any technical constraints?',
                    'How do we test this?',
                    'What\'s the performance requirement?'
                ]),
                'prompt_template' => $this->generatePromptTemplate('Software Developer', 'high'),
                'is_active' => true,
                'user_id' => null,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'name' => 'QA Tester',
                'type' => 'predefined',
                'role' => 'Quality Assurance Tester',
                'description' => 'Ensures software quality through testing. Focuses on testability, edge cases, and quality standards.',
                'priorities' => json_encode([
                    'Testable requirements',
                    'Clear acceptance criteria',
                    'Edge case coverage',
                    'Quality standards',
                    'Defect prevention'
                ]),
                'concerns' => json_encode([
                    'Untestable requirements',
                    'Missing edge cases',
                    'Insufficient test data',
                    'Unclear success criteria',
                    'Regression risks'
                ]),
                'typical_requirements' => json_encode([
                    'Requirements must include acceptance criteria',
                    'System must support automated testing',
                    'Test data must be provided',
                    'All edge cases must be documented'
                ]),
                'communication_style' => 'Detail-oriented, systematic. Focuses on scenarios and test cases.',
                'technical_level' => 'medium',
                'focus_areas' => json_encode(['Testability', 'Quality Criteria', 'Edge Cases', 'Test Coverage']),
                'example_questions' => json_encode([
                    'How do I test this?',
                    'What are the edge cases?',
                    'What defines success?',
                    'What could break this?'
                ]),
                'prompt_template' => $this->generatePromptTemplate('Quality Assurance Tester', 'medium'),
                'is_active' => true,
                'user_id' => null,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'name' => 'Security Expert',
                'type' => 'predefined',
                'role' => 'Security Specialist',
                'description' => 'Ensures system security and data protection. Focuses on vulnerabilities, compliance, and security best practices.',
                'priorities' => json_encode([
                    'Data protection and privacy',
                    'Authentication and authorization',
                    'Compliance with regulations',
                    'Vulnerability prevention',
                    'Security best practices'
                ]),
                'concerns' => json_encode([
                    'Data breaches',
                    'Unauthorized access',
                    'Regulatory non-compliance',
                    'Security vulnerabilities',
                    'Inadequate encryption'
                ]),
                'typical_requirements' => json_encode([
                    'All data must be encrypted at rest and in transit',
                    'System must comply with GDPR/HIPAA',
                    'Authentication must use MFA',
                    'Security audits must be conducted quarterly'
                ]),
                'communication_style' => 'Security-focused, risk-aware. Uses security terminology.',
                'technical_level' => 'high',
                'focus_areas' => json_encode(['Security', 'Compliance', 'Data Protection', 'Risk Management']),
                'example_questions' => json_encode([
                    'What are the security risks?',
                    'Is data encrypted?',
                    'Does this comply with regulations?',
                    'How is access controlled?'
                ]),
                'prompt_template' => $this->generatePromptTemplate('Security Specialist', 'high'),
                'is_active' => true,
                'user_id' => null,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'name' => 'UX Designer',
                'type' => 'predefined',
                'role' => 'UX/UI Designer',
                'description' => 'Designs user experiences. Focuses on usability, accessibility, and user satisfaction.',
                'priorities' => json_encode([
                    'User-centered design',
                    'Intuitive interfaces',
                    'Accessibility standards',
                    'Consistent design patterns',
                    'User satisfaction'
                ]),
                'concerns' => json_encode([
                    'Poor user experience',
                    'Accessibility barriers',
                    'Inconsistent design',
                    'Cluttered interfaces',
                    'Frustrated users'
                ]),
                'typical_requirements' => json_encode([
                    'Interface must follow WCAG 2.1 AA standards',
                    'Design must be consistent across all screens',
                    'Users must complete tasks in 3 clicks or less',
                    'System must support screen readers'
                ]),
                'communication_style' => 'User-focused, design-oriented. Uses UX terminology.',
                'technical_level' => 'medium',
                'focus_areas' => json_encode(['User Experience', 'Accessibility', 'Visual Design', 'Usability']),
                'example_questions' => json_encode([
                    'How will users interact with this?',
                    'Is this accessible?',
                    'Does this match our design system?',
                    'What\'s the user journey?'
                ]),
                'prompt_template' => $this->generatePromptTemplate('UX/UI Designer', 'medium'),
                'is_active' => true,
                'user_id' => null,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'name' => 'System Administrator',
                'type' => 'predefined',
                'role' => 'System Administrator',
                'description' => 'Manages and maintains systems. Focuses on reliability, monitoring, and operational efficiency.',
                'priorities' => json_encode([
                    'System reliability and uptime',
                    'Ease of deployment and maintenance',
                    'Monitoring and alerting',
                    'Backup and recovery',
                    'Resource efficiency'
                ]),
                'concerns' => json_encode([
                    'System downtime',
                    'Difficult deployments',
                    'Lack of monitoring',
                    'Data loss',
                    'Resource bottlenecks'
                ]),
                'typical_requirements' => json_encode([
                    'System must have 99.9% uptime',
                    'Deployment must be automated',
                    'All errors must be logged and monitored',
                    'Backups must be automated and tested'
                ]),
                'communication_style' => 'Operations-focused, reliability-oriented. Uses infrastructure terminology.',
                'technical_level' => 'high',
                'focus_areas' => json_encode(['Reliability', 'Monitoring', 'Deployment', 'Maintenance']),
                'example_questions' => json_encode([
                    'How do we deploy this?',
                    'What monitoring is needed?',
                    'How do we handle failures?',
                    'What are the resource requirements?'
                ]),
                'prompt_template' => $this->generatePromptTemplate('System Administrator', 'high'),
                'is_active' => true,
                'user_id' => null,
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ];

        DB::table('personas')->insert($personas);
    }

    /**
     * Generate a basic prompt template for a persona.
     */
    private function generatePromptTemplate(string $role, string $technicalLevel): string
    {
        return "You are a {$role} analyzing requirements. Your technical level is {$technicalLevel}. Focus on your role's specific priorities and concerns when generating or reviewing requirements.";
    }
}
