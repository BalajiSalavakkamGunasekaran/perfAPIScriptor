// Generate Gatling script from the unified API data format
export function generateGatlingScript(apiData) {
    const testName = apiData.info?.name?.replace(/[^a-zA-Z0-9]/g, '') || "APISimulation";
    const loopCount = apiData.options?.loopCount || 1;
    const rampUpPeriod = apiData.options?.rampUpPeriod || 5;
    const thinkTime = apiData.options?.thinkTime || 1;
    const addAssertions = apiData.options?.addAssertions || true;
    
    // Start generating the Gatling Scala script
    let script = `
  import io.gatling.core.Predef._
  import io.gatling.http.Predef._
  import scala.concurrent.duration._
  
  class ${testName} extends Simulation {
  
    val httpProtocol = http
      .acceptHeader("application/json")
      .acceptEncodingHeader("gzip, deflate")
      .acceptLanguageHeader("en-US,en;q=0.9")
      .userAgentHeader("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36")
  
    // Scenario definition
    val scn = scenario("${testName}")
  `;
  
    // Add each endpoint as a Gatling HTTP request
    if (apiData.endpoints && Array.isArray(apiData.endpoints)) {
      apiData.endpoints.forEach((endpoint, index) => {
        const requestName = endpoint.name || `${endpoint.method}_${endpoint.path.replace(/[^a-zA-Z0-9]/g, '_')}`;
        const url = endpoint.path;
        const method = endpoint.method.toLowerCase();
        
        script += `
      .exec(
        http("${requestName}")
          .${method}("${url}")`;
        
        // Add headers if present
        if (endpoint.headers && Object.keys(endpoint.headers).length > 0) {
          script += `
          .headers(Map(`;
          const headerEntries = Object.entries(endpoint.headers).map(([key, value]) => 
            `"${key}" -> "${String(value).replace(/"/g, '\\"')}"`
          ).join(",\n          ");
          script += `
            ${headerEntries}
          ))`;
        }
  
        // Add body if present
        if (endpoint.body) {
          if (typeof endpoint.body === 'object') {
            const bodyStr = JSON.stringify(endpoint.body);
            script += `
          .body(StringBody("""${bodyStr.replace(/"/g, '\\"')}"""))`;
          } else if (typeof endpoint.body === 'string') {
            script += `
          .body(StringBody("""${endpoint.body.replace(/"/g, '\\"')}"""))`;
          }
        }
  
        // Add assertions if enabled
        if (addAssertions) {
          script += `
          .check(status.is(200))`;
        }
        
        script += `
      )`;
  
        // Add think time if enabled
        if (thinkTime > 0) {
          script += `
      .pause(${thinkTime})`;
        }
      });
    }
  
    // Close the scenario and add simulation setup
    script += `
  
    // Simulation setup
    setUp(
      scn.inject(
        rampUsers(${loopCount}).during(${rampUpPeriod}.seconds)
      )
    ).protocols(httpProtocol)
  }
  `;
  
    return script;
  }