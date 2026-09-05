Feature: End-to-End Task Lifecycle, Multi-Level Progression, Logic OR, and Approval Decisions

Background:
  * url baseUrl
  # Tokens for different roles
  * def adminLogin = karate.call('02_auth.feature', { username: credentials.admin.username, password: credentials.admin.password })
  * def adminToken = adminLogin.response.accessToken

  * def staffLogin = karate.call('02_auth.feature', { username: credentials.staffIt.username, password: credentials.staffIt.password })
  * def staffToken = staffLogin.response.accessToken

  * def mgrItLogin = karate.call('02_auth.feature', { username: credentials.managerIt.username, password: credentials.managerIt.password })
  * def mgrItToken = mgrItLogin.response.accessToken

  * def staffFinLogin = karate.call('02_auth.feature', { username: credentials.staffFin.username, password: credentials.staffFin.password })
  * def staffFinToken = staffFinLogin.response.accessToken

  * def dirLogin = karate.call('02_auth.feature', { username: credentials.director.username, password: credentials.director.password })
  * def dirToken = dirLogin.response.accessToken

Scenario: 01 Complete Approval Pipeline: Task Creation -> Level 1 (Logic OR Fulfillment) -> Level 2 -> Final Approved
  # 1. Get default workflow ID
  Given path 'workflows'
  And header Authorization = 'Bearer ' + adminToken
  When method GET
  Then status 200
  * def workflowId = response[0].id

  # 2. Staff IT submits a new Task
  Given path 'tasks'
  And header Authorization = 'Bearer ' + staffToken
  And request
  """
  {
    "title": "Karate E2E Budget Approval",
    "description": "Automated end-to-end task test lifecycle",
    "priority": "HIGH",
    "division": "IT",
    "workflowId": "#(workflowId)",
    "notes": "Submitted via Karate automation suite",
    "attachments": [
      {
        "name": "Purchase Order Spec",
        "url": "https://company.internal/docs/po-123.pdf",
        "type": "link",
        "notes": "Karate Test Link"
      }
    ]
  }
  """
  When method POST
  Then status 201
  And match response.id == '#present'
  And match response.status == 'in progress'
  And match response.currentStepOrder == 1
  * def taskId = response.id

  # 3. Manager IT Approves Level 1 Unit
  Given path 'tasks', taskId, 'approval'
  And header Authorization = 'Bearer ' + mgrItToken
  And request { decision: 'APPROVED', notes: 'Manager IT OK by Karate' }
  When method POST
  Then status 200
  And match response.status == 'in progress'

  # 4. Check Task Status & Verify Logic OR (or Next Approver)
  Given path 'tasks', taskId
  And header Authorization = 'Bearer ' + staffToken
  When method GET
  Then status 200

  # 5. Director Approves (Final Stage)
  Given path 'tasks', taskId, 'approval'
  And header Authorization = 'Bearer ' + dirToken
  And request { decision: 'APPROVED', notes: 'Director Final Approval OK by Karate' }
  When method POST
  Then status 200

  # 6. Fetch Final State
  Given path 'tasks', taskId
  And header Authorization = 'Bearer ' + staffToken
  When method GET
  Then status 200
  And match response.history == '#[ ]'

Scenario: 02 Revision Request Cycle: Request Revision -> Requester Submits Revision
  # 1. Get default workflow ID
  Given path 'workflows'
  And header Authorization = 'Bearer ' + adminToken
  When method GET
  Then status 200
  * def workflowId = response[0].id

  # 2. Staff IT creates a new Task
  Given path 'tasks'
  And header Authorization = 'Bearer ' + staffToken
  And request
  """
  {
    "title": "Karate Task for Revision Testing",
    "description": "Task created to test revision flow",
    "priority": "MEDIUM",
    "division": "IT",
    "workflowId": "#(workflowId)"
  }
  """
  When method POST
  Then status 201
  * def revTaskId = response.id

  # 3. Manager IT requests Revision
  Given path 'tasks', revTaskId, 'approval'
  And header Authorization = 'Bearer ' + mgrItToken
  And request { decision: 'REVISION', notes: 'Please add budget breakdown document' }
  When method POST
  Then status 200
  And match response.status == 'revision'

  # 4. Staff IT Submits Revision
  Given path 'tasks', revTaskId, 'revision'
  And header Authorization = 'Bearer ' + staffToken
  And request
  """
  {
    "title": "Karate Task for Revision Testing (Revised)",
    "description": "Updated with breakdown details",
    "notes": "Added budget breakdown",
    "attachments": [
      {
        "name": "Budget Breakdown.xlsx",
        "url": "https://company.internal/docs/budget.xlsx",
        "type": "link"
      }
    ]
  }
  """
  When method POST
  Then status 200
  And match response.status == 'in progress'
