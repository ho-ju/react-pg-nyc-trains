import React from "react";

import './BasicPage.css'

import AnimateHeight from "react-animate-height";
import { HttpData } from "../../pages/http";

export type BasicPageProps<T> = {
  httpData: HttpData<T>;
  header: React.ComponentType<any>;
  body: React.ComponentType<T>;
  // All other props
  [x: string]: any;
}

function BasicPage<T>(props: BasicPageProps<T>) {
  const { header, body: component, httpData, ...passThroughProps } = props;
  let elements = [<props.header key="header" httpData={props.httpData} {...passThroughProps} />];
  if (props.httpData.error != null) {
    elements.push(
      <ErrorMessage key="errorMessage" tryAgainFunction={() => props.httpData.poll()}>{props.httpData.error}</ErrorMessage>
    )
  } else if (props.httpData.response === null) {
    elements.push(<LoadingBar key="loadingBar " />)
  }
  elements.push(
    <AnimateHeight
      key="body"
      animateOpacity={true}
      height={props.httpData.response != null ? "auto" : 0}
      duration={500}>
      {props.httpData.response != null ? React.createElement(props.body, props.httpData.response) : <div></div>}
    </AnimateHeight>
  );
  return <div>
    {elements}
  </div>
}

function ErrorMessage(props: any) {
  return (
    <div className="ErrorMessage">
      <div>{props.children}</div>
      <div className="tryAgain" onClick={props.tryAgainFunction}>try again</div>
    </div>
  )
}

function LoadingBar() {
  return (
    <div className="LoadingBar">
      <div className="spinner">
        <div className="bounce1" />
        <div className="bounce2" />
        <div className="bounce3" />
      </div>
    </div>
  )
}

export default BasicPage;
