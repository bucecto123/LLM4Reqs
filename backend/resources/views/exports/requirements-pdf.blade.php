<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{ $project->name }} - Requirements Export</title>
    <style>
        body {
            font-family: 'Arial', sans-serif;
            line-height: 1.6;
            color: #333;
            margin: 0;
            padding: 20px;
        }
        
        h1 {
            color: #2E5C8A;
            font-size: 28px;
            margin-bottom: 10px;
            border-bottom: 3px solid #2E5C8A;
            padding-bottom: 10px;
        }
        
        h2 {
            color: #2E5C8A;
            font-size: 22px;
            margin-top: 30px;
            margin-bottom: 15px;
            border-bottom: 2px solid #E0E0E0;
            padding-bottom: 5px;
        }
        
        h3 {
            color: #333;
            font-size: 18px;
            margin-top: 25px;
            margin-bottom: 10px;
        }
        
        h4 {
            color: #555;
            font-size: 16px;
            margin-top: 20px;
            margin-bottom: 8px;
        }
        
        .header-info {
            color: #666;
            font-size: 12px;
            margin-bottom: 20px;
            text-align: center;
        }
        
        .stats-table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
            font-size: 14px;
        }
        
        .stats-table th {
            background-color: #F5F5F5;
            color: #333;
            font-weight: bold;
            padding: 12px;
            text-align: left;
            border: 1px solid #DDD;
        }
        
        .stats-table td {
            padding: 10px 12px;
            border: 1px solid #DDD;
        }
        
        .stats-table tr:nth-child(even) {
            background-color: #F9F9F9;
        }
        
        .requirement-item {
            margin: 15px 0;
            padding: 15px;
            background-color: #F8F9FA;
            border-left: 4px solid #2E5C8A;
            border-radius: 4px;
        }
        
        .requirement-title {
            font-weight: bold;
            font-size: 16px;
            color: #2E5C8A;
            margin-bottom: 8px;
        }
        
        .requirement-text {
            margin: 10px 0;
            line-height: 1.5;
        }
        
        .requirement-meta {
            font-size: 11px;
            color: #666;
            margin-top: 10px;
            padding-top: 8px;
            border-top: 1px solid #E0E0E0;
        }
        
        .conflict-item {
            margin: 15px 0;
            padding: 15px;
            background-color: #FFF5F5;
            border-left: 4px solid #DC3545;
            border-radius: 4px;
        }
        
        .conflict-title {
            font-weight: bold;
            font-size: 16px;
            color: #DC3545;
            margin-bottom: 8px;
        }
        
        .conflict-requirements {
            margin: 10px 0;
            padding: 10px;
            background-color: #FFF;
            border: 1px solid #E0E0E0;
            border-radius: 4px;
        }
        
        .conflict-req {
            margin: 8px 0;
            padding: 8px;
            background-color: #F8F9FA;
            border-radius: 3px;
        }
        
        .conflict-req-title {
            font-weight: bold;
            color: #333;
        }
        
        .conflict-meta {
            font-size: 11px;
            color: #666;
            margin-top: 10px;
            padding-top: 8px;
            border-top: 1px solid #E0E0E0;
        }
        
        .badge {
            display: inline-block;
            padding: 3px 8px;
            border-radius: 12px;
            font-size: 11px;
            font-weight: bold;
            text-transform: uppercase;
        }
        
        .badge-functional {
            background-color: #E3F2FD;
            color: #1565C0;
        }
        
        .badge-non-functional {
            background-color: #F3E5F5;
            color: #7B1FA2;
        }
        
        .badge-constraint {
            background-color: #FFF3E0;
            color: #EF6C00;
        }
        
        .badge-high {
            background-color: #FFEBEE;
            color: #D32F2F;
        }
        
        .badge-medium {
            background-color: #FFF8E1;
            color: #F57C00;
        }
        
        .badge-low {
            background-color: #E8F5E8;
            color: #388E3C;
        }
        
        .page-break {
            page-break-before: always;
        }
        
        .summary-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin: 20px 0;
        }
        
        .summary-card {
            padding: 15px;
            background-color: #F8F9FA;
            border-radius: 8px;
            border: 1px solid #E0E0E0;
        }
        
        .summary-card h4 {
            margin: 0 0 10px 0;
            color: #2E5C8A;
        }
        
        .toc {
            margin: 20px 0;
            padding: 15px;
            background-color: #F8F9FA;
            border-radius: 8px;
        }
        
        .toc h3 {
            margin: 0 0 15px 0;
            color: #2E5C8A;
        }
        
        .toc ul {
            margin: 0;
            padding-left: 20px;
        }
        
        .toc li {
            margin: 5px 0;
        }
        
        .toc a {
            color: #2E5C8A;
            text-decoration: none;
        }
        
        .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 2px solid #E0E0E0;
            text-align: center;
            font-size: 12px;
            color: #666;
        }
        
        @media print {
            body {
                padding: 10px;
            }
            
            .page-break {
                page-break-before: always;
            }
        }
    </style>
