import { Alert, Alert_Reference, Alert_Text, alert_EffectToJSON, alert_CauseToJSON } from "../api/types";
import { timestampToDateString, timestampToDateTime } from "./time";

export function buildStatusFromAlerts(alerts: Alert_Reference[]) {
  if (alerts.length === 0) {
    return "GOOD_SERVICE"
  }
  for (const alert of alerts) {
    if (alert_CauseToJSON(alert.cause).includes("DELAY")) {
      return "DELAYS"
    }
    if (alert_EffectToJSON(alert.effect).includes("DELAY")) {
      return "DELAYS"
    }
  }
  return "SERVICE_CHANGE"
}

export default function parseAlert(apiAlert: Alert): ParsedAlert {
  return new ParsedAlert(
    getEnglishText(apiAlert.header),
    getEnglishText(apiAlert.description),
    buildActivePeriodMessage(apiAlert),
  )
}

function getEnglishText(texts: Alert_Text[] | undefined): string {
  if (texts === undefined) {
    return ""
  }
  for (const text of texts) {
    if (text.language.toLowerCase() === "en") {
      return text.text
    }
  }
  return ""
}

function buildActivePeriodMessage(alert: Alert): string {
  // First we see if the MTA provided a human readable active period message.
  for (const description of alert.description) {
    if (description.language !== "github.com/jamespfennell/gtfs/extensions/nyctalerts/Metadata") {
      continue
    }
    const parsedText = JSON.parse(description.text);
    if (!parsedText.hasOwnProperty("HumanReadableActivePeriod")) {
      continue
    }
    const mtaMessage: string | null = parsedText.HumanReadableActivePeriod;
    if (mtaMessage === null || mtaMessage === "") {
      continue;
    }
    return mtaMessage
  }
  // If not, we create one ourselves.
  let timeMessage = "";
  if (alert.currentActivePeriod !== undefined) {
    // If the active period has both a start and end time, it usually indicates a planned alert.
    if (alert.currentActivePeriod.endsAt != null) {
      timeMessage += "In effect from " + timestampToDateString(alert.currentActivePeriod.startsAt) + " to "
        + timestampToDateString(alert.currentActivePeriod.endsAt)
    } else {
      timeMessage += "Alert posted " + timestampToDateTime(alert.currentActivePeriod.startsAt)
    }
    timeMessage += ".";
  }
  return timeMessage
}

export class ParsedAlert {
  header: string;
  description: string;
  activePeriodMessage: string;

  constructor(header: string, description: string, activePeriodMessage: string) {
    this.header = header;
    this.description = description;
    this.activePeriodMessage = activePeriodMessage;
  }
}
