// Generate k6 script from the unified API data format
export function generateK6Script(apiData) {
  const testName = apiData.info?.name || "API Test";
  const loopCount = apiData.options?.loopCount || 1;
  const thinkTime = apiData.options?.thinkTime || 1;
  const addAssertions = apiData.options?.addAssertions || true;
  
  // Start generating the k6 JavaScript script
  let script = `
import http from 'k6/http';
import { check, sleep } from 'k6';

// Test configuration
export const options = {
  stages: [
    { duration: '${Math.max(5, apiData.options?.rampUpPeriod || 5)}s', target: ${loopCount} }, // Ramp up
    { duration: '${Math.max(10, (apiData.options?.rampUpPeriod || 5) * 2)}s', target: ${loopCount} }, // Stay at peak load
    { duration: '5s', target: 0 } // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'], // 95% of requests should complete within 2s
  },
};

// Default headers for all requests
const defaultHeaders = {
  'User-Agent': 'k6/perfAPIScriptor',
  'Accept': 'application/json',
};

export default function() {
  // Main test logic
`;

  // Add each endpoint as a k6 HTTP request
  if (apiData.endpoints && Array.isArray(apiData.endpoints)) {
    apiData.endpoints.forEach((endpoint, index) => {
      const requestName = endpoint.name || `${endpoint.method} ${endpoint.path}`;
      const url = endpoint.path;
      const method = endpoint.method;
      
      script += `
  // ${requestName}
  {`;

      // Prepare headers
      script += `
    const headers = {
      ...defaultHeaders,`;
      
      // Add specific headers if present
      if (endpoint.headers && Object.keys(endpoint.headers).length > 0) {
        Object.entries(endpoint.headers).forEach(([key, value]) => {
          script += `
      '${key}': '${String(value).replace(/'/g, "\\'")}',`;
        });
      }
      
      script += `
    };`;

      // Prepare request body if present
      if (endpoint.body) {
        if (typeof endpoint.body === 'object') {
          script += `
    const payload = ${JSON.stringify(endpoint.body, null, 2)};`;
        } else if (typeof endpoint.body === 'string') {
          script += `
    const payload = \`${endpoint.body.replace(/`/g, '\\`')}\`;`;
        }
      }

      // Make the request
      script += `
    const response = http.${method.toLowerCase()}('${url}', `;
      
      // Add payload if present
      if (endpoint.body) {
        script += `payload, `;
      }
      
      script += `{ headers: headers });`;

      // Add assertions if enabled
      if (addAssertions) {
        script += `
    
    // Verify response
    check(response, {
      'status is 200': (r) => r.status === 200,
      'transaction time < 1000ms': (r) => r.timings.duration < 1000,
    });`;
      }

      // Add think time if enabled
      if (thinkTime > 0) {
        script += `
    
    // Think time
    sleep(${thinkTime});`;
      }

      script += `
  }
`;
    });
  }

  // Close the script
  script += `}
`;

  return script;
}