import React, { useState } from "react";

import './stop-all.scss';

import ListOfRouteLogos from "../../shared/routelogo/ListOfRouteLogos";
import RouteLogo from "../../shared/routelogo/RouteLogo";
import { Link } from "react-router-dom";
import { List, ListElement } from "../../util/List";
import { ListStopsReply, Stop, StopTime, Stop_Reference, Trip_Reference } from "../../api/types";
import { HttpData, useHttpData } from "../http";
import { stopServiceMapsURL, stopURL } from "../../api/api";
import BasicPage from "../../shared/basicpage/BasicPage";


export type StopAllPageProps = {
  stopId: string;
  stopName: string | null;
}

function StopAllPage(props: StopAllPageProps) {
  const httpData = useHttpData(stopURL(props.stopId), 5000, Stop.fromJSON);
  return (
    <div className="StopAllPage" key={props.stopId}>
      <BasicPage
        httpData={httpData}
        header={Header}
        body={Body}
        stopName={props.stopName}
      />
    </div>
  )
}

export type HeaderProps = {
  httpData: HttpData<Stop>;
  stopName: string | null;
}

function Header(props: HeaderProps) {
  let stopName = props.stopName;
  if (props.httpData.response?.name !== undefined) {
    stopName = props.httpData.response?.name
  }
  return <div className="header">
    {stopName}
  </div>
}

function Body(stop: Stop) {
  let allStations:any[] = [];
  let allStops:any[] = [];
  // Get related stations first
  let inSystemTransfers = [];
  let otherSystemTransfers = [];
  for (const transfer of stop.transfers) {
    // TODO: handle cross-system transfers
    if (transfer.toStop != null) {
      inSystemTransfers.push(transfer.toStop)
    } else {
      otherSystemTransfers.push(transfer.toStop);
    }
  }

  let allStopIDs:any[] = [];
  // Add base/original stop first
  allStopIDs.push(stop.id);
  for (const stop of inSystemTransfers) {
    allStopIDs.push(stop.id);
  }

  // Call API to get ALL stations
  const httpData = useHttpData(stopServiceMapsURL(allStopIDs, false), null, ListStopsReply.fromJSON);
  if (httpData.response !== null) {
    for(const listOfStops of httpData.response.stops) {
      allStations.push(listOfStops);
    }
  }

  // Set data for all stops and all service maps (for line numbers header)
  for(const stations of allStations) {
    allStops.push(stations.stopTimes);
    for(const serviceMap of stations.serviceMaps) {
      stop.serviceMaps.push(serviceMap);
    }
  }

  // Flatten Arrays to match expected data set
  allStops = allStops.flat();
  allStops = allStops.sort(function (x, y) {
    return x.arrival.time - y.arrival.time;
  })

  let usualRouteIds: string[] = [];
  for (const serviceMap of stop.serviceMaps) {
    if (serviceMap.configId === 'weekday') {
      serviceMap.routes.forEach(
        route => usualRouteIds.push(route.id)
      )
    }
  }

  let currentTime = Math.round((new Date()).getTime() / 1000);

  let stopTimeElements = [];
  let allAssigned = true; // TODO

  stopTimeElements.push(
    <HeadsignStopTimes key='test' headsign='All Directions' stopTimes={allStops} currentTime={currentTime} />
  )
  if (!allAssigned) {
    stopTimeElements.push(
      <div key="scheduledTripWarning" className="scheduledTripWarning">
        Trains marked with {String.fromCharCode(9734)} are scheduled and have not entered into service yet.
      </div>
    )
  }

  let allTrainStopTimes = JSON.stringify(stop.stopTimes);

  // {buildLinkedStops(siblingStops, "Other platforms at this station")}
  // {buildConnections(otherSystemTransfers)}
  return (
    <div>
      <div className="myCustomTimes"></div>
      <div className="mainRoutes">
        <ListOfRouteLogos
          routeIds={usualRouteIds}
          skipExpress={true}
          addLinks={true}
        />
      </div>
      {stopTimeElements}
      {/* <LinkedStops stops={inSystemTransfers} baseStop={stop.id} title="Transfers" /> */}
    </div>
  )
}
type HeadsignStopTimesProps = {
  headsign: string;
  stopTimes: StopTime[];
  currentTime: number;
}

