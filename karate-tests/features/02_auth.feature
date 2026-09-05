Feature: Authentication & Authorization via JWT and API Key

Background:
  * url baseUrl

Scenario: 01 Login with Valid Admin Credentials
  Given path 'auth', 'login'
  And request { username: '#(credentials.admin.username)', password: '#(credentials.admin.password)' }
  When method POST
  Then status 201
  And match response.accessToken == '#present'
  And match response.user.username == 'admin'
  And match response.user.role == 'Admin'
  * def adminToken = response.accessToken

Scenario: 02 Login with Invalid Password (Should Fail)
  Given path 'auth', 'login'
  And request { username: 'admin', password: 'WrongPassword999!' }
  When method POST
  Then status 401
  And match response.statusCode == 401
  And match response.message == 'Invalid username or password'

Scenario: 03 Access Protected Endpoint via API Key
  Given path 'health'
  When method GET
  Then status 200
  And match response.status == 'ok'

