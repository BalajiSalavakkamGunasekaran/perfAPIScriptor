// Generate JMeter script from the unified API data format
export function generateJMeterScript(apiData) {
    // Convert the apiData into JMeter XML format
    const testPlanName = apiData.info?.name || "API Test Plan";
    const threadGroupName = "Thread Group";
    const numThreads = apiData.options?.loopCount || 1;
    const rampUp = apiData.options?.rampUpPeriod || 5;
    const loopCount = apiData.options?.loopCount || 1;
    const thinkTime = apiData.options?.thinkTime || 1;
    
    // Create JMeter XML
    let jmeterXml = `<?xml version="1.0" encoding="UTF-8"?>
  <jmeterTestPlan version="1.2" properties="5.0" jmeter="5.4.1">
    <hashTree>
      <TestPlan guiclass="TestPlanGui" testclass="TestPlan" testname="${testPlanName}" enabled="true">
        <stringProp name="TestPlan.comments"></stringProp>
        <boolProp name="TestPlan.functional_mode">false</boolProp>
        <boolProp name="TestPlan.tearDown_on_shutdown">true</boolProp>
        <boolProp name="TestPlan.serialize_threadgroups">false</boolProp>
        <elementProp name="TestPlan.user_defined_variables" elementType="Arguments" guiclass="ArgumentsPanel" testclass="Arguments" testname="User Defined Variables" enabled="true">
          <collectionProp name="Arguments.arguments"/>
        </elementProp>
        <stringProp name="TestPlan.user_define_classpath"></stringProp>
      </TestPlan>
      <hashTree>
        <ThreadGroup guiclass="ThreadGroupGui" testclass="ThreadGroup" testname="${threadGroupName}" enabled="true">
          <stringProp name="ThreadGroup.on_sample_error">continue</stringProp>
          <elementProp name="ThreadGroup.main_controller" elementType="LoopController" guiclass="LoopControlPanel" testclass="LoopController" testname="Loop Controller" enabled="true">
            <boolProp name="LoopController.continue_forever">false</boolProp>
            <stringProp name="LoopController.loops">${loopCount}</stringProp>
          </elementProp>
          <stringProp name="ThreadGroup.num_threads">${numThreads}</stringProp>
          <stringProp name="ThreadGroup.ramp_time">${rampUp}</stringProp>
          <boolProp name="ThreadGroup.scheduler">false</boolProp>
          <stringProp name="ThreadGroup.duration"></stringProp>
          <stringProp name="ThreadGroup.delay"></stringProp>
          <boolProp name="ThreadGroup.same_user_on_next_iteration">true</boolProp>
        </ThreadGroup>
        <hashTree>`;
    
    // Add HTTP requests for each endpoint
    if (apiData.endpoints && Array.isArray(apiData.endpoints)) {
      apiData.endpoints.forEach(endpoint => {
        const requestName = endpoint.name || `${endpoint.method} ${endpoint.path}`;
        const domain = extractDomain(endpoint.path);
        const path = extractPath(endpoint.path);
        const method = endpoint.method;
        
        jmeterXml += `
          <HTTPSamplerProxy guiclass="HttpTestSampleGui" testclass="HTTPSamplerProxy" testname="${escapeXml(requestName)}" enabled="true">
            <elementProp name="HTTPsampler.Arguments" elementType="Arguments" guiclass="HTTPArgumentsPanel" testclass="Arguments" testname="User Defined Variables" enabled="true">
              <collectionProp name="Arguments.arguments">`;
        
        // Add body parameters if present
        if (endpoint.body && typeof endpoint.body === 'object') {
          Object.entries(endpoint.body).forEach(([key, value]) => {
            jmeterXml += `
                <elementProp name="${escapeXml(key)}" elementType="HTTPArgument">
                  <boolProp name="HTTPArgument.always_encode">false</boolProp>
                  <stringProp name="Argument.value">${escapeXml(String(value))}</stringProp>
                  <stringProp name="Argument.metadata">=</stringProp>
                  <boolProp name="HTTPArgument.use_equals">true</boolProp>
                  <stringProp name="Argument.name">${escapeXml(key)}</stringProp>
                </elementProp>`;
          });
        } else if (endpoint.body && typeof endpoint.body === 'string') {
          jmeterXml += `
                <elementProp name="" elementType="HTTPArgument">
                  <boolProp name="HTTPArgument.always_encode">false</boolProp>
                  <stringProp name="Argument.value">${escapeXml(endpoint.body)}</stringProp>
                  <stringProp name="Argument.metadata">=</stringProp>
                </elementProp>`;
        }
        
        jmeterXml += `
              </collectionProp>
            </elementProp>
            <stringProp name="HTTPSampler.domain">${escapeXml(domain)}</stringProp>
            <stringProp name="HTTPSampler.port"></stringProp>
            <stringProp name="HTTPSampler.protocol"></stringProp>
            <stringProp name="HTTPSampler.contentEncoding"></stringProp>
            <stringProp name="HTTPSampler.path">${escapeXml(path)}</stringProp>
            <stringProp name="HTTPSampler.method">${escapeXml(method)}</stringProp>
            <boolProp name="HTTPSampler.follow_redirects">true</boolProp>
            <boolProp name="HTTPSampler.auto_redirects">false</boolProp>
            <boolProp name="HTTPSampler.use_keepalive">true</boolProp>
            <boolProp name="HTTPSampler.DO_MULTIPART_POST">false</boolProp>
            <stringProp name="HTTPSampler.embedded_url_re"></stringProp>
            <stringProp name="HTTPSampler.connect_timeout"></stringProp>
            <stringProp name="HTTPSampler.response_timeout"></stringProp>
          </HTTPSamplerProxy>
          <hashTree>`;
        
        // Add headers
        if (endpoint.headers && Object.keys(endpoint.headers).length > 0) {
          jmeterXml += `
            <HeaderManager guiclass="HeaderPanel" testclass="HeaderManager" testname="HTTP Headers" enabled="true">
              <collectionProp name="HeaderManager.headers">`;
          
          Object.entries(endpoint.headers).forEach(([key, value]) => {
            jmeterXml += `
                <elementProp name="" elementType="Header">
                  <stringProp name="Header.name">${escapeXml(key)}</stringProp>
                  <stringProp name="Header.value">${escapeXml(String(value))}</stringProp>
                </elementProp>`;
          });
          
          jmeterXml += `
              </collectionProp>
            </HeaderManager>
            <hashTree/>`;
        }
        
        // Add think time if enabled
        if (thinkTime > 0) {
          jmeterXml += `
            <TestAction guiclass="TestActionGui" testclass="TestAction" testname="Think Time" enabled="true">
              <intProp name="ActionProcessor.action">1</intProp>
              <intProp name="ActionProcessor.target">0</intProp>
              <stringProp name="ActionProcessor.duration">${thinkTime * 1000}</stringProp>
            </TestAction>
            <hashTree/>`;
        }
        
        // Add assertions if enabled
        if (apiData.options?.addAssertions) {
          jmeterXml += `
            <ResponseAssertion guiclass="AssertionGui" testclass="ResponseAssertion" testname="Response Assertion" enabled="true">
              <collectionProp name="Asserion.test_strings">
                <stringProp name="49586">200</stringProp>
              </collectionProp>
              <stringProp name="Assertion.custom_message"></stringProp>
              <stringProp name="Assertion.test_field">Assertion.response_code</stringProp>
              <boolProp name="Assertion.assume_success">false</boolProp>
              <intProp name="Assertion.test_type">8</intProp>
            </ResponseAssertion>
            <hashTree/>`;
        }
        
        jmeterXml += `
          </hashTree>`;
      });
    }
    
    // Close the XML
    jmeterXml += `
          <ResultCollector guiclass="ViewResultsFullVisualizer" testclass="ResultCollector" testname="View Results Tree" enabled="true">
            <boolProp name="ResultCollector.error_logging">false</boolProp>
            <objProp>
              <name>saveConfig</name>
              <value class="SampleSaveConfiguration">
                <time>true</time>
                <latency>true</latency>
                <timestamp>true</timestamp>
                <success>true</success>
                <label>true</label>
                <code>true</code>
                <message>true</message>
                <threadName>true</threadName>
                <dataType>true</dataType>
                <encoding>false</encoding>
                <assertions>true</assertions>
                <subresults>true</subresults>
                <responseData>false</responseData>
                <samplerData>false</samplerData>
                <xml>false</xml>
                <fieldNames>true</fieldNames>
                <responseHeaders>false</responseHeaders>
                <requestHeaders>false</requestHeaders>
                <responseDataOnError>false</responseDataOnError>
                <saveAssertionResultsFailureMessage>true</saveAssertionResultsFailureMessage>
                <assertionsResultsToSave>0</assertionsResultsToSave>
                <bytes>true</bytes>
                <sentBytes>true</sentBytes>
                <url>true</url>
                <threadCounts>true</threadCounts>
                <idleTime>true</idleTime>
                <connectTime>true</connectTime>
              </value>
            </objProp>
            <stringProp name="filename"></stringProp>
          </ResultCollector>
          <hashTree/>
        </hashTree>
      </hashTree>
    </hashTree>
  </jmeterTestPlan>`;
  
    return jmeterXml;
  }
  
  // Helper functions to extract domain and path
  function extractDomain(url) {
    try {
      if (url.startsWith('http://') || url.startsWith('https://')) {
        const urlObj = new URL(url);
        return urlObj.hostname;
      }
      // Try to extract domain from non-URL string
      const parts = url.split('/');
      return parts[0].includes('.') ? parts[0] : '';
    } catch (e) {
      return '';
    }
  }
  
  function extractPath(url) {
    try {
      if (url.startsWith('http://') || url.startsWith('https://')) {
        const urlObj = new URL(url);
        return urlObj.pathname + urlObj.search;
      }
      // If not a full URL, treat the whole string as path
      return url.startsWith('/') ? url : '/' + url;
    } catch (e) {
      return url.startsWith('/') ? url : '/' + url;
    }
  }
  
  // Escape XML special characters to prevent XML injection
  function escapeXml(unsafe) {
    if (unsafe === null || unsafe === undefined) {
      return '';
    }
    return unsafe
      .toString()
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }