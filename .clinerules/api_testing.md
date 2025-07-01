---
description: Guidelines for maintaining Postman API collections and testing endpoints when new APIs are created.
globs: backend/src/routes/*.ts, docs/*.postman_collection.json
alwaysApply: true
---

- **Always Update Postman Collection When Creating New APIs:**
  - After implementing any new API endpoints, immediately update the Postman collection file
  - Location: `docs/DeckCraft_AI_API_Collection.postman_collection.json`
  - This ensures all endpoints can be tested and documented for the user

- **Postman Collection Structure:**
  - Group related endpoints under descriptive folder names
  - Use clear, descriptive request names that explain the endpoint purpose
  - Include comprehensive descriptions for each endpoint
  - Add proper test scripts with assertions for response validation

- **Required Elements for Each New Endpoint:**
  ```javascript
  // 1. Proper HTTP method and URL structure
  {
    "method": "GET|POST|PUT|DELETE",
    "url": {
      "raw": "{{baseUrl}}/api/{{apiVersion}}/your/endpoint",
      "host": ["{{baseUrl}}"],
      "path": ["api", "{{apiVersion}}", "your", "endpoint"]
    }
  }

  // 2. Request body with proper JSON structure (if applicable)
  "body": {
    "mode": "raw",
    "raw": "{\n  \"field\": \"{{variable}}\"\n}",
    "options": {
      "raw": {
        "language": "json"
      }
    }
  }

  // 3. Test scripts with proper assertions
  "event": [
    {
      "listen": "test",
      "script": {
        "exec": [
          "pm.test('Status code is 200', function () {",
          "    pm.response.to.have.status(200);",
          "});",
          "// Add more specific tests here"
        ]
      }
    }
  ]
  ```

- **Test Script Best Practices:**
  - Always test for expected status codes (200, 201, 400, 401, 404, 500)
  - Validate response structure and required properties
  - Store important values in environment variables for chaining requests
  - Include helpful console.log statements for debugging
  - Test both success and error scenarios

- **Environment Variables Management:**
  - Add new variables to the collection's `variable` section when needed
  - Use descriptive variable names (e.g., `testUserId`, `testPresentationId`)
  - Include descriptions for complex variables
  - Update the `prerequest` script if default values are needed

- **Error Testing Endpoints:**
  - Create separate requests to test error scenarios
  - Test missing required fields
  - Test invalid data types
  - Test authentication failures
  - Group these under "Error Testing" folder

- **Documentation Integration:**
  - Keep endpoint descriptions comprehensive and up-to-date
  - Include parameter descriptions in query strings and bodies
  - Reference related endpoints when applicable
  - Update the main API documentation endpoint list in app.ts 404 handler

- **Example New Endpoint Addition Pattern:**
  ```json
  {
    "name": "Descriptive Endpoint Name",
    "request": {
      "method": "POST",
      "header": [
        {
          "key": "Content-Type",
          "value": "application/json"
        }
      ],
      "body": {
        "mode": "raw",
        "raw": "{\n  \"param1\": \"{{variable1}}\",\n  \"param2\": \"value\"\n}",
        "options": {
          "raw": {
            "language": "json"
          }
        }
      },
      "url": {
        "raw": "{{baseUrl}}/api/{{apiVersion}}/new/endpoint",
        "host": ["{{baseUrl}}"],
        "path": ["api", "{{apiVersion}}", "new", "endpoint"]
      },
      "description": "Clear description of what this endpoint does and when to use it."
    },
    "response": [],
    "event": [
      {
        "listen": "test",
        "script": {
          "exec": [
            "pm.test('Status code is 201', function () {",
            "    pm.response.to.have.status(201);",
            "});",
            "",
            "pm.test('Response has required fields', function () {",
            "    const responseJson = pm.response.json();",
            "    pm.expect(responseJson).to.have.property('success', true);",
            "    pm.expect(responseJson).to.have.property('data');",
            "});",
            "",
            "// Store important values for other tests",
            "if (pm.response.code === 201) {",
            "    const responseJson = pm.response.json();",
            "    pm.environment.set('newResourceId', responseJson.data.id);",
            "    console.log('✅ Created resource:', responseJson.data.id);",
            "}"
          ],
          "type": "text/javascript"
        }
      }
    ]
  }
  ```

- **Collection Update Checklist:**
  - [ ] Add new endpoint(s) to appropriate folder
  - [ ] Include proper request structure with variables
  - [ ] Add comprehensive test scripts
  - [ ] Update collection variables if needed
  - [ ] Test success scenarios
  - [ ] Add error testing requests
  - [ ] Update main app.ts 404 handler endpoint list
  - [ ] Verify all requests work as expected
  - [ ] Document any new environment setup requirements

- **Testing Workflow:**
  - Test each new endpoint individually first
  - Run the entire collection to ensure no regressions
  - Verify environment variables are set correctly
  - Test both authenticated and unauthenticated scenarios (when applicable)
  - Ensure error responses are properly formatted

This approach ensures that every new API endpoint is immediately testable and well-documented, making development and debugging much more efficient.
