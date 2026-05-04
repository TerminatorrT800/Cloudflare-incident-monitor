const { getIncidents } = require("./services/cloudflare.js");
const { sendSlackMessage } = require("./services/slack.js");
const fs = require("fs");
const path = require("path");

const storagePath = path.join(__dirname, "./storage/incidents.json");
const defaultPath = path.join(__dirname, "./incidents.default.json");

function loadStoredIncidents() {
  if (fs.existsSync(storagePath)) {
    return JSON.parse(fs.readFileSync(storagePath, "utf-8"));
  }

  fs.mkdirSync(path.dirname(storagePath), { recursive: true });

  if (fs.existsSync(defaultPath)) {
    fs.copyFileSync(defaultPath, storagePath);
    return JSON.parse(fs.readFileSync(storagePath, "utf-8"));
  }

  fs.writeFileSync(storagePath, JSON.stringify([]));
  return [];
}

async function checkForIncidents() {
  try {
    const incidents = await getIncidents();
    const storedIncidents = loadStoredIncidents();
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
          const storedUpdateIds = storedUpdates.map((update) => update.id);
          let newUpdates = [];

          for (const incidentUpdate of incident.incidentUpdates) {
            if (!storedUpdateIds.includes(incidentUpdate.id)) {
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

      fs.writeFileSync(storagePath, JSON.stringify(incidents, null, 2));
    } else {
      fs.appendFileSync(
        path.join(__dirname, "./log/incidentLogs.txt"),
        `\n\n${new Date()} No active incidents at the moment.\n\n`,
      );
    }
  } catch (error) {
    console.error("Error fetching incidents:", error);
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


async function main() {
  
console.log("Checking for incidents...");
await checkForIncidents();
await console.log("Current incidents.json:", fs.readFileSync(storagePath, "utf-8"));
await console.log("Done.");
process.exit(0);
}


main()
