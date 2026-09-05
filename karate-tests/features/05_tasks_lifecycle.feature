Feature: End-to-End Task Lifecycle, Multi-Level Progression, Logic OR, and Approval Decisions

Background:
  * url baseUrl

Scenario: 01 Complete Approval Pipeline: Task Creation -> Level 1 (Logic OR Fulfillment) -> Level 2 -> Final Approved
  # 1. Login as Admin
  Given path 'auth', 'login'
  And request { username: '#(credentials.admin.username)', password: '#(credentials.admin.password)' }
  When method POST
  Then status 201
  * def adminToken = response.accessToken

  # 2. Login as Staff IT (Requester)
  Given path 'auth', 'login'
  And request { username: '#(credentials.staffIt.username)', password: '#(credentials.staffIt.password)' }
  When method POST
  Then status 201
  * def staffToken = response.accessToken

  # 3. Login as Manager IT (Level 1 Unit 1 Approver)
  Given path 'auth', 'login'
  And request { username: '#(credentials.managerIt.username)', password: '#(credentials.managerIt.password)' }
  When method POST
  Then status 201
  * def mgrItToken = response.accessToken

  # 4. Login as Staff Finance (Level 1 Unit 2 Logic OR Candidate)
  Given path 'auth', 'login'
  And request { username: '#(credentials.staffFin.username)', password: '#(credentials.staffFin.password)' }
  When method POST
  Then status 201
  * def staffFinToken = response.accessToken

  # 5. Login as Director (Level 2 Approver)
  Given path 'auth', 'login'
  And request { username: '#(credentials.director.username)', password: '#(credentials.director.password)' }
  When method POST
  Then status 201
  * def dirToken = response.accessToken

  # 6. Get Standard Corporate workflow (Staff -> Manager -> Direktur)
  Given path 'workflows'
  And header Authorization = 'Bearer ' + adminToken
  When method GET
  Then status 200
  * def workflow = response.find(w => w.name.includes('Standard Corporate'))
  * def workflowId = workflow ? workflow.id : response[0].id

  # 7. Staff IT submits a new Task
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
  * def taskId = response.id

  # 8. Manager IT Approves Level 1
  Given path 'tasks', taskId, 'approve'
  And header Authorization = 'Bearer ' + mgrItToken
  And request { decision: 'APPROVED', notes: 'Manager IT OK by Karate' }
  When method POST
  Then status 201

  # 9. Director Approves Level 2 (Final Stage)
  Given path 'tasks', taskId, 'approve'
  And header Authorization = 'Bearer ' + dirToken
  And request { decision: 'APPROVED', notes: 'Director Final Approval OK by Karate' }
  When method POST
  Then status 201
  And match response.status == 'approved'

  # 10. Fetch Final State
  Given path 'tasks', taskId
  And header Authorization = 'Bearer ' + staffToken
  When method GET
  Then status 200
  And match response.id == taskId
  And match response.status == 'approved'

Scenario: 02 Revision Request Cycle: Request Revision -> Requester Submits Revision
  # 1. Login as Admin
  Given path 'auth', 'login'
  And request { username: '#(credentials.admin.username)', password: '#(credentials.admin.password)' }
  When method POST
  Then status 201
  * def adminToken = response.accessToken

  # 2. Login as Staff IT
  Given path 'auth', 'login'
  And request { username: '#(credentials.staffIt.username)', password: '#(credentials.staffIt.password)' }
  When method POST
  Then status 201
  * def staffToken = response.accessToken

  # 3. Login as Manager IT
  Given path 'auth', 'login'
  And request { username: '#(credentials.managerIt.username)', password: '#(credentials.managerIt.password)' }
  When method POST
  Then status 201
  * def mgrItToken = response.accessToken

  # 4. Get Standard Corporate workflow
  Given path 'workflows'
  And header Authorization = 'Bearer ' + adminToken
  When method GET
  Then status 200
  * def workflow = response.find(w => w.name.includes('Standard Corporate'))
  * def workflowId = workflow ? workflow.id : response[0].id

  # 5. Staff IT creates a new Task
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

  # 6. Manager IT requests Revision
  Given path 'tasks', revTaskId, 'approve'
  And header Authorization = 'Bearer ' + mgrItToken
  And request { decision: 'REVISION', notes: 'Please add budget breakdown document' }
  When method POST
  Then status 201
  And match response.status == 'revision'

  # 7. Staff IT Submits Revision
  Given path 'tasks', revTaskId, 'submit-revision'
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
  Then status 201
  And match response.status == 'in progress'
