Feature: Workflow Engine Management (Multi-Level & Multi-User Logic OR)

Background:
  * url baseUrl
  * def loginResp = karate.call('02_auth.feature', { username: credentials.admin.username, password: credentials.admin.password })
  * def adminToken = loginResp.response.accessToken

Scenario: 01 Get All Configured Workflows
  Given path 'workflows'
  And header Authorization = 'Bearer ' + adminToken
  When method GET
  Then status 200
  And match response == '#[ ]'

Scenario: 02 Create Multi-Level Workflow with Granular Approver Units (Role+Division and Multi-User Option OR)
  * def flowCode = 'WF_KARATE_' + java.lang.System.currentTimeMillis()
  Given path 'workflows'
  And header Authorization = 'Bearer ' + adminToken
  And request
  """
  {
    "name": "Karate Automated Multi-Level Approval",
    "code": "#(flowCode)",
    "description": "Workflow created by Karate automated test runner",
    "isActive": true,
    "steps": [
      {
        "stepOrder": 1,
        "name": "Level 1: Manager & Finance Team Choice",
        "description": "Requires Manager IT and ANY candidate from Finance",
        "approvalType": "ALL",
        "approverUnits": [
          {
            "id": "u-1-1",
            "type": "ROLE_DIVISION",
            "role": "Manager",
            "division": "IT",
            "label": "Manager IT"
          },
          {
            "id": "u-1-2",
            "type": "MULTI_USER_OPTION",
            "candidateUsernames": ["staff_fin", "manager_fin"],
            "label": "Finance Team Option (OR Logic)"
          }
        ]
      },
      {
        "stepOrder": 2,
        "name": "Level 2: Director Sign-off",
        "description": "Final Director approval",
        "approvalType": "ALL",
        "approverUnits": [
          {
            "id": "u-2-1",
            "type": "ROLE_DIVISION",
            "role": "Direktur",
            "division": "SAME_AS_REQUESTER",
            "label": "Director Level"
          }
        ]
      }
    ]
  }
  """
  When method POST
  Then status 201
  And match response.id == '#present'
  And match response.version == 1
  And match response.steps == '#[2]'
