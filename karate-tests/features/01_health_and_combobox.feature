Feature: Health & Reference Combobox API

Background:
  * url baseUrl

Scenario: 01 Verify Health Check Status
  Given path 'health'
  When method GET
  Then status 200
  And match response.status == 'OK'
  And match response.timestamp == '#present'
  And match response.database == 'connected'

Scenario: 02 Get Combobox Reference Data (Roles, Divisions, Statuses)
  Given path 'combobox'
  When method GET
  Then status 200
  And match response.roles == '#present'
  And match response.divisions == '#present'
  And match response.roles contains 'Admin'
  And match response.roles contains 'Head of Division'
  And match response.roles contains 'Leader'
  And match response.divisions contains 'IT'
  And match response.divisions contains 'Operation'
  And match response.divisions contains 'Human Resources'
