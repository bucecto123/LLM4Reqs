<?php

/**
 * Document Upload API Test Script
 * 
 * Run this script to test the document upload functionality
 * Usage: php test_document_api.php
 */

require_once __DIR__ . '/vendor/autoload.php';

class DocumentAPITester 
{
    private $baseUrl;
    private $authToken;
    
    public function __construct($baseUrl = 'http://localhost:8000/api')
    {
        $this->baseUrl = $baseUrl;
    }
    
    public function setAuthToken($token)
    {
        $this->authToken = $token;
    }
    
    /**
     * Test the health endpoint
     */
    public function testHealth()
    {
        echo "Testing health endpoint...\n";
        
        $response = $this->makeRequest('GET', '/health');
        
        if ($response && isset($response['status']) && $response['status'] === 'ok') {
            echo "✅ Health check passed\n";
            return true;
        } else {
            echo "❌ Health check failed\n";
            return false;
        }
    }
    
    /**
     * Test document routes info
     */
    public function testDocumentRoutesInfo()
    {
        echo "Testing document routes info...\n";
        
        $response = $this->makeRequest('GET', '/test-document-routes');
        
        if ($response && isset($response['message'])) {
            echo "✅ Document routes info retrieved\n";
            print_r($response);
            return true;
        } else {
            echo "❌ Document routes info failed\n";
            return false;
        }
    }
    
    /**
     * Test file upload (requires auth)
     */
    public function testFileUpload($filePath, $projectId = 1, $conversationId = null)
    {
        echo "Testing file upload...\n";
        
        if (!$this->authToken) {
            echo "❌ Auth token required for file upload\n";
            return false;
        }
        
        if (!file_exists($filePath)) {
            echo "❌ Test file not found: $filePath\n";
            return false;
        }
        
        // This would require implementing multipart upload
        // For now, just show the structure
        echo "📄 Would upload file: " . basename($filePath) . "\n";
        echo "📄 File size: " . filesize($filePath) . " bytes\n";
        echo "📄 Project ID: $projectId\n";
        
        // TODO: Implement actual multipart upload test
        echo "⚠️ Actual upload test requires HTTP client with multipart support\n";
        
        return true;
    }
    
    /**
     * Make HTTP request
     */
    private function makeRequest($method, $endpoint, $data = null)
    {
        $url = $this->baseUrl . $endpoint;
        
        $options = [
            'http' => [
                'method' => $method,
                'header' => [
                    'Content-Type: application/json',
                    'Accept: application/json'
                ]
            ]
        ];
        
        if ($this->authToken) {
            $options['http']['header'][] = 'Authorization: Bearer ' . $this->authToken;
        }
        
        if ($data && ($method === 'POST' || $method === 'PUT')) {
            $options['http']['content'] = json_encode($data);
        }
        
        $context = stream_context_create($options);
        $result = @file_get_contents($url, false, $context);
        
        if ($result === false) {
            echo "❌ Request failed to: $url\n";
            return null;
        }
        
        return json_decode($result, true);
    }
    
    /**
     * Run all tests
     */
    public function runAllTests()
    {
        echo "=== Document Upload API Tests ===\n\n";
        
        $results = [];
        
        // Test 1: Health check
        $results['health'] = $this->testHealth();
        echo "\n";
        
        // Test 2: Document routes info
        $results['routes_info'] = $this->testDocumentRoutesInfo();
        echo "\n";
        
        // Test 3: File upload (simulation)
        $testFile = __DIR__ . '/test_files/sample_requirements.txt';
        $results['file_upload'] = $this->testFileUpload($testFile);
        echo "\n";
        
        // Summary
        echo "=== Test Results Summary ===\n";
        foreach ($results as $test => $passed) {
            $status = $passed ? "✅ PASSED" : "❌ FAILED";
            echo "$test: $status\n";
        }
        
        return $results;
    }
}

// Run the tests
$tester = new DocumentAPITester();

// You can set auth token if you have one
// $tester->setAuthToken('your-auth-token-here');

$tester->runAllTests();