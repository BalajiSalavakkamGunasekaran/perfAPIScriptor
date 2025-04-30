// parsers/postmanParser.js
export function parsePostmanCollection(collection) {
    const endpoints = [];
    let endpointId = 1;
  
    // Function to process items recursively (handles nested folders)
    function processItems(items) {
      if (!items || !Array.isArray(items)) return;
  
      items.forEach(item => {
        // If item has request property, it's an API endpoint
        if (item.request) {
          const request = item.request;
          const method = typeof request.method === 'string' ? request.method.toUpperCase() : 'GET';
          let url = '';
          
          // Handle different URL formats in Postman
          if (typeof request.url === 'string') {
            url = request.url;
          } else if (request.url && request.url.raw) {
            url = request.url.raw;
          } else if (request.url && request.url.path) {
            url = '/' + (Array.isArray(request.url.path) ? request.url.path.join('/') : request.url.path);
          }
  
          // Extract headers
          const headers = {};
          if (request.header && Array.isArray(request.header)) {
            request.header.forEach(h => {
              if (h.key && h.value) {
                headers[h.key] = h.value;
              }
            });
          }
  
          // Extract request body
          let body = null;
          if (request.body) {
            if (request.body.raw) {
              try {
                body = JSON.parse(request.body.raw);
              } catch (e) {
                body = request.body.raw;
              }
            } else if (request.body.formdata && Array.isArray(request.body.formdata)) {
              body = {};
              request.body.formdata.forEach(param => {
                if (param.key && param.value) {
                  body[param.key] = param.value;
                }
              });
            }
          }
  
          // Extract query parameters
          const queryParams = {};
          if (request.url && request.url.query && Array.isArray(request.url.query)) {
            request.url.query.forEach(param => {
              if (param.key && param.value) {
                queryParams[param.key] = param.value;
              }
            });
          }
  
          // Add to endpoints array
          endpoints.push({
            id: `endpoint_${endpointId++}`,
            name: item.name || `${method} ${url}`,
            method,
            path: url,
            headers,
            body,
            queryParams,
            description: item.description || ''
          });
        }
        
        // If item has nested items, process them recursively
        if (item.item && Array.isArray(item.item)) {
          processItems(item.item);
        }
      });
    }
  
    // Start processing from the top level
    if (collection.item && Array.isArray(collection.item)) {
      processItems(collection.item);
    }
  
    return {
      name: collection.info ? collection.info.name : 'Postman Collection',
      description: collection.info ? collection.info.description : '',
      endpoints
    };
  }
  
  // parsers/swaggerParser.js
  export function parseSwaggerSpec(swagger) {
    const endpoints = [];
    let endpointId = 1;
    const basePath = swagger.basePath || '';
    
    // Process each path in the Swagger definition
    if (swagger.paths) {
      Object.keys(swagger.paths).forEach(path => {
        const pathItem = swagger.paths[path];
        
        // Process each HTTP method for this path
        ['get', 'post', 'put', 'delete', 'patch', 'options', 'head'].forEach(method => {
          if (pathItem[method]) {
            const operation = pathItem[method];
            const fullPath = basePath + path;
            
            // Extract parameters
            const headers = {};
            const queryParams = {};
            let body = null;
            
            if (operation.parameters && Array.isArray(operation.parameters)) {
              operation.parameters.forEach(param => {
                if (param.in === 'header') {
                  headers[param.name] = param.default || '';
                } else if (param.in === 'query') {
                  queryParams[param.name] = param.default || '';
                } else if (param.in === 'body' && param.schema) {
                  // Try to create a sample body based on schema
                  body = generateSampleFromSchema(param.schema);
                }
              });
            }
            
            // Add to endpoints array
            endpoints.push({
              id: `endpoint_${endpointId++}`,
              name: operation.summary || operation.operationId || `${method.toUpperCase()} ${fullPath}`,
              method: method.toUpperCase(),
              path: fullPath,
              headers,
              body,
              queryParams,
              description: operation.description || ''
            });
          }
        });
      });
    }
    
    return {
      name: swagger.info ? swagger.info.title : 'Swagger API',
      description: swagger.info ? swagger.info.description : '',
      endpoints
    };
  }
  
  // parsers/openApiParser.js
  export function parseOpenApiSpec(openapi) {
    const endpoints = [];
    let endpointId = 1;
    
    // Process each path in the OpenAPI definition
    if (openapi.paths) {
      Object.keys(openapi.paths).forEach(path => {
        const pathItem = openapi.paths[path];
        
        // Process each HTTP method for this path
        ['get', 'post', 'put', 'delete', 'patch', 'options', 'head', 'trace'].forEach(method => {
          if (pathItem[method]) {
            const operation = pathItem[method];
            
            // Extract parameters
            const headers = {};
            const queryParams = {};
            let body = null;
            
            // Handle parameters at path level and operation level
            const allParams = [
              ...(pathItem.parameters || []),
              ...(operation.parameters || [])
            ];
            
            allParams.forEach(param => {
              if (param.in === 'header') {
                headers[param.name] = param.example || '';
              } else if (param.in === 'query') {
                queryParams[param.name] = param.example || '';
              }
            });
            
            // Handle request body (OpenAPI 3.x style)
            if (operation.requestBody && operation.requestBody.content) {
              const contentTypes = Object.keys(operation.requestBody.content);
              if (contentTypes.length > 0) {
                const contentType = contentTypes[0]; // Use first content type
                const mediaType = operation.requestBody.content[contentType];
                
                if (mediaType.schema) {
                  body = generateSampleFromSchema(mediaType.schema);
                  headers['Content-Type'] = contentType;
                } else if (mediaType.example) {
                  body = mediaType.example;
                }
              }
            }
            
            // Add server information if available
            let serverUrl = '';
            if (openapi.servers && openapi.servers.length > 0) {
              serverUrl = openapi.servers[0].url || '';
            }
            
            // Normalize path for consistency
            const fullPath = path.startsWith('/') ? path : '/' + path;
            
            // Add to endpoints array
            endpoints.push({
              id: `endpoint_${endpointId++}`,
              name: operation.summary || operation.operationId || `${method.toUpperCase()} ${fullPath}`,
              method: method.toUpperCase(),
              path: fullPath,
              server: serverUrl,
              headers,
              body,
              queryParams,
              description: operation.description || ''
            });
          }
        });
      });
    }
    
    return {
      name: openapi.info ? openapi.info.title : 'OpenAPI Specification',
      description: openapi.info ? openapi.info.description : '',
      endpoints
    };
  }
  
  // Helper function to generate sample values from schema definitions
  function generateSampleFromSchema(schema) {
    if (!schema) return null;
    
    // Handle references
    if (schema.$ref) {
      // For simplicity, just return an empty object for references
      return {};
    }
    
    // Handle different types
    switch (schema.type) {
      case 'object':
        if (schema.properties) {
          const result = {};
          Object.keys(schema.properties).forEach(propName => {
            result[propName] = generateSampleFromSchema(schema.properties[propName]);
          });
          return result;
        }
        return {};
      
      case 'array':
        if (schema.items) {
          return [generateSampleFromSchema(schema.items)];
        }
        return [];
      
      case 'string':
        return schema.example || schema.default || 'string';
      
      case 'number':
      case 'integer':
        return schema.example || schema.default || 0;
      
      case 'boolean':
        return schema.example || schema.default || false;
      
      default:
        return null;
    }
  }