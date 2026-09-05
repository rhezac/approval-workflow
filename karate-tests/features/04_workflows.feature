Feature: Workflow Engine Management (Multi-Level & Multi-User Logic OR)

Background:
  * url baseUrl
  Given path 'auth', 'login'
  And request { username: '#(credentials.admin.username)', password: '#(credentials.admin.password)' }
  When method POST
  Then status 201
  * def adminToken = response.accessToken

Scenario: 01 Get All Configured Workflows
  Given path 'workflows'
  And header Authorization = 'Bearer ' + adminToken
  When method GET
  Then status 200
  And match response == '#[]'

Scenario: 02 Create Multi-Level Workflow with Granular Approver Units (Role+Division and Multi-User Option OR)
  # Get User IDs for candidate users
  Given path 'users'
  And header Authorization = 'Bearer ' + adminToken
  When method GET
  Then status 200
  * def staffFinId = response.find(x => x.username == 'staff_fin').id
  * def mgrFinId = response.find(x => x.username == 'manager_fin').id

  Given path 'workflows'
  And header Authorization = 'Bearer ' + adminToken
  And request
  """
  {
    "name": "Karate Automated Multi-Level Approval",
    "description": "Workflow created by Karate automated test runner",
    "steps": [
      {
        "stepOrder": 1,
        "name": "Level 1: Manager & Finance Team Choice",
        "logic": "ALL",
        "approverUnits": [
          {
            "id": "u-1-1",
            "type": "ROLE_DIVISION",
            "roleRequired": "Manager",
            "divisionRequired": "IT",
            "label": "Manager IT"
          },
          {
            "id": "u-1-2",
            "type": "MULTI_USER_OPTION",
            "userIds": ["#(staffFinId)", "#(mgrFinId)"],
            "label": "Finance Team Option (OR Logic)"
          }
        ]
      },
      {
        "stepOrder": 2,
        "name": "Level 2: Director Sign-off",
        "logic": "ALL",
        "approverUnits": [
          {
            "id": "u-2-1",
            "type": "ROLE_DIVISION",
            "roleRequired": "Direktur",
            "divisionRequired": "ANY",
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
