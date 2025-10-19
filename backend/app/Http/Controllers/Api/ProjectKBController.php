<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Jobs\KBBuildJob;
use App\Models\Project;
use Illuminate\Http\Request;

class ProjectKBController extends Controller
{
	/**
	 * Enqueue a knowledge base build for the project.
	 */
	public function build(Request $request, int $projectId)
	{
		$project = Project::findOrFail($projectId);

		$job = new KBBuildJob($project->id);
		$pendingDispatch = dispatch($job);
		$jobId = $pendingDispatch->id ?? $job->uniqueId();

		return response()->json([
			'success' => true,
			'message' => 'Knowledge base build queued',
			'job_id' => $jobId,
			'project_id' => $project->id,
		], 202);
	}
}