function HeadsignStopTimes(props: HeadsignStopTimesProps) {

  let [maxStopTimes, setMaxStopTimes] = useState(10);

  let children = [];
  children.push(
    <div key="subHeading" className="SubHeading">
      {props.headsign}
    </div>
  );
  let rendered = 0;
  let skipped = 0;
  if (props.stopTimes.length === 0) {
    children.push(
      <div key="noTrainsScheduled" className="noTrainsScheduled">
        No trains scheduled
      </div>
    );
  }

  let tripStopTimeElements = [];
  let walkingOffset = (60 * 7)
  for (const stopTime of props.stopTimes) {
    let tripTime = stopTime.arrival?.time;
    let direction = stopTime.headsign;
    if (tripTime === undefined) {
      tripTime = stopTime.departure?.time;
    }
    if (tripTime === undefined) {
      skipped += 1;
      continue
    }
    // This handles buggy stale trips in the GTFS feed, as well as trips that have left the station
    // but have not been updated in the feed yet.
    if (tripTime < props.currentTime + walkingOffset) {
      skipped += 1;
      continue;
    }
    if (rendered >= maxStopTimes && tripTime - props.currentTime > 10 * 60) {
      break
    }
    if (stopTime.trip === undefined) {
      skipped += 1;
      continue;
    }
    rendered += 1
    let trip: Trip_Reference = stopTime.trip;

    // TODO
    /*
    let isAssigned = (
      tripStopTime.trip.currentStatus != null ||
      tripStopTime.trip.currentStopSequence !== 0
    );
    allAssigned = allAssigned && isAssigned;*/

    tripStopTimeElements.push(
      <TripStopTime
        key={"trip" + trip.id}
        lastStopName={definedOr(trip.destination?.name, "")}
        routeId={definedOr(trip.route?.id, "")}
        tripId={trip.id}
        time={tripTime - props.currentTime}
        isAssigned={true} // TODO
        direction={direction}
      />
    );
  }
  if (rendered > maxStopTimes) {
    maxStopTimes = rendered
  }
  children.push(
    <List key="tripStopTimes">
      {tripStopTimeElements}
    </List>
  );
  if (rendered + skipped !== props.stopTimes.length) {
    children.push(
      <div key="moreTrips" className="MoreTrips" onClick={() => setMaxStopTimes(maxStopTimes + 4)}>
        show more trains
      </div>
    )
  }
  return <div>{children}</div>
}

type TripStopTimeProps = {
  key: string,
  lastStopName: string,
  routeId: string,
  tripId: string,
  time: any,
  isAssigned: boolean,
  direction: any,
}

function TripStopTime(props: TripStopTimeProps) {
  let displayTime = "";
  if (props.time < 30) {
    displayTime = "Arr"
  } else if (props.time < 60) {
    displayTime = String.fromCharCode(189)
  } else {
    displayTime = Math.floor(props.time / 60).toString()
  }

  return (
    <Link
      to={"/routes/" + props.routeId + "/" + props.tripId}
      state={{ lastStopName: props.lastStopName }}>
      <ListElement className={"TripStopTime"}>
        <div className="time">
          {displayTime}
        </div>
        <div className="route">
          <RouteLogo route={props.routeId} />
        </div>
        <div className="lastStop">
          {props.lastStopName}
          {props.isAssigned ? "" : String.fromCharCode(160)
            + String.fromCharCode(9734)}
        </div>
        <div className="direction">&nbsp;<i>({props.direction})</i></div>
      </ListElement>
    </Link>
  )
}

function definedOr<S>(s: S | undefined, d: S): S {
  if (s === undefined) {
    return d
  }
  return s
}

export default StopAllPage;
