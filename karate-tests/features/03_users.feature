Feature: User Management, RBAC, and Autocompletion Search

Background:
  * url baseUrl
  Given path 'auth', 'login'
  And request { username: '#(credentials.admin.username)', password: '#(credentials.admin.password)' }
  When method POST
  Then status 201
  * def adminToken = response.accessToken

Scenario: 01 Get All Users with Admin Token
  Given path 'users'
  And header Authorization = 'Bearer ' + adminToken
  When method GET
  Then status 200
  And match response == '#[]'
  And match response[*].username contains 'admin'

Scenario: 02 Search User by Full Name / Username with Autocomplete Limit
  Given path 'users'
  And header Authorization = 'Bearer ' + adminToken
  And param search = 'Irwan'
  And param limit = 5
  When method GET
  Then status 200
  And match response == '#[]'
  And match response[0].fullName contains 'Irwan'
  And match response[0].role == 'Manager'

Scenario: 03 Create a New User
  * def randomUsername = 'testuser_' + java.lang.System.currentTimeMillis()
  Given path 'users'
  And header Authorization = 'Bearer ' + adminToken
  And request
  """
  {
    "username": "#(randomUsername)",
    "password": "Password@123",
    "fullName": "Automated Karate Test User",
    "role": "Staff",
    "division": "IT",
    "isActive": true
  }
  """
  When method POST
  Then status 201
  And match response.id == '#present'
  And match response.username == randomUsername
  And match response.fullName == 'Automated Karate Test User'
