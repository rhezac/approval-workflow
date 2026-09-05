Feature: Approval Delegation & Substitution Rules

Background:
  * url baseUrl

Scenario: 01 Manager Creates Delegation to Another Manager (Same-Role Rule)
  # 1. Login as Manager IT
  Given path 'auth', 'login'
  And request { username: '#(credentials.managerIt.username)', password: '#(credentials.managerIt.password)' }
  When method POST
  Then status 201
  * def mgrItToken = response.accessToken

  # 2. Look up Manager Finance ID
  Given path 'users'
  And header Authorization = 'Bearer ' + mgrItToken
  And param search = 'manager_fin'
  When method GET
  Then status 200
  * def targetDelegateeId = response[0].id

  # 3. Create Delegation
  Given path 'tasks', 'delegations'
  And header Authorization = 'Bearer ' + mgrItToken
  And request
  """
  {
    "delegateeId": "#(targetDelegateeId)",
    "startDate": "2026-09-10",
    "endDate": "2026-09-20",
    "reason": "Annual leave covered by Manager Finance (Karate Test)"
  }
  """
  When method POST
  Then status 201
  And match response.id == '#present'
  And match response.isActive == true
  * def delegationId = response.id

  # 4. List Active Delegations
  Given path 'tasks', 'delegations'
  And header Authorization = 'Bearer ' + mgrItToken
  When method GET
  Then status 200

  # 5. Deactivate Delegation
  Given path 'tasks', 'delegations', delegationId
  And header Authorization = 'Bearer ' + mgrItToken
  When method DELETE
  Then status 200
  And match response.success == true
