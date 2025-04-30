//import YAML from 'js-yaml';

// Swagger (OpenAPI) parser
export const parseSwagger = (swaggerData) => {
  const apiData = { paths: [] };

  Object.keys(swaggerData.paths).forEach((path) => {
    Object.keys(swaggerData.paths[path]).forEach((method) => {
      const endpoint = swaggerData.paths[path][method];
      apiData.paths.push({
        url: path,
        method: method.toUpperCase(),
        description: endpoint.description || "No description",
        parameters: endpoint.parameters || [],
        responses: endpoint.responses || {},
      });
    });
  });

  return apiData;
};

// Postman collection parser
export const parsePostman = (postmanData) => {
  const apiData = { paths: [] };

  postmanData.item.forEach((item) => {
    if (item.request) {
      apiData.paths.push({
        url: item.request.url.raw,
        method: item.request.method,
        description: item.name || "No description",
        parameters: item.request.url.query || [],
        headers: item.request.header || [],
        body: item.request.body || {},
      });
    }
  });

  return apiData;
};

// Insomnia collection parser
export const parseInsomnia = (insomniaData) => {
  const apiData = { paths: [] };

  insomniaData.resources.forEach((resource) => {
    if (resource.requests) {
      resource.requests.forEach((request) => {
        apiData.paths.push({
          url: request.url,
          method: request.method,
          description: request.name || "No description",
          parameters: request.query || [],
          headers: request.headers || [],
          body: request.body || {},
        });
      });
    }
  });

  return apiData;
};

// SoapUI collection parser
export const parseSoapUI = (soapUIData) => {
  const apiData = { paths: [] };

  const testCases = soapUIData.getElementsByTagName('testCase');
  Array.from(testCases).forEach((testCase) => {
    const requests = testCase.getElementsByTagName('request');
    Array.from(requests).forEach((request) => {
      apiData.paths.push({
        url: request.getElementsByTagName('url')[0].textContent,
        method: request.getAttribute('method'),
        description: testCase.getAttribute('name') || "No description",
        headers: request.getElementsByTagName('headers'),
        body: request.getElementsByTagName('body')[0]?.textContent || "",
      });
    });
  });

  return apiData;
};
