Feature: Approval Delegation & Substitution Rules

Background:
  * url baseUrl
  * def mgrItLogin = karate.call('02_auth.feature', { username: credentials.managerIt.username, password: credentials.managerIt.password })
  * def mgrItToken = mgrItLogin.response.accessToken

  * def mgrFinLogin = karate.call('02_auth.feature', { username: credentials.managerFin.username, password: credentials.managerFin.password })
  * def mgrFinToken = mgrFinLogin.response.accessToken

Scenario: 01 Manager Creates Delegation to Another Manager (Same-Role Rule)
  # 1. Look up Manager Finance ID
  Given path 'users'
  And header Authorization = 'Bearer ' + mgrItToken
  And param search = 'manager_fin'
  When method GET
  Then status 200
  * def targetDelegateeId = response[0].id

  # 2. Create Delegation
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

  # 3. List Active Delegations
  Given path 'tasks', 'delegations'
  And header Authorization = 'Bearer ' + mgrItToken
  When method GET
  Then status 200
  And match response == '#[ ]'

  # 4. Deactivate Delegation
  Given path 'tasks', 'delegations', delegationId, 'deactivate'
  And header Authorization = 'Bearer ' + mgrItToken
  When method PATCH
  Then status 200
  And match response.isActive == false
