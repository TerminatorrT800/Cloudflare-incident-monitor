const { getIncidents } = require("./services/cloudflare.js");
const { sendSlackMessage } = require("./services/slack.js");
const { CronJob } = require("cron");
const fs = require("fs");
const path = require("path");

async function checkForIncidents() {
  try {
    const incidents = await getIncidents();
    const storedIncidents = JSON.parse(
      fs.readFileSync(path.join(__dirname, "./storage/incidents.json"), "utf-8"),
    );
    const storedIncidentIds = storedIncidents.map((incident) => incident.id);
    console.log("Stored Incidents:", storedIncidentIds);
    if (incidents.length > 0) {
      let newIncidents = [];

      for (const incident of incidents) {
        if (!storedIncidentIds.includes(incident.id)) {
          newIncidents.push(incident);
          storedIncidents.push(incident);

          await sendSlackMessage({
            name: incident.name,
            status: incident.status,
            impact: incident.impact,
            createdAt: formatIsoDate(incident.createdAt),
            update: null,
          });

          for (const incidentUpdate of incident.incidentUpdates.reverse()) {
            await sendSlackMessage({
              name: incident.name,
              status: incidentUpdate.status,
              impact: incident.impact,
              createdAt: formatIsoDate(incidentUpdate.createdAt),
              update: incidentUpdate.body,
            });
          }
        } else {
          const storedUpdates = storedIncidents.filter(
            (storedIncident) => storedIncident.id == incident.id,
          )[0].incidentUpdates;
          const sotredUpdateIds = storedUpdates.map((update) => update.id);
          let newUpdates = [];

          for (const incidentUpdate of incident.incidentUpdates) {
            if (!sotredUpdateIds.includes(incidentUpdate.id)) {
              newUpdates.push(incidentUpdate);
              storedUpdates.push(incidentUpdate);

              await sendSlackMessage({
                name: incident.name,
                status: incidentUpdate.status,
                impact: incident.impact,
                createdAt: formatIsoDate(incidentUpdate.createdAt),
                update: incidentUpdate.body,
              });
            }
          }

          if (newUpdates.length == 0) {
            fs.appendFileSync(
              path.join(__dirname, "./log/incidentLogs.txt"),
              `${new Date()} No new updates for incident: ${incident.name}\n\n`,
            );
          } else {
            for (const update of newUpdates) {
              try {
                fs.appendFileSync(
                  path.join(__dirname, "./log/incidentLogs.txt"),
                  `${new Date()} New update for incident ${incident.name}: ${JSON.stringify(update)}\n\n`,
                );
              } catch (error) {
                console.log(`Error while trying to write to log : ${error}`);
              }
            }
          }
        }
      }

      if (newIncidents.length == 0) {
        fs.appendFileSync(
          path.join(__dirname, "./log/incidentLogs.txt"),
          `${new Date()} No new incidents\n\n`,
        );
      } else {
        for (const incident of newIncidents) {
          try {
            fs.appendFileSync(
              path.join(__dirname, "./log/incidentLogs.txt"),
              `${new Date()} New incident ${incident.name}: ${JSON.stringify(incident)}\n\n`,
            );
          } catch (error) {
            console.log(`Error while trying to write to log : ${error}`);
          }
        }
      }

      fs.writeFileSync(
        path.join(__dirname, "./storage/incidents.json"),
        JSON.stringify(incidents, null, 2),
      );
    } else {
      fs.appendFileSync(
        path.join(__dirname, "./log/incidentLogs.txt"),
        `\n\n${new Date()} No active incidents at the moment.\n\n`,
      );
    }

    //console.log(incidents);
  } catch (error) {
    console.error("Error fetching incidents:", error);
    fs.appendFileSync(
      path.join(__dirname, "./log/incidentLogs.txt"),
      `${new Date()} ERROR: Failed to fetch incidents - ${error.message}\n\n`,
    );
  }
}

function formatIsoDate(isoString) {
  const date = new Date(isoString);

  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZoneName: "short",
  });
}


checkForIncidents();