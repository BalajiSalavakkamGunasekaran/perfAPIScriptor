// Function to parse the SoapUI XML file and extract relevant API data
export const parseSoapUI = (xmlDoc) => {
    const testSuite = xmlDoc.getElementsByTagName("testSuite")[0];
    const testCase = testSuite.getElementsByTagName("testCase")[0];
  
    const apiData = {
      info: {
        title: testCase.getAttribute("name"),  // Use the name of the test case as the API title
      },
      item: [],
    };
  
    const requestElements = testCase.getElementsByTagName("request");
    for (let i = 0; i < requestElements.length; i++) {
      const request = requestElements[i];
  
      const method = request.getAttribute("method");  // HTTP method (GET, POST, etc.)
      const url = request.getAttribute("url");  // URL of the API
      const body = request.getElementsByTagName("body")[0]?.textContent || "";  // Request body
  
      apiData.item.push({
        name: `Request ${i + 1}`,
        request: {
          method: method,
          url: url,
          body: {
            raw: body,
          },
        },
      });
    }
  
    return apiData;
  };
  