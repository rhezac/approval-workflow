Feature: Health & Reference Combobox API

Background:
  * url baseUrl

Scenario: 01 Verify Health Check Status
  Given path 'health'
  When method GET
  Then status 200
  And match response.status == 'ok'
  And match response.timestamp == '#present'
  And match response.database == 'up'

Scenario: 02 Get Combobox Reference Data (Roles, Divisions, Statuses)
  Given path 'combobox'
  When method GET
  Then status 200
  And match response.roles == '#present'
  And match response.divisions == '#present'
  And match response.roles[*].name contains 'Admin'
  And match response.roles[*].name contains 'Head of Division'
  And match response.roles[*].name contains 'Leader'
  And match response.divisions[*].name contains 'IT'
  And match response.divisions[*].name contains 'Operation'
  And match response.divisions[*].name contains 'Human Resources'
