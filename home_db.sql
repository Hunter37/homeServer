CREATE TABLE
    meet (
        meet_key        int NOT NULL,           -- 123124
        meet_name       varchar(255) NOT NULL,  -- 2021 LSC Summer Championship
        meet_type       varchar(31),            -- Invitational | Open | LSC Championship | Zones | Sectionals | Summer Nationals | Olympic Trials
        host_lsc        varchar(15),            -- LSC code
        --host_team_name  varchar(255),           -- Team name (the query return lsc name)
        start_date      date,                   -- 2021-07-01
        end_date        date,                   -- 2021-07-04
        PRIMARY KEY (meet_key)
    );
/*
POST https://usaswimming.sisense.com/api/datasources/Meets/jaql
Content-Type: application/json
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyIjoiNjRhZjE4MGY5Nzg1MmIwMDJkZTU1ZDhkIiwiYXBpU2VjcmV0IjoiMjJhYmIxZGItNzlhYy0zMTQ1LTBjNTItYTU0OGQ5ZjAyOTQ5IiwiYWxsb3dlZFRlbmFudHMiOlsiNjRhYzE5ZTEwZTkxNzgwMDFiYzM5YmVhIl0sInRlbmFudElkIjoiNjRhYzE5ZTEwZTkxNzgwMDFiYzM5YmVhIn0.0uWonsgKfrpfCDi4GramolaPUNrVrdg-yKAf47s2SQ4

{
  "metadata": [
    {
      "title": "MeetKey",
      "dim": "[Meet.MeetKey]",
      "datatype": "numeric"
    },
    {
      "title": "MeetName",
      "dim": "[Meet.MeetName]",
      "datatype": "text"
    },
    {
      "title": "MeetType",
      "dim": "[Meet.MeetType]",
      "datatype": "text"
    },
    {
      "title": "HostLSC",
      "dim": "[OrgUnit.Level3Code]",
      "datatype": "text"
    },
    {
      "title": "HostTeam",
      "dim": "[OrgUnit.Level3Name]",
      "datatype": "text"
    },
    {
      "title": "StartDate",
      "dim": "[Meet.StartDate (Calendar)]",
      "datatype": "datetime",
      "level": "days",
      "sort": "asc",
      "filter": {
        #"from": "1900-01-01T00:00:00",
        #"to": "1980-01-01T00:00:00"
        #"from": "1980-01-01T00:00:00",
        #"to": "2000-01-01T00:00:00"
        "from": "2024-12-01T00:00:00",
        "to": "2024-12-10T00:00:00"
      }
    },
    {
      "title": "EndDate",
      "dim": "[Meet.EndDate (Calendar)]",
      "datatype": "datetime",
      "level": "days"
    }
  ],
  "count": 1000
}
*/

CREATE TABLE
    event (
        swim_key        int NOT NULL,   -- 172040834 -> globle unique
        person_key      int NOT NULL,
        meet_key        int NOT NULL,
        event_key       int NOT NULL,   -- 1 -> 50 SCY Free
        team_key        int,            -- Team unique key
        gender          varchar(1),     -- M | F



        event_category  varchar(7),     -- Prelim | Semi | Final
        team_name       varchar(255),   -- Team name
        
        PRIMARY KEY (swim_key),
        FOREIGN KEY (meet_key) REFERENCES meet (meet_key),
        FOREIGN KEY (person_key) REFERENCES person (person_key)
    );
/*

POST https://usaswimming.sisense.com/api/datasources/USA Swimming Times Elasticube/jaql
Content-Type: application/json
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyIjoiNjRhZjE4MGY5Nzg1MmIwMDJkZTU1ZDhkIiwiYXBpU2VjcmV0IjoiMjJhYmIxZGItNzlhYy0zMTQ1LTBjNTItYTU0OGQ5ZjAyOTQ5IiwiYWxsb3dlZFRlbmFudHMiOlsiNjRhYzE5ZTEwZTkxNzgwMDFiYzM5YmVhIl0sInRlbmFudElkIjoiNjRhYzE5ZTEwZTkxNzgwMDFiYzM5YmVhIn0.0uWonsgKfrpfCDi4GramolaPUNrVrdg-yKAf47s2SQ4

{
  "metadata": [
    {
      "dim": "[UsasSwimTime.UsasSwimTimeKey]",
      "datatype": "numeric",
      "filter": {
        "equals": 172040834
      }
    },
    {
      "title": "MeetKey",
      "dim": "[Meet.MeetKey]",
      "datatype": "numeric"
    }
  ],
  "count": 20000,
}

*/