</head>
<body>
    <!-- Header -->
    <h1>{{ $project->name }}</h1>
    <div class="header-info">
        <strong>Requirements & Conflicts Report</strong><br>
        Generated: {{ now()->format('F j, Y \a\t g:i A') }}<br>
        Exported by: LLM4Reqs
    </div>

    <!-- Table of Contents -->
    <div class="toc">
        <h3>Table of Contents</h3>
        <ul>
            <li><a href="#project-overview">1. Project Overview</a></li>
            @if($data['requirements']->count() > 0)
                <li><a href="#requirements-analysis">2. Requirements Analysis</a></li>
                <ul>
                    <li><a href="#requirements-by-type">2.1 Requirements by Type</a></li>
                    <li><a href="#requirements-by-priority">2.2 Requirements by Priority</a></li>
                    <li><a href="#detailed-requirements">2.3 Detailed Requirements</a></li>
                </ul>
            @endif
            @if($data['conflicts']->count() > 0)
                <li><a href="#conflicts-analysis">{{ $data['requirements']->count() > 0 ? '3' : '2' }}. Conflicts Analysis</a></li>
                <ul>
                    <li><a href="#conflicts-by-severity">{{ $data['requirements']->count() > 0 ? '3.1' : '2.1' }} Conflicts by Severity</a></li>
                    <li><a href="#detailed-conflicts">{{ $data['requirements']->count() > 0 ? '3.2' : '2.2' }} Detailed Conflicts</a></li>
                </ul>
            @endif
        </ul>
    </div>

    <!-- Project Overview -->
    <div class="page-break">
        <h2 id="project-overview">1. Project Overview</h2>
        
        <div class="summary-grid">
            <div class="summary-card">
                <h4>Project Information</h4>
                <p><strong>Name:</strong> {{ $project->name }}</p>
                <p><strong>Description:</strong> {{ $project->description ?: 'No description provided' }}</p>
                <p><strong>Created:</strong> {{ $project->created_at->format('F j, Y') }}</p>
                <p><strong>Last Updated:</strong> {{ $project->updated_at->format('F j, Y') }}</p>
            </div>
            
            <div class="summary-card">
                <h4>Summary Statistics</h4>
                <table class="stats-table">
                    <tr><td><strong>Total Requirements:</strong></td><td>{{ $data['stats']['total_requirements'] }}</td></tr>
                    @if($data['requirements']->count() > 0)
                        <tr><td>Functional:</td><td>{{ $data['stats']['functional_requirements'] }}</td></tr>
                        <tr><td>Non-functional:</td><td>{{ $data['stats']['non_functional_requirements'] }}</td></tr>
                        <tr><td>Constraints:</td><td>{{ $data['stats']['constraint_requirements'] }}</td></tr>
                        <tr><td>High Priority:</td><td>{{ $data['stats']['high_priority'] }}</td></tr>
                        <tr><td>Medium Priority:</td><td>{{ $data['stats']['medium_priority'] }}</td></tr>
                        <tr><td>Low Priority:</td><td>{{ $data['stats']['low_priority'] }}</td></tr>
                    @endif
                    @if($data['conflicts']->count() > 0)
                        <tr><td><strong>Total Conflicts:</strong></td><td>{{ $data['stats']['total_conflicts'] }}</td></tr>
                        <tr><td>High Severity:</td><td>{{ $data['stats']['high_severity_conflicts'] }}</td></tr>
                        <tr><td>Medium Severity:</td><td>{{ $data['stats']['medium_severity_conflicts'] }}</td></tr>
                        <tr><td>Low Severity:</td><td>{{ $data['stats']['low_severity_conflicts'] }}</td></tr>
                        <tr><td>Resolved:</td><td>{{ $data['stats']['resolved_conflicts'] }}</td></tr>
                        <tr><td>Pending:</td><td>{{ $data['stats']['pending_conflicts'] }}</td></tr>
                    @endif
                </table>
            </div>
        </div>
    </div>

    <!-- Requirements Section -->
    @if($data['requirements']->count() > 0)
        <div class="page-break">
            <h2 id="requirements-analysis">2. Requirements Analysis</h2>
            
            <!-- Requirements by Type -->
            <h3 id="requirements-by-type">2.1 Requirements by Type</h3>
            @php $byType = $data['requirements']->groupBy('requirement_type'); @endphp
            @foreach($byType as $type => $typeRequirements)
                <h4>{{ ucfirst($type) }} Requirements ({{ $typeRequirements->count() }})</h4>
                @foreach($typeRequirements->take(10) as $req)
                    <p>• <strong>[REQ-{{ $req->id }}]</strong> {{ $req->title }}</p>
                @endforeach
                @if($typeRequirements->count() > 10)
                    <p><em>... and {{ $typeRequirements->count() - 10 }} more requirements</em></p>
                @endif
            @endforeach
            
            <!-- Requirements by Priority -->
            <h3 id="requirements-by-priority">2.2 Requirements by Priority</h3>
            @php $byPriority = $data['requirements']->groupBy('priority'); @endphp
            @foreach(['high', 'medium', 'low'] as $priority)
                @if($byPriority->has($priority))
                    @php $priorityReqs = $byPriority[$priority]; @endphp
                    <h4>{{ ucfirst($priority) }} Priority ({{ $priorityReqs->count() }})</h4>
                    @foreach($priorityReqs->take(5) as $req)
                        <p>• <strong>[REQ-{{ $req->id }}]</strong> {{ $req->title }}</p>
                    @endforeach
                    @if($priorityReqs->count() > 5)
                        <p><em>... and {{ $priorityReqs->count() - 5 }} more requirements</em></p>
                    @endif
                @endif
            @endforeach
            
            <!-- Detailed Requirements -->
            <div class="page-break">
                <h3 id="detailed-requirements">2.3 Detailed Requirements</h3>
                @foreach($data['requirements'] as $requirement)
                    <div class="requirement-item">
                        <div class="requirement-title">REQ-{{ $requirement->id }}: {{ $requirement->title }}</div>
                        <div class="requirement-text">
                            {{ $requirement->requirement_text ?: 'No detailed description available.' }}
                        </div>
                        <div class="requirement-meta">
                            <span class="badge badge-{{ $requirement->requirement_type }}">{{ $requirement->requirement_type }}</span>
                            <span class="badge badge-{{ $requirement->priority }}">{{ $requirement->priority }}</span>
                            @if($requirement->confidence_score)
                                | Confidence: {{ round($requirement->confidence_score * 100) }}%
                            @endif
                            @if($requirement->document)
                                | Source: {{ $requirement->document->original_filename }}
                            @endif
                            | Created: {{ $requirement->created_at->format('F j, Y') }}
                        </div>
                    </div>
                @endforeach
            </div>
        </div>
    @endif

    <!-- Conflicts Section -->
    @if($data['conflicts']->count() > 0)
        <div class="page-break">
            <h2 id="conflicts-analysis">{{ $data['requirements']->count() > 0 ? '3' : '2' }}. Conflicts Analysis</h2>
            
            <!-- Conflicts by Severity -->
            <h3 id="conflicts-by-severity">{{ $data['requirements']->count() > 0 ? '3.1' : '2.1' }} Conflicts by Severity</h3>
            @php $bySeverity = $data['conflicts']->groupBy('severity'); @endphp
            @foreach(['high', 'medium', 'low'] as $severity)
                @if($bySeverity->has($severity))
                    @php $severityConflicts = $bySeverity[$severity]; @endphp
                    <h4>{{ ucfirst($severity) }} Severity ({{ $severityConflicts->count() }})</h4>
                    @foreach($severityConflicts->take(5) as $conflict)
                        <p>• <strong>REQ-{{ $conflict->requirement_id_1 }}</strong> ↔ <strong>REQ-{{ $conflict->requirement_id_2 }}</strong></p>
                    @endforeach
                    @if($severityConflicts->count() > 5)
                        <p><em>... and {{ $severityConflicts->count() - 5 }} more conflicts</em></p>
                    @endif
                @endif
            @endforeach
            
            <!-- Detailed Conflicts -->
            <div class="page-break">
                <h3 id="detailed-conflicts">{{ $data['requirements']->count() > 0 ? '3.2' : '2.2' }} Detailed Conflicts</h3>
                @foreach($data['conflicts'] as $index => $conflict)
                    <div class="conflict-item">
                        <div class="conflict-title">Conflict #{{ $index + 1 }}</div>
                        <p><strong>Requirements:</strong> REQ-{{ $conflict->requirement_id_1 }} ↔ REQ-{{ $conflict->requirement_id_2 }}</p>
                        <p><strong>Severity:</strong> <span class="badge badge-{{ $conflict->severity }}">{{ $conflict->severity }}</span> | 
                           <strong>Confidence:</strong> <span class="badge">{{ $conflict->confidence }}</span></p>
                        <p><strong>Description:</strong> {{ $conflict->conflict_description ?: 'No description provided' }}</p>
                        
                        <div class="conflict-requirements">
                            @if($conflict->requirement1)
                                <div class="conflict-req">
                                    <div class="conflict-req-title">Requirement 1: {{ $conflict->requirement1->title }}</div>
                                    <p>{{ $conflict->requirement1->requirement_text ?: 'No description' }}</p>
                                </div>
                            @endif
                            
                            @if($conflict->requirement2)
                                <div class="conflict-req">
                                    <div class="conflict-req-title">Requirement 2: {{ $conflict->requirement2->title }}</div>
                                    <p>{{ $conflict->requirement2->requirement_text ?: 'No description' }}</p>
                                </div>
                            @endif
                        </div>
                        
                        @if($conflict->resolution_notes)
                            <p><strong>Resolution Notes:</strong></p>
                            <p>{{ $conflict->resolution_notes }}</p>
                        @endif
                        
                        <div class="conflict-meta">
                            Status: <span class="badge">{{ $conflict->resolution_status }}</span>
                            @if($conflict->detected_at)
                                | Detected: {{ $conflict->detected_at->format('F j, Y g:i A') }}
                            @endif
                        </div>
                    </div>
                @endforeach
            </div>
        </div>
    @endif

    <!-- Footer -->
    <div class="footer">
        <p>Generated by LLM4Reqs on {{ now()->format('F j, Y \a\t g:i A') }}</p>
        <p>Project: {{ $project->name }} | Export Type: {{ request()->get('include', 'all') }}</p>
    </div>
</body>
</html